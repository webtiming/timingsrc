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
import Dataset from './dataset.js';

const PosDelta = motionutils.MotionDelta.PosDelta;
const MoveDelta = motionutils.MotionDelta.MoveDelta;
const Active = BaseSequencer.Active;
const ActiveMap = BaseSequencer.ActiveMap;
const Relation = Interval.Relation;

const EVENTMAP_THRESHOLD = 5000;
const ACTIVECUES_THRESHOLD = 5000;


class PointModeSequencer extends BaseSequencer {

    constructor (dataset, to) {

        super(dataset);

        // Timing Object
        this._to = to;
        this._sub = this._to.on("timingsrc", this._onTimingCallback.bind(this));

        // Schedule
        this._sched = new Schedule(this._ds, to);
        let cb = this._onScheduleCallback.bind(this);
        this._sched_cb = this._sched.add_callback(cb)
    }


    /*
        Implement movement direction from single timing object
    */
    _movementDirection() {
        const now = this._to.clock.now();
        return motionutils.calculateDirection(this._to.vector, now);
    }


    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    /*
        Handling Dataset Update Callbacks
    */

    _onDatasetCallback(eventMap, relevanceInterval) {
        /*
            process dataset events which are relevant to the set
            of activeCues, or to the immediate future (schedule)

            enterCues - inactive -> active
            changeCues - active -> active, but changed
            exitCues - active -> inactive

            Two approaches
            - 1) EVENTS: filter list of events - compare to current active cues
            - 2) LOOKUP: regenerate new activeCues by looking up set of
                 active cues from dataset, compare it to current active cues


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

        if (relevanceInterval == undefined) {
            return;
        }

        const now = this._to.clock.now();
        const now_vector = motionutils.calculateVector(this._to.vector, now);

        // activeInterval
        const activeInterval = new Interval(now_vector.position);

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
            let direction = motionutils.calculateDirection(now_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
        }

        /*
            clear schedule

            This is only necessary if a cue interval is changed,
            and the change is relevant within the posInterval of
            of the schedule. RelevanceInterval to figure this out.
        */
        if (this._sched.posInterval) {
            if (!this._sched.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._sched.setVector(now_vector);
            }
        }
    }


    /***************************************************************
     TIMING OBJECT CALLBACK
    ***************************************************************/

    _onTimingCallback (eArg) {
        /*
            If update is the initial vector from the timing object,
            we set current time as the official time for the update.
            Else, the new vector is "live" and we use the timestamp
            when it was created as the official time for the update.
            This is represented by the new_vector.
        */
        let new_vector;

        if (eArg.live) {
            new_vector = this._to.vector;
        } else {
            // make a live vector from to vector
            new_vector = motionutils.calculateVector(this._to.vector, this._to.clock.now());
        }

        /*
            The nature of the vector change
        */
        let delta = new motionutils.MotionDelta(this._to.old_vector, new_vector);

        /*
            Reevaluate active state.
            This is required after any discontinuity of the position (jump),
            or if the motion stopped without jumping (pause or halt at range
            restriction)
        */
        const items = [];
        if (delta.posDelta == PosDelta.CHANGE || delta.moveDelta == MoveDelta.STOP) {
            // make position interval
            let low = new_vector.position;
            let high = new_vector.position;
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
            let direction = motionutils.calculateDirection(new_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
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

        const items = [];
        endpointItems.forEach(function (item) {
            let cue = item.cue;
            let has_cue = this._map.has(cue.key);
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
                    items.push({key:cue.key, new:undefined, old:cue});
                    this._map.delete(cue.key);
                } else {
                    // enter
                    items.push({key:cue.key, new:cue, old:undefined});
                    // exit
                    items.push({key:cue.key, new:undefined, old:cue});
                    // no need to both add and remove from activeCues
                }
            } else if (action_code == Active.ENTER) {
                if (!has_cue) {
                    // enter
                    items.push({key:cue.key, new:cue, old:undefined});
                    this._map.set(cue.key, cue);
                }
            } else if (action_code == Active.EXIT) {
                if (has_cue) {
                    // exit
                    items.push({key:cue.key, new:undefined, old:cue});
                    this._map.delete(cue.key);
                }
            }
        }, this);

        // Event items already sorted

        // event notification
        this._notifyEvents(items);
    };
}

export default PointModeSequencer;

