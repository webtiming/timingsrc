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

import TimingSampler from "../timingobject/timingsampler.js";




/**
 *  This is effectively a type of timing object converter that
 *  - transforms to a 0,100 value range (given a range)
 *  - and audomates sampling -> change event 

 */

 class Progress {


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

    static position2percent(position, range) {
        let [low, high] = range;
        // make sure position is within position_range
        position = Math.max(position, low);
        position = Math.min(position, high);
        let offset = position - low;
        let length = high - low;
        return 100.0*offset/length;
    };

    static percent2position(percent, range) {
        let [low, high] = range;
        // make sure percent is [0,100]
        percent = Math.max(0, percent);
        percent = Math.min(100, percent);
        let length = high - low;
        let offset = length*percent/100.0;
        return low + offset;
    };

    constructor (timingObject, progress_elem, options={}) {
        this._to = timingObject;
        this._progress_elem = progress_elem;
        let {range} = options;
        this._range = range || this._to.range;
        let [low, high] = this._range;
        if (low == -Infinity || high == Infinity) {
            throw new Error("illegal range", this._range);
        }

        this._lock_value = undefined;
        this._lock_tid = undefined;

        // subscribe to input event from progress elem
        this._progress_elem.addEventListener("input", function() {
            // lock updates on progress elem until lock value is removed
            this._lock_value = this._progress_elem.value;
        }.bind(this));

        // subscribe to change event from progress elem
        this._progress_elem.addEventListener("change", function () {
            if (this._lock_value != undefined) {
                /*
                progress change with preceeding input event
                this is a drag end
                use cached value from input event to update the timing object
                */
                let percent = parseInt(this._lock_value);
            } else {
                /*
                progress change without preceeding input event
                this is a click
                use element value to update the timing object
                */ 
               let percent = parseInt(this._progress_elem.value);   
            }
            // update the timing object
            let position = Progress.percent2position(percent, this._range);
            this._to.update({position: position});
            // unlock on update timeout
            this._lock_value = undefined;
            this._lock_tid = setTimeout(function(){
                // unlock after timeout
                this._lock_tid = undefined;
                console.log("timeout on update ack - should not happen");
            }.bind(this), 1000);
        });
        
        // sampler
        this._sampler = new TimingSampler(this._to, options); 
        this._sampler.on("change", this._refresh.bind(this));
    }

    _refresh(position) {
        // unlock if unlock is pending
        if (this._lock_tid) {
            clearTimeout(this._lock_tid);
            this._lock_tid = undefined;
        }
        // update progress elem if unlocked
        if (this._lock_value != undefined) {
            let percent = Progress.position2percent(position, this._range);
            this._progress_elem.value = `${percent}`;
        }
    }
}

export default Progress;