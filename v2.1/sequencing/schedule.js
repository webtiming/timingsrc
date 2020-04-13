define(function(require) {

    const motionutils = require("../util/motionutils");
    const Interval = require("../util/interval");
    const leftof = Interval.endpoint.leftof;
    const isMoving = motionutils.isMoving;

    function queueCmp(a,b) {return a.ts - b.ts;};

    class Schedule {

        // Default lookahead in seconds
        static LOOKAHEAD = 5

        // Run flags
        static RUN_VECTOR = "vector";
        static RUN_TIMEOUT = "timeout";

        constructor(clock, range, axis, options) {
            // clock
            this.clock = clock;
            // timing object range
            this.range = range;
            // current timeout
            this.tid;
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
            // options
            options = options || {};
            options.lookahead = options.lookahead || Schedule.LOOKAHEAD;
            this.options = options;
        }

        /*
            set timeout to point in time (seconds)
        */
        setTimeout(target_ts) {
            if (this.tid != undefined) {
                throw new Error("at most on timeout");
            }
            let now = this.clock.now();
            let delay = Math.max(target_ts - now, 0) * 1000;
            this.tid = setTimeout(this.onTimeout.bind(this), delay, target_ts);
        }

        /*
            handle timeout intended for point in time (seconds)
        */
        onTimeout(target_ts) {
            if (this.tid != undefined) {
                this.tid = undefined;
                // check if timeout was too early
                let now = this.clock.now()
                if (now < target_ts) {
                    // schedule new timeout
                    this.setTimeout(target_ts);
                } else {
                    // handle timeout
                    this.run(target_ts, Schedule.RUN_TIMEOUT);
                }
            }
        }

        /*
            update schedule with new motion vector
        */
        setVector(now, vector) {
            // clean up current motion
            let current_vector = this.vector;
            if (this.vector != undefined) {
                clearTimeout(this.tid);
                this.tid = undefined;
                this.timeInterval = undefined;
                this.posInterval = undefined;
            }
            // update vector
            this.vector = vector;
            // start scheduler if moving
            if (isMoving(this.vector)) {
                this.run(now, Schedule.RUN_VECTOR);
            }
        }


        /*
            advance timeInterval and posInterval if needed
        */
        advance(now) {
            let start, delta = this.options.lookahead;
            let advance = false;
            if (this.timeInterval == undefined) {
                start = now;
                advance = true;
            } else if (leftof(this.timeInterval.endpointHigh, now)) {
                start = this.timeInterval.high;
                advance = true
            }
            if (advance) {
                // advance intervals
                this.timeInterval = new Interval(start, start + delta, true, false);
                this.posInterval = motionutils.getPositionInterval(this.timeInterval, this.vector);
                // console.log("time:", this.timeInterval.toString());
                // console.log("pos:", this.posInterval.toString());
                // clear task queue
                this.queue = [];
            }
            return advance;
        }


        /*
            push eventItem onto queue
        */
        push(eventItems) {
            eventItems.forEach(function(item) {
                if (this.timeInterval.inside(item.ts)) {
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
            while (this.queue.length > 0 && this.queue[0].ts <= now) {
                res.push(this.queue.shift());
            }
            return res;
        };

        /*
            return timestamp of next eventItem
        */
        next() {
            return (this.queue.length > 0) ? this.queue[0].ts: undefined;
        }

        /*
            load events
        */

        load(endpoints, minimum_ts) {
            let endpointEvents = motionutils.getEndpointEvents(this.timeInterval,
                                                               this.posInterval,
                                                               this.vector,
                                                               endpoints);
            /*
                ISSUE 1

                Range violation might occur within timeInterval.
                All endpointEvents with .ts later or equal to range
                violation will be cancelled.
            */
            let range_ts = motionutils.getRangeIntersect(this.vector, this.range)[0];

            /*
                ISSUE 2

                If load is used in response to dynamically added cues, the
                invocation of load might occor at any time during the timeInterval,
                as opposed to immediately after the start of timeInterval.
                This again implies that some of the endPointEvents we have found
                from the entire timeInterval might already be historic at time of
                invocation.

                Cancel endpointEvents with .ts < minimum_ts.

                For regular loads this will have no effect since we
                do not specify a minimum_ts, but instead let it assume the
                default value of timeInterval.low.
            */
            if (minimum_ts == undefined) {
                minimum_ts = this.timeInterval.low;
            }

            /*
                ISSUE 3

                With acceleration the motion might change direction at
                some point, which might be the endpoint. In this
                case, motion touches the endpoint but does not actually
                cross over it.

                For simplicity we say that this should not change the
                active state of that cue. The cue is either not activated
                or not inactivated by this occurrence. We might therefor
                simply drop such endpointEvents.

                To detect this, note that velocity will be exactly 0
                evaluated at the endpoint, but acceleration will be nonzero.
            */

            return endpointEvents.filter(function(item) {
                // ISSUE 1
                if (item.ts >= range_ts) {
                    return false;
                }
                // ISSUE 2
                if (item.ts < minimum_ts) {
                    return false;
                }
                // ISSUE 3
                if (this.vector.acceleration != 0.0) {
                    let v = motionutils.calculateVector(this.vector, item.ts);
                    if (v.position == item.endpoint[0] && v.velocity == 0) {
                        return false;
                    }
                }
                return true;
            }, this);
        }

        /*
            process due cue events up until given timestamp
        */
        process(endpointEvents) {
            let _ts = this.clock.now();
            endpointEvents.forEach(function(item){
                let delay = _ts - item.ts;
                let toString = Interval.endpoint.toString;
                let str = [
                    `${toString(item.endpoint)}`,
                    `key: ${item.cue.key}`,
                    `delay: ${delay.toFixed(3)}`,
                    `dir: ${item.direction}`
                    ].join(" ");
                console.log(str);
            });
        }

        /*
            run schedule
        */
        run(now, run_flag) {
            // process - due events
            this.process(this.pop(now));
            // advance schedule and load events if needed
            if (this.advance(now)) {
                // fetch cue endpoints for posInterval
                let endpoints = this.axis.lookup_endpoints(this.posInterval);
                // load events and push on queue
                this.push(this.load(endpoints));
                // process - possibly new due events
                this.process(this.pop(now));
            }
            // timeout - until next due event
            let ts = this.next() || this.timeInterval.high;
            this.setTimeout(Math.min(ts, this.timeInterval.high));
        }

    }

    return Schedule;
});

