define(function(require) {

    const motionutils = require("../util/motionutils");
    const Interval = require("../util/interval");


    class Schedule {

        // Default lookahead in seconds
        static LOOKAHEAD = 5

        // Run flags
        static RUN_START = 1;
        static RUN_TIMEOUT = 2;
        static RUN_STOP = 3;


        constructor(to, options) {
            this.to = to;
            this.tid;
            this.running = false;

            // time interval - back to back
            this.timeInterval;

            // options
            options = options || {};
            options.lookahead = options.lookahead || Schedule.LOOKAHEAD;
            this.options = options;
        }

        /*
            set timeout to point in time (seconds)
        */
        setTimeout(ts) {
            if (this.tid != undefined) {
                throw new Error("at most on timeout");
            }
            let delay = Math.max(ts - this.to.clock.now(), 0) * 1000;
            this.tid = setTimeout(this.onTimeout.bind(this), delay, ts);
        }

        /*
            handle timeout intended for point in time (seconds)
        */
        onTimeout(ts) {
            if (this.tid != undefined) {
                this.tid = undefined;
                // check if timeout was too early
                let now = this.to.clock.now()
                if (now < ts) {
                    // schedule new timeout
                    this.setTimeout(ts);
                } else {
                    // handle timeout
                    this.run(now, Schedule.RUN_TIMEOUT);
                }
            }
        }

        /*
            start schedule
        */
        start() {
            if (!this.running) {
                this.running = true;
                this.run(this.to.clock.now(), Schedule.RUN_START);
            }
        }

        /*
            stop schedule
        */
        stop() {
            if (this.running) {
                this.running = false;
                clearTimeout(this.tid);
                this.tid = undefined;
                this.run(this.to.clock.now(), Schedule.RUN_STOP);
            }
        }

        /*
            run schedule
        */
        run(now, run_flag) {

            // update time interval
            let delta = this.options.lookahead;
            if (run_flag == Schedule.RUN_START) {
                this.timeInterval = new Interval(now, now + delta, true, false);
            } else if (run_flag == Schedule.RUN_TIMEOUT) {
                // update timeInterval is expired
                const leftof = Interval.endpoint.leftof;
                if (leftof(this.timeInterval.endpointHigh, now)) {
                    let start = this.timeInterval.high;
                    this.timeInterval = new Interval(start, start + delta, true, false);
                }
            } else if (run_flag == Schedule.RUN_STOP) {
                this.timeInterval = undefined;
            }

            // do something
            console.log("run", now, run_flag);
            if (this.timeInterval) {
                console.log(this.timeInterval.toString());
            }

            if (run_flag == Schedule.RUN_STOP) {
                // clear events
            } else {
                // load events
                // process due events
                // timeout until next event is due
                this.setTimeout(Math.min(now + 1, this.timeInterval.high));
            }
        }
    }

    return Schedule;
});

