define(function(require) {

    const motionutils = require("../util/motionutils");
    const Interval = require("../util/interval");


    class Schedule {

        constructor(to) {
            this.to = to;
            this.tid = undefined;
        }

        clearTimeout() {
            clearTimeout(this.tid);
            this.tid = undefined;
        }

        /*
            set timeout to point in time given in seconds
        */
        setTimeout(ts) {
            clearTimeout(this.tid);
            let self = this;
            let delay = Math.max(ts - this.to.clock.now(), 0) * 1000;
            this.tid = setTimeout(function(ts) {
                self.onTimeout(ts);
            }, delay, ts);
        }

        onTimeout(ts) {
            this.tid = undefined;
            // check if timeout was too early
            let now = this.to.clock.now()
            if (now < ts) {
                // schedule new timeout
                this.setTimeout(ts);
            } else {
                // handle timeout
                this.main(now, true);
            }
        }

        start() {
            if (this.tid == undefined) {
                this.main();
            }
        }

        stop() {
            this.clearTimeout();
        }


        main(now, is_timeout) {
            now = now || this.to.clock.now();

            // do something
            console.log("main", now);

            // timeout 5 sec
            let ts = now + 5;
            this.setTimeout(ts);
        }

    }

    return Schedule;
});

