/*
    Copyright 2020
    Author : Ingar Arntzen

    This file is part of the Timingsrc module.

    Timingsrc is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Timingsrc is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with Timingsrc.  If not, see <http://www.gnu.org/licenses/>.
*/

define(function(require) {

    const utils = require("../util/utils");
    const Interval = require("../util/interval");
    const motionutils = require("../util/motionutils");
    const PosDelta = motionutils.MotionDelta.PosDelta;
    const MoveDelta = motionutils.MotionDelta.MoveDelta;
    const Schedule = require("./schedule");
    const BaseSequencer = require("./basesequencer");
    const Active = BaseSequencer.Active;
    const ActiveMap = BaseSequencer.ActiveMap;

    const EVENTMAP_THRESHOLD = 5000;
    const ACTIVECUES_THRESHOLD = 5000;


    class SingleSequencer extends BaseSequencer {

        constructor (axis, to) {

            super(axis);

            // Timing Object
            this._to = to;
            this._sub = this._to.on("timingsrc", this._onTimingCallback.bind(this));

            // Schedule
            this._sched = new Schedule(this._axis, to);
            let cb = this._onScheduleCallback.bind(this);
            this._sched_cb = this._sched.add_callback(cb)
        }


        get_movement_direction() {
            const now = this._to.clock.now();
            return motionutils.calculateDirection(this._to.vector, now);
        }


        /***************************************************************
         AXIS CALLBACK
        ***************************************************************/

        /*
            Handling Axis Update Callbacks
        */

        _onAxisCallback(eventMap) {
            /*
                process axis events which are relevant to the set
                of activeCues, or to the immediate future (schedule)

                enterCues - inactive -> active
                changeCues - active -> active, but changed
                exitCues - active -> inactive

                Two approaches
                - 1) EVENTS: filter list of events - compare to current active cues
                - 2) LOOKUP: regenerate new activeCues by looking up set of
                     active cues from axis, compare it to current active cues


                EventMap.size < about 1K-10K (5K)
                - EVENTS better or equal
                EventMap.size > about 5K
                - LOOKUP better
                - exception
                    - If activeCues.size > 1K-10K (5K) - EVENTS BETTER

                If new cues are predominantly active cues, EVENTS are
                always better - and more so for larger sets of events.
                However, there is no information about this
                before making the choice, and also this is a somewhat
                unlikely scenario.

                So, the simple policy above works for typical workloads,
                where the majority of added cues are inactive.
            */

            if (!this._to.isReady()) {
                return;
            }

            const now = this._to.clock.now();
            const now_vector = motionutils.calculateVector(this._to.vector, now);

            // choose approach to get events
            let get_events = this._events_from_axis_events.bind(this);
            if (EVENTMAP_THRESHOLD < eventMap.size) {
                if (this._activeCues.size < ACTIVECUES_THRESHOLD) {
                    get_events = this._events_from_axis_lookup.bind(this);
                }
            }

            // get events
            let activeInterval = new Interval(now_vector.position);
            const [exit, change, enter] = get_events(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._activeCues.delete(item.key);
            });
            enter.forEach(item => {
                this._activeCues.set(item.key, item.new);
            });

            // notifications
            const events = utils.array_concat([exit, change, enter], {copy:true, order:true});

            // sort events according to general movement direction
            let direction = motionutils.calculateDirection(now_vector);
            BaseSequencer.sort_events(events, direction);

            // event notification
            this._notifyEvents(events);

            /*
                clear schedule

                This is only necessary if a cue interval is changed,
                and the change is relevant within the posInterval of
                of the schedule.

                Instead of checking all cues, it is likely cheaper to
                simply refresh the schedule every time, i.e. a single
                lookup from axis on 5 second interval. At least for
                large event batches it should be more efficient.

                Also, simply refreshing the schedule is a much simpler
                solution in terms of code complexity.

                TODO: cue interval changes may affect schedule
                posInterval even if it does not affect active cues,
                so just looking at changes in active cues is not an option.

                NOTE: if axis delivered a "union" interval for the
                batch, it would be very quick to see if this was
                relevant for the posInterval.

            */

            this._sched.setVector(now_vector);
        }


        /***************************************************************
         TIMING OBJECT CALLBACK
        ***************************************************************/

        _onTimingCallback (eArg) {
            const events = [];
            /*
                If update is the initial vector from the timing object,
                we set current time as the official time for the update.
                Else, the new vector is "live" and we use the timestamp
                when it was created as the official time for the update.
                This is represented by the new_vector.
            */
            let new_vector;

            if (eArg.live) {
                new_vector = to.vector;
            } else {
                // make a live vector from to vector
                new_vector = motionutils.calculateVector(to.vector, to.clock.now());
            }

            /*
                The nature of the vector change
            */
            let delta = new motionutils.MotionDelta(to.old_vector, new_vector);

            /*
                Reevaluate active state.
                This is required after any discontinuity of the position (jump),
                or if the motion stopped without jumping (pause or halt at range
                restriction)
            */
            if (delta.posDelta == PosDelta.CHANGE || delta.moveDelta == MoveDelta.STOP) {
                // make position interval
                let low = new_vector.position;
                let high = new_vector.position;
                let itv = new Interval(low, high, true, true);
                // new active cues
                let activeCues = new Map(this._axis.lookup(itv).map(cue => {
                    return [cue.key, cue];
                }));
                // exit cues - in old activeCues but not in new activeCues
                let exitCues = utils.map_difference(this._activeCues, activeCues);
                // enter cues - not in old activeCues but in new activeCues
                let enterCues = utils.map_difference(activeCues, this._activeCues);
                // update active cues
                this._activeCues = activeCues;
                // make events
                for (let cue of exitCues.values()) {
                    events.push({key:cue.key, new:undefined, old:cue});
                }
                for (let cue of enterCues.values()) {
                    events.push({key:cue.key, new:cue, old:undefined});
                }

                // sort events according to general movement direction
                let direction = motionutils.calculateDirection(new_vector);
                BaseSequencer.sort_events(events, direction);

                // event notification
                this._notifyEvents(events);
            }

            /*
                Handle Timing Object Moving
            */
            this._sched.setVector(new_vector);
        };


        /***************************************************************
         SCHEDULE CALLBACK
        ***************************************************************/

        _onScheduleCallback = function(now, endpointItems, schedule) {
            if (!this._to.isReady()) {
                return;
            }

            const events = [];
            endpointItems.forEach(function (item) {
                let cue = item.cue;
                let has_cue = this._activeCues.has(cue.key);
                let [value, right, closed, singular] = item.endpoint;

                /*
                    Action Code - see sequenceutils
                */
                // to role
                let to_role = "S";
                // movement direction
                let to_dir = (item.direction > 0) ? "R" : "L";
                // endpoint type
                let ep_type = (singular) ? "S": (right) ? "R" : "L";
                // action code, enter, exit, stay, enter-exit
                let action_code = ActiveMap.get(`${to_role}${to_dir}${ep_type}`);

                if (action_code == Active.ENTER_EXIT) {
                    if (has_cue) {
                        // exit
                        events.push({key:cue.key, new:undefined, old:cue});
                        this._activeCues.delete(cue.key);
                    } else {
                        // enter
                        events.push({key:cue.key, new:cue, old:undefined});
                        // exit
                        events.push({key:cue.key, new:undefined, old:cue});
                        // no need to both add and remove from activeCues
                    }
                } else if (action_code == Active.ENTER) {
                    if (!has_cue) {
                        // enter
                        events.push({key:cue.key, new:cue, old:undefined});
                        this._activeCues.set(cue.key, cue);
                    }
                } else if (action_code == Active.EXIT) {
                    if (has_cue) {
                        // exit
                        events.push({key:cue.key, new:undefined, old:cue});
                        this._activeCues.delete(cue.key);
                    }
                }
            }, this);

            // event notification
            this._notifyEvents(events);
        };
    }

    return SingleSequencer;
});
