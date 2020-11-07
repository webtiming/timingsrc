

/*
    
    POINT CALLBACK

    - callback for every point x, where (x - offset) % stride === 0

    - analogy to setInterval - except callbacks are in position space, not
      in time space.

      options : {offset:offset}
    Default is offset 0
*/

import Timeout from '../util/timeout.js';


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


class IntervalCallback {

    constructor (timingObject, stride, options={}) {
        this._to = timingObject;
        this._stride = stride;
        let {offset=0} = options;
        this._offset = offset;

        this._timeout = new Timeout(this, this._handleTimeout.bind(this));

        this._to.on("change", this._onChange.bind(this));
    }


    /*
        Calculate target points before and after a given position.
        If the given position is itself a target point, this will
        be reported as isTarget===true.
    */

    _calculatePoints(position) {
        var beforePoint = {}, afterPoint = {};
        var target;
        var point = this._getPoint(position);
        if (point.offset === 0) {
          target = true;
          beforePoint.n = point.n - 1;
          beforePoint.offset = point.offset;
          afterPoint.n = point.n + 1;
          afterPoint.offset = point.offset;
        } else {
          target = false;
          beforePoint.n = point.n;
          beforePoint.offset = 0;
          afterPoint.n = point.n + 1;
          afterPoint.offset = 0;
        }
        return {
          isTarget : target,
          before : this._getFloat(beforePoint),
          after : this._getFloat(afterPoint)
        }
      };


    _onChange() {
        let points = this._calculatePoints(this._to.pos);
        if (points.isTarget) {
            this._handleCallback(point);
        }
        // check moving or not


        this._renewTimeout();
    }


    _calculateTimeout() {
        let vector = this._timingsrc.query();
        let points = this._calculatePoints(vector.position);
        var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
        return vector.timestamp + delay;
    }


    _renewTimeout(ts) {
        this._timeout.clear();
        this._timeout.setTimeout(ts, ts);
    }
    
    _handleTimeout(now, ts) {
        this._handleCallback();
        let ts = this._calculateTimeout();
        this._renewTimeout(ts);
    }


    _handleCallback(point) {
        console.log("callback", point);
    }

}


export default IntervalCallback;