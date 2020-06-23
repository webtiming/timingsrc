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

    const utils = require("../util/util");
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


    class DoubleSequencer extends BaseSequencer {

        constructor (axis, toA, toB) {

            super(axis);

            // Timing objects
            this._toA = toA;
            this._toA_ready = false;
            this._toB = toB;
            this._toB_ready = false;
            let to_cb = this._onTimingCallback.bind(this);
            this._subA = this._toA.on("timingsrc", to_cb);
            this._subB = this._toB.on("timingsrc", to_cb);

            // Schedules
            let sched_cb = this._onScheduleCallback.bind(this);
            this._schedA = new Schedule(this._axis, toA);
            this._schedA_cb = this._schedA.add_callback(sched_cb);
            this._schedB = new Schedule(this._axis, toB);
            this._schedB_cb = this._schedB.add_callback(sched_cb);

        }


        _isReady() {
            return (this._toA_ready && this._toB_ready);
        }


        /***************************************************************
         AXIS CALLBACK
        ***************************************************************/

        /*
            Handling Axis Update Callbacks
        */
        _onAxisCallback(eventMap) {
            if (!this._isReady()) {
                return;
            }

            // assuming both timing objects have the same clock
            const now = this._toA.clock.now();
            const now_vector_A = motionutils.calculateVector(this._toA.vector, now);
            const now_vector_B = motionutils.calculateVector(this._toB.vector, now);

            // choose approach to get events
            let get_events = this._events_from_axis_events.bind(this);
            if (EVENTMAP_THRESHOLD < eventMap.size) {
                if (this._activeCues.size < ACTIVECUES_THRESHOLD) {
                    get_events = this._events_from_axis_lookup.bind(this);
                }
            }

            // get events
            let [pos_A, pos_B] = [now_vector_A.position, now_vector_B.position];
            let [low, high] = (pos_A <= pos_B) ? [pos_A, pos_B] : [pos_B, pos_A];
            let activeInterval = new Interval(low, high, true, true);
            const [exit, change, enter] = get_events(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._activeCues.delete(item.key);
            });
            enter.forEach(item => {
                this._activeCues.set(item.key, item.new);
            });

            // notifications
            const events = exit;
            events.push(...change);
            events.push(...enter);

            // event notification
            if (events.length > 0) {
                this.eventifyTrigger("update", events);
            }


            /*
                clear schedules

                This is only necessary if a cue interval is changed,
                and the change is relevant within the posInterval of
                one of the schedules.

                Instead of checking all cues, it is likely cheaper to
                simply refresh the schedule every time, i.e. a single
                lookup from axis on 5 second interval. At least for
                large event batches it should be more efficient.

                Also, simply refreshing the schedule is a much simpler
                solution in terms of code complexity.

                Note: cue interval changes may affect schedule
                posInterval even if it does not affect active cues,
                so just looking at changes in active cues is not an option.

                TODO: if axis delivered a "union" interval for the
                batch, it would be very quick to see if this was
                relevant for either of the posIntervals.
            */


            this._schedA.setVector(now_vector_A);
            this._schedB.setVector(now_vector_B);
        }


        /***************************************************************
         TIMING OBJECT CALLBACK
        ***************************************************************/

        /*
            Handling Change Events from Timing Objects
        */
        _onTimingCallback (eArg, eInfo) {

            /*
                make sure both timingobjects are ready
            */
            let init = false;
            if (!this._isReady()) {
                if (eInfo.src == this._toA) {
                    this._toA_ready = true;
                } else {
                    this._toB_ready = true;
                }
                if (this._isReady()) {
                    init = true;
                } else {
                    return;
                }
            }

            /*
                figure out which timing object was firing
            */
            const to = eInfo.src;
            const other_to = (to == this._toA) ? this._toB : this._toA;

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
                new_vector = motionutils.calculateVector(to.vector, to.clock.now());
            }

            /*
                The nature of the vector change
            */
            const delta = new motionutils.MotionDelta(to.old_vector, new_vector);

            /*
                Sample the state of the other timing object at same time.
            */
            let ts = new_vector.timestamp;
            let other_new_vector = motionutils.calculateVector(other_to.vector, ts);

            /*
                Reevaluate active state.
                This is required after any discontinuity of the position (jump),
                or if the motion stopped without jumping (pause or halt at range
                restriction)
            */
            const events = [];
            if (delta.posDelta == PosDelta.CHANGE || delta.MoveDelta == MoveDelta.STOP) {

                // make position interval
                let low = Math.min(new_vector.position, other_new_vector.position);
                let high = Math.max(new_vector.position, other_new_vector.position);
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
                // event notification
                if (events.length > 0 ) {
                    this.eventifyTrigger("update", events);
                }
            }

            /*
                Handle Timing Object Moving
                - on init both shedules must be updated
            */
            if (to == this._toA) {
                this._schedA.setVector(new_vector);
            } else if (to == this._toB) {
                this._schedB.setVector(new_vector);
            }
            if (init) {
                if (other_to == this._toA) {
                    this._schedA.setVector(other_new_vector);
                } else if (other_to == this._toB) {
                    this._schedB.setVector(other_new_vector);
                }
            }
        };


        /***************************************************************
         SCHEDULE CALLBACK
        ***************************************************************/

        /*
            Handling due Events from Schedules
        */
        _onScheduleCallback = function(now, endpointItems, schedule) {
            if (!this._isReady()) {
                return;
            }

            /*
                figure out which timing object was firing
            */
            const to = schedule.to;
            const other_to = (to == this._toA) ? this._toB : this._toA;

            const events = [];
            endpointItems.forEach(function (item) {

                /*
                    figure out if to (event source) is lower than the other to
                    at time of event
                */
                // endpoint
                let [pos, right, closed, singular] = item.endpoint;
                // position of other to at time of event
                let ts = item.tsEndpoint[0];
                let other_vector = motionutils.calculateVector(other_to.vector, ts);
                let pos_other = other_vector.position;

                /*
                    Action Code - see sequenceutils
                */
                // to role
                let to_role = (pos < pos_other) ? "L" : (pos == pos_other) ? "S" : "R";
                // movement direction
                let to_dir = (item.direction > 0) ? "R" : "L";
                // endpoint type
                let ep_type = (singular) ? "S": (right) ? "R" : "L";
                // action code, enter, exit, stay, enter-exit
                let action_code = ActiveMap.get(`${to_role}${to_dir}${ep_type}`);

                /*
                    state of cue
                */
                let cue = item.cue;
                let has_cue = this._activeCues.has(cue.key);

                // filter action code
                if (action_code == Active.ENTER_EXIT) {
                    /*
                        both timing objects evaluated to same position
                        either
                        1) to is moving and other_to is paused at this point,
                           implying that the cue STAYS active
                        or,
                        2) both are moving. if both are moving in the same
                        direction - EXIT
                        opposite direction - ENTER
                    */
                    let other_moving = motionutils.isMoving(other_vector);
                    if (!other_moving) {
                        // other not moving
                        action_code = Active.ENTER;
                    } else {
                        // both moving
                        let direction = motionutils.calculateDirection(other_vector);                        // movement direction
                        action_code = (direction != item.direction) ? Active.ENTER : Active.EXIT;
                    }
                }
                if (action_code == Active.STAY) {
                    action_code = Active.ENTER;
                }
                if (action_code == Active.ENTER && has_cue) {
                    return;
                }
                if (action_code == Active.EXIT && !has_cue) {
                    return;
                }

                // enter or exit
                if (action_code == Active.ENTER) {
                    // enter
                    events.push({key:cue.key, new:cue, old:undefined});
                    this._activeCues.set(cue.key, cue);
                } else if (action_code == Active.EXIT) {
                    // exit
                    events.push({key:cue.key, new:undefined, old:cue});
                    this._activeCues.delete(cue.key);
                }
            }, this);

            // event notification
            if (events.length > 0) {
                this.eventifyTrigger("update", events);
            }
        }
    }

    return DoubleSequencer;
});
