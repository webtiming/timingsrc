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

    const util = require("../util/util");
    const endpoint = require("../util/endpoint");
    const Interval = require("../util/interval");
    const motionutils = require("../util/motionutils");
    const eventify = require("../util/eventify");
    const Schedule = require("./schedule");
    const Axis = require("./axis");

    const Delta = Axis.Delta;
    const PosDelta = motionutils.MotionDelta.PosDelta;
    const MoveDelta = motionutils.MotionDelta.MoveDelta;
    const Relation = Interval.Relation;
    const isMoving = motionutils.isMoving;
    const Match = [
        Relation.OVERLAP_LEFT,
        Relation.COVERED,
        Relation.EQUAL,
        Relation.COVERS,
        Relation.OVERLAP_RIGHT
    ]

    class SingleSequencer {

        constructor (axis, to) {

            // axis
            this._axis = axis;

            // timing object
            this._to = to;

            // schedule
            this._sched = new Schedule(this._axis, to);

            // activeCues
            this._activeCues = new Map(); // (key -> cue)

            // Axis Callback
            let cb = this._onAxisCallback.bind(this)
            this._axis_cb = this._axis.add_callback(cb);

            // Schedule Callback
            cb = this._onScheduleCallback.bind(this);
            this._sched_cb = this._sched.add_callback(cb)


            /*

            Wrap onTimingChange

            To allow multiple instances of SingleSequencer to subscribe to
            the same event source, the handler must be different objects.
            If we use the class method directly as handler, it will
            be on the prototype and therefor be shared between instances.

            It is safe to use the same handler for multiple event sources.

            Additionally we specify a context for the handler simply to
            be able to use 'this' safely inside the wrapper implementation.

            */

            this._onTimingCallbackWrapper = function (eInfo) {
                this._onTimingCallback(eInfo);
            };
            this._to.on("change", this._onTimingCallbackWrapper.bind(this));

            // Change event
            eventify.eventifyInstance(this, {init:false}); // no events type
            this.eventifyDefineEvent("change", {init:true});
        }


        /***************************************************************
         EVENTS
        ***************************************************************/

        /*
            Eventify: callback formatter
        */
        eventifyCallbackFormatter = function (type, e, eInfo) {
            return [e, eInfo];
        };

        /*
            Eventify: immediate events
        */
        eventifyMakeInitEvents = function (type) {
            if (type === "change") {
                if (this.isReady()) {
                    let changeMap = [...this._activeCues.values()].map(cue => {
                        return [cue.key, {new:cue, old:undefined}];
                    });
                    return [changeMap];
                }
            }
            return [];
        };


        /***************************************************************
         READINESS
        ***************************************************************/

        /*
            Sequencer Ready Promise
        */
        get ready () {
            return this._to.ready;
        };

        /*
            Sequencer Read State
        */
        isReady() {
            return this._to.isReady();
        }


        /***************************************************************
         AXIS CALLBACK
        ***************************************************************/

        _onAxisCallback(events) {
            //console.log("onAxisCallback");
            /*
                process axis events which are relevant to the set
                of activeCues, or to the immediate future (schedule)

                enterCues - inactive -> active
                changeCues - active -> active, but changed
                exitCues - active -> inactive

                Two approaches
                - 1) filter list of events - compare to current active cues
                - 2) regenerate new activeCues from
                     axis, compare it to current active cues

                Preferred method depends on length of events.
            */
            const enterEvents = [];
            const changeEvents = [];
            const exitEvents = [];
            const now = this._to.clock.now();
            const now_vector = motionutils.calculateVector(this._to.vector, now);

            let is_active, should_be_active, _item;
            events.forEach(function(item){
                let delta = item.delta;
                // filter out noops
                if (delta.interval == Delta.NOOP && delta.data == Delta.NOOP) {
                    return;
                }
                // exit, change, enter events
                is_active = this._activeCues.has(item.key);
                should_be_active = false;
                if (item.new != undefined) {
                    if (item.new.interval.covers_endpoint(now_vector.position)) {
                        should_be_active = true;
                    }
                }
                if (is_active && !should_be_active) {
                    // exit
                    _item = {key:item.key, new:undefined, old:item.old};
                    exitEvents.push(_item);
                    this._activeCues.delete(item.key);
                } else if (!is_active && should_be_active) {
                    // enter
                    _item = {key:item.key, new:item.new, old:undefined};
                    enterEvents.push(_item);
                    this._activeCues.set(_item.key, _item.new);
                } else if (is_active && should_be_active) {
                    // change
                    _item = {key:item.key, new:item.new, old:item.old};
                    changeEvents.push(_item);
                }

            }, this);

            let _events = [];
            _events.push(...exitEvents);
            _events.push(...changeEvents);
            _events.push(...enterEvents);

            // event notification
            if (_events.length > 0) {
                this.eventifyTriggerEvent("change", _events);
            }

            /*
                Clear and reset schedule if necessary.

                This is only necessary if any of the cues intervals
                are changed, and that these changes are relevant
                with respect to the posInterval of scheduler.
                - new interval match posInterval
                - old interval match posInterval

                There is no change in motion at this time, so either we
                continue moving or we continue paused.

                corner case - if motion is available and moving -
                yet the sheduler has not been started yet,
                sched.posInterval will be undefined. Not sure if this is
                possible, but if it were to occur we dont do anything
                and trust that the schedule will be started shortly
                by onTimingCallback.
            */
            if (isMoving(now_vector) && this._sched.posInterval) {
                let sched_dirty = false;
                let rel, item;
                let delta;
                for (let i=0; i<events.length; i++) {
                    item = events[i];
                    delta = item.delta;
                    if (delta.interval == Delta.NOOP) {
                        continue;
                    }
                    // check item.new.interval
                    if (item.new != undefined) {
                        rel = item.new.interval.compare(this._sched.posInterval);
                        if (Match.includes(rel)) {
                            sched_dirty = true;
                            break;
                        }
                    }
                    // check item.old.interval
                    if (item.old != undefined) {
                        rel = item.old.interval.compare(this._sched.posInterval);
                        if (Match.includes(rel)) {
                            sched_dirty = true;
                            break;
                        }
                    }
                }
                if (sched_dirty) {
                    this._sched.setVector(now_vector);
                }
            }
        }


        /***************************************************************
         TIMING OBJECT CALLBACK
        ***************************************************************/

        _onTimingCallback (eInfo) {
            //console.log("onTimingCallback");
            const events = [];

            /*
                If update is the initial vector from the timing object,
                we set current time as the official time for the update.
                Else, the new vector is "live" and we use the timestamp
                when it was created as the official time for the update.
                This is represented by the new_vector.
            */
            let new_vector;
            if (eInfo.init) {
                new_vector = motionutils.calculateVector(to.vector, to.clock.now());
            } else {
                new_vector = to.vector;
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
                let exitCues = util.map_difference(this._activeCues, activeCues);
                // enter cues - not in old activeCues but in new activeCues
                let enterCues = util.map_difference(activeCues, this._activeCues);
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
                this.eventifyTriggerEvent("change", events);
            }

            /*
                Handle Timing Object Moving
            */
            this._sched.setVector(new_vector);
        };


        /***************************************************************
         SCHEDULE CALLBACK
        ***************************************************************/

        _onScheduleCallback = function(endpointItems) {
            const events = [];
            endpointItems.forEach(function (item) {
                let cue = item.cue;
                let has_cue = this._activeCues.has(cue.key);
                let [value, right, closed, singular] = item.endpoint;
                if (singular) {
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
                } else {
                    // enter or exit
                    let right_value = (right) ? -1 : 1;
                    let enter = (item.direction * right_value) > 0;
                    if (enter) {
                        if (!has_cue) {
                            // enter
                            events.push({key:cue.key, new:cue, old:undefined});
                            this._activeCues.set(cue.key, cue);
                        }
                    } else {
                        if (has_cue) {
                            // exit
                            events.push({key:cue.key, new:undefined, old:cue});
                            this._activeCues.delete(cue.key);
                        }
                    }
                }
            }, this);

            // event notification
            this.eventifyTriggerEvent("change", events);
        };


        /***************************************************************
         MAP ACCESSORS
        ***************************************************************/

        has(key) {
            return this._activeCues.has(key);
        };

        get(key) {
            return this._activeCues.get(key);
        };

        keys() {
            return this._activeCues.keys();
        };

        values() {
            return this._activeCues.values();
        };

        entries() {
            return this._activeCues.entries();
        }

    }

    eventify.eventifyPrototype(SingleSequencer.prototype);

    return SingleSequencer;

});

