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

import endpoint from './endpoint.js';
import Interval from './interval.js';

// Closure
(function() {
  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
})();


// sort func
const cmp = function (a, b) {return a - b;};

/*******************************************************************
 BASIC
*******************************************************************/

export function equalVectors(vector_a, vector_b) {
    let pos = vector_a.position == vector_b.position;
    let vel = vector_a.velocity == vector_b.velocity;
    let acc = vector_a.acceleration == vector_b.acceleration;
    let ts = vector_a.timestamp == vector_b.timestamp;
    return pos && vel && acc && ts;
};


export function copyVector(vector) {
    return {
        position: vector.position,
        velocity: vector.velocity,
        acceleration: vector.acceleration,
        timestamp: vector.timestamp
    }
};

/*
    Calculate vector snapshot for motion defined by vector at time ts

    vector: [p0,v0,a0,t0]
    t0 and ts are absolute time from same clock, in seconds
*/

export function calculateVector(vector, ts) {
	if (ts === undefined) {
	    throw new Error ("no ts provided for calculateVector");
	}
	const deltaSec = ts - vector.timestamp;
	return {
		position : vector.position + vector.velocity*deltaSec + 0.5*vector.acceleration*deltaSec*deltaSec,
		velocity : vector.velocity + vector.acceleration*deltaSec,
		acceleration : vector.acceleration,
		timestamp : ts
	};
};


/*
    Calculate direction of motion at time ts
    1 : forwards, -1 : backwards: 0, no movement
*/
export function calculateDirection(vector, ts) {
    /*
      Given initial vector calculate direction of motion at time t
      (Result is valid only if (t > vector[T]))
      Return Forwards:1, Backwards -1 or No-direction (i.e. no-motion) 0.
      If t is undefined - t is assumed to be now.
    */
    let freshVector;
    if (ts == undefined) {
        freshVector = vector;
    } else {
        freshVector = calculateVector(vector, ts);
    }
    // check velocity
    let direction = cmp(freshVector.velocity, 0.0);
    if (direction === 0) {
        // check acceleration
        direction = cmp(vector.acceleration, 0.0);
    }
    return direction;
};


/*
    isMoving

    returns true if motion is moving else false
*/
export function isMoving(vector) {
    return (vector.velocity !== 0.0 || vector.acceleration !== 0.0);
};


/*******************************************************************
 RANGE
*******************************************************************/

//	RANGE STATE is used for managing/detecting range violations.
export const RangeState = Object.freeze({
    INIT : "init",
    INSIDE: "inside",
    OUTSIDE_LOW: "outsidelow",
    OUTSIDE_HIGH: "outsidehigh"
});

/*
	A snapshot vector is checked with respect to range,
	calclulates correct RangeState (i.e. INSIDE|OUTSIDE)
*/
export function correctRangeState(vector, range) {
    const {position: p, velocity: v, acceleration: a} = vector;
	if (p > range[1]) return RangeState.OUTSIDE_HIGH;
	if (p < range[0]) return RangeState.OUTSIDE_LOW;
	// corner cases
	if (p === range[1]) {
		if (v > 0.0) return RangeState.OUTSIDE_HIGH;
		if (v === 0.0 && a > 0.0) return RangeState.OUTSIDE_HIGH;
	} else if (p === range[0]) {
	    if (v < 0.0) return RangeState.OUTSIDE_LOW;
	    if (v == 0.0 && a < 0.0) return RangeState.OUTSIDE_HIGH;
	}
	return RangeState.INSIDE;
};


/* 
    detect range violation
    vector assumed to be valid now
*/
export function detectRangeViolation(now_vector, range) {
    return (correctRangeState(now_vector, range) != RangeState.INSIDE);
}


/*
	A snapshot vector is checked with respect to range.
	Returns vector corrected for range violations, or input vector unchanged.

    vector assumed to be valid now
*/
export function checkRange(vector, range) {
	const state = correctRangeState(vector, range);
	if (state !== RangeState.INSIDE) {
		// protect from range violation
		vector.velocity = 0.0;
		vector.acceleration = 0.0;
		if (state === RangeState.OUTSIDE_HIGH) {
			vector.position = range[1];
		} else vector.position = range[0];
	}
	return vector;
};


/*
    Return tsEndpoint of (first) range intersect if any.
*/
export function rangeIntersect(vector, range) {
    let t0 = vector.timestamp;
    // Time delta to hit rangeLeft
    let deltaLeft = calculateMinPositiveRealSolution(vector, range[0]);
    // Time delta to hit rangeRight
    let deltaRight = calculateMinPositiveRealSolution(vector, range[1]);
    // Pick the appropriate solution
    if (deltaLeft !== undefined && deltaRight !== undefined) {
        if (deltaLeft < deltaRight) {
            return [t0 + deltaLeft, range[0]];
        }
        else
            return [t0 + deltaRight, range[1]];
    }
    else if (deltaLeft !== undefined)
        return [t0 + deltaLeft, range[0]];
    else if (deltaRight !== undefined)
        return [t0 + deltaRight, range[1]];
    else return [undefined, undefined];
}


/*******************************************************************
 EQUATIONS
*******************************************************************/

/*
    hasRealSolution

    Given motion determined from p,v,a,t.
    Determine if equation p(t) = p + vt + 0.5at^2 = x
    has solutions for some real number t.
*/

function hasRealSolution (p,v,a,x) {
	if ((Math.pow(v,2) - 2*a*(p-x)) >= 0.0) return true;
	else return false;
};


/*
    calculateRealSolution

    Given motion determined from p,v,a,t.
    Determine if equation p(t) = p + vt + 0.5at^2 = x
    has solutions for some real number t.
    Calculate and return real solutions, in ascending order.
*/

function calculateRealSolutions(p,v,a,x) {
	// Constant Position
	if (a === 0.0 && v === 0.0) {
	    if (p != x) return [];
	    else return [0.0];
	}
	// Constant non-zero Velocity
	if (a === 0.0) return [(x-p)/v];
	// Constant Acceleration
	if (hasRealSolution(p,v,a,x) === false) return [];
	// Exactly one solution
	const discriminant = v*v - 2*a*(p-x);
	if (discriminant === 0.0) {
	    return [-v/a];
	}
	const sqrt = Math.sqrt(Math.pow(v,2) - 2*a*(p-x));
	const d1 = (-v + sqrt)/a;
	const d2 = (-v - sqrt)/a;
	return [Math.min(d1,d2),Math.max(d1,d2)];
};


/*
    calculatePositiveRealSolutions

    Given motion determined from p,v,a,t.
    Determine if equation p(t) = p + vt + 0.5at^2 = x
    has solutions for some real number t.
    Calculate and return positive real solutions, in ascending order.
*/

function calculatePositiveRealSolutions(p,v,a,x) {
	const res = calculateRealSolutions(p,v,a,x);
	if (res.length === 0) return [];
	else if (res.length == 1) {
	    if (res[0] > 0.0) {
			return [res[0]];
	    }
	    else return [];
	}
	else if (res.length == 2) {
	    if (res[1] < 0.0) return [];
	    if (res[0] > 0.0) return [res[0], res[1]];
	    if (res[1] > 0.0) return [res[1]];
	    return [];
	}
	else return [];
};


/*
    calculateMinPositiveRealSolution

    Given motion determined from p,v,a,t.
    Determine if equation p(t) = p + vt + 0.5at^2 = x
    has solutions for some real number t.
    Calculate and return the least positive real solution.
*/
export function calculateMinPositiveRealSolution(vector, x) {
    const {position: p, velocity: v, acceleration: a} = vector;
	const res = calculatePositiveRealSolutions(p,v,a,x);
	if (res.length === 0) {
        return;
    }
	else return res[0];
};


/*
    calculateDelta


    Given motion determined from p0,v0,a0 (initial conditions or snapshot),
    Supply two posisions, posBefore < p0 < posAfter.
    Calculate which of these positions will be reached first,
    if any, by the movement described by the vector.
    In addition, calculate when this position will be reached.
    Result will be expressed as time delta relative to t0, if solution exists,
    and a flag to indicate Before (false) or After (true)
    Note: t1 == (delta + t0) is only guaranteed to be in the
    future as long as the function
    is evaluated at time t0 or immediately after.
*/
export function calculateDelta(vector, range) {
	// Time delta to hit posBefore
	let deltaBeforeSec = calculateMinPositiveRealSolution(vector, range[0]);
	// Time delta to hit posAfter
	let deltaAfterSec = calculateMinPositiveRealSolution(vector, range[1]);
    // Infinity is no good solution
    if (deltaBeforeSec == Infinity) {
        deltaBeforeSec = undefined;
    }
    if (deltaAfterSec == Infinity) {
        deltaAfterSec = undefined;
    }
    // Pick the appropriate solution
	if (deltaBeforeSec !== undefined && deltaAfterSec !== undefined) {
	    if (deltaBeforeSec < deltaAfterSec)
			return [deltaBeforeSec, range[0]];
	    else
			return [deltaAfterSec, range[1]];
	}
	else if (deltaBeforeSec !== undefined)
	    return [deltaBeforeSec, range[0]];
	else if (deltaAfterSec !== undefined)
	    return [deltaAfterSec, range[1]];
	else return [undefined, undefined];
};


/*******************************************************************
 TIME_INTERVAL POS_INTERVAL
*******************************************************************/

/*
    posInterval_from_timeInterval

    given
    - a time interval
    - a vector describing motion within the time interval

    figure out an interval (of positions)
    which covers all possible positions during the time interval

    the interval may be a little bigger, so we will round down and up
    to the nearest integer. Also, the interval will always be closed.

*/

export function posInterval_from_timeInterval (timeInterval, vector) {

    /*
        no motion or singular time interval
    */
    if (!isMoving(vector) || timeInterval.singular) {
        return new Interval(vector.position);
    }

    let t0 = timeInterval.low;
    let t1 = timeInterval.high;
    let t0_closed = timeInterval.lowInclude;
    let t1_closed = timeInterval.highInclude;

    let vector0 = calculateVector(vector, t0);
    let p0 = vector0.position;
    let v0 = vector0.velocity;
    let a0 = vector0.acceleration;
    let p1 = calculateVector(vector, t1).position;

    let low, high;

    if (a0 != 0) {

        /*
            motion, with acceleration

            position over time is a parabola
            figure out if extrema happens to occor within
            timeInterval. If it does, extreme point is endpoint in
            position Interval. p0 or p1 will be the other
            interval endpoint.

            I extreme point is not occuring within timeInterval,
            interval endpoint will be p0 and p1.

            general parabola
            y = Ax*x + Bx + C
            extrema (x,y) : x = - B/2A, y = -B*B/4A + C

            where t0 <= t <= t1
            p(t) = 0.5*a0*(t-t0)*(t-t0) + v0*(t-t0) + p0,

            A = a0/2, B = v0, C = p0

            extrema (t_extrema, p_extrema):
            t_extrem = -v0/a0 + t0
            p_extrem = -v0*v0/(2*a0) + p0

        */
        let t_extrem = -v0/a0 + t0;
        if (timeInterval.covers_endpoint(t_extrem)) {
            let p_extrem = -v0*v0/(2.0*a0) + p0;
            // maximal point reached in time interval
            if (a0 > 0.0) {
                // p_extrem is minimum
                // figure out if p0 or p1 is maximum
                if (p0 < p1) {
                    low = p_extrem;
                    high = p1;
                } else {
                    low = p_extrem;
                    high = p0;
                }
            } else {
                // p_extrem is maximum
                // figure out if p0 or p1 is minimum
                if (p0 < p1) {
                    low = p0;
                    high = p_extrem;
                } else {
                    low = p1;
                    high = p_extrem;
                }
            }
        } else {
            // see below
        }
    }

    /*
        Motion, with or without acceleration,
        yet with no extreme points within interval

        positition monotonic increasing (forward velocity)
        or decreasing (backward velocity)

        extrem positions are associated with p0 and p1.
    */
    if (p0 < p1) {
        // forward
        low = p0;
        high = p1;
    } else {
        // backward
        low = p1;
        high = p0;
    }

    /*
        round down and up - to the nearest decimal

        Math.floor10(4.999999, -1) -> 4.9
        Math.floor10(5, -1)        -> 5
        Math.floor10(5.000001, -1) -> 5

        Math.ceil10(4.999999, -1) -> 5
        Math.ceil10(5, -1)        -> 5
        Math.ceil10(5.000001, -1)   -> 5.1
    */
    low = Math.floor10(low, -1);
    high = Math.ceil10(high, -1);
    return new Interval(low, high, true, true);
}


/*
    time endpoint and pos endpoints.

    time is always increasing even when position
    is decreasing. When making a timeEndpoint from
    a posEndpoin the right/left aspect of the endpoint
    needs to be flipped.

    ts - the value of the timeEndpoint, ie. the time when
         motion will pass over posEndpoing
    direction - direction of motion at time ts
*/

export function timeEndpoint_from_posEndpoint(posEndpoint, ts, direction) {
    let [pos, right, close, singular] = posEndpoint;
    // flip right/left if direction is backwards
    if (direction < 0 && right !== undefined) {
        right = !right
    }
    return [ts, right, close, singular];
}


/*******************************************************************
 ENDPOINT EVENTS
*******************************************************************/

/*
    endpointEvents

    Given a motion and a set of endpoints, calculate when
    the motion will pass by each endpoint.

    Given
    - timeInterval
    - posInterval
    - vector describing motion within timeInterval
    - list of endpointItems

    endpointItem
    {
        endpoint: [value, high, closed, singular],
        cue: {
            key: "mykey",
            interval: new Interval(...),
            data: {...}
        }
    }

    Creates eventItem by adding to endpointItem
    - tsEndpoint : timestamp endpoint (future) when motion will pass the endpoint
    - direction: true if motion passes endpoint while moving forward

    EventItems will be sorted by ts

    Issue:

        timeInterval [t0, t1)
        posinterval [p0, p1)

        Consider event at time t1 concerning endpoint p1)
        This will be outside the timeInterval, but inside
        the posInterval.

        Conversely, it will be inside the next timeInterval,
        but not the next posInterval.

        This is a problem - like falling between chairs.

        Resolve this by representing timestamps as endpoints too

*/

export function endpointEvents (timeInterval, posInterval, vector, endpointItems) {

    /*
        no motion or singular time interval
    */
    if (timeInterval.singular) {
        throw new Error("endpointEvents: timeInterval is singular");
    }
    if (!isMoving(vector)) {
        throw new Error("endpointEvents: no motion")
    }

    let p0 = vector.position;
    let v0 = vector.velocity;
    let a0 = vector.acceleration;
    let t0 = vector.timestamp;

    let value, ts, deltas;
    let tsEndpoint, direction;
    let eventItems = [];

    endpointItems.forEach(function(item) {
        // check that endpoint is inside given posInterval
        if (!posInterval.covers_endpoint(item.endpoint)) {
            console.log("fuck 1");
            return;
        }
        value = item.endpoint[0];
        // check if equation has any solutions
        if (!hasRealSolution(p0, v0, a0, value)) {
            console.log("fuck 2");
            return;
        }
        // find time when motion will pass value
        // time delta is relative to t0
        // could be both in history or future
        deltas = calculateRealSolutions(p0,v0,a0, value);
        // include any timestamp within the timeinterval
        deltas.forEach(function(delta) {
            ts = t0 + delta;
            direction = calculateDirection(vector, ts);
            tsEndpoint = timeEndpoint_from_posEndpoint(item.endpoint, ts, direction);
            if (timeInterval.covers_endpoint(tsEndpoint)){
                item.tsEndpoint = tsEndpoint;
                item.direction = direction;
                eventItems.push(item);
            }
        });
    });

    // sort eventItems according to tsEndpoints
    const cmp = function (a,b) {
        return endpoint.cmp(a.tsEndpoint, b.tsEndpoint);
    };
    eventItems.sort(cmp);

    /*
    if (eventItems.length != endpointItems.length) {
        console.log("BADNESS");
        console.log("timeInterval", timeInterval);
        console.log("posInterval", posInterval);
        console.log("vector", vector);
        console.log("endpointItems", JSON.stringify(endpointItems));
    }
    */

    return eventItems;
};


/*******************************************************************
 MOTION TRANSITION
*******************************************************************/

/*
    Figure the nature of the transition from one motion to another,
    i.e. when old_vector is replaced by new_vector.

    The time when this transition occured is given bey
    new_vector.timestamp, by definition.

    - was moving (boolean) - true if moving before change
    - is moving (boolean) - true if moving after change
    - pos changed (boolean) - true if position was changed instantaneously
    - move changed (boolean) - true if movement was changed instantaneously

    report changed in two independent aspects
    - change in position (i.e. discontinuity in position)
    - change in movement (i.e. starting, stopping, changed)

    These are represented as
    - PosDelta
    - MoveDelta

    return [PosDelta, MoveDelta]
*/


/* Static properties */

const PosDelta = Object.freeze({
    NOOP: 0,                // no change in position
    CHANGE: 1               // change in position
});


const MoveDelta = Object.freeze({
    NOOP: 0,                // no change in movement, not moving
    NOOP_MOVING: 1,         // no change in movement, moving
    START: 2,               // not moving -> moving
    CHANGE: 3,              // keep moving, movement changed
    STOP: 4                 // moving -> not moving
});


export class MotionDelta {

    constructor (old_vector, new_vector) {
        let ts = new_vector.timestamp;
        let is_moving = isMoving(new_vector)
        let init = (old_vector == undefined || old_vector.position == undefined);

        if (init) {
            /*
                Possible to introduce
                PosDelta.INIT here instead of PosDelta.CHANGE
                Not sure if this is needed.
            */
            if (is_moving) {
                this._mc = [PosDelta.CHANGE, MoveDelta.START];
            } else {
                this._mc = [PosDelta.CHANGE, MoveDelta.NOOP];
            }
        } else {
            let was_moving = isMoving(old_vector);
            let end_vector = calculateVector(old_vector, ts);
            let start_vector = calculateVector(new_vector, ts);

            // position change
            let pos_changed = (end_vector.position != start_vector.position);
            let pct = (pos_changed) ? PosDelta.CHANGE : PosDelta.NOOP;

            // movement change
            let mct;
            if (was_moving && is_moving) {
                let vel_changed = (end_vector.velocity != start_vector.velocity);
                let acc_changed = (end_vector.acceleration != start_vector.acceleration);
                let move_changed = (vel_changed || acc_changed);
                if (move_changed) {
                    mct = MoveDelta.CHANGE;
                } else {
                    mct = MoveDelta.NOOP_MOVING;
                }
            } else if (!was_moving && is_moving) {
                mct = MoveDelta.START;
            } else if (was_moving && !is_moving) {
                mct = MoveDelta.STOP;
            } else if (!was_moving && !is_moving) {
                mct = MoveDelta.NOOP;
            }
            this._mc = [pct, mct];
        }
    }

    get posDelta () {
        return this._mc[0];
    }

    get moveDelta () {
        return this._mc[1]
    }

    toString() {
        const PosDelta = MotionDelta.PosDelta;
        const MoveDelta = MotionDelta.MoveDelta;
        let str = (this.posDelta == PosDelta.CHANGE) ? "jump, " : "";
        if (this.moveDelta == MoveDelta.START) {
            str += "movement started";
        } else if (this.moveDelta == MoveDelta.CHANGE) {
            str += "movement changed";
        } else if (this.moveDelta == MoveDelta.STOP) {
            str += "movement stopped";
        } else if (this.moveDelta == MoveDelta.NOOP_MOVING) {
            str += "movement noop - moving";
        } else if (this.moveDelta == MoveDelta.NOOP) {
            str += "movement noop - not moving";
        }
        return str;
    }
}


MotionDelta.PosDelta = PosDelta;
MotionDelta.MoveDelta = MoveDelta;

