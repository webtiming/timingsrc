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

    const PosDelta = motionutils.MotionDelta.PosDelta;
    const MoveDelta = motionutils.MotionDelta.MoveDelta;

    class DoubleSequencer {

        constructor (axis, toA, toB) {

            // ActiveCues
            this._activeCues = new Map(); // (key -> cue)

            // Axis
            this._axis = axis;
            let axis_cb = this._onAxisCallback.bind(this)
            this._axis_cb = this._axis.add_callback(axis_cb);

            // Timing objects
            this._toA = toA;
            this._toB = toB;
            let to_cb = this._onTimingCallback.bind(this);
            this._subA = this._toA.on("timingsrc", to_cb);
            this._subB = this._toB.on("timingsrc", to_cb);

            // Schedules
            let sched_cb = this._onScheduleCallback.bind(this);
            this._schedA = new Schedule(this._axis, toA);
            this._schedA_cb = this._schedA.add_callback(sched_cb);
            this._schedB = new Schedule(this._axis, toB);
            this._schedB_cb = this._schedB.add_callback(sched_cb);

            // Change event
            eventify.eventifyInstance(this);
            this.eventifyDefineEvent("change", {init:true});
        }

        /***************************************************************
         EVENTS
        ***************************************************************/

        /*
            Eventify: immediate events
        */
        eventifyMakeInitEvents = function (type) {
            if (type === "change") {
                if (this.isReady() && this._activeCues.size > 0) {
                    let events = [...this._activeCues.values()].map(cue => {
                        return {key:cue.key, new:cue, old:undefined};
                    });
                    return [true, events];
                }
            }
            return [];
        };


        /***************************************************************
         READYNESS
        ***************************************************************/

        /*
            Sequencer Ready Promise
        */
        get ready () {
            return Promise.all(this._toA.ready, this._toB_ready);
        };

        /*
            Sequencer Read State
        */
        isReady() {
            return this._toA.isReady() && this._toB.isReady();
        }


        /*
            Handling Axis Update Callbacks
        */
        _onAxisCallback(batchMap) {
            // Do something
            console.log("onAxisUpdate");
        }

        /*
            Handling Change Events from Timing Objects
        */
        _onTimingCallback (eArg, eInfo) {

            const events = [];

            if (!this.isReady()) {
                return;
            }

            // TODO - avoid processing ready signal from both timing objects
            // initially.


            /* figure out which timing object was firing */
            const to = eInfo.src;
            const other_to = (to == this._toA) ? this._toB : this._toA;
            if (eInfo.src == this._toA) {
                console.log("update toA");
            } else {
                console.log("update toB");
            }

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
                if (events.length > 0 ) {
                    this.eventifyTriggerEvent("change", events);
                }
            }



            /*
                Moving
            */

            // kick off schedule

            /*
            // TODO - need to kick off the other as well
            if (to == this._toA) {
                this._scheduleA.setVector(new_vector);
            } else if (to == this._toB) {
                this._scheduleB.setVector(new_vector);
            }
            */

        };





        /*
            Handling due Events from Schedules
        */
        _onScheduleCallback = function(dueEvens, schedule) {
            if (schedule == this._scheduleA) {
                console.log("schedule A callback");
            } else if (schedule == this._scheduleB) {
                console.log("schedule B callback");
            }
        }


        /*
            Map accessors
        */

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

    eventify.eventifyPrototype(DoubleSequencer.prototype);

    return DoubleSequencer;

});

