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

        constructor(clock, axis, options) {
            // clock
            this.clock = clock;
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
                console.log("time:", this.timeInterval.toString());
                console.log("pos:", this.posInterval.toString());
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

        load(endpoints) {
            console.log("load");
            let endpointEvents = motionutils.getEndpointEvents(this.timeInterval,
                                                               this.posInterval,
                                                               this.vector,
                                                               endpoints);

            /*
                filter event items
            */

            return endpointEvents;
        }

        /*
            process due cue events
        */
        process(now) {
            this.pop(now).forEach(function(item){
                let dir = (item.direction == 1) ? "forward" : "backward";
                console.log(`key: ${item.cue.key} value: ${item.endpoint[0]} dir: ${dir}`);
            });
        }



        /*
            run schedule
        */
        run(now, run_flag) {
            // process - due events
            this.process(now);
            // advance schedule and load events if needed
            let advanced = this.advance(now);
            if (advanced) {
                // fetch cue endpoints for posInterval
                let endpoints = this.axis.lookup_endpoints(this.posInterval);
                // load events and push on queue
                this.push(this.load(endpoints));
                // process - possibly new due events
                this.process(now);
            }
            // timeout - until next due event
            let ts = this.next() || this.timeInterval.high;
            this.setTimeout(Math.min(ts, this.timeInterval.high));
        }

    }

    return Schedule;
});

