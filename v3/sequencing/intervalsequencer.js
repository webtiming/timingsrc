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

import {array_concat, map_difference} from '../util/utils.js';
import Interval from '../util/interval.js';
import eventify from '../util/eventify.js';
import * as motionutils from '../util/motionutils.js';
import Schedule from './schedule.js';
import BaseSequencer from './basesequencer.js';
import dataset from './dataset.js';

const PosDelta = motionutils.MotionDelta.PosDelta;
const MoveDelta = motionutils.MotionDelta.MoveDelta;
const Active = BaseSequencer.Active;
const ActiveMap = BaseSequencer.ActiveMap;
const Relation = Interval.Relation;

const EVENTMAP_THRESHOLD = 5000;
const ACTIVECUES_THRESHOLD = 5000;

/*
    calculate general movement direction for double sequencer
    define movement direction as the aggregate movement direction
    for both timing objects
*/
function movement_direction (now_vector_A, now_vector_B) {
    let direction_A = motionutils.calculateDirection(now_vector_A);
    let direction_B = motionutils.calculateDirection(now_vector_B);
    let direction = direction_A + direction_B;
    return (direction > 0) ? 1 : (direction < 0) ? -1 : 0;
}


class IntervalModeSequencer extends BaseSequencer {

    constructor (dataset, toA, toB) {

        super(dataset);

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
        this._schedA = new Schedule(this._ds, toA);
        this._schedA_cb = this._schedA.add_callback(sched_cb);
        this._schedB = new Schedule(this._ds, toB);
        this._schedB_cb = this._schedB.add_callback(sched_cb);
    }


    _isReady() {
        return (this._toA_ready && this._toB_ready);
    }


    /*
        Implement movement direction from two timing objects
    */

    _movementDirection() {
        const now = this._toA.clock.now();
        const now_vector_A = motionutils.calculateVector(this._toA.vector, now);
        const now_vector_B = motionutils.calculateVector(this._toB.vector, now);
        return movement_direction(now_vector_A, now_vector_B);
    }

    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    /*
        Handling Dataset Update Callbacks
    */
    _onDatasetCallback(eventMap, relevanceInterval) {
        if (!this._isReady()) {
            return;
        }

        if (relevanceInterval == undefined) {
            return;
        }

        // assuming both timing objects have the same clock
        const now = this._toA.clock.now();
        const now_vector_A = motionutils.calculateVector(this._toA.vector, now);
        const now_vector_B = motionutils.calculateVector(this._toB.vector, now);

        // active interval
        let [pos_A, pos_B] = [now_vector_A.position, now_vector_B.position];
        let [low, high] = (pos_A <= pos_B) ? [pos_A, pos_B] : [pos_B, pos_A];
        const activeInterval = new Interval(low, high, true, true);

        if (!activeInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
            // relevanceInterval is NOT outside activeInterval
            // some events relevant for activeIntervale

            // choose approach to get events
            let get_items = this._items_from_dataset_events.bind(this);
            if (EVENTMAP_THRESHOLD < eventMap.size) {
                if (this._map.size < ACTIVECUES_THRESHOLD) {
                    get_items = this._items_from_dataset_lookup.bind(this);
                }
            }

            // get items
            const [exit, change, enter] = get_items(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._map.delete(item.key);
            });
            enter.forEach(item => {
                this._map.set(item.key, item.new);
            });

            // notifications
            const items = array_concat([exit, change, enter], {copy:true, order:true});

            // sort event items according to general movement direction
            let direction = movement_direction(now_vector_A, now_vector_B);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items, direction);
        }


        /*
            clear schedules

            This is only necessary if a cue interval is changed,
            and the change is relevant within the posInterval of
            one of the schedules. RelevanceInterval to figure this out.
        */

        if (this._schedA.posInterval) {
            if (!this._schedA.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._schedA.setVector(now_vector_A);
            }
        }

        if (this._schedB.posInterval) {
            if (!this._schedB.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._schedB.setVector(now_vector_B);
            }
        }
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
        const items = [];
        if (delta.posDelta == PosDelta.CHANGE || delta.MoveDelta == MoveDelta.STOP) {

            // make position interval
            let low = Math.min(new_vector.position, other_new_vector.position);
            let high = Math.max(new_vector.position, other_new_vector.position);
            let itv = new Interval(low, high, true, true);

            // new active cues
            let activeCues = new Map(this._ds.lookup(itv).map(cue => {
                return [cue.key, cue];
            }));
            // exit cues - in old activeCues but not in new activeCues
            let exitCues = map_difference(this._map, activeCues);
            // enter cues - not in old activeCues but in new activeCues
            let enterCues = map_difference(activeCues, this._map);
            // update active cues
            this._map = activeCues;
            // make event items
            for (let cue of exitCues.values()) {
                items.push({key:cue.key, new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                items.push({key:cue.key, new:cue, old:undefined});
            }

            // sort event items according to general movement direction
            let direction = movement_direction(new_vector, other_new_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
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

        const items = [];
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
            let has_cue = this._map.has(cue.key);

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
                items.push({key:cue.key, new:cue, old:undefined});
                this._map.set(cue.key, cue);
            } else if (action_code == Active.EXIT) {
                // exit
                items.push({key:cue.key, new:undefined, old:cue});
                this._map.delete(cue.key);
            }
        }, this);

        // Event items already sorted

        // event notification
        this._notifyEvents(items);
    }
}

export default IntervalModeSequencer;

