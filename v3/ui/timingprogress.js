/*
    TODO

    - set refresh frequency to be sensitive
        to velocity - adapted to a fixed rate
        change in percent
        calculate percent velocity
        rate change in percent per second

    - treat progress change as a speculative
        change, (with a timeout)
        implementation - ideally as speculative converter
        easy solution - lock with a timeout

    - avoid competition from timeupdate and dragging

    - dragging should not be interrupted
    - make handle invisible when to out of range

*/

/**
 *  Make a progress variable for a timing object
 *  
 *  - create an evented variable for a timing object
 *  - adaptive rate sampling  - appropriate for velocity and rate?
 *  - change event with value changes
 *  - change events only at the time we hit integers?
 *      - sequencing intervals
 *      - or once per different integer - not important when?
 *  - need to test with online motions
 * 
 */


const DEFAULT_RANGE = [0,100];


class TimingProgress {

    constructor (to, options = {}) {
        this._range = options.range || to.range || DEFAULT_RANGE;
        this.to = to;
        this.callbacks = [];
        this.tid;
        this.to.on("change", function () {
            let v = this.to.query();
            let moving = (v.velocity != 0.0 || v.acceleration != 0.0);
            // check range violation
            let [low, high] = this._range;
            if (v.position < low || high < v.position) {
                moving = false;
            }
            // start or stop progress ticker
            if (moving && this.tid == undefined) {
                this.tid = setInterval(function(){
                    this.notifyCallbacks();
                }.bind(this), 1000);
            }
            if (!moving && this.tid != undefined) {
                clearTimeout(this.tid);
                this.tid = undefined;
            }
            this.notifyCallbacks();
        }.bind(this));
    }

    // callback for onchange
    addCallback (callback) {
        this.callbacks.push(callback)
    }

    notifyCallbacks () {
        for (let callback of this.callbacks) {
            callback();
        }
    }

    get percent () {
        let pos = this.to.pos;
        let [low, high] = this._range;
        // make sure pos is within range
        pos = Math.max(pos, low);
        pos = Math.min(pos, high);
        let offset = pos - low;
        let length = high - low;
        return 100.0*offset/length;
    }

    set percent (percent) {
        let [low, high] = this._range;
        // make sure percent is [0,100]
        percent = Math.max(0, percent);
        percent = Math.min(100, percent);
        let length = high - low;
        let offset = length*percent/100.0;
        let pos = low + offset;
        this.to.update({position: pos});
    }

    set range (range) {
        this._range = range;
    }
}

export default TimingProgress;