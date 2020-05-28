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


define(function() {


    /*
        Wraps the built in setTimeout to provide a
        Timeout that does not fire too early.

        Importantly, the Timeout object manages at most
        one timeout.

        - Given clock.now() returns a value in seconds.
        - The timeout is set with and absolute timestamp,
          not a delay.
    */

    class Timeout {

        constructor (clock, callback) {
            this.tid = undefined;
            this.clock = clock;
            this.callback = callback;
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
                    this.callback(now);
                }
            }
        }

        /*
            cancel and clear timeout if active
        */
        clear() {
            if (this.tid != undefined) {
                clearTimeout(this.tid);
                this.tid = undefined;
            }
        }
    }

    return Timeout;
});
