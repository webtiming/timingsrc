import * as motionutils from '../util/motionutils.js';


/*
    Provide callback 

    - the first time the timing object reaches or passes a given offset.
    - if to is initially paused exactly at target offset, then nothing happens, until
    next onchange event. 
    Analogy to setTimeout - except in position space.
*/

/*
    determine if motion described by fresh vector is on
    the left or right side of offset.
*/

function get_side(vector, offset) {
    let {position, velocity, acceleration} = vector;
    if (position < offset) return "left";
    if (offset < position) return "right";
    // position == offset
    if (velocity < 0) return "left";
    if (0 < velocity) return "right";
    // velocity == 0
    if (acceleration < 0) return "left";
    if (0 < acceleration) return "right";
    return;
}

export default class OffsetCallback {

    constructor (to, offset, callback) {
        this._to = to;
        this._offset = offset;
        this._callback = callback;
        this._tid;
        // timing object timingsrc event
        this._sub = this._to.on("timingsrc", this._onChange.bind(this));
        this._side; // left or right side of offset
        this._terminited = false;
    }

    _onChange(eArg, eInfo) {
        this._clearTimeout();
        let vector = this._to.query();
        // try to initialise side if not already done
        if (this._side == undefined) {
            this._side = get_side(vector, this._offset);
            if (this._side == undefined) {
                return;
            }
        } else {
            // check if we are still on same side
            let side = get_side(vector, this._offset);
            if (side != this._side) {
                // terminate - by skip to other side
                this._terminate(vector.position);
            }     
        }
        // register timeout for reacing offset if not paused
        let delta = motionutils.calculateMinPositiveRealSolution(vector, this._offset);
        if (delta != Infinity && delta != undefined) {
            this._tid = setTimeout(this._handleTimeout.bind(this), delta*1000.0);
        }
    }

    _handleTimeout() {
        if (this._tid != undefined) {
            // terminate - by timeout during playback
            this._terminate(this._to.pos);
        }
    }

    _clearTimeout() {
        if (this._tid != undefined) {
            clearTimeout(this._tid);
            this._tid = undefined;
        }
    }

    _terminate(pos) {
        if (!this._terminated) {
            this._clearTimeout();
            this._terminated = true;
            this._to.off(this._sub);
            if (pos) {
                this._callback(pos);
            }
        }
    }

    cancel() {
        this._terminate();
    }
}