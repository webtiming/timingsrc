define(function(require) {

    const motionutils = require("../util/motionutils");
    const Interval = require("../util/interval");
    const leftof = Interval.endpoint.leftof;
    const isMoving = motionutils.isMoving;

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
            run schedule
        */
        run(now, run_flag) {

            // do something
            console.log("run", now, run_flag);

            // advance timeInterval and posInterval if needed
            this.advanceIntervals(now);

            // load events

            // process - due events

            // timeout - until next due event
            this.setTimeout(Math.min(now + 1, this.timeInterval.high));

        }


        /*
            update time interval if needed
        */
        advanceIntervals(now) {
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

                // fetch cue endpoints for posInterval
                let endpoints = this.axis.lookup_endpoints(this.posInterval);
                // load events
                this.load(now, endpoints);

            }
        }


        /*
            load events
        */

        load(now, endpoints) {

            console.log("load")
            // console.log(endpoints)

            /*
                make time ordered sequence of events

                - endpoint
                - cue
                - ts
                - direction
                - enter/exit

                given endpoints, timeInterval, vector

                - see calculateSolutionsInInterval()

            */

        }



    }







    return Schedule;
});

