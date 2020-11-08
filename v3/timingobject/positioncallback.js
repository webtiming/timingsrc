


import Timeout from '../util/timeout.js';
import * as motionutils from '../util/motionutils.js';

/*
    modify modulo operation
*/
function mod(n,m) {
    return ((n % m) + m) % m;   
}

/*
    divide n by m, 
    find q (integer) and r such that  
    n = q*m + r 
*/
function divmod(n, m) {
    let q = Math.floor(n/m);
    let r = mod(n, m);
    return [q,r];
}

/**
 *  point n == offset + q*stride + r
    - given stride, offset
    represent point as [q, r]
 */

function float2point(n, stride, offset) {
    return divmod(n-offset, stride);
}

function point2float(p, stride, offset) {
    let [q, r] = p;
    return offset + q*stride + r;
}


/*
    Given stride and offset, calculate nearest
    waypoints before and after given position.
    If position is exact match with waypoint,
    return [true, before, after]
*/
function stride_points(position, stride, offset) {
    let [q, r] = float2point(position, stride, offset);
    let after = [q+1, 0];
    let before = (r == 0) ? [q-1, 0]: [q, 0];
    before = point2float(before, stride, offset);
    after = point2float(after, stride, offset);
    return [(r==0), before, after];
};



/*
    
    Position callback

    - callback whenever the timing object position is x, 
      where (x - offset) % stride === 0

    - analogy to setInterval - except callbacks are in position space, not
      in time space

    options : {
        stride - default 1
        offset - default 0
    }

    NOTE: pausing on x and later resuming from x triggers callback in both cases 

*/

class PositionCallback {

    constructor (timingObject, callback, options={}) {
        this._to = timingObject;
        let {stride=1, offset=0} = options;
        this._offset = offset;
        this._stride = stride;
        this._callback = callback;
        this._timeout = new Timeout(this._to, this._handleTimeout.bind(this));

        // timing object timingsrc event
        this._to.on("timingsrc", this._onChange.bind(this));
    }

    _onChange(eArg, eInfo) {
        let pos = (eArg.live) ? eArg.position : this._to.pos;                
        this._renewTimeout(pos);
    }

    _calculateTimeout(before, after) {
        let vector = this._to.query();
        let [delta, pos] = motionutils.calculateDelta(vector, [before, after]);
        if (delta == undefined) {            
            return;
        } 
        // check range violation
        let [rLow, rHigh] = this._to.range;
        if (pos < rLow || rHigh < pos ) {
            return [undefined, undefined];
        }
        return [vector.timestamp + delta, pos];   
    }

    _renewTimeout(pos) {
        this._timeout.clear();
        // find candidate points - before and after
        let [match, before, after]  = stride_points(pos,
                                                    this._stride, 
                                                    this._offset);
        // callback
        if (match) {
            this._callback(pos);
        }
        // calculate timeout to next
        let res = this._calculateTimeout(before, after);
        if (res == undefined) {
            return;
        }
        // set timeout
        let ts = res[0];
        this._timeout.setTimeout(ts, res);
    }
    
    _handleTimeout(now, arg) {
        let pos = arg[1];
        this._renewTimeout(pos);
    }
}


export default PositionCallback;