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


import endpoint from '../util/endpoint.js';
import Interval from '../util/interval.js';
import Timeout from '../util/timeout.js';
import * as motionutils from '../util/motionutils.js';

const pft = motionutils.posInterval_from_timeInterval;

function queueCmp(a,b) {
    return endpoint.cmp(a.tsEndpoint, b.tsEndpoint);
};

class Schedule {

    // Default lookahead in seconds
    static LOOKAHEAD = 5

    constructor(axis, to, options) {
        // timingobject
        this.to = to;
        // current timeout
        this.timeout = new Timeout(to, this.run.bind(this));
        // current vector
        this.vector;
        // current time interval
        this.timeInterval;
        // current position interval
        this.posInterval;
        // axis
        this.axis = axis;
        // task queue
        this.queue = [];
        // callbacks
        this.callbacks = [];
        // options
        options = options || {};
        options.lookahead = options.lookahead || Schedule.LOOKAHEAD;
        this.options = options;
    }


    /***************************************************************
        CALLBACKS
    ***************************************************************/

    add_callback (handler) {
        let handle = {
            handler: handler
        }
        this.callbacks.push(handle);
        return handle;
    };

    del_callback (handle) {
        let index = this.callbacks.indexof(handle);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    };

    _notify_callbacks (...args) {
        this.callbacks.forEach(function(handle) {
            handle.handler(...args);
        });
    };

    /***************************************************************
        MOTION CHANGE
    ***************************************************************/

    /*
        update schedule with new motion vector
    */
    setVector(vector) {
        let now = vector.timestamp;
        // clean up current motion
        let current_vector = this.vector;
        if (this.vector != undefined) {
            this.timeout.clear();
            this.timeInterval = undefined;
            this.posInterval = undefined;
            this.queue = [];
        }
        // update vector
        this.vector = vector;
        // start scheduler if moving
        if (motionutils.isMoving(this.vector)) {
            this.run(now);
        }
    }


    /***************************************************************
        TASK QUEUE
    ***************************************************************/

    /*
        push eventItem onto queue
    */
    push(eventItems) {
        eventItems.forEach(function(item) {
            if (this.timeInterval.covers_endpoint(item.tsEndpoint)) {
                this.queue.push(item);
            }
        }, this);
        // maintain ordering
        this.queue.sort(queueCmp);
    };

    /*
        pop due eventItems from queue
    */
    pop(now) {
        let eventItem, res = [];
        let len = this.queue.length;
        while (this.queue.length > 0 && this.queue[0].tsEndpoint[0] <= now) {
            res.push(this.queue.shift());
        }
        return res;
    };

    /*
        return timestamp of next eventItem
    */
    next() {
        return (this.queue.length > 0) ? this.queue[0].tsEndpoint[0]: undefined;
    }


    /***************************************************************
        ADVANCE TIMEINTERVAL/POSINTERVAL
    ***************************************************************/


    /*
        advance timeInterval and posInterval if needed
    */
    advance(now) {
        let start, delta = this.options.lookahead;
        let advance = false;
        if (this.timeInterval == undefined) {
            start = now;
            advance = true;
        } else if (endpoint.leftof(this.timeInterval.endpointHigh, now)) {
            start = this.timeInterval.high;
            advance = true
        }
        if (advance) {
            // advance intervals
            this.timeInterval = new Interval(start, start + delta, true, false);
            this.posInterval = pft(this.timeInterval, this.vector);
            // clear task queue
            this.queue = [];
        }
        return advance;
    }


    /***************************************************************
        LOAD
    ***************************************************************/

    /*
        load events
    */

    load(endpoints, minimum_tsEndpoint) {
        let endpointEvents = motionutils.endpointEvents(this.timeInterval,
                                                        this.posInterval,
                                                        this.vector,
                                                        endpoints);

        /*
            ISSUE 1

            Range violation might occur within timeInterval.
            All endpointEvents with .tsEndpoint later or equal to range
            violation will be cancelled.
        */
        let range_ts = motionutils.rangeIntersect(this.vector, this.to.range)[0];

        /*
            ISSUE 2

            If load is used in response to dynamically added cues, the
            invocation of load might occor at any time during the timeInterval,
            as opposed to immediately after the start of timeInterval.
            This again implies that some of the endPointEvents we have found
            from the entire timeInterval might already be historic at time of
            invocation.

            Cancel endpointEvents with .tsEndpoint < minimum_ts.

            For regular loads this will have no effect since we
            do not specify a minimum_ts, but instead let it assume the
            default value of timeInterval.low.
        */
        if (minimum_tsEndpoint == undefined) {
            minimum_tsEndpoint = this.timeInterval.endpointLow;
        }

        /*
            ISSUE 3

            With acceleration the motion might change direction at
            some point, which might also be a cue endpoint. In this
            case, motion touches the cue endpoint but does not actually
            cross over it.

            For simplicity we say that this should not change the
            active state of that cue. The cue is either not activated
            or not inactivated by this occurrence. We might therefor
            simply drop such endpointEvents.

            To detect this, note that velocity will be exactly 0
            evaluated at the cue endpoint, but acceleration will be nonzero.

            Importantly, there is one exception. Dropping such events
            should only happen when 0 velocity is reached during motion,
            not at the start of a motion. For instance, in the case of
            starting with acceleration but no velocity, from a cue
            endpoint, this event should not be dropped.
            This is avoided by requiring that the tsEndpoint is not
            equal to timeInterval.endpointLow

        */

        return endpointEvents.filter(function(item) {
            // ISSUE 1
            if (range_ts <= item.tsEndpoint[0]) {
                // console.log("issue1");
                return false;
            }

            // ISSUE 2
            if (endpoint.leftof(item.tsEndpoint, minimum_tsEndpoint)) {
                // console.log("issue2");
                return false;
            }
            // ISSUE 3
            // checks every event. alternative approach would be
            // to calculate the ts of this event once, and compare
            // the result to the ts of all event
            if (this.vector.acceleration != 0.0) {
                let ts = item.tsEndpoint[0];
                if (ts > this.timeInterval.endpointLow[0]) {
                    let v = motionutils.calculateVector(this.vector, ts);
                    if (v.position == item.endpoint[0] && v.velocity == 0) {
                        return false;
                    }
                }
            }
            return true;
        }, this);
    }


    /***************************************************************
        RUN
    ***************************************************************/

    /*
        run schedule
    */
    run(now) {
        // process - due events
        let dueEvents = this.pop(now);
        // advance schedule and load events if needed
        if (this.advance(now)) {
            // fetch cue endpoints for posInterval
            let endpointItems = this.axis.lookup_endpoints(this.posInterval);
            // load events and push on queue
            this.push(this.load(endpointItems));
            // process - possibly new due events
            dueEvents.push(...this.pop(now));
        }
        if (dueEvents.length > 0) {
            this._notify_callbacks(now, dueEvents, this);
        }
        // timeout - until next due event
        let ts = this.next() || this.timeInterval.high;
        this.timeout.setTimeout(Math.min(ts, this.timeInterval.high));
    }
}

export default Schedule;

