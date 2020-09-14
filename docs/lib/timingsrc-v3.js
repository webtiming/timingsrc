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


/* Set Comparison */
function eqSet(as, bs) {
    return as.size === bs.size && all(isIn(bs), as);
}

function all(pred, as) {
    for (var a of as) if (!pred(a)) return false;
    return true;
}

function isIn(as) {
    return function (a) {
        return as.has(a);
    };
}

/*
    get the difference of two Maps
    key in a but not in b
*/
const map_difference = function (a, b) {
    if (a.size == 0) {
        return new Map();
    } else if (b.size == 0) {
        return a;
    } else {
        return new Map([...a].filter(function ([key, value]) {
            return !b.has(key)
        }));
    }
};

/*
    get the intersection of two Maps
    key in a and b
*/
const map_intersect = function (a, b) {
    [a, b] = (a.size <= b.size) ? [a,b] : [b,a];
    if (a.size == 0) {
        // No intersect
        return new Map();
    }
    return new Map([...a].filter(function ([key, value]) {
        return b.has(key)
    }));
};

function divmod (n, d) {
    let r = n % d;
    let q = (n-r)/d;
    return [q, r];
}


function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

/*
    effective concatenation of multiple arrays
    - order - if true preserves ordering of input arrays
            - else sorts input arrays (longest first)
            - default false is more effective
    - copy  - if true leaves input arrays unchanged, copy
              values into new array
            - if false copies remainder arrays into the first
              array
            - default false is more effective
*/
function array_concat(arrays, options = {}) {
    let {copy=false, order=false} = options;
    if (arrays.length == 0) {
        return [];
    }
    if (arrays.length == 1) {
        return arrays[0];
    }
    let total_len = arrays.reduce((acc, cur) => acc + cur.length, 0);
    // order
    if (!order) {
        // sort arrays according to length - longest first
        arrays.sort((a, b) => b.length - a.length);
    }
    // copy
    let first = (copy) ? [] : arrays.shift();
    let start = first.length;
    // reserve memory total length
    first.length = total_len;
    // fill up first with entries from other arrays
    let end, len;
    for (let arr of arrays) {
        len = arr.length;
        end = start + len;
        for (let i=0; i<len; i++) {
            first[start + i] = arr[i];
        }
        start = end;
    }
    return first;
}
/*
    default object equals
*/
function object_equals(a, b) {
    // Create arrays of property names
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    let len = aProps.length;
    let propName;
    // If properties lenght is different => not equal
    if (aProps.length != bProps.length) {
        return false;
    }
    for (let i=0; i<len; i++) {
        propName = aProps[i];
        // If property values are not equal => not equal
        if (a[propName] !== b[propName]) {
            return false;
        }
    }
    // equal
    return true;
}


/* document readypromise */
const docready = new Promise(function(resolve) {
    if (document.readyState === 'complete') {
        resolve();
    } else {
        let onReady = function () {
            resolve();
            document.removeEventListener('DOMContentLoaded', onReady, true);
            window.removeEventListener('load', onReady, true);
        };
        document.addEventListener('DOMContentLoaded', onReady, true);
        window.addEventListener('load', onReady, true);
    }
});

var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    eqSet: eqSet,
    all: all,
    isIn: isIn,
    map_difference: map_difference,
    map_intersect: map_intersect,
    divmod: divmod,
    isIterable: isIterable,
    array_concat: array_concat,
    object_equals: object_equals,
    docready: docready
});

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


const isNumber = function(n) {
	let N = parseFloat(n);
    return (n===N && !isNaN(N));
};


/*********************************************************

ENDPOINT

Utilities for interval endpoints comparison

**********************************************************/

/*
	endpoint modes - in endpoint order
	endpoint order
	p), [p, [p], p], (p
*/
const MODE_RIGHT_OPEN = 0;
const MODE_LEFT_CLOSED = 1;
const MODE_SINGULAR = 2;
const MODE_RIGHT_CLOSED = 3;
const MODE_LEFT_OPEN = 4;

// create endpoint
function create(val, right, closed, singular) {
	// make sure infinity endpoints are legal
	if (val == Infinity) {
		if (right == false || closed == false) {
			throw new Error("Infinity endpoint must be right-closed or singular");
		}
	}
	if (val == -Infinity) {
		if (right == true || closed == false) {
			throw new Error("-Infinity endpoint must be left-closed or singular")
		}
	}
	return [val, right, closed, singular];
}


/*
	resolve endpoint mode
*/
function get_mode(e) {
	// if right, closed is given
	// use that instead of singular
	let [val, right, closed, singular] = e;
	if (right == undefined) {
		return MODE_SINGULAR;
	} else if (right) {
		if (closed) {
			return MODE_RIGHT_CLOSED;
		} else {
			return MODE_RIGHT_OPEN;
		}
	} else {
		if (closed) {
			return MODE_LEFT_CLOSED;
		} else {
			return MODE_LEFT_OPEN;
		}
	}
}

/*
	get order

	given two endpoints
	return two numbers representing their order

	also accepts regular numbers as endpoints
	regular number are represented as singular endpoints

	for endpoint values that are not
	equal, these values convey order directly,
	otherwise endpoint mode numbers 0-4 are returned

	parameters are either
	- point: Number
	or,
	- endpoint: [
		value (number),
		right (bool),
		closed (bool),
		singular (bool)
	  ]
*/

function get_order(e1, e2) {
	// support plain numbers (not endpoints)
	if (e1.length === undefined) {
		if (!isNumber(e1)) {
			throw new Error("e1 not a number", e1);
		}
		e1 = create(e1, undefined, undefined, true);
	}
	if (e2.length === undefined) {
		if (!isNumber(e2)) {
			throw new Error("e2 not a number", e2);
		}
		e2 = create(e2, undefined, undefined, true);
	}
	if (e1[0] != e2[0]) {
		// different values
		return [e1[0], e2[0]];
	} else {
		// equal values
		return [get_mode(e1), get_mode(e2)];
	}
}

/*
	return true if e1 is ordered before e2
	false if equal
*/

function leftof(e1, e2) {
	let [order1, order2] = get_order(e1, e2);
	return (order1 < order2);
}

/*
	return true if e1 is ordered after e2
	false is equal
*/

function rightof(e1, e2) {
	let [order1, order2] = get_order(e1, e2);
	return (order1 > order2);
}

/*
	return true if e1 is ordered equal to e2
*/

function equals(e1, e2) {
	let [order1, order2] = get_order(e1, e2);
	return (order1 == order2);
}

/*
	return -1 if ordering e1, e2 is correct
	return 0 if e1 and e2 is equal
	return 1 if ordering e1, e2 is incorrect
*/

function cmp(e1, e2) {
	let [order1, order2] = get_order(e1, e2);
	let diff = order1 - order2;
	if (diff == 0) return 0;
	return (diff > 0) ? 1 : -1;
}


function min(e1, e2) {
    return (cmp(e1, e2) <= 0) ? e1 : e2;
}


function max(e1, e2) {
    return (cmp(e1, e2) <= 0) ? e2 : e1;
}


/*
	human friendly endpoint representation
*/
function toString(e) {
	if (e.length === undefined) {
		return e.toString();
	} else {
		let mode = get_mode(e);
		let val = e[0];
		if (val == Infinity || val == -Infinity) {
			val = "--";
		}
		if (mode == MODE_RIGHT_OPEN) {
			return `${val})`
		} else if (mode == MODE_LEFT_CLOSED) {
			return `[${val}`
		} else if (mode == MODE_SINGULAR){
			return `[${val}]`
		} else if (mode == MODE_RIGHT_CLOSED) {
			return `${val}]`
		} else if (mode == MODE_LEFT_OPEN) {
			return `(${val}`
		}
	}
}


var endpoint = {
	cmp,
	toString,
	equals,
	rightof,
	leftof,
	create,
	min,
	max
};

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


const isNumber$1 = function(n) {
	let N = parseFloat(n);
    return (n===N && !isNaN(N));
};

/*********************************************************
INTERVAL ERROR
**********************************************************/

class IntervalError extends Error {
	constructor(message) {
		super(message);
		this.name == "IntervalError";
	}
}

/*********************************************************
INTERVAL
**********************************************************/

// Interval Relations
const Relation = Object.freeze({
	OUTSIDE_LEFT: 64,  	// 0b1000000
	OVERLAP_LEFT: 32,  	// 0b0100000
	COVERED: 16,		// 0b0010000
	EQUALS: 8,			// 0b0001000
	COVERS: 4,			// 0b0000100
	OVERLAP_RIGHT: 2,	// 0b0000010
	OUTSIDE_RIGHT: 1	// 0b0000001
});

/*
    Masks for Interval matching
*/
const MATCH_OUTSIDE = Relation.OUTSIDE_LEFT + Relation.OUTSIDE_RIGHT;
const MATCH_INSIDE = Relation.EQUALS + Relation.COVERED;
const MATCH_OVERLAP = MATCH_INSIDE +
	Relation.OVERLAP_LEFT + Relation.OVERLAP_RIGHT;
const MATCH_COVERS = MATCH_OVERLAP + Relation.COVERS;
const MATCH_ALL = MATCH_COVERS + MATCH_OUTSIDE;


/*********************************************************
INTERVAL
**********************************************************/

class Interval {


	static fromEndpoints(endpointLow, endpointHigh) {
		let [low, low_right, low_closed, low_singular] = endpointLow;
		let [high, high_right, high_closed, high_singular] = endpointHigh;
		if (low_right) {
			throw new IntervalError("illegal endpointLow - bracket must be left");
		}
		if (!high_right) {
			throw new IntervalError("illegal endpointHigh - bracket must be right");
		}
		return new Interval(low, high, low_closed, high_closed);
	};


	static Match = Object.freeze({
		OUTSIDE: MATCH_OUTSIDE,
		INSIDE: MATCH_INSIDE,
		OVERLAP: MATCH_OVERLAP,
		COVERS: MATCH_COVERS,
		ALL: MATCH_ALL
	});


	constructor (low, high, lowInclude, highInclude) {
		var lowIsNumber = isNumber$1(low);
		// new Interval(3.0) defines singular - low === high
		if (lowIsNumber && high === undefined) high = low;
		if (!isNumber$1(low)) throw new IntervalError("low not a number");
		if (!isNumber$1(high)) throw new IntervalError("high not a number");
		if (low > high) throw new IntervalError("low > high");
		if (low === high) {
			lowInclude = true;
			highInclude = true;
		}
		if (low === -Infinity) lowInclude = true;
		if (high === Infinity) highInclude = true;
		if (lowInclude === undefined) lowInclude = true;
		if (highInclude === undefined) highInclude = false;
		if (typeof lowInclude !== "boolean") throw new IntervalError("lowInclude not boolean");
		if (typeof highInclude !== "boolean") throw new IntervalError("highInclude not boolean");
		this.low = low;
		this.high = high;
		this.lowInclude = lowInclude;
		this.highInclude = highInclude;
		this.length = this.high - this.low;
		this.singular = (this.low === this.high);
		this.finite = (isFinite(this.low) && isFinite(this.high));

		/*
			Accessors for full endpoint representationo
			[value (number), right (bool), closed (bool)]

			- use with inside(endpoint, interval)
		*/
		this.endpointLow = endpoint.create(this.low, false, this.lowInclude, this.singular);
		this.endpointHigh = endpoint.create(this.high, true, this.highInclude, this.singular);
	}

	toString () {
		if (this.singular) {
			let p = this.endpointLow[0];
			return `[${p}]`;
		} else {
			let low = endpoint.toString(this.endpointLow);
			let high = endpoint.toString(this.endpointHigh);
			return `${low},${high}`;
		}
	};

	covers_endpoint (p) {
		let leftof = endpoint.leftof(p, this.endpointLow);
		let rightof = endpoint.rightof(p, this.endpointHigh);
		return !leftof && !rightof;
	}

	compare (other) {
		return compare(this, other);
	}

	equals (other) {
		return compare(this, other) == Relation.EQUALS;
	}

	/*
		default mode - all except outside
		2+4+8+16+32 = 62
	*/
	match (other, mask=MATCH_COVERS) {
		let relation = compare(this, other);
		return Boolean(mask & relation);
	}
}



/*********************************************************
COMPARE INTERVALS
**********************************************************

compare (a, b)
param a Interval
param b Interval
returns IntervalRelation

compares interval b to interval a
e.g. return value COVERED reads b is covered by a.

cmp_1 = endpoint_compare(b_low, a_low);
cmp_2 = endpoint_compare(b_high, a_high);

key = 10*cmp_1 + cmp_2

cmp_1  cmp_2  key  relation
=====  =====  ===  ============================
-1     -1     -11  OUTSIDE_LEFT, PARTIAL_LEFT
-1 	   0      -10  COVERS
-1     1       -9  COVERS
0	   -1      -1  COVERED
0      0        0  EQUAL
0 	   1        1  COVERS
1      -1       9  COVERED
1 	   0       10  COVERED
1 	   1       11  OUTSIDE_RIGHT, OVERLAP_RIGHT
=====  =====  ===  ============================

**********************************************************/



function compare(a, b) {
	if (! a instanceof Interval) {
		// could be a number
		if (isNumber$1(a)) {
			a = new Interval(a);
		} else {
			throw new IntervalError("a not interval", a);
		}
	}
	if (! b instanceof Interval) {
		// could be a number
		if (isNumber$1(b)) {
			b = new Interval(b);
		} else {
			throw new IntervalError("b not interval", b);
		}
	}

	let cmp_1 = endpoint.cmp(a.endpointLow, b.endpointLow);
	let cmp_2 = endpoint.cmp(a.endpointHigh, b.endpointHigh);
	let key = cmp_1*10 + cmp_2;

	if (key == 11) {
		// OUTSIDE_LEFT or PARTIAL_LEFT
		if (endpoint.leftof(b.endpointHigh, a.endpointLow)) {
			return Relation.OUTSIDE_RIGHT;
		} else {
			return Relation.OVERLAP_RIGHT;
		}
	} else if ([-1, 9, 10].includes(key)) {
		return Relation.COVERED;
	} else if ([1, -9, -10].includes(key)) {
		return Relation.COVERS;
	} else if (key == 0) {
		return Relation.EQUALS;
	} else {
		// key == -11
		// OUTSIDE_RIGHT, PARTIAL_RIGHT
		if (endpoint.rightof(b.endpointLow, a.endpointHigh)) {
			return Relation.OUTSIDE_LEFT;
		} else {
			return Relation.OVERLAP_LEFT;
		}
	}
}

/*********************************************************
COMPARE INTERVALS BY ENDPOINT
**********************************************************

cmp functions for sorting intervals (ascending) based on
endpoint low or high

use with array.sort()

**********************************************************/

function _make_interval_cmp(low) {
	return function cmp (a, b) {
		let e1, e2;
		if (low) {
			e1 = [a.low, false, a.lowInclude, a.singular];
			e2 = [b.low, false, b.lowInclude, a.singular];
		} else {
			e1 = [a.high, true, a.highInclude, a.singular];
			e2 = [b.high, true, b.highInclude, a.singular];
		}
		return endpoint.cmp(e1, e2);
	}
}

/*
	Add static variables to Interval class.
*/
Interval.Relation = Relation;
Interval.cmpLow = _make_interval_cmp(true);
Interval.cmpHigh = _make_interval_cmp(false);

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


// sort func
const cmp$1 = function (a, b) {return a - b;};

/*******************************************************************
 BASIC
*******************************************************************/

function equalVectors(vector_a, vector_b) {
    let pos = vector_a.position == vector_b.position;
    let vel = vector_a.velocity == vector_b.velocity;
    let acc = vector_a.acceleration == vector_b.acceleration;
    let ts = vector_a.timestamp == vector_b.timestamp;
    return pos && vel && acc && ts;
}

function copyVector(vector) {
    return {
        position: vector.position,
        velocity: vector.velocity,
        acceleration: vector.acceleration,
        timestamp: vector.timestamp
    }
}
/*
    Calculate vector snapshot for motion defined by vector at time ts

    vector: [p0,v0,a0,t0]
    t0 and ts are absolute time from same clock, in seconds
*/

function calculateVector(vector, ts) {
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
}

/*
    Calculate direction of motion at time ts
    1 : forwards, -1 : backwards: 0, no movement
*/
function calculateDirection(vector, ts) {
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
    let direction = cmp$1(freshVector.velocity, 0.0);
    if (direction === 0) {
        // check acceleration
        direction = cmp$1(vector.acceleration, 0.0);
    }
    return direction;
}

/*
    isMoving

    returns true if motion is moving else false
*/
function isMoving(vector) {
    return (vector.velocity !== 0.0 || vector.acceleration !== 0.0);
}

/*******************************************************************
 RANGE
*******************************************************************/

//	RANGE STATE is used for managing/detecting range violations.
const RangeState = Object.freeze({
    INIT : "init",
    INSIDE: "inside",
    OUTSIDE_LOW: "outsidelow",
    OUTSIDE_HIGH: "outsidehigh"
});

/*
	A snapshot vector is checked with respect to range,
	calclulates correct RangeState (i.e. INSIDE|OUTSIDE)
*/
function correctRangeState(vector, range) {
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
}
/*

	A snapshot vector is checked with respect to range.
	Returns vector corrected for range violations, or input vector unchanged.
*/
function checkRange(vector, range) {
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
}

/*
    Return tsEndpoint of (first) range intersect if any.
*/
function rangeIntersect(vector, range) {
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
}

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
}

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
}

/*
    calculateMinPositiveRealSolution

    Given motion determined from p,v,a,t.
    Determine if equation p(t) = p + vt + 0.5at^2 = x
    has solutions for some real number t.
    Calculate and return the least positive real solution.
*/
function calculateMinPositiveRealSolution(vector, x) {
    const {position: p, velocity: v, acceleration: a} = vector;
	const res = calculatePositiveRealSolutions(p,v,a,x);
	if (res.length === 0) {
        return;
    }
	else return res[0];
}

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
function calculateDelta(vector, range) {
	// Time delta to hit posBefore
	const deltaBeforeSec = calculateMinPositiveRealSolution(vector, range[0]);
	// Time delta to hit posAfter
	const deltaAfterSec = calculateMinPositiveRealSolution(vector, range[1]);
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
}

/*******************************************************************
 TIME_INTERVAL POS_INTERVAL
*******************************************************************/

/*
    posInterval_from_timeInterval

    given
    - a time interval
    - a vector describing motion within the time interval
    figure out the smallest interval (of positions)
    that covers all possible positions during the time interval
*/

function posInterval_from_timeInterval (timeInterval, vector) {

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
                    return new Interval(p_extrem, p1, true, t1_closed);
                } else {
                    return new Interval(p_extrem, p0, true, t0_closed);
                }
            } else {
                // p_extrem is maximum
                // figure out if p0 or p1 is minimum
                if (p0 < p1) {
                    return new Interval(p0, p_extrem, t0_closed, true);
                } else {
                    return new Interval(p1, p_extrem, t1_closed, true);
                }
            }
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
        return new Interval(p0, p1, t0_closed, t1_closed);
    } else {
        // backward
        return new Interval(p1, p0, t1_closed, t0_closed);
    }
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

function timeEndpoint_from_posEndpoint(posEndpoint, ts, direction) {
    let [pos, right, close, singular] = posEndpoint;
    // flip right/left if direction is backwards
    if (direction < 0 && right !== undefined) {
        right = !right;
    }
    return [ts, right, close, singular];
}


/*******************************************************************
 ENDPOINT EVENTS
*******************************************************************/

/*
    endpointEvents

    Given a motion and a set of endpoing, calculate when
    the motion will pass by each endpoing.

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

function endpointEvents (timeInterval, posInterval, vector, endpointItems) {

    /*
        no motion or singular time interval
    */
    if (timeInterval.singular) {
        throw new Error("getEventItems: timeInterval is singular");
    }
    if (!isMoving(vector)) {
        throw new Error("getEventItems: no motion")
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
            return;
        }
        value = item.endpoint[0];
        // check if equation has any solutions
        if (!hasRealSolution(p0, v0, a0, value)) {
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
    return eventItems;
}

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


class MotionDelta {


    static PosDelta = Object.freeze({
        NOOP: 0,                // no change in position
        CHANGE: 1               // change in position
    });


    static MoveDelta = Object.freeze({
        NOOP: 0,                // no change in movement, not moving
        NOOP_MOVING: 1,         // no change in movement, moving
        START: 2,               // not moving -> moving
        CHANGE: 3,              // keep moving, movement changed
        STOP: 4                 // moving -> not moving
    });

    constructor (old_vector, new_vector) {
        let ts = new_vector.timestamp;
        let is_moving = isMoving(new_vector);
        let init = (old_vector == undefined || old_vector.position == undefined);
        const PosDelta = MotionDelta.PosDelta;
        const MoveDelta = MotionDelta.MoveDelta;

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


// return module object
/*
export default {
    isMoving,
    // equalVectors,
    // copyVector,
	calculateVector,
	calculateDirection,
	// calculateMinPositiveRealSolution,
	calculateDelta,
	// correctRangeState,
	// checkRange,
	// RangeState,
    posInterval_from_timeInterval,
    endpointEvents,
    rangeIntersect,
    MotionDelta
};
*/

var motionutils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    equalVectors: equalVectors,
    copyVector: copyVector,
    calculateVector: calculateVector,
    calculateDirection: calculateDirection,
    isMoving: isMoving,
    RangeState: RangeState,
    correctRangeState: correctRangeState,
    checkRange: checkRange,
    rangeIntersect: rangeIntersect,
    calculateDelta: calculateDelta,
    posInterval_from_timeInterval: posInterval_from_timeInterval,
    timeEndpoint_from_posEndpoint: timeEndpoint_from_posEndpoint,
    endpointEvents: endpointEvents,
    MotionDelta: MotionDelta
});

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


/*
    utility function for protecting against duplicates
*/
function unique(A) {
    return [...new Set(A)];
}


/*
    batch inserts and removes have two strategies
    1) change-sort
    2) splice

    simple rule by measurement
    splice is better for batchlength <= 100 for both insert and remove
*/
function resolve_approach(arrayLength, batchLength) {
    if (arrayLength == 0) {
        return "sort";
    }
    return (batchLength <= 100) ? "splice" : "sort";
}

class BinarySearchError extends Error {

    constructor(message) {
        super(message);
        this.name = "BinarySearchError";
    }

}


/*

BINARY SEARCH

- based on sorted list of unique elements
- implements protection against duplicates


Public API
- update (remove_elements, insert_elements)
- lookup (interval) - returns list for all elements
- remove (interval) - removes elements within interval
- has (element)     - returns true if element exists with value == element, else false
- get (element)     - returns element with value if exists, else undefined
- values ()         - returns iterable for all elements
- indexOf(element)  - returns index of element
- indexOfElements(elements)
- getByIndex(index) - returns element at given index


*/

function cmp$2(a, b) {return a-b;}

class BinarySearch {

    constructor(options) {
        this.array = [];
        this.options = options || {};
    }


    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    binaryIndexOf(searchElement) {
        let minIndex = 0;
        let maxIndex = this.array.length - 1;
        let currentIndex;
        let currentElement;
        while (minIndex <= maxIndex) {
    		currentIndex = (minIndex + maxIndex) / 2 | 0;
    		currentElement = this.array[currentIndex];
            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            } else if (currentElement > searchElement) {
                maxIndex = currentIndex - 1;
            } else {
                // found
    		    return currentIndex;
    		}
        }
        // not found - indicate at what index the element should be inserted
    	return ~maxIndex;

        // NOTE : ambiguity

        /*
        search for an element that is less than array[0]
        should return a negative value indicating that the element
        was not found. Furthermore, as it escapes the while loop
        the returned value should indicate the index that this element
        would have had - had it been there - as is the idea of this bitwise
        operator trick

        so, it follows that search for value of minimum element returns 0 if it exists, and 0 if it does not exists
        this ambiguity is compensated for in relevant methods
        */
    };


    /*
        utility function for resolving ambiguity
    */
    isFound(index, x) {
        if (index > 0) {
            return true;
        }
        if (index == 0 && this.array.length > 0 && this.array[0] == x) {
            return true;
        }
        return false;
    };

    /*
        returns index of value or -1
    */
    indexOf(x) {
        var index = this.binaryIndexOf(x);
        return (this.isFound(index, x)) ? index : -1;
    };

    indexOfElements(elements) {
        let x, index;
        let indexes = [];
        for (let i=0; i<elements.length; i++) {
            x = elements[i];
            index = this.indexOf(x);
            if (index > -1) {
                indexes.push(index);
            }
        }
        return indexes;
    };

    /*
        element exists with value
    */
    has(x) {
        return (this.indexOf(x) > -1) ? true : false;
    };

    get(index) {
        return this.array[index];
    };



    /*
        REMOVE
        Removes all elements with given values
        search for each one and splice remove them individually
        (reverse order)

        INSERT
        binarysearch and splice
        insert - binarysearch and splice

        WARNING - there should be no need to insert elements that are already
        present in the array. This function drops such duplicates
    */
    _update_splice(to_remove, to_insert, options) {

        // REMOVE
        if (this.array.length > 0) {
            let indexes = this.indexOfElements(to_remove);
            /*
                sort indexes to make sure we are removing elements
                in backwards order
                optimization
                - if elements were sorted in the first place this should not be necessary
            */
            indexes.sort(function(a,b){return a-b;});
            for (let i=indexes.length-1; i > -1; i--) {
                this.array.splice(indexes[i], 1);
            }
        }

        // INSERT
        let x, index;
        let len = to_insert.length;
        for (let i=0; i<len; i++) {
            x = to_insert[i];
            index = this.binaryIndexOf(x);
            if (!this.isFound(index, x)) {
                // insert at correct place
                this.array.splice(Math.abs(index), 0, x);
            }
        }
    };


    /*
        remove - flag - sort to end and remove

        Removes all elements with given values
        - visit all elements - set their value to Infinite
        - sort O(N) - native
        - splice off Infinity values at end

        insert - concat and sort

        by doing both remove and insert in one operation,
        sorting can be done only once.
    */
    _update_sort(to_remove, to_insert, options) {
        // REMOVE
        if (this.array.length > 0 && to_remove.length > 0) {
            // visit all elements and set their value to undefined
            // undefined values will be sorted to the end of the array
            let indexes = this.indexOfElements(to_remove);
            for (let i=0; i<indexes.length;i++) {
                this.array[indexes[i]] = undefined;
            }
        }
        // INSERT
        // concat
        this.array = this.array.concat(to_insert);
        // sort
        this.array.sort(cmp$2);
        // remove undefined values at the end if any
        if (to_remove.length > 0) {
            let index = this.array.indexOf(undefined);
            if (index > -1) {
                this.array.splice(index, this.array.length-index);
            }
        }
        // remove duplicates
        this.array = unique(this.array);
    };


    /*
        Update - removing and inserting elements in one operation

        a single element should only be present once in the list, thus avoiding
        multiple operations to one element. This is presumed solved externally.
        - also objects must not be members of both lists.

        - internally selects the best method - searchsplice or concatsort
        - selection based on relative sizes of existing elements and new elements

    */
    update(to_remove, to_insert, options) {
        let size = to_remove.length + to_insert.length;
        if (size == 0) {
            return;
        }

        // regular case
        let approach = resolve_approach(this.array.length, size);
        if (approach == "splice") {
            this._update_splice(to_remove, to_insert, options);
        } else if (approach == "sort"){
            this._update_sort(to_remove, to_insert, options);
        }
    };


    /*
        Accessors
    */

    getMinimum() {
        return (this.array.length > 0) ? this.array[0] : undefined;
    };

    getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : undefined;
    };


    /*
        Internal search functions
    */

    /*
       Find index of largest value less than x
       Returns -1 if noe values exist that are less than x
     */
    ltIndexOf(x) {
        var i = this.binaryIndexOf(x);
        if (this.isFound(i, x)) {
            /*
                found - x is found on index i
                consider element to the left
                if we are at the left end of the array nothing is found
                return -1
            */
            if (i > 0) {
                return i-1;
            } else {
                return -1;
            }
        } else {
            /*
                not found - Math.abs(i) is index where x should be inserted
                => Math.abs(i) - 1 is the largest value less than x
            */
            return Math.abs(i)-1;
        }
    };

    /*
       Find index of rightmost value less than x or equal to x
       Returns -1 if noe values exist that are less than x or equal to x
     */
    leIndexOf(x) {
        var i = this.binaryIndexOf(x);
        if (this.isFound(i, x)) {
            /*
                element found
            */
            return i;
        } else {
            // not found - consider element to the left
            i = Math.abs(i) - 1;
            return (i >= 0) ? i : -1;
        }
    };

    /*
       	Find index of leftmost value greater than x
       	Returns -1 if no values exist that are greater than x
    */

    gtIndexOf(x) {
        var i = this.binaryIndexOf(x);
        if (this.isFound(i, x)) {
            /*
                found - x is found on index i
                if there are no elements to the right return -1
            */
            if (i < this.array.length -1) {
                return i+1;
            } else {
                return -1;
            }
        } else {
            /*
                not found - Math.abs(i) is index where x should be inserted
                => Math.abs(i) is the smallest value greater than x
                unless we hit the end of the array, in which cas no smalles value
                exist which is greater than x
            */
            let idx = Math.abs(i);
            return (idx < this.array.length) ? idx : -1;
        }
    };


    /*
       Find index of leftmost value which is greater than x or equal to x
       Returns -1 if noe values exist that are greater than x or equal to x
     */

    geIndexOf(x) {
        var i = this.binaryIndexOf(x);
        if (this.isFound(i, x)) {
            /*
                found element
            */
            return i;
        } else {
            // not found - consider the element where x would be inserted
            i = Math.abs(i);
            return (i<this.array.length) ? i : -1;
        }
    };

    /*
        lookup start and end indexes of elements within interval
        for use with slice operation
        returns undefined if no elements are found
    */
    lookupIndexes(interval) {
        if (interval === undefined)
            interval = new Interval(-Infinity, Infinity, true, true);
        if (interval instanceof Interval === false)
            throw new BinarySearchError("lookup requires Interval argument");

        // interval represents a single point
        if (interval.singular) {
            let index = this.indexOf(interval.low);
            if (index > -1) {
                return [index, index + 1];
            } else {
                return [undefined, undefined];
            }
        }

        // regular non-singular interval
        var start_index = -1, end_index = -1;
        if (interval.lowInclude) {
            start_index = this.geIndexOf(interval.low);
        } else {
            start_index = this.gtIndexOf(interval.low);
        }
        if (start_index === -1) {
            return [undefined, undefined];
        }
        if (interval.highInclude) {
            end_index = this.leIndexOf(interval.high);
        } else {
            end_index = this.ltIndexOf(interval.high);
        }
        if (end_index === -1) { // not reachable - I think
            return [undefined, undefined];
        }
        return [start_index, end_index + 1];
    };


    /*
        lookup by interval
    */
    lookup(interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.slice(start, end) : [];
    };

    /*
        remove by interval
    */
    remove(interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.splice(start, end-start) : [];
    };


    slice(start, end) {
        return this.array.slice(start, end);
    };

    splice(start, length) {
        return this.array.splice(start, length);
    };



    /*
        method for removing multiple closely placed elements in place
        - removeList is sorted
        - changes only affect the part of the index between first and last element
        - move remaining elements to the left, remove elements with a single splice
        - efficent if removelist references elements that are close to eachother
    */

    removeInSlice(removeList) {
        if (removeList.length == 0){
            return;
        }
        const low = removeList[0];
        const high = removeList[removeList.length-1];
        let [start, end] = this.lookupIndexes(new Interval(low, high, true, true));

        let rd_ptr = start;
        let wr_ptr = start;
        let rm_ptr = 0;

        while (rd_ptr < end) {
            let rd_elem = this.array[rd_ptr];
            let rm_elem = removeList[rm_ptr];
            if (rd_elem < rm_elem) {
                this.array[wr_ptr] = this.array[rd_ptr];
                wr_ptr++;
                rd_ptr++;
            } else if (rd_elem == rm_elem) {
                rd_ptr++;
                rm_ptr++;
            } else {
                // rd_elem > rm_elem
                rm_ptr++;
            }
            if (rm_ptr == removeList.length) {
                break
            }
        }
        this.array.splice(wr_ptr, rd_ptr-wr_ptr);
    };


    values() {
        return this.array.values();
    };

    clear() {
        this.array = [];
    };

    get length () {
        return this.array.length;
    }

}

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



/*
	Event
	- name: event name
	- publisher: the object which defined the event
	- init: true if the event suppports init events
	- subscriptions: subscriptins to this event

*/

class Event {

	constructor (publisher, name, options) {
		options = options || {};
		this.publisher = publisher;
		this.name = name;
		this.init = (options.init === undefined) ? false : options.init;
		this.subscriptions = [];
	}

	/*
		subscribe to event
		- subscriber: subscribing object
		- callback: callback function to invoke
		- options:
			init: if true subscriber wants init events
	*/
	subscribe (callback, options) {
		if (!callback || typeof callback !== "function") {
			throw new Error("Callback not a function", callback);
		}
		const sub = new Subscription(this, callback, options);
		this.subscriptions.push(sub);
	    // Initiate init callback for this subscription
	    if (this.init && sub.init) {
	    	sub.init_pending = true;
	    	let self = this;
	    	Promise.resolve().then(function () {
	    		const eArgs = self.publisher.eventifyInitEventArgs(self.name) || [];
	    		for (let eArg of eArgs) {
	    			self.trigger(eArg, [sub], true);
	    		}
	    		sub.init_pending = false;
	    	});
	    }
		return sub
	}

	/*
		trigger event

		- if sub is undefined - publish to all subscriptions
		- if sub is defined - publish only to given subscription
	*/
	trigger (eArg, subs, init) {
		let eInfo, ctx;
		for (const sub of subs) {
			// ignore terminated subscriptions
			if (sub.terminated) {
				continue;
			}
			eInfo = {
				src: this.publisher,
				name: this.name,
				sub: sub,
				init: init
			};
			ctx = sub.ctx || this.publisher;
			try {
				sub.callback.call(ctx, eArg, eInfo);
			} catch (err) {
				console.log(`Error in ${this.name}: ${sub.callback} ${err}`);
			}
		}
	}

	/*
	unsubscribe from event
	- use subscription returned by previous subscribe
	*/
	unsubscribe(sub) {
		let idx = this.subscriptions.indexOf(sub);
		if (idx > -1) {
			this.subscriptions.splice(idx, 1);
			sub.terminate();
		}
	}
}


/*
	Subscription class
*/

class Subscription {

	constructor(event, callback, options) {
		options = options || {};
		this.event = event;
		this.name = event.name;
		this.callback = callback;
		this.init = (options.init === undefined) ? this.event.init : options.init;
		this.init_pending = false;
		this.terminated = false;
		this.ctx = options.ctx;
	}

	terminate() {
		this.terminated = true;
		this.callback = undefined;
		this.event.unsubscribe(this);
	}
}


/*

	EVENTIFY INSTANCE

	Eventify brings eventing capabilities to any object.

	In particular, eventify supports the initial-event pattern.
	Opt-in for initial events per event type.

	eventifyInitEventArgs(name) {
		if (name == "change") {
			return [this._value];
		}
	}

*/

function eventifyInstance (object) {
	object.__eventify_eventMap = new Map();
	object.__eventify_buffer = [];
	return object;
}

/*
	EVENTIFY PROTOTYPE

	Add eventify functionality to prototype object
*/

function eventifyPrototype(_prototype) {

	function eventifyGetEvent(object, name) {
		const event = object.__eventify_eventMap.get(name);
		if (event == undefined) {
			throw new Error("Event undefined", name);
		}
		return event;
	}

	/*
		DEFINE EVENT
		- used only by event source
		- name: name of event
		- options: {init:true} specifies init-event semantics for event
	*/
	function eventifyDefine(name, options) {
		// check that event does not already exist
		if (this.__eventify_eventMap.has(name)) {
			throw new Error("Event already defined", name);
		}
		this.__eventify_eventMap.set(name, new Event(this, name, options));
	}
	/*
		ON
		- used by subscriber
		register callback on event.
	*/
	function on(name, callback, options) {
		return eventifyGetEvent(this, name).subscribe(callback, options);
	}
	/*
		OFF
		- used by subscriber
		Un-register a handler from a specfic event type
	*/
	function off(sub) {
		return eventifyGetEvent(this, sub.name).unsubscribe(sub);
	}

	function eventifySubscriptions(name) {
		return eventifyGetEvent(this, name).subscriptions;
	}



	/*
		Trigger list of eventItems on object

		eventItem:  {name:.., eArg:..}

		copy all eventItems into buffer.
		request emptying the buffer, i.e. actually triggering events,
		every time the buffer goes from empty to non-empty
	*/
	function eventifyTriggerAll(eventItems) {
		if (eventItems.length == 0) {
			return;
		}

		// make trigger items
		// resolve non-pending subscriptions now
		// else subscriptions may change from pending to non-pending
		// between here and actual triggering
		// make list of [ev, eArg, subs] tuples
		let triggerItems = eventItems.map((item) => {
			let {name, eArg} = item;
			let ev = eventifyGetEvent(this, name);
			let subs = ev.subscriptions.filter(sub => sub.init_pending == false);
			return [ev, eArg, subs];
		}, this);

		// append trigger Items to buffer
		const len = triggerItems.length;
		const buf = this.__eventify_buffer;
		const buf_len = this.__eventify_buffer.length;
		// reserve memory - set new length
		this.__eventify_buffer.length = buf_len + len;
		// copy triggerItems to buffer
		for (let i=0; i<len; i++) {
			buf[buf_len+i] = triggerItems[i];
		}
		// request emptying of the buffer
		if (buf_len == 0) {
			let self = this;
			Promise.resolve().then(function() {
				for (let [ev, eArg, subs] of self.__eventify_buffer) {
					// actual event triggering
					ev.trigger(eArg, subs, false);
				}
				self.__eventify_buffer = [];
			});
		}
	}

	/*
		Trigger multiple events of same type (name)
	*/
	function eventifyTriggerAlike(name, eArgs) {
		return this.eventifyTriggerAll(eArgs.map(eArg => {
			return {name, eArg};
		}));
	}

	/*
		Trigger single event
	*/
	function eventifyTrigger(name, eArg) {
		return this.eventifyTriggerAll([{name, eArg}]);
	}

	_prototype.eventifyDefine = eventifyDefine;
	_prototype.eventifyTrigger = eventifyTrigger;
	_prototype.eventifyTriggerAlike = eventifyTriggerAlike;
	_prototype.eventifyTriggerAll = eventifyTriggerAll;
	_prototype.eventifySubscriptions = eventifySubscriptions;
	_prototype.on = on;
	_prototype.off = off;
}

/*
	Event Variable

	Objects with a single "change" event
*/

class EventVariable {

	constructor (value) {
		eventifyInstance(this);
		this._value = value;
		this.eventifyDefine("change", {init:true});
	}

	eventifyInitEventArgs(name) {
		if (name == "change") {
			return [this._value];
		}
	}

	get value () {return this._value};
	set value (value) {
		if (value != this._value) {
			this._value = value;
			this.eventifyTrigger("change", value);
		}
	}
}
eventifyPrototype(EventVariable.prototype);

/*
	Event Boolean


	Note : implementation uses falsiness of input parameter to constructor and set() operation,
	so eventBoolean(-1) will actually set it to true because
	(-1) ? true : false -> true !
*/

class EventBoolean extends EventVariable {
	constructor(value) {
		super(Boolean(value));
	}

	set value (value) {
		super.value = Boolean(value);
	}
	get value () {return super.value};
}


/*
	make a promise which is resolved when EventBoolean changes
	value.
*/
function makePromise(eventObject, conditionFunc) {
	conditionFunc = conditionFunc || function(val) {return val == true};
	return new Promise (function (resolve, reject) {
		let sub = eventObject.on("change", function (value) {
			if (conditionFunc(value)) {
				resolve(value);
				eventObject.off(sub);
			}
		});
	});
}
// module api
var eventify = {
	eventifyPrototype,
	eventifyInstance,
	EventVariable,
	EventBoolean,
	makePromise
};

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

/*******************************************************************
 BASE OBSERVABLE MAP
*******************************************************************/

/*
    This is a base class for observable map
*/

class ObservableMap {

    constructor () {

        // Internal Map
        this._map = new Map(); // (key -> item)

        // Events
        eventify.eventifyInstance(this);
        this.eventifyDefine("batch", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    }

    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        item ordering
    */
    _sortItems(items) {
        return items;
    }

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            let items = [...this._map.entries()].map(([key, item]) => {
                return {key:key, new:item, old:undefined};
            });
            items = this._sortItems(items);
            return (name == "batch") ? [items] : items;
        }
    }

    /*
        Event Notification
    */
    _notifyEvents(items) {
        // event notification
        if (items.length == 0) {
            return;
        }
        const has_update_subs = this.eventifySubscriptions("batch").length > 0;
        const has_remove_subs = this.eventifySubscriptions("remove").length > 0;
        const has_change_subs = this.eventifySubscriptions("change").length > 0;
        // update
        if (has_update_subs) {
            this.eventifyTrigger("batch", items);
        }
        // change, remove
        if (has_remove_subs || has_change_subs) {
            for (let item of items) {
                if (item.new == undefined && item.old != undefined) {
                    if (has_remove_subs) {
                        this.eventifyTrigger("remove", item);
                    }
                } else {
                    if (has_change_subs) {
                        this.eventifyTrigger("change", item);
                    }
                }
            }
        }
    }


    /***************************************************************
     ACCESSORS
    ***************************************************************/

    get size () {
        return this._map.size;
    }

    has(key) {
        return this._map.has(key);
    };

    get(key) {
        return this._map.get(key);
    };

    keys() {
        return this._map.keys();
    };

    values() {
        return this._map.values();
    };

    entries() {
        return this._map.entries();
    }


    /***************************************************************
     MODIFY
    ***************************************************************/

    set(key, value) {
        let old = undefined;
        if (this._map.has(key)) {
            old = this._map.get(key);
        }
        this._map.set(key, value);
        this._notifyEvents([{key: key, new:value, old: old}]);
        return this;
    }

    delete(key) {
        let result = false;
        let old = undefined;
        if (this._map.has(key)) {
            old = this._map.get(key);
            this._map.delete(key);
            result = true;
        }
        this._notifyEvents([{key: key, new:undefined, old: old}]);
        return result;
    }

    clear() {
        // clear _map
        let _map = this._map;
        this._map = new Map();
        // create change events for all cues
        const items = [];
        for (let [key, val] of _map.entries()) {
            items.push({key: key, new: undefined, old: val});
        }
        // event notification
        this._notifyEvents(items);
    }

}

eventify.eventifyPrototype(ObservableMap.prototype);

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

    constructor (timingObject, callback) {
        this.tid = undefined;
        this.to = timingObject;
        this.callback = callback;
    }

    isSet() {
        return this.tid != undefined;
    }

    /*
        set timeout to point in time (seconds)
    */
    setTimeout(target_ts, arg) {
        if (this.tid != undefined) {
            throw new Error("at most on timeout");
        }
        let now = this.to.clock.now();
        let delay = Math.max(target_ts - now, 0) * 1000;
        this.tid = setTimeout(this.onTimeout.bind(this), delay, target_ts, arg);
    }

    /*
        handle timeout intended for point in time (seconds)
    */
    onTimeout(target_ts, arg) {
        if (this.tid != undefined) {
            this.tid = undefined;
            // check if timeout was too early
            let now = this.to.clock.now();
            if (now < target_ts) {
                // schedule new timeout
                this.setTimeout(target_ts, arg);
            } else {
                // handle timeout
                this.callback(now, arg);
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

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


// Need a polyfill for performance,now as Safari on ios doesn't have it...
(function(){
    if ("performance" in window === false) {
        window.performance = {};
        window.performance.offset = new Date().getTime();
    }
    if ("now" in window.performance === false){
      window.performance.now = function now(){
        return new Date().getTime() - window.performance.offset;
      };
    }
	})();

// local clock in seconds
const local_clock = {
	now : function () {return performance.now()/1000.0;}
};

function calculateVector$1(vector, tsSec) {
	if (tsSec === undefined) tsSec = local_clock.now();
	var deltaSec = tsSec - vector.timestamp;
	return {
		position : vector.position + vector.velocity*deltaSec,
		velocity : vector.velocity,
		timestamp : tsSec
	};
}
class MasterClock {

	constructor (options) {
		var now = local_clock.now();
		options = options || {};
		this._vector  = {position: now, velocity: 1.0, timestamp: now};
		// event support
		eventify.eventifyInstance(this);
		this.eventifyDefine("change", {init:false}); // define change event (no init-event)
		// adjust
		this.adjust(options);
	};

	/*
		ADJUST
		- could also accept timestamp for velocity if needed?
		- given skew is relative to local clock
		- given rate is relative to local clock
	*/
	adjust(options) {
		options = options || {};
		var now = local_clock.now();
		var nowVector = this.query(now);
		if (options.skew === undefined && options.rate === undefined) {
			return;
		}
		this._vector = {
			position : (options.skew !== undefined) ? now + options.skew : nowVector.position,
			velocity : (options.rate !== undefined) ? options.rate : nowVector.velocity,
			timestamp : nowVector.timestamp
		};
		this.eventifyTrigger("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	now() {
		return calculateVector$1(this._vector, local_clock.now()).position;
	};

	/*
		QUERY
		- calculates the state of the clock right now
		- result vector includes position and velocity
	*/
	query(now) {
		return calculateVector$1(this._vector, now);
	};

}
eventify.eventifyPrototype(MasterClock.prototype);

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


/*
	INTERNAL PROVIDER

	Timing provider internal to the browser context

	Used by timing objects as timingsrc if no timingsrc is specified.
*/

class InternalProvider {

	constructor (callback, options) {
		options = options || {};
		// initialise internal state
		this._clock = new MasterClock({skew:0});
		this._range = [-Infinity, Infinity];
		this._vector;
		this._callback = callback;
		// options
		options.timestamp = options.timestamp || this._clock.now();
		this._process_update(options);
	};

	// internal clock
	get clock() {return this._clock;};
	get range() {return this._range;};
	get vector() {return this._vector;};

	isReady() {return true;};

	// update
	_process_update(arg) {
		// process arg
		let {
			position: pos,
			velocity: vel,
			acceleration: acc,
			timestamp: ts,
			range: range,
			...rest
		} = arg;

		// record state from current motion
		let p = 0, v = 0, a = 0;
		if (this._vector != undefined) {
			let nowVector = calculateVector(this._vector, ts);
			nowVector = checkRange(nowVector, this._range);
			p = nowVector.position;
			v = nowVector.velocity;
			a = nowVector.acceleration;
		}

		// fill in from current motion, for missing properties
		let vector = {
			position : (pos != undefined) ? pos : p,
			velocity : (vel != undefined) ? vel : v,
			acceleration : (acc != undefined) ? acc : a,
			timestamp : ts
		};

		// update range
		if (range != undefined) {
			let [low, high] = range;
			if (low < high) {
				if (low != this._range[0] || high != this._range[1]) {
					this._range = [low, high];
				}
			}
		}

		// check vector with respect to range
		vector = checkRange(vector, this._range);
		// save old vector
		this._old_vector = this._vector;
		// update vector
		this._vector = vector;
		return {range, ...vector, ...rest};
	};

	// update
	update(arg) {
		arg = this._process_update(arg);
		return this._callback(arg);
	}

	close() {
		this._callback = undefined;
	}
}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


function checkTimingProvider(obj){
	let required = ["on", "skew", "vector", "range", "update"];
	for (let prop of required) {
		if (!(prop in obj)) {
			throw new Error(`TimingProvider ${obj} missing property ${prop}`);
		}
	}
}


/*
	EXTERNAL PROVIDER

	External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
	and the TIMINGSRC API

	Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

	- wraps a timing provider external
	- handles some complexity that arises due to the very simple API of providers
	- implements a clock for the provider
*/

class ExternalProvider {

	constructor(provider, callback, options) {
		checkTimingProvider(provider);

		this._provider = provider;
		this._callback = callback;
		this._range;
		this._vector;
		this._ready = false;

		/*
			provider clock (may fluctuate based on live skew estimates)
		*/
		this._provider_clock;
		/*
			local clock
			provider clock normalised to values of performance now
			normalisation based on first skew measurement, so
		*/
		this._clock;


		// register event handlers
		this._provider.on("vectorchange", this._onVectorChange.bind(this));
		this._provider.on("skewchange", this._onSkewChange.bind(this));
		if (this._provider.skew != undefined) ;
	};

	isReady() {return this._ready;};

	// internal clock
	get clock() {return this._clock;};
	get range() {return this._range;};


	/*
		- local timestamp of vector is set for each new vector, using the skew available at that time
		- the vector then remains unchanged
		- skew changes affect local clock, thereby affecting the result of query operations

		- one could imagine reevaluating the vector as well when the skew changes,
			but then this should be done without triggering change events

		- ideally the vector timestamp should be a function of the provider clock
	*/

	get vector() {
		// local_ts = provider_ts - skew
		let local_ts = this._vector.timestamp - this._provider.skew;
		return {
			position : this._vector.position,
			velocity : this._vector.velocity,
			acceleration : this._vector.acceleration,
			timestamp : local_ts
		}
	}


	// internal provider object
	get provider() {return this._provider;};


	_onSkewChange() {
		if (!this._clock) {
			this._provider_clock = new MasterClock({skew: this._provider.skew});
			this._clock = new MasterClock({skew:0});
		} else {
			this._provider_clock.adjust({skew: this._provider.skew});
			// provider clock adjusted with new skew - correct local clock similarly
			// current_skew = clock_provider - clock_local
			let current_skew = this._provider_clock.now() - this._clock.now();
			// skew delta = new_skew - current_skew
			let skew_delta = this._provider.skew - current_skew;
			this._clock.adjust({skew: skew_delta});
		}
		if (!this.isReady() && this._provider.vector != undefined) {
			// just became ready
			this._ready = true;
			this._range = this._provider.range;
			this._vector = this._provider.vector;
			let eArg = {
				range: this.range,
				...this.vector,
				live: false
			};
			this._callback(eArg);
		}
	};

	_onVectorChange() {
		if (this._clock) {
			// is ready (onSkewChange has fired earlier)
			if (!this._ready) {
				this._ready = true;
			}
			if (!this._range) {
				this._range = this._provider.range;
			}
			this._vector = this._provider.vector;
			let eArg = {
				range: this.range,
				...this.vector
			};
			this._callback(eArg);
		}
	};


	// update
	/*
		TODO - support setting range on provider
		TODO - suppport tunnel
		TODO - support onRangeChange from provider
	*/
	update(arg) {
		let vector = {
			position: arg.position,
			velocity: arg.velocity,
			acceleration: arg.acceleration,
			timestamp: arg.timestamp
		};
		// calc back to provider ts
		// local_ts = provider_ts - skew
		vector.timestamp = vector.timestamp + this._provider.skew;
		let res = this._provider.update(vector);
		// return success
		return true;
	};
}

/*
	Copyright 2020
	Author : Ingar Mæhlum Arntzen

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

const MAX_NONCE = 10000;

function getRandomInt() {
 	return Math.floor(Math.random() * MAX_NONCE);
}
function isTimingProvider(obj){
	let required = ["on", "skew", "vector", "range", "update"];
	for (let prop of required) {
		if (!(prop in obj)) {
			return false;
		}
	}
	return true;
}

function checkRange$1(live, now, vector, range) {
	if (live) {
		return checkRange(vector, range);
	} else {
		let now_vector = calculateVector(vector, now);
		return checkRange(now_vector, range);
	}
}



/*
	TIMING BASE

	abstract base class for objects that may be used as timingsrc

	essential internal state
	- range, vector

	external methods
	query, update

	events
	on/off "change", "timeupdate"

	internal methods for range timeouts

	defines internal processing steps
	- handleEvent(arg) <- from external timingobject
		- vector = onChange(vector)
		- process(vector) <- from timeout or preProcess
	- handleTimeout(arg) <- timeout on range restrictions
	- process (arg)
		- set internal vector, range
		- dispatchEvents(arg)
		- renew range timeout
	- dispatchEvent (arg)
		- emit change event and timeupdate event
		- turn periodic timeupdate on or off

	individual steps in this structure may be specialized
	by subclasses (i.e. timing converters)
*/


class TimingObject {

	constructor (timingsrc, options) {

		// special support for options given as first and only argument
		// equivalent to new TimingObject(undefined, options)
		// in this case, timingsrc may be found in options
		if (timingsrc != undefined && options == undefined) {
			if (!(timingsrc instanceof TimingObject) && !isTimingProvider(timingsrc)) {
				// timingsrc is neither timing object nor timingprovider
				// assume timingsrc is options
				options = timingsrc;
				timingsrc = undefined;
				if (options.provider) {
					timingsrc = options.provider;
				} else if (options.timingsrc) {
					timingsrc = options.timingsrc;
				}
			}		}

		// options
		options = options || {};
		this.__options = options;


		// default timeout option
		if (options.timeout == undefined) {
			options.timeout = true;
		}

		// cached vectors and range
		this.__old_vector;
		this.__vector;
		this.__range = [-Infinity, Infinity];

		// range restriction timeout
		this.__timeout = new Timeout(this, this.__handleTimeout.bind(this));

		// timeoutid for timeupdate event
		this.__tid = undefined;

		// timingsrc
		this.__timingsrc;
		this.__sub;

		// update promises
		this.__update_events = new Map();

		// readiness
		this.__ready = new eventify.EventBoolean();

		// exported events
		eventify.eventifyInstance(this);
		this.eventifyDefine("timingsrc", {init:true});
		this.eventifyDefine("change", {init:true});
		this.eventifyDefine("rangechange", {init:true});
		this.eventifyDefine("timeupdate", {init:true});

		// initialise timingsrc
		this.__set_timingsrc(timingsrc, options);
	};


	/***************************************************************

		EVENTS

	***************************************************************/

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
	  	- overrides to add support for timeupdate events
	*/
	eventifyInitEventArgs(name) {
		if (this.__ready.value) {
			if (name == "timingsrc") {
				let eArg = {
					...this.__vector,
					range: this.__range,
					live:false
				};
				return [eArg];
			} else if (name == "timeupdate") {
				return [undefined];
			} else if (name == "change") {
				return [this.__vector];
			} else if (name == "rangechange") {
				return [this.__range];
			}
		}
	};


	/***************************************************************

		ACCESSORS

	***************************************************************/

	// ready or not
	isReady() {return this.__ready.value;};

	// ready promise
    get ready() {return eventify.makePromise(this.__ready);};

    // range
    get range() {
    	// copy
    	return [this.__range[0], this.__range[1]];
    };

    // vector
    get vector() {
    	// copy
		return {
			position : this.__vector.position,
			velocity : this.__vector.velocity,
			acceleration : this.__vector.acceleration,
			timestamp : this.__vector.timestamp
		};
    };

    // old vector
    get old_vector() {return this.__old_vector;};

    // delta
    get delta() {
    	return new MotionDelta(this.__old_vector, this.__vector);
    }

	// clock - from timingsrc or provider
	get clock() {return this.__timingsrc.clock};



	/***************************************************************

		QUERY

	***************************************************************/

	// query
	query() {
		if (this.__ready.value == false)  {
			throw new Error("query before timing object is ready");
		}
		// reevaluate state to handle range violation
		let vector = calculateVector(this.__vector, this.clock.now());
		// detect range violation - only if timeout is set {
		if (this.__timeout.isSet()) {
			if (vector.position < this.__range[0] || this.__range[1] < vector.position) {
				// emulate update event to trigger range restriction
				this.__process({...this.onRangeViolation(vector)});
			}
			// re-evaluate query after state transition
			return calculateVector(this.__vector, this.clock.now());
		}
		return vector;
	};

	// shorthand query
	get pos() {return this.query().position;};
	get vel() {return this.query().velocity;};
	get acc() {return this.query().acceleration;};


	/***************************************************************

		UPDATE

	***************************************************************/

	// internal update
	__update(arg) {
		if (this.__timingsrc instanceof TimingObject) {
			return this.__timingsrc.__update(arg);
		} else {
			// provider
			return this.__timingsrc.update(arg);
		}
	};

	// external update
	update(arg) {
		// check if noop
		let ok = (arg.range != undefined);
		ok = ok || (arg.position != undefined);
		ok = ok || (arg.velocity != undefined);
		ok = ok || (arg.acceleration != undefined);
		if (!ok) {
			return Promise.resolve(arg);
		}
		arg.tunnel = getRandomInt();
		if (arg.timestamp == undefined) {
			arg.timestamp = this.clock.now();
		}
		let event = new eventify.EventVariable();
		this.__update_events.set(arg.tunnel, event);
		let promise = eventify.makePromise(event, val => (val != undefined));
		this.__update(arg);
		return promise;
	}


	/***************************************************************

		CORE UPDATE PROCESSING

	***************************************************************/

	/*
		do not override
		handle incoming change event
		eArg = {vector:vector, range:range, live:true}

		subclasses may specialise behaviour by overriding
		onVectorChange

	*/
	__handleEvent(arg) {
		let {
			range,
			live = true,
			...rest
		} = arg;
		// copy range object
		if (range != undefined) {
			range = [range[0], range[1]];
		}
		// new arg object
		let _arg = {
			range,
			live,
			...rest,
		};
		_arg = this.onUpdateStart(_arg);
		if (_arg != undefined) {
			return this.__process(_arg);
		}
	};

	/*
		do not override
		handle timeout
	*/
	__handleTimeout(now, vector) {
		this.__process({...this.onRangeViolation(vector)});
	}

	/*
		core processing step after change event or timeout
		assignes the internal vector
	*/
	__process(arg) {
		let {
			range,
			position,
			velocity,
			acceleration,
			timestamp,
			live=true,
			...rest
		} = arg;


		// update range
		let range_change = false;
		if (range != undefined) {
			let [low, high] = range;
			if (low < high) {
				if (low != this.__range[0] || high != this.__range[1]) {
					this.__range = [low, high];
					range = [low, high];
					range_change = true;
				}
			}
		}

		// update vector
		let vector;
		let vector_change = false;
		let now = this.clock.now();

		// make sure vector is consistent with range
		if (position != undefined) {
			// vector change
			vector = {position, velocity, acceleration, timestamp};
			// make sure vector is consistent with range
			vector = checkRange$1(live, now, vector, this.__range);
		} else {
			// there is no vector change, but if range was changed,
			// the current vector must be checked for new range.
			if (range_change) {
				vector = checkRange$1(false, now, this.__vector, this.__range);
			}
		}

		if (vector != undefined) {
			// update vector
			if (this.__vector != undefined) {
				vector_change = !equalVectors(vector, this.__vector);
			} else {
				vector_change = true;
			}
			if (vector_change) {
				// save old vector
				this.__old_vector = this.__vector;
				// update vector
				this.__vector = vector;
			}
		}

		let _arg;
		if (range_change && vector_change) {
			_arg = {range, ...vector, live, ...rest};
		} else if (range_change) {
			_arg = {range, live, ...rest};
		} else if (vector_change) {
			_arg = {...vector, live, ...rest};
		} else {
			_arg = {live, ...rest};
		}

		// trigger events
		this.__ready.value = true;
		this.__dispatchEvents(_arg, range_change, vector_change);
		// renew timeout
		if (this.__options.timeout) {
			this.__renewTimeout();
		}
		// release update promises
		if (_arg.tunnel != undefined) {
			let event = this.__update_events.get(_arg.tunnel);
			if (event) {
				this.__update_events.delete(_arg.tunnel);
				delete _arg.tunnel;
				event.value = _arg;
			}
		}
		// TODO
		// since externalprovider does not support tunnel yet
		// free all remaining promises
		for (let event of this.__update_events.values()) {
			event.value = {};
		}
		this.onUpdateDone(_arg);
		return _arg;
	};

	/*
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events
		need to be suppressed,
	*/
	__dispatchEvents(arg, range_change, vector_change) {
		let {
			range,
			position,
			velocity,
			acceleration,
			timestamp
		} = arg;
		// trigger timingsrc events
		this.eventifyTrigger("timingsrc", arg);
		// trigger public change events
		if (vector_change) {
			let vector = {position, velocity, acceleration, timestamp};
			this.eventifyTrigger("change", vector);
		}
		if (range_change) {
			this.eventifyTrigger("rangechange", range);
		}
		// trigger timeupdate events
		this.eventifyTrigger("timeupdate");
		let moving = isMoving(this.__vector);
		if (moving && this.__tid === undefined) {
			let self = this;
			this.__tid = setInterval(function () {
				self.eventifyTrigger("timeupdate");
			}, 200);
		} else if (!moving && this.__tid !== undefined) {
			clearTimeout(this.__tid);
			this.__tid = undefined;
		}
	};


	/***************************************************************

		SUBCLASS MAY OVERRIDE

	***************************************************************/

	/*
		may be overridden
	*/
	onRangeViolation(vector) {return vector;};

	/*
		may be overridden
	*/
	onUpdateStart(arg) {return arg;};

	/*
		may be overridden
	*/
	onUpdateDone(arg) {};


	/***************************************************************

		TIMEOUTS

	***************************************************************/

	/*
		renew timeout is called during every processing step
		in order to recalculate timeouts.

		- optional vector - default is own vector
		- optional range - default is own range
	*/
	__renewTimeout(vector, range) {
		this.__timeout.clear();
		let timeout_vector = this.__calculateTimeoutVector(vector, range);
		if (timeout_vector == undefined) {
			return;
		}
		this.__timeout.setTimeout(timeout_vector.timestamp, timeout_vector);
	};


	/*
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.

		- optional vector - default is own vector
		- optional range - default is own range
	*/
	__calculateTimeoutVector(vector, range) {
		vector = vector || this.__vector;
		range = range || this.__range;
		let now = this.clock.now();
		let now_vector = calculateVector(vector, now);
		let [delta, pos] = calculateDelta(now_vector, range);
		if (delta == undefined || delta == Infinity) {
			return;
		}
		// vector when range restriction will be reached
		let timeout_vector = calculateVector(vector, now + delta);
		// possibly avoid rounding errors
		timeout_vector.position = pos;
		return timeout_vector;
	};


	/***************************************************************

		TIMINGSRC

	***************************************************************/

	/*

		timingsrc property and switching on assignment

	*/
	__clear_timingsrc() {
		// clear timingsrc
		if (this.__timingsrc != undefined) {
			if (this.__timingsrc instanceof TimingObject) {
				this.__timingsrc.off(this.__sub);
				this.__sub = undefined;
				this.__timingsrc = undefined;
			} else {
				// provider
				this.__timingsrc.close();
				this.__timingsrc = undefined;
			}
		}
	}

	__set_timingsrc(timingsrc, options) {
		// set timingsrc
		let callback = this.__handleEvent.bind(this);
		if (timingsrc instanceof TimingObject) {
			// timingsrc
			this.__timingsrc = timingsrc;
			this.__sub = this.__timingsrc.on("timingsrc", callback);
		} else {
			// provider
			if (timingsrc == undefined) {
				// Internal Provider
				this.__timingsrc = new InternalProvider(callback, options);
			} else {
				// External Provider
				this.__timingsrc = new ExternalProvider(timingsrc, callback, options);
			}
			// emulating initial event from provider, causing
			// this timingobject to initialise
			if (this.__timingsrc.isReady()) {
				let arg = {
					range: this.__timingsrc.range,
					...this.__timingsrc.vector,
					live: false
				};
				// generate initial event
				callback(arg);
			}
		}
	}

	get timingsrc () {return this.__timingsrc;};
	set timingsrc(timingsrc) {
		this.__clear_timingsrc();
		this.__set_timingsrc(timingsrc);
	}

}

eventify.eventifyPrototype(TimingObject.prototype);

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


class SkewConverter extends TimingObject {

	constructor (timingsrc, skew, options) {
		super(timingsrc, options);
		this._skew = skew;
        this.eventifyDefine("skewchange", {init:true});
	}

    // extend
    eventifyInitEventArgs(name) {
        if (name == "skewchange") {
            return [this._skew];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

	// overrides
	onUpdateStart(arg) {
        if (arg.range != undefined) {
            arg.range[0] += this._skew;
            arg.range[1] += this._skew;
        }
        if (arg.position != undefined) {
			arg.position += this._skew;
        }
        return arg;
	};

	// overrides
	update(arg) {
        if (arg.position != undefined) {
			arg.position -= this._skew;
        }
        if (arg.range != undefined) {
            let [low, high] = arg.range;
            arg.range = [low - this._skew, high - this._skew];
        }
		return super.update(arg);
	};

	get skew() {return this._skew;};

	set skew(skew) {
        if (skew != this._skew) {
            // set skew and emulate new event from timingsrc
			this._skew = skew;
			this.__handleEvent({
                ...this.timingsrc.vector,
                range: this.timingsrc.range
            });
            this.eventifyTrigger("skewchange", skew);
        }
	}
}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


class DelayConverter extends TimingObject {
	constructor (timingObject, delay) {
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delayconverter pointless");}
		super(timingObject);
		// fixed delay
		this._delay = delay;
		// buffer
		this._buffer = [];
		// timeoutid
		this._timeout = new Timeout(this, this.__handleDelayed.bind(this));
        this.eventifyDefine("delaychange", {init:true});
	};

    // extend
    eventifyInitEventArgs(name) {
        if (name == "delaychange") {
            return [this._delay];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

	// overrides
	onUpdateStart(arg) {
		/*
			Vector's timestamp always time-shifted (back-dated) by delay

			Normal operation is to delay every incoming vector update.
			This implies returning null to abort further processing at this time,
			and instead trigger a later continuation.

			However, delay is calculated based on the timestamp of the vector (age), not when the vector is
			processed in this method. So, for small small delays the age of the vector could already be
			greater than delay, indicating that the vector is immediately valid and do not require delayed processing.

			This is particularly true for the first vector, which may be old.

			So we generally check the age to figure out whether to apply the vector immediately or to delay it.
		*/

		this._buffer.push(arg);
		// if timeout for next already defined, nothing to do
		if (!this._timeout.isSet()) {
			this.__handleDelayed();
		}
		return;
	};

	__handleDelayed() {
		// run through buffer and apply vectors that are due
		let now = this.clock.now();
		let arg, due;
		while (this._buffer.length > 0) {
			due = this._buffer[0].timestamp + this._delay;
			if (now < due) {
				break;
			} else {
				arg = this._buffer.shift();
				// apply
				arg.timestamp = due;
				this.__process(arg);
			}
		}
		// set new timeout
		if (this._buffer.length > 0) {
			due = this._buffer[0].timestamp + this._delay;
			this._timeout.setTimeout(due);
		}
	};

	update(arg) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

    get delay() {return this._delay;};

	set delay(delay) {
        if (delay != this._delay) {
            // set delay and emulate new event from timingsrc
            this._delay = delay;
            this._timeout.clear();
            this.__handleDelayed();
            this.eventifyTrigger("delaychange", delay);
        }
    }
}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


class ScaleConverter extends TimingObject {
    constructor (timingsrc, factor) {
		super(timingsrc);
		this._factor = factor;
        this.eventifyDefine("scalechange", {init:true});
	};

    // extend
    eventifyInitEventArgs(name) {
        if (name == "scalechange") {
            return [this._factor];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

	// overrides
    onUpdateStart(arg) {
        if (arg.range != undefined) {
            arg.range = [arg.range[0]*this._factor, arg.range[1]*this._factor];
        }
        if (arg.position != undefined) {
            arg.position *= this._factor;
        }
        if (arg.velocity != undefined) {
            arg.velocity *= this._factor;
        }
        if (arg.acceleration != undefined) {
            arg.acceleration *= this._factor;
        }
        return arg;
    }

	update(arg) {
		if (arg.position != undefined) {
            arg.position /= this._factor;
        }
		if (arg.velocity != undefined) {
            arg.velocity /= this._factor;
        }
		if (arg.acceleration != undefined) {
            arg.acceleration /= this._factor;
        }
		return super.update(arg);
	};

    get scale() {return this._factor;};

    set scale(factor) {
        if (factor != this._factor) {
            // set scale and emulate new event from timingsrc
            this._factor = factor;
            this.__handleEvent({
                ...this.timingsrc.vector,
                range: this.timingsrc.range
            });
            this.eventifyTrigger("scalechange", factor);
        }
    }
}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


// ovverride modulo to behave better for negative numbers
function mod(n, m) {
	return ((n % m) + m) % m;
}
function transform(x, range) {
	let skew = range[0];
	let length = range[1] - range[0];
	return skew + mod(x-skew, length);
}


/*
	LOOP CONVERTER
*/

class LoopConverter extends TimingObject {

	constructor(timingsrc, range) {
		super(timingsrc, {timeout:true});
		this.__range = range;
	};

	update(arg) {
		// range change - only a local operation
		if (arg.range != undefined) {
			// implement local range update
			let [low, high] = arg.range;
			if (low >= high) {
				throw new Error("illegal range", arg.range)
			}
			if (low != this.__range[0] || high != this.__range[1]) {
				this.__range = [low, high];
				let vector = this.timingsrc.query();
				vector.position = transform(vector.position, this.__range);
				this.__vector = vector;
				// trigger vector change
				let _arg = {range: this.__range, ...this.__vector, live:true};
				this.__dispatchEvents(_arg, true, true);
			}
			delete arg.range;
		}
		// vector change
		if (arg.position != undefined) {
			// inverse transformation of position, from looper
			// coordinates to timingsrc coordinates
			// preserve relative position diff
			let now = this.clock.now();
			let now_vector = calculateVector(this.vector, now);
			let diff = now_vector.position - arg.position;
			let now_vector_src = calculateVector(this.timingsrc.vector, now);
			arg.position = now_vector_src.position - diff;
		}
		return super.update(arg);
	};

	// overrides
	onRangeViolation(vector) {
		// vector is moving
		if (vector.position <= this.__range[0]) {
			vector.position = this.__range[1];
		} else if (this.__range[1] <= vector.position) {
			vector.position = this.__range[0];
		}
		return vector;
	};

	// overrides
	onUpdateStart(arg) {
        if (arg.range != undefined) {
            // ignore range change from timingsrc
            // instead, insist that this._range is correct
            arg.range = this.__range;
        }
        if (arg.position != undefined) {
        	// vector change
        	arg.position = transform(arg.position, this.__range);
        }
        return arg;
	};

}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


function state() {
	var _state = RangeState.INIT;
	var _range = null;
	var is_special_state_change = function (old_state, new_state) {
		// only state changes between INSIDE and OUTSIDE* are special state changes.
		if (old_state === RangeState.OUTSIDE_HIGH && new_state === RangeState.OUTSIDE_LOW) return false;
		if (old_state === RangeState.OUTSIDE_LOW && new_state === RangeState.OUTSIDE_HIGH) return false;
		if (old_state === RangeState.INIT) return false;
		return true;
	};
	var get = function () {return _state;};
	var set = function (new_state, new_range) {

		var absolute = false; // absolute change
		var special = false;  // special change

		// check absolute change
		if (new_state !== _state || new_range !== _range) {
			absolute = true;
		}
		// check special change
		if (new_state !== _state) {
			special = is_special_state_change(_state, new_state);
		}
		// range change
		if (new_range !== _range) {
			_range = new_range;
		}
		// state change
		if (new_state !== _state) {
			_state = new_state;
		}
		return {special:special, absolute:absolute};

	};
	return {get: get, set:set};
}

/*
	Range converter allows a new (smaller) range to be specified.

	- ignores the range of its timingsrc
	- vector change from timingsrc
	  - outside own range - drop - set timeout to inside
	  - inside own range - normal processing
	- extra vector changes (compared to timingsrc)
		- enter inside
		- range violation own range
	- range updated locally

*/

class RangeConverter extends TimingObject {

	constructor (timingObject, range) {
		super(timingObject, {timeout:true});
		this.__state = state();
		this.__range = range;
	};


	update(arg) {
		throw Error("Not Implemented!");
	};



	// overrides
	onUpdateStart(arg) {
        if (arg.range != undefined) {
        	// ignore range change from timingsrc
        	// delete causes update to be dropped
            delete arg.range;
        }
        if (arg.position != undefined) {
        	// vector change from timingsrc
        	let {position, velocity, acceleration, timestamp} = arg;
        	let vector = {position, velocity, acceleration, timestamp};
        	vector = this.onVectorChange(vector);
        	if (vector == undefined) {
        		// drop because motion is outside
				// create new timeout for entering inside
				this.__renewTimeout(this.timingsrc.vector, this.__range);
				return;
        	} else {
        		// regular
        		arg.position = vector.position;
        		arg.velocity = vector.velocity;
        		arg.acceleration = vector.acceleration;
        		arg.timestamp = vector.timestamp;
        	}
        }
        return arg;
	};


	onVectorChange(vector) {
		var new_state = correctRangeState(vector, this.__range);
		var state_changed = this.__state.set(new_state, this.__range);
		if (state_changed.special) {
			// state transition between INSIDE and OUTSIDE
			if (this.__state.get() === RangeState.INSIDE) ; else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = checkRange(vector, this.__range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this.__state.get() === RangeState.INSIDE) ; else {
				// stay outside or first event outside
				// forward if
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				// - range change
				// else drop
				// - outside-high to outside-high (no range change)
				// - outside-low to outside-low (no range change)
				if (state_changed.absolute) {
					vector = checkRange(vector, this.__range);
				} else {
					return;
				}
			}
		}
		return vector;
	};
}

/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


class TimeshiftConverter extends TimingObject {

    constructor (timingsrc, offset) {
		super(timingsrc);
		this._offset = offset;
        this.eventifyDefine("offsetchange", {init:true});
	};

    // extend
    eventifyInitEventArgs(name) {
        if (name == "offsetchange") {
            return [this._offset];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

    // overrides
    onUpdateStart(arg) {
        if (arg.range != undefined) {
            arg.range = [-Infinity, Infinity];
        }
        if (arg.position != undefined) {
            // calculate timeshifted vector
            let ts = arg.timestamp;
            let new_vector = calculateVector(arg, ts + this._offset);
            arg.position = new_vector.position;
            arg.velocity = new_vector.velocity;
            arg.acceleration = new_vector.acceleration;
            arg.timestamp = ts;
        }
        return arg;
    };

    get offset() {return this._offset;};

    set offset(offset) {
        if (offset != this._offset) {
            // set offset and emulate new event from timingsrc
            this._offset = offset;
            this.__handleEvent({
                ...this.timingsrc.vector,
                range: this.timingsrc.range
            });
            this.eventifyTrigger("offsetchange", offset);
        }
    }

}

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

const Relation$1 = Interval.Relation;

/*
    Remove cue from array
    - noop if cue does not exist
    - returns array empty
*/
var removeCueFromArray = function (arr, cue) {
    // cue equality defined by key property
    if (arr.length == 1) {
        if (arr[0].key == cue.key) {
            arr.shift();
        }
        return arr.length == 0;
    }
    else if (arr.length == 0) {
        return true;
    } else {
        let idx = arr.findIndex(function (_cue) {
            return _cue.key == cue.key;
        });
        if (idx > -1) {
            arr.splice(idx, 1);
        }
        return arr.length == 0;
    }
};

/*
    Setup ID's for cue buckets.
*/
const CueBucketIds = [0, 10, 100, 1000, 10000, 100000, Infinity];
var getCueBucketId = function (length) {
    for (let i=0; i<CueBucketIds.length; i++) {
        if (length <= CueBucketIds[i]) {
            return CueBucketIds[i];
        }
    }
};


/*
    Delta

    Used to represent statechanges in batchMap,
    for intervals and data.
*/
const Delta = Object.freeze({
    NOOP: 0,
    INSERT: 1,
    REPLACE: 2,
    DELETE: 3
});

/*
    make a shallow copy of a cue
*/
function cue_copy(cue) {
    if (cue == undefined) {
        return;
    }
    return {
        key: cue.key,
        interval: cue.interval,
        data: cue.data
    };
}

/*
    Characterize the transition from cue_a to cue_b
    in terms of delta values for interval and data

    For instance, interval has
    - INSERT: value not in a but in b
    - DELETE: value in a but not in b
    - REPLACE: value in a and in be and not equal
    - NOOP: either remains undefined or remains equal

    optional equals function for data comparison
    otherwise simple object equality (==) is used
*/
function cue_delta(cue_a, cue_b, equals) {
    let interval_delta, data_delta, eq;
    // interval delta
    let a_interval_defined = cue_a != undefined && cue_a.interval != undefined;
    let b_interval_defined = cue_b != undefined && cue_b.interval != undefined;
    if (!a_interval_defined && !b_interval_defined) {
        interval_delta = Delta.NOOP;
    } else if (!a_interval_defined) {
        interval_delta = Delta.INSERT;
    } else if (!b_interval_defined) {
        interval_delta = Delta.DELETE;
    } else {
        // check interval equality
        eq = cue_a.interval.equals(cue_b.interval);
        interval_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
    }
    // data delta
    let a_data_defined = cue_a != undefined && cue_a.data != undefined;
    let b_data_defined = cue_b != undefined && cue_b.data != undefined;
    if (!a_data_defined && !b_data_defined) {
        data_delta = Delta.NOOP;
    } else if (!a_data_defined) {
        data_delta = Delta.INSERT;
    } else if (!b_data_defined) {
        data_delta = Delta.DELETE;
    } else {
        // check data equality
        if (equals) {
            eq = equals(cue_a.data, cue_b.data);
        } else {
            eq = object_equals(cue_a.data, cue_b.data);
        }
        data_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
    }
    return {interval: interval_delta, data: data_delta};
}



/*
    CUE ORDERING AND SORTING
*/

function cue_cmp_forwards (cue_a, cue_b) {
    return Interval.cmpLow(cue_a.iterval, cue_b.interval);
}

function cue_cmp_backwards (cue_a, cue_b) {
    return -1 * Interval.cmpHigh(cue_a.iterval, cue_b.interval);
}

function sort_cues (cues, direction=0) {
    if (direction >= 0) {
        cues.sort(cue_cmp_forwards);
    } else {
        cuess.sort(cue_cmp_backwards);
    }
}


/*
    this implements Dataset, a data collection supporting
    efficient lookup of cues tied to intervals on the timeline

    - cues may be tied to one or two points on the timeline, this
      is expressed by an Interval.
    - cues are indexed both by key and by intervals
    - the interval index is divided into a set of CueBuckets,
      based on cue interval length, for efficient lookup
*/

class Dataset extends ObservableMap {

    static sort_cues = sort_cues;
    static Delta = Delta;
    static cue_delta = cue_delta;

    constructor() {
        super();

        /*
            Initialise set of CueBuckets
            Each CueBucket is responsible for cues of a certain length
        */
        this._cueBuckets = new Map();  // CueBucketId -> CueBucket
        for (let i=0; i<CueBucketIds.length; i++) {
            let cueBucketId = CueBucketIds[i];
            this._cueBuckets.set(cueBucketId, new CueBucket(cueBucketId));
        }

        // Inline update callbacks
        this._update_callbacks = [];
    };

    /***************************************************************
        UPDATE CALLBACKS
    */

    add_callback (handler) {
        let handle = {
            handler: handler
        };
        this._update_callbacks.push(handle);
        return handle;
    };


    del_callback (handle) {
        let index = this._update_callbacks.indexof(handle);
        if (index > -1) {
            this._update_callbacks.splice(index, 1);
        }
    };


    _notify_callbacks (batchMap, relevanceInterval) {
        this._update_callbacks.forEach(function(handle) {
            handle.handler(batchMap, relevanceInterval);
        });
    };

    /***************************************************************
     MAP METHODS
    */

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }


    /***************************************************************
        UPDATE

        - insert, replace or delete cues

        update(cues, equals, check)

        <cues> ordered list of cues to be updated
        <equals> - equality function for data objects
        <check> - check cue integrity if true

        cue = {
            key:key,
            interval: Interval,
            data: data
        }

        required
        - cue.key property is defined and value is != undefined
        - if cue.interval != undefined, it must be instance of Interval

        EXAMPLES

        // INSERT (no pre-existing cue)

        cue = {key:1, interval: new Interval(3,4), data: {}}
        // insert cue with only interval
        cue = {key:1, interval: new Interval(3,4)}
        // insert cue with only data
        cue = {key:1, data: {}}


        // REPLACE (pre-existing cue)
        preexisting_cue = {key:1, interval: new Interval(3,4), data: {}}

        cue = {key:1, interval: new Interval(3,5), data: {foo:"bar"}}
        // replace interval, keep data
        cue = {key:1, interval: new Interval(3,5)}
        // replace interval, delete data
        cue = {key:1, interval: new Interval(3,5), data: undefined
        // replace data, keep interval
        cue = {key:1, data: {foo:"bar"}}
        // replace data, delete interval
        cue = {key:1, interval: undefined, data: {foo:"bar"}}

        // DELETE (pre-existing)
        cue = {key:1}
        // delete interval, keep data
        cue = {key:1, interval: undefined}
        // delete data, keep interval
        cue = {key:1, data: undefined}


        Update returns a list of event items - describes the effects of an update.
            {
                new: new_cue,
                old: old_cue,
                delta: {
                    interval: Delta,
                    data: Delta
                }
            }

        with independent delta values for interval and data:
        Delta.NOOP: 0
        Delta.INSERT: 1
        Delta.REPLACE: 2
        Delta.DELETE: 3

        Duplicates
        - if there are multiple cue operations for the same key,
          within the same batch of cues,
          these will be processed in order.

        - The old cue will always be the state of the cue,
          before the batch started.

        - The returned delta values will be calcultated relative to
          the cue before the batch started (old).

          This way, external mirroring observers may will be able to
          replicate the effects of the update operation.

    ***************************************************************/

    update(cues, options) {
        const batchMap = new Map();
        let current_cue;
        let has_interval, has_data;
        let init = this._map.size == 0;
        // options
        options = options || {};
        // check is false by default
        if (options.check == undefined) {
            options.check = false;
        }
        // chaining is true by default
        if (options.chaining == undefined) {
            options.chaining = true;
        }

        if (!isIterable(cues)) {
            cues = [cues];
        }

        /***********************************************************
            process all cues
        ***********************************************************/
        for (let cue of cues) {

            /*******************************************************
                check validity of cue argument
            *******************************************************/

            if (options.check) {
                if (!(cue) || !cue.hasOwnProperty("key") || cue.key == undefined) {
                    throw new Error("illegal cue", cue);
                }
            }
            has_interval = cue.hasOwnProperty("interval");
            has_data = cue.hasOwnProperty("data");
            if (options.check && has_interval) {
                if (!cue.interval instanceof Interval) {
                    throw new Error("interval must be Interval");
                }
            }

            /*******************************************************
                adjust cue so that it correctly represents
                the new cue to replace the current cue
                - includeds preservation of values from current cue
            *******************************************************/

            current_cue = (init) ? undefined : this._map.get(cue.key);
            if (current_cue == undefined) {
                // make sure properties are defined
                if (!has_interval) {
                    cue.interval = undefined;
                }
                if (!has_data) {
                    cue.data = undefined;
                }
            } else if (current_cue != undefined) {
                if (!has_interval && !has_data) {
                    // make sure properties are defined
                    cue.interval = undefined;
                    cue.data = undefined;
                } else if (!has_data) {
                    // REPLACE_INTERVAL, preserve data
                    cue.data = current_cue.data;
                } else if (!has_interval) {
                    // REPLACE_DATA, preserve interval
                    cue.interval = current_cue.interval;
                } else ;
            }

            /*******************************************************
                update cue
                - update _map
                - update cueBuckets
                - create batchMap
            *******************************************************/

            this._update_cue(batchMap, current_cue, cue, options);
        }
        // flush all buckets so updates take effect
        this._call_buckets("flush");
        if (batchMap.size > 0) {

            /*
                create events without delta property
                and accumulate relevance interval for batch
            */
            let relevance = {low: Infinity, high: -Infinity};

            // create list of events and remove delta property
            let items = [...batchMap.values()].map(item => {
                if (item.new && item.new.interval) {
                    relevance.low = endpoint.min(relevance.low, item.new.interval.endpointLow);
                    relevance.high = endpoint.max(relevance.high, item.new.interval.endpointHigh);
                }
                if (item.old && item.old.interval) {
                    relevance.low = endpoint.min(relevance.low, item.old.interval.endpointLow);
                    relevance.high = endpoint.max(relevance.high, item.old.interval.endpointHigh);
                }
                return {key:item.key, new:item.new, old:item.old};
            });
            // event notification
            this._notifyEvents(items);

            // create relevance Interval
            let relevanceInterval = undefined;
            if (relevance.low != Infinity) {
                relevanceInterval = Interval.fromEndpoints(relevance.low, relevance.high);
            }

            /*
                notify sequencer last so that change event
                from the dataset will be applied before change
                events from sequencers.
            */
            this._notify_callbacks(batchMap, relevanceInterval);
            return items;
        }
        return [];
    };



    /***************************************************************
        UPDATE CUE

        update operation for a single cue

        - update _map
        - generate entry for batchMap
        - update CueBucket
    ***************************************************************/

    _update_cue(batchMap, current_cue, cue, options) {
        let old_cue, new_cue;
        let item, _item;
        let oldCueBucket, newCueBucket;
        let low_changed, high_changed;
        let remove_needed, add_needed;
        let equals = options.equals;
        let chaining = options.chaining;

        if (current_cue === cue) {
            throw Error("illegal cue arg: same object as current cue");
        }

        // check for equality
        let delta = cue_delta(current_cue, cue, equals);

        // (NOOP, NOOP)
        if (delta.interval == Delta.NOOP && delta.data == Delta.NOOP) {
            item = {
                key:cue.key, new:current_cue,
                old:current_cue, delta: delta
            };
            batchMap.set(cue.key, item);
            return;
        }

        /***********************************************************
            update _map and batchMap
        ***********************************************************/

        if (current_cue == undefined) {
            // INSERT - add cue object to _map
            old_cue = undefined;
            new_cue = cue;
            this._map.set(cue.key, new_cue);
        } else if (cue.interval == undefined && cue.data == undefined) {
            // DELETE - remove cue object from _map
            old_cue = current_cue;
            new_cue = undefined;
            this._map.delete(cue.key);
        } else {
            // REPLACE
            // in-place modification of current cue
            // copy old cue before modification
            old_cue = cue_copy(current_cue);
            new_cue = current_cue;
            // update current cue in place
            new_cue.interval = cue.interval;
            new_cue.data = cue.data;
        }
        item = {key:cue.key, new:new_cue, old:old_cue, delta:delta};

        /*
            if this item has been set earlier in batchMap
            restore the correct old_cue by getting it from
            the previous batchMap item

            recalculate delta relative to old_cue
            - this delta is only for sequencers
            - continue processing with the original delta defined
            above, as this is required to correctly change cueBuckets
            which have already been affected by previous item.
        */
        if (chaining) {
            _item = batchMap.get(cue.key);
            if (_item != undefined) {
                item.old = _item.old;
                item.delta = cue_delta(new_cue, item.old, equals);
            }
        }

        batchMap.set(cue.key, item);

        /***********************************************************
            update cueBuckets

            - use delta.interval to avoid unnessesary changes

            - interval may change in several ways:
                - low changed
                - high changed
                - low and high changed
            - changed intervals may stay in bucket or change bucket:
            - changing to/from singular may require special consideration
              with respect to how many endpoints are being updated
                - singular -> singular
                - singular -> regular
                - regular -> singular
                - regular -> regular
            - changes to interval.lowInclude and interval highInclude
              do not require any changes to CueBuckets, as long
              as interval.low and interval.high values stay unchanged.
        ***********************************************************/

        if (delta.interval == Delta.NOOP) {
            // data changes are reflected in _map changes,
            // since data changes are made in-place, these
            // changes will be visible in cues registered in
            // CueBuckets
            return;
        } else if (delta.interval == Delta.INSERT) {
            remove_needed = false;
            add_needed = true;
            low_changed = true;
            high_changed = true;
        } else if (delta.interval == Delta.DELETE) {
            remove_needed = true;
            add_needed = false;
            low_changed = true;
            high_changed = true;
        } else if (delta.interval == Delta.REPLACE) {
            remove_needed = true;
            add_needed = true;
            low_changed = item.new.interval.low != item.old.interval.low;
            high_changed = item.new.interval.high != item.old.interval.high;
        }

        /*
            old cue and new cue might not belong to the same cue bucket
        */
        if (remove_needed){
            let old_bid = getCueBucketId(item.old.interval.length);
            oldCueBucket = this._cueBuckets.get(old_bid);
        }
        if (add_needed) {
            let new_bid = getCueBucketId(item.new.interval.length);
            newCueBucket = this._cueBuckets.get(new_bid);
        }

        /*
            if old CueBucket is different from the new cue Buckets
            both low and high must be moved, even it one was not
            changed
        */
        if (oldCueBucket && newCueBucket) {
            if (oldCueBucket != newCueBucket) {
                remove_needed = true;
                add_needed = true;
                low_changed = true;
                high_changed = true;
            }
        }

        /*
            dispatch add and remove operations for interval points

            cues in CueBucket may be removed using a copy of the cue,
            because remove is by key.

            cues added to CueBucket must be the correct object
            (current_cue), so that later in-place modifications become
            reflected in CueBucket.
            batchMap item.new is the current cue object.
        */

        // update low point - if changed
        if (low_changed) {
            if (remove_needed) {
                // console.log("remove old low", item.old.interval.low);
                oldCueBucket.del_endpoint(item.old.interval.low, item.old);
            }
            if (add_needed) {
                // console.log("add new low", item.new.interval.low);
                newCueBucket.add_endpoint(item.new.interval.low, item.new);
            }
        }
        // update high point - if changed
        if (high_changed) {
            if (remove_needed && !item.old.interval.singular) {
                // console.log("remove old high", item.old.interval.high);
                oldCueBucket.del_endpoint(item.old.interval.high, item.old);
            }
            if (add_needed && !item.new.interval.singular) {
                // console.log("add new high", item.new.interval.high);
                newCueBucket.add_endpoint(item.new.interval.high, item.new);
            }
        }
    }


    /*
        INTERNAL FUNCTION
        execute method across all cue buckets
        and aggregate results
    */
    _call_buckets(method, ...args) {
        const arrays = [];
        for (let cueBucket of this._cueBuckets.values()) {
            let cues = cueBucket[method](...args);
            if (cues != undefined && cues.length > 0) {
                arrays.push(cues);
            }
        }
        return array_concat(arrays);
    };

    /*
        LOOKUP ENDPOINTS

        returns (endpoint, cue) for all endpoints covered by given interval

        returns:
            - [{endpoint: endpoint, cue:cue}]
    */

    lookup_endpoints(interval) {
        return this._call_buckets("lookup_endpoints", interval);
    };


    /*
        LOOKUP
    */

    lookup(interval, mask) {
        return this._call_buckets("lookup", interval, mask);
    };


    /*
        REMOVE CUES BY INTERVAL
    */
    lookup_delete(interval, mask) {
        const cues = this._call_buckets("lookup_delete", interval, mask);
        // remove from _map and make event items
        const items = [];
        let cue;
        for (let i=0; i<cues.length; i++) {
            cue = cues[i];
            this._map.delete(cue.key);
            // check for equality
            items.push({key:cue.key, new: undefined, old: cue});
        }
        // event notification
        this._notifyEvents(items);
        return items;
    };

    /*
        CLEAR ALL CUES
    */
    clear() {
        // clear cue Buckets
        this._call_buckets("clear");
        // clear _map
        let _map = this._map;
        this._map = new Map();
        // create change events for all cues
        const items = [];
        for (let cue of _map.values()) {
            items.push({key: cue.key, new: undefined, old: cue});
        }
        // event notification
        this._notifyEvents(items);
        return items;
    };


    /*
        utility
    */
    integrity() {
        const res = this._call_buckets("integrity");

        // sum up cues and points
        let cues = [];
        let points = [];
        for (let bucketInfo of res.values()) {
            cues.push(bucketInfo.cues);
            points.push(bucketInfo.points);
        }
        cues = [].concat(...cues);
        points = [].concat(...points);
        // remove point duplicates if any
        points = [...new Set(points)];

        if (cues.length != this._map.size) {
            throw new Error("inconsistent cue count _map and aggregate cueBuckets " + cues-this._map.size);
        }

        // check that cues are the same
        for (let cue of cues.values()) {
            if (!this._map.has(cue.key)) {
                throw new Error("inconsistent cues _map and aggregate cueBuckets");
            }
        }

        return {
            cues: cues.length,
            points: points.length
        };
    };

}


/*
    CueBucket is a bucket of cues limited to specific length
*/


class CueBucket {


    constructor(maxLength) {

        // max length of cues in this bucket
        this._maxLength = maxLength;

        /*
            pointMap maintains the associations between values (points on
            the timeline) and cues that reference such points. A single point value may be
            referenced by multiple cues, so one point value maps to a list of cues.

            value -> [cue, ....]
        */
        this._pointMap = new Map();


        /*
            pointIndex maintains a sorted list of numbers for efficient lookup.
            A large volume of insert and remove operations may be problematic
            with respect to performance, so the implementation seeks to
            do a single bulk update on this structure, for each batch of cue
            operations (i.e. each invocations of addCues). In order to do this
            all cue operations are processed to calculate a single batch
            of deletes and a single batch of inserts which then will be applied to
            the pointIndex in one atomic operation.

            [1.2, 3, 4, 8.1, ....]
        */
        this._pointIndex = new BinarySearch();

        // bookeeping during batch processing
        this._created = new Set(); // point
        this._dirty = new Set(); // point

    };


    /*

        ENDPOINT BATCH PROCESSING

        Needs to translate endpoint operations into a minimum set of
        operations on the pointIndex.

        To do this, we need to record points that are created and
        points that are removed.

        The total difference that the batch of cue operations
        amounts to is expressed as one list of values to be
        deleted, and and one list of values to be inserted.
        The update operation of the pointIndex will process both
        in one atomic operation.

        On flush both the pointMap and the pointIndex will be brought
        up to speed

        created and dirty are used for bookeeping during
        processing of a cue batch. They are needed to
        create the correct diff operation to be applied on pointIndex.

        created : includes values that were not in pointMap
        before current batch was processed

        dirty : includes values that were in pointMap
        before current batch was processed, and that
        have been become empty at least at one point during cue
        processing.

        created and dirty are used as temporary alternatives to pointMap.
        after the cue processing, pointmap will updated based on the
        contents of these two.

        process buffers operations for pointMap and index so that
        all operations may be applied in one batch. This happens in flush
    */

    add_endpoint(point, cue) {
        let init = (this._pointMap.size == 0);
        let cues = (init) ? undefined : this._pointMap.get(point);
        if (cues == undefined) {
            this._pointMap.set(point, [cue]);
            this._created.add(point);
        } else {
            cues.push(cue);
            //addCueToArray(cues, cue);
        }
    }

    del_endpoint(point, cue) {
        let init = (this._pointMap.size == 0);
        let cues = (init) ? undefined : this._pointMap.get(point);
        if (cues != undefined) {
            let empty = removeCueFromArray(cues, cue);
            if (empty) {
                this._dirty.add(point);
            }
        }
    };

    /*
        Batch processing is completed
        Commit changes to pointIndex and pointMap.

        pointMap
        - update with contents of created

        pointIndex
        - points to delete - dirty and empty
        - points to insert - created and non-empty

        it is possible that a cue ends up in both created and dirty

    */
    flush() {
        if (this._created.size == 0 && this._dirty.size == 0) {
            return;
        }

        // update pointIndex
        let to_remove = [];
        let to_insert = [];
        for (let point of this._created.values()) {
            let cues = this._pointMap.get(point);
            if (cues.length > 0) {
                to_insert.push(point);
            } else {
                this._pointMap.delete(point);
            }
        }
        for (let point of this._dirty.values()) {
            let cues = this._pointMap.get(point);
            if (cues == undefined) {
                // point already deleted from created set - ignore
                continue;
            }
            if (cues.length == 0) {
                to_remove.push(point);
                this._pointMap.delete(point);
            }
        }
        this._pointIndex.update(to_remove, to_insert);
        // cleanup
        this._created.clear();
        this._dirty.clear();
    };


    /*
        LOOKUP_ENDPOINTS

        returns all (endpoint, cue) pairs where
            - endpoint is a cue endpoint (cue.endpointLow or cue.endpointHigh)
            - endpoint is INSIDE search interval
            - [{endpoint:endpoint, cue: cue}]

        - a given endpoint may appear multiple times in the result,
          as multiple cues may be tied to the same endpoint
        - a given cue may appear two times in the result, if
          both cue.endpointLow and cue.endpointHigh are both INSIDE interval
        - a singular cue will appear only once
        - ordering: no specific order is guaranteed
          - results are concatenated from multiple CueBuckets
          - internally in a single CueBucket
            - no defined order for cues tied to the same endpoint
          - the natural order is endpoint order
            - but this can be added on the outside if needed
            - no order is defined if two cues have exactly the
              same endpoint

    */

    lookup_endpoints(interval) {
        if (this._pointMap.size == 0) {
            return [];
        }
        const broader_interval = new Interval(interval.low, interval.high, true, true);
        const points = this._pointIndex.lookup(broader_interval);
        const result = [];
        const len = points.length;
        let point, _endpoint;
        for (let i=0; i<len; i++) {
            point = points[i];
            this._pointMap.get(point)
                .forEach(function (cue) {
                    /*
                        figure out if point is endpoint low or high
                        include cue if the endpoint is inside search interval
                    */
                    if (point == cue.interval.low) {
                        _endpoint = cue.interval.endpointLow;
                    } else if (point == cue.interval.high) {
                        _endpoint = cue.interval.endpointHigh;
                    } else {
                        console.log(point);
                        console.log(cue);
                        throw new Error("fatal: point cue mismatch");
                    }
                    if (interval.covers_endpoint(_endpoint)) {
                        result.push({endpoint:_endpoint, cue:cue});
                    }
                });
        }
        return result;
    }


    /*
        _LOOKUP CUES

        Internal function, used by LOOKUP.

        Return list of cues
        - all cues with at least one endpoint value v,
          where interval.low <= v <= interval.high
        - no duplicates

        Note - some cues may be outside the search interval
        e.g. if the search interval is [.., 4) then
        (4, ...] will be returned, even if this strictly
        is OUTSIDE_RIGHT the search interval.
        This is necessary in lookup for correct calculation of covers
        from left_interval.
    */

    _lookup_cues(interval) {
        if (this._pointMap.size == 0) {
            return [];
        }
        const broader_interval = new Interval(interval.low, interval.high, true, true);
        const points = this._pointIndex.lookup(broader_interval);
        const len = points.length;
        const cueSet = new Set();
        const result = [];
        for (let i=0; i<len; i++) {
            this._pointMap.get(points[i])
                .forEach(function(cue) {
                    // avoid duplicates
                    if (cueSet.has(cue.key)) {
                        return;
                    } else {
                        cueSet.add(cue.key);
                    }
                    result.push(cue);
                });
        }
        return result;
    }



    /*
        LOOKUP

        Strategy split task into two subtasks,

        1) find cues [OVERLAP_LEFT, COVERED, EQUALS, OVERLAP_RIGHT]
        2) find cues [COVERS]

        // mode order
        Relation.OVERLAP_LEFT,
        Relation.COVERED,
        Relation.EQUALS,
        Relation.COVERS,
        Relation.OVERLAP_RIGHT
    */


    lookup(interval, mask=Interval.Match.COVERS) {

        if (this._pointMap.size == 0) {
            return [];
        }

        let cues = [];

        // ignore illegal values
        mask &= Interval.Match.COVERS;

        // special case only [EQUALS]
        if (mask == Relation$1.EQUALS) {
            return this._pointMap.get(interval.low).filter(function(cue) {
                return cue.interval.match(interval, Relation$1.EQUALS);
            });
        }

        // handle match with the basic lookup mask first
        // [OVERLAP_LEFT, COVERED, EQUALS, OVERLAP_RIGHT]
        let _mask = mask & Interval.Match.OVERLAP;
        if (_mask) {
            // keep cues which match lookup part of basic mask,
            cues = this._lookup_cues(interval)
                .filter(function(cue){
                    return cue.interval.match(interval, _mask);
                });
        }

        /*
            intervals in this CueBucket are limited by maxLength
            if interval.length is larger than maxLength, no cue
            in this CueBucket can cover interval
        */
        if (interval.length > this._maxLength) {
            return cues;
        }

        /*
            handle match with COVERS separately

            search left of search interval for cues
            that covers the search interval
            search left is limited by CueBucket maxlength
            left_interval: [interval.high-maxLength, interval.low]

            it would be possible to search right too, but we
            have to choose one.
        */
        if (mask & Relation$1.COVERS) {


            let low = interval.high - this._maxLength;
            let high = interval.low;
            // protect against float rounding effects creating
            // high < low by a very small margin
            [low, high] = [Math.min(low, high), Math.max(low, high)];
            let left_interval = new Interval(low, high, true, true);
            this._lookup_cues(left_interval)
                .forEach(function(cue){
                    if (cue.interval.match(interval, Relation$1.COVERS)) {
                        cues.push(cue);
                    }
                });
        }

        return cues;
    }


    /*
        REMOVE CUES
    */
    lookup_delete(interval, mask) {
        /*
            update pointMap
            - remove all cues from pointMap
            - remove empty entries in pointMap
            - record points that became empty, as these need to be deleted in pointIndex
            - separate into two bucketes, inside and outside
        */
        const cues = this.lookup(interval, mask);
        const to_remove = [];
        let cue, point, points;
        for (let i=0; i<cues.length; i++) {
            cue = cues[i];
            // points of cue
            if (cue.interval.singular) {
                points = [cue.interval.low];
            } else {
                points = [cue.interval.low, cue.interval.high];
            }
            for (let j=0; j<points.length; j++) {
                point = points[j];
                // remove cue from pointMap
                // delete pointMap entry only if empty
                let empty = removeCueFromArray(this._pointMap.get(point), cue);
                if (empty) {
                    this._pointMap.delete(point);
                    to_remove.push(point);
                }
            }
        }

        /*
            update pointIndex

            - remove all points within pointIndex
            - exploit locality, the operation is limited to a segment of the index, so
              the basic idea is to take out a copy of segment (slice), do modifications, and then reinsert (splice)
            - the segment to modify is limited by [interval.low - maxLength, interval.high + maxLenght] as this will cover
              both cues inside, partial and overlapping.

            # Possible - optimization
            alternative approach using regular update could be more efficient for very samll batches
            this._pointIndex.update(to_remove, []);
            it could also be comparable for huge loads (250.000 cues)
        */

        to_remove.sort(function(a,b){return a-b});
        this._pointIndex.removeInSlice(to_remove);

        /*
            alternative solution
            this._pointIndex.update(to_remove, []);
        */

        return cues;
    };


    /*
        Possible optimization. Implement a removecues method that
        exploits locality by removing an entire slice of pointIndex.
        - this can safely be done for LookupMethod.OVERLAP and PARTIAL.
        - however, for LookupMethod.INSIDE, which is likely the most useful
          only some of the points in pointIndex shall be removed
          solution could be to remove entire slice, construct a new slice
          with those points that should not be deleted, and set it back in.
    */
    clear() {
        this._pointMap.clear();
        this._pointIndex = new BinarySearch();
        this._created.clear();
        this._dirty.clear();
    };


    /*
        Integrity test for cue bucket datastructures
        pointMap and pointIndex
    */
    integrity() {

        if (this._pointMap.size !== this._pointIndex.length) {
            throw new Error("unequal number of points " + (this._pointMap.size - this._pointIndex.length));
        }

        // check that the same cues are present in both pointMap and pointIndex
        const missing = new Set();
        for (let point of this._pointIndex.values()) {
            if (!this._pointMap.has(point)){
                missing.add(point);
            }
        }
        if (missing.size > 0) {
            throw new Error("differences in points " + [...missing]);
        }

        // collect all cues
        let cues = [];
        for (let _cues of this._pointMap.values()) {
            for (let cue of _cues.values()) {
                cues.push(cue);
            }
        }
        // remove duplicates
        cues = [...new Map(cues.map(function(cue){
            return [cue.key, cue];
        })).values()];

        // check all cues
        for (let cue of cues.values()) {
            if (cue.interval.length > this._maxLength) {
                throw new Error("cue interval violates maxLength ",  cue);
            }
            let points;
            if (cue.singular) {
                points = [cue.interval.low];
            } else {
                points = [cue.interval.low, cue.interval.high];
            }
            for (let point of points.values()) {
                if (!this._pointIndex.has(point)) {
                    throw new Error("point from pointMap cue not found in pointIndex ", point);
                }
            }
        }

        return [{
            maxLength: this._maxLength,
            points: [...this._pointMap.keys()],
            cues: cues
        }];
    };
}

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

const pft = posInterval_from_timeInterval;

function queueCmp(a,b) {
    return endpoint.cmp(a.tsEndpoint, b.tsEndpoint);
}
class Schedule {

    // Default lookahead in seconds
    static LOOKAHEAD = 5

    constructor(axis, to, options) {
        // timingobject
        this.to = to;
        // current timeout
        this.timeout = new Timeout(to, this.run.bind(this));
        // current vector
        this.vector;
        // current time interval
        this.timeInterval;
        // current position interval
        this.posInterval;
        // axis
        this.axis = axis;
        // task queue
        this.queue = [];
        // callbacks
        this.callbacks = [];
        // options
        options = options || {};
        options.lookahead = options.lookahead || Schedule.LOOKAHEAD;
        this.options = options;
    }


    /***************************************************************
        CALLBACKS
    ***************************************************************/

    add_callback (handler) {
        let handle = {
            handler: handler
        };
        this.callbacks.push(handle);
        return handle;
    };

    del_callback (handle) {
        let index = this.callbacks.indexof(handle);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    };

    _notify_callbacks (...args) {
        this.callbacks.forEach(function(handle) {
            handle.handler(...args);
        });
    };

    /***************************************************************
        MOTION CHANGE
    ***************************************************************/

    /*
        update schedule with new motion vector
    */
    setVector(vector) {
        let now = vector.timestamp;
        // clean up current motion
        let current_vector = this.vector;
        if (this.vector != undefined) {
            this.timeout.clear();
            this.timeInterval = undefined;
            this.posInterval = undefined;
            this.queue = [];
        }
        // update vector
        this.vector = vector;
        // start scheduler if moving
        if (isMoving(this.vector)) {
            this.run(now);
        }
    }


    /***************************************************************
        TASK QUEUE
    ***************************************************************/

    /*
        push eventItem onto queue
    */
    push(eventItems) {
        eventItems.forEach(function(item) {
            if (this.timeInterval.covers_endpoint(item.tsEndpoint)) {
                this.queue.push(item);
            }
        }, this);
        // maintain ordering
        this.queue.sort(queueCmp);
    };

    /*
        pop due eventItems from queue
    */
    pop(now) {
        let res = [];
        let len = this.queue.length;
        while (this.queue.length > 0 && this.queue[0].tsEndpoint[0] <= now) {
            res.push(this.queue.shift());
        }
        return res;
    };

    /*
        return timestamp of next eventItem
    */
    next() {
        return (this.queue.length > 0) ? this.queue[0].tsEndpoint[0]: undefined;
    }


    /***************************************************************
        ADVANCE TIMEINTERVAL/POSINTERVAL
    ***************************************************************/


    /*
        advance timeInterval and posInterval if needed
    */
    advance(now) {
        let start, delta = this.options.lookahead;
        let advance = false;
        if (this.timeInterval == undefined) {
            start = now;
            advance = true;
        } else if (endpoint.leftof(this.timeInterval.endpointHigh, now)) {
            start = this.timeInterval.high;
            advance = true;
        }
        if (advance) {
            // advance intervals
            this.timeInterval = new Interval(start, start + delta, true, false);
            this.posInterval = pft(this.timeInterval, this.vector);
            // clear task queue
            this.queue = [];
        }
        return advance;
    }


    /***************************************************************
        LOAD
    ***************************************************************/

    /*
        load events
    */

    load(endpoints, minimum_tsEndpoint) {
        let endpointEvents$1 = endpointEvents(this.timeInterval,
                                                        this.posInterval,
                                                        this.vector,
                                                        endpoints);

        /*
            ISSUE 1

            Range violation might occur within timeInterval.
            All endpointEvents with .tsEndpoint later or equal to range
            violation will be cancelled.
        */
        let range_ts = rangeIntersect(this.vector, this.to.range)[0];

        /*
            ISSUE 2

            If load is used in response to dynamically added cues, the
            invocation of load might occor at any time during the timeInterval,
            as opposed to immediately after the start of timeInterval.
            This again implies that some of the endPointEvents we have found
            from the entire timeInterval might already be historic at time of
            invocation.

            Cancel endpointEvents with .tsEndpoint < minimum_ts.

            For regular loads this will have no effect since we
            do not specify a minimum_ts, but instead let it assume the
            default value of timeInterval.low.
        */
        if (minimum_tsEndpoint == undefined) {
            minimum_tsEndpoint = this.timeInterval.endpointLow;
        }

        /*
            ISSUE 3

            With acceleration the motion might change direction at
            some point, which might also be a cue endpoint. In this
            case, motion touches the cue endpoint but does not actually
            cross over it.

            For simplicity we say that this should not change the
            active state of that cue. The cue is either not activated
            or not inactivated by this occurrence. We might therefor
            simply drop such endpointEvents.

            To detect this, note that velocity will be exactly 0
            evaluated at the cue endpoint, but acceleration will be nonzero.

            Importantly, there is one exception. Dropping such events
            should only happen when 0 velocity is reached during motion,
            not at the start of a motion. For instance, in the case of
            starting with acceleration but no velocity, from a cue
            endpoint, this event should not be dropped.
            This is avoided by requiring that the tsEndpoint is not
            equal to timeInterval.endpointLow

        */

        return endpointEvents$1.filter(function(item) {
            // ISSUE 1
            if (range_ts <= item.tsEndpoint[0]) {
                // console.log("issue1");
                return false;
            }

            // ISSUE 2
            if (endpoint.leftof(item.tsEndpoint, minimum_tsEndpoint)) {
                // console.log("issue2");
                return false;
            }
            // ISSUE 3
            // checks every event. alternative approach would be
            // to calculate the ts of this event once, and compare
            // the result to the ts of all event
            if (this.vector.acceleration != 0.0) {
                let ts = item.tsEndpoint[0];
                if (ts > this.timeInterval.endpointLow[0]) {
                    let v = calculateVector(this.vector, ts);
                    if (v.position == item.endpoint[0] && v.velocity == 0) {
                        return false;
                    }
                }
            }
            return true;
        }, this);
    }


    /***************************************************************
        RUN
    ***************************************************************/

    /*
        run schedule
    */
    run(now) {
        // process - due events
        let dueEvents = this.pop(now);
        // advance schedule and load events if needed
        if (this.advance(now)) {
            // fetch cue endpoints for posInterval
            let endpointItems = this.axis.lookup_endpoints(this.posInterval);
            // load events and push on queue
            this.push(this.load(endpointItems));
            // process - possibly new due events
            dueEvents.push(...this.pop(now));
        }
        if (dueEvents.length > 0) {
            this._notify_callbacks(now, dueEvents, this);
        }
        // timeout - until next due event
        let ts = this.next() || this.timeInterval.high;
        this.timeout.setTimeout(Math.min(ts, this.timeInterval.high));
    }
}

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


function isNoop(delta) {
    return (delta.interval == Dataset.Delta.NOOP && delta.data == Dataset.Delta.NOOP);
}


/*******************************************************************
 ACTIVE MAP
*******************************************************************/
/*

    This table describes cue changes to/from active state
    based on

    - to_role - the role of the timing object

      in the case of the double sequencer a timing object
      may be *LEFT* (L), *RIGHT* (R) or, in the corner case that
      the two timing objects are at the same position,
      *SINGULAR* (S)

      in the case of the single sequencer, the role is
      always *SINGULAR* (S)


    - to_direction - the direction of the movement of the
      timing object, either *RIGHT* (R) or *LEFT* (L)

      This map is only used when timing object is in a
      moving state, so *PAUSED* (P) is not needed.

    - endpoint_type - the type of endpoint which is
      passed by the timing object during motion, either
      *LEFT* (R) endpoint or *RIGHT* (R) endpoint, or
      *SINGULAR* (S) endpoint.

    - cue_change
      *ENTER* : cue changes from not active to active
      *EXIT*: cue changes from active to not active
      *STAY*: cue stays active
      *ENTER-EXIT*: cue changes from not active to active,
                    and immediately back agoind to not active
                    This only occurs when a *SINGULAR*
                    timing object passed a *SINGULAR* cue.


    Table columns are:

    | to_role | to_direction | endpoint_type | cue change |

    left, right, left -> stay
    left, right, right -> exit
    left, right, singular -> exit

    left, left, left -> stay
    left, left, right -> enter
    left, left, singular -> enter

    right, right, left -> enter
    right, right, right -> stay
    right, right, singular -> enter

    right, left, left -> exit
    right, left, right -> stay
    right, left, singular -> exit

    // cornercase - timing objects are the same

    singular, right, left -> enter
    singular, right, right -> exit
    singular, right, singular -> enter, exit

    singular, left, left -> exit
    singular, left, right -> enter
    singular, left, singular -> enter, exit

*/

const Active = Object.freeze({
    ENTER: 1,
    STAY: 0,
    EXIT: -1,
    ENTER_EXIT: 2
});

const ActiveMap = new Map([
    ["LRL", Active.STAY],
    ["LRR", Active.EXIT],
    ["LRS", Active.EXIT],
    ["LLL", Active.STAY],
    ["LLR", Active.ENTER],
    ["LLS", Active.ENTER],
    ["RRL", Active.ENTER],
    ["RRR", Active.STAY],
    ["RRS", Active.ENTER],
    ["RLL", Active.EXIT],
    ["RLR", Active.STAY],
    ["RLS", Active.EXIT],
    ["SRL", Active.ENTER],
    ["SRR", Active.EXIT],
    ["SRS", Active.ENTER_EXIT],
    ["SLL", Active.EXIT],
    ["SLR", Active.ENTER],
    ["SLS", Active.ENTER_EXIT]
]);



/*******************************************************************
 EVENT ITEM ORDERING SORTING
*******************************************************************/

function item_cmp_forwards (item_a, item_b) {
    let itv_a = (item_a.new) ? item_a.new.interval : item_a.old.interval;
    let itv_b = (item_b.new) ? item_b.new.interval : item_b.old.interval;
    return Interval.cmpLow(itv_a, itv_b);
}

function item_cmp_backwards (item_a, item_b) {
    let itv_a = (item_a.new) ? item_a.new.interval : item_a.old.interval;
    let itv_b = (item_b.new) ? item_b.new.interval : item_b.old.interval;
    return -1 * Interval.cmpHigh(itv_a, itv_b);
}

function sort_items (items, direction=0) {
    if (direction >= 0) {
        items.sort(item_cmp_forwards);
    } else {
        items.sort(item_cmp_backwards);
    }
}


function cues_cmp_forwards (cue_a, cue_b) {
    return Interval.cmpLow(cue_a.interval, cue_b.interval);
}

function cues_cmp_backwards (cue_a, cue_b) {
    return -1 * Interval.cmpHigh(cue_a.interval, cue_b.interval);
}

function sort_cues$1 (cues, direction=0) {
    if (direction >= 0) {
        cues.sort(cues_cmp_forwards);
    } else {
        cues.sort(cues_cmp_backwards);
    }
}


/*******************************************************************
 BASE SEQUENCER
*******************************************************************/

/*
    This is an abstract base class for sequencers
    It implements common logic related to Dataset, events and activeCues.
*/

class BaseSequencer extends ObservableMap {

    static Active = Active;
    static ActiveMap = ActiveMap;
    static sort_items = sort_items;

    constructor (dataset) {
        super();

        // Dataset
        this._ds = dataset;
        let cb = this._onDatasetCallback.bind(this);
        this._ds_cb = this._ds.add_callback(cb);
    }


    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        Get the direction of movement
        To be implemented by subclass
    */
    _movementDirection() {
        throw new Error("not implemented");
    }


    /*
        event order based on movement direction
    */
    _sortItems(items) {
        sort_items(items, this._movementDirection());
        return items;
    }

    sortCues(cues) {
        sort_cues$1(cues, this._movementDirection());
        return cues;
    }


    /***************************************************************
     MAP METHODS
    ***************************************************************/

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }


    /***************************************************************
     DATASET
    ***************************************************************/

    get ds () { return this._ds;}

    _onDatasetCallback(eventMap, relevanceInterval) {
        throw new Error("not implemented");
    }

    /*
        make exit, change and enter events
        - based on eventMap
    */
    _items_from_dataset_events(eventMap, interval) {
        const enterEvents = [];
        const changeEvents = [];
        const exitEvents = [];
        const first = this._map.size == 0;
        let is_active, should_be_active, _item;
        for (let item of eventMap.values()) {
            if (isNoop(item.delta)) {
                continue;
            }
            // exit, change, enter events
            is_active = (first) ? false : this._map.has(item.key);
            should_be_active = false;
            if (item.new != undefined) {
                if (item.new.interval.match(interval)) {
                    should_be_active = true;
                }
            }
            if (is_active && !should_be_active) {
                // exit
                _item = {key:item.key, new:undefined, old:item.old};
                exitEvents.push(_item);
            } else if (!is_active && should_be_active) {
                // enter
                _item = {key:item.key, new:item.new, old:undefined};
                enterEvents.push(_item);
            } else if (is_active && should_be_active) {
                // change
                _item = {key:item.key, new:item.new, old:item.old};
                changeEvents.push(_item);
            }
        }        return [exitEvents, changeEvents, enterEvents];
    }

    /*
        make exit, change and enter events
        - based on dataset.lookup
    */
    _items_from_dataset_lookup(eventMap, interval) {

        /*
            Active cues

            find new set of active cues by querying the dataset
        */
        const _activeCues = new Map(this._ds.lookup(interval).map(function(cue) {
            return [cue.key, cue];
        }));

        let changeEvents = [];
        let exitEvents = [];
        let first = (this._map.size == 0);
        if (!first){

            /*
                Change Events

                change cues - cues which are modified, yet remain active cues
            */
            let remainCues = map_intersect(this._map, _activeCues);
            if (remainCues.size > 0) {
                /*
                    Two approaches

                    1) large eventMap
                    eventMap larger than remainCues
                    - iterate remainCues
                    - keep those that are found in eventMap

                    2) large remainCues
                    remainCues larger than eventMap
                    - iterate eventMap
                    - keep those that are found in remainCues

                    measurement shows that 2) is better
                */
                let cue, _item;
                for (let item of eventMap.values()) {
                    cue = remainCues.get(item.key);
                    if (cue != undefined && !isNoop(item.delta)) {
                        _item = {key:item.key, new:item.new, old:item.old};
                        changeEvents.push(_item);
                    }
                }
            }

            /*
                Exit Events
                exit cues were in old active cues - but not in new
            */
            let exitCues = map_difference(this._map, _activeCues);
            exitEvents = [...exitCues.values()]
                .map(cue => {
                    return {key:cue.key, new:undefined, old:cue};
                });
        }

        /*
            Enter Events
            enter cues were not in old active cues - but are in new
        */
        let enterCues;
        if (first) {
            enterCues = _activeCues;
        } else {
            enterCues = map_difference(_activeCues, this._map);
        }
        let enterEvents = [...enterCues.values()]
            .map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });

        return [exitEvents, changeEvents, enterEvents];
    }
}

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

const PosDelta = MotionDelta.PosDelta;
const MoveDelta = MotionDelta.MoveDelta;
const Active$1 = BaseSequencer.Active;
const ActiveMap$1 = BaseSequencer.ActiveMap;

const EVENTMAP_THRESHOLD = 5000;
const ACTIVECUES_THRESHOLD = 5000;


class PointModeSequencer extends BaseSequencer {

    constructor (dataset, to) {

        super(dataset);

        // Timing Object
        this._to = to;
        this._sub = this._to.on("timingsrc", this._onTimingCallback.bind(this));

        // Schedule
        this._sched = new Schedule(this._ds, to);
        let cb = this._onScheduleCallback.bind(this);
        this._sched_cb = this._sched.add_callback(cb);
    }


    /*
        Implement movement direction from single timing object
    */
    _movementDirection() {
        const now = this._to.clock.now();
        return calculateDirection(this._to.vector, now);
    }


    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    /*
        Handling Dataset Update Callbacks
    */

    _onDatasetCallback(eventMap, relevanceInterval) {
        /*
            process dataset events which are relevant to the set
            of activeCues, or to the immediate future (schedule)

            enterCues - inactive -> active
            changeCues - active -> active, but changed
            exitCues - active -> inactive

            Two approaches
            - 1) EVENTS: filter list of events - compare to current active cues
            - 2) LOOKUP: regenerate new activeCues by looking up set of
                 active cues from dataset, compare it to current active cues


            EventMap.size < about 1K-10K (5K)
            - EVENTS better or equal
            EventMap.size > about 5K
            - LOOKUP better
            - exception
                - If activeCues.size > 1K-10K (5K) - EVENTS BETTER

            If new cues are predominantly active cues, EVENTS are
            always better - and more so for larger sets of events.
            However, there is no information about this
            before making the choice, and also this is a somewhat
            unlikely scenario.

            So, the simple policy above works for typical workloads,
            where the majority of added cues are inactive.
        */

        if (!this._to.isReady()) {
            return;
        }

        if (relevanceInterval == undefined) {
            return;
        }

        const now = this._to.clock.now();
        const now_vector = calculateVector(this._to.vector, now);

        // activeInterval
        const activeInterval = new Interval(now_vector.position);

        if (!activeInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
            // relevanceInterval is NOT outside activeInterval
            // some events relevant for activeIntervale

            // choose approach to get events
            let get_items = this._items_from_dataset_events.bind(this);
            if (EVENTMAP_THRESHOLD < eventMap.size) {
                if (this._map.size < ACTIVECUES_THRESHOLD) {
                    get_items = this._items_from_dataset_lookup.bind(this);
                }
            }

            // get items
            const [exit, change, enter] = get_items(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._map.delete(item.key);
            });
            enter.forEach(item => {
                this._map.set(item.key, item.new);
            });

            // notifications
            const items = array_concat([exit, change, enter], {copy:true, order:true});

            // sort event items according to general movement direction
            let direction = calculateDirection(now_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
        }

        /*
            clear schedule

            This is only necessary if a cue interval is changed,
            and the change is relevant within the posInterval of
            of the schedule. RelevanceInterval to figure this out.
        */
        if (this._sched.posInterval) {
            if (!this._sched.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._sched.setVector(now_vector);
            }
        }
    }


    /***************************************************************
     TIMING OBJECT CALLBACK
    ***************************************************************/

    _onTimingCallback (eArg) {
        /*
            If update is the initial vector from the timing object,
            we set current time as the official time for the update.
            Else, the new vector is "live" and we use the timestamp
            when it was created as the official time for the update.
            This is represented by the new_vector.
        */
        let new_vector;

        if (eArg.live) {
            new_vector = this._to.vector;
        } else {
            // make a live vector from to vector
            new_vector = calculateVector(this._to.vector, this._to.clock.now());
        }

        /*
            The nature of the vector change
        */
        let delta = new MotionDelta(this._to.old_vector, new_vector);

        /*
            Reevaluate active state.
            This is required after any discontinuity of the position (jump),
            or if the motion stopped without jumping (pause or halt at range
            restriction)
        */
        const items = [];
        if (delta.posDelta == PosDelta.CHANGE || delta.moveDelta == MoveDelta.STOP) {
            // make position interval
            let low = new_vector.position;
            let high = new_vector.position;
            let itv = new Interval(low, high, true, true);
            // new active cues
            let activeCues = new Map(this._ds.lookup(itv).map(cue => {
                return [cue.key, cue];
            }));
            // exit cues - in old activeCues but not in new activeCues
            let exitCues = map_difference(this._map, activeCues);
            // enter cues - not in old activeCues but in new activeCues
            let enterCues = map_difference(activeCues, this._map);
            // update active cues
            this._map = activeCues;
            // make event items
            for (let cue of exitCues.values()) {
                items.push({key:cue.key, new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                items.push({key:cue.key, new:cue, old:undefined});
            }

            // sort event items according to general movement direction
            let direction = calculateDirection(new_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
        }

        /*
            Handle Timing Object Moving
        */
        this._sched.setVector(new_vector);
    };


    /***************************************************************
     SCHEDULE CALLBACK
    ***************************************************************/

    _onScheduleCallback = function(now, endpointItems, schedule) {
        if (!this._to.isReady()) {
            return;
        }

        const items = [];
        endpointItems.forEach(function (item) {
            let cue = item.cue;
            let has_cue = this._map.has(cue.key);
            let [value, right, closed, singular] = item.endpoint;

            /*
                Action Code - see sequenceutils
            */
            // to role
            let to_role = "S";
            // movement direction
            let to_dir = (item.direction > 0) ? "R" : "L";
            // endpoint type
            let ep_type = (singular) ? "S": (right) ? "R" : "L";
            // action code, enter, exit, stay, enter-exit
            let action_code = ActiveMap$1.get(`${to_role}${to_dir}${ep_type}`);

            if (action_code == Active$1.ENTER_EXIT) {
                if (has_cue) {
                    // exit
                    items.push({key:cue.key, new:undefined, old:cue});
                    this._map.delete(cue.key);
                } else {
                    // enter
                    items.push({key:cue.key, new:cue, old:undefined});
                    // exit
                    items.push({key:cue.key, new:undefined, old:cue});
                    // no need to both add and remove from activeCues
                }
            } else if (action_code == Active$1.ENTER) {
                if (!has_cue) {
                    // enter
                    items.push({key:cue.key, new:cue, old:undefined});
                    this._map.set(cue.key, cue);
                }
            } else if (action_code == Active$1.EXIT) {
                if (has_cue) {
                    // exit
                    items.push({key:cue.key, new:undefined, old:cue});
                    this._map.delete(cue.key);
                }
            }
        }, this);

        // Event items already sorted

        // event notification
        this._notifyEvents(items);
    };
}

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

const PosDelta$1 = MotionDelta.PosDelta;
const MoveDelta$1 = MotionDelta.MoveDelta;
const Active$2 = BaseSequencer.Active;
const ActiveMap$2 = BaseSequencer.ActiveMap;

const EVENTMAP_THRESHOLD$1 = 5000;
const ACTIVECUES_THRESHOLD$1 = 5000;

/*
    calculate general movement direction for double sequencer
    define movement direction as the aggregate movement direction
    for both timing objects
*/
function movement_direction (now_vector_A, now_vector_B) {
    let direction_A = calculateDirection(now_vector_A);
    let direction_B = calculateDirection(now_vector_B);
    let direction = direction_A + direction_B;
    return (direction > 0) ? 1 : (direction < 0) ? -1 : 0;
}


class IntervalModeSequencer extends BaseSequencer {

    constructor (dataset, toA, toB) {

        super(dataset);

        // Timing objects
        this._toA = toA;
        this._toA_ready = false;
        this._toB = toB;
        this._toB_ready = false;
        let to_cb = this._onTimingCallback.bind(this);
        this._subA = this._toA.on("timingsrc", to_cb);
        this._subB = this._toB.on("timingsrc", to_cb);

        // Schedules
        let sched_cb = this._onScheduleCallback.bind(this);
        this._schedA = new Schedule(this._ds, toA);
        this._schedA_cb = this._schedA.add_callback(sched_cb);
        this._schedB = new Schedule(this._ds, toB);
        this._schedB_cb = this._schedB.add_callback(sched_cb);
    }


    _isReady() {
        return (this._toA_ready && this._toB_ready);
    }


    /*
        Implement movement direction from two timing objects
    */

    _movementDirection() {
        const now = this._toA.clock.now();
        const now_vector_A = calculateVector(this._toA.vector, now);
        const now_vector_B = calculateVector(this._toB.vector, now);
        return movement_direction(now_vector_A, now_vector_B);
    }

    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    /*
        Handling Dataset Update Callbacks
    */
    _onDatasetCallback(eventMap, relevanceInterval) {
        if (!this._isReady()) {
            return;
        }

        if (relevanceInterval == undefined) {
            return;
        }

        // assuming both timing objects have the same clock
        const now = this._toA.clock.now();
        const now_vector_A = calculateVector(this._toA.vector, now);
        const now_vector_B = calculateVector(this._toB.vector, now);

        // active interval
        let [pos_A, pos_B] = [now_vector_A.position, now_vector_B.position];
        let [low, high] = (pos_A <= pos_B) ? [pos_A, pos_B] : [pos_B, pos_A];
        const activeInterval = new Interval(low, high, true, true);

        if (!activeInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
            // relevanceInterval is NOT outside activeInterval
            // some events relevant for activeIntervale

            // choose approach to get events
            let get_items = this._items_from_dataset_events.bind(this);
            if (EVENTMAP_THRESHOLD$1 < eventMap.size) {
                if (this._map.size < ACTIVECUES_THRESHOLD$1) {
                    get_items = this._items_from_dataset_lookup.bind(this);
                }
            }

            // get items
            const [exit, change, enter] = get_items(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._map.delete(item.key);
            });
            enter.forEach(item => {
                this._map.set(item.key, item.new);
            });

            // notifications
            const items = array_concat([exit, change, enter], {copy:true, order:true});

            // sort event items according to general movement direction
            let direction = movement_direction(now_vector_A, now_vector_B);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items, direction);
        }


        /*
            clear schedules

            This is only necessary if a cue interval is changed,
            and the change is relevant within the posInterval of
            one of the schedules. RelevanceInterval to figure this out.
        */

        if (this._schedA.posInterval) {
            if (!this._schedA.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._schedA.setVector(now_vector_A);
            }
        }

        if (this._schedB.posInterval) {
            if (!this._schedB.posInterval.match(relevanceInterval, Interval.Match.OUTSIDE)) {
                // relevanceInterval is NOT outside schedule posInterval
                // refresh schedule
                this._schedB.setVector(now_vector_B);
            }
        }
    }


    /***************************************************************
     TIMING OBJECT CALLBACK
    ***************************************************************/

    /*
        Handling Change Events from Timing Objects
    */
    _onTimingCallback (eArg, eInfo) {

        /*
            make sure both timingobjects are ready
        */
        let init = false;
        if (!this._isReady()) {
            if (eInfo.src == this._toA) {
                this._toA_ready = true;
            } else {
                this._toB_ready = true;
            }
            if (this._isReady()) {
                init = true;
            } else {
                return;
            }
        }

        /*
            figure out which timing object was firing
        */
        const to = eInfo.src;
        const other_to = (to == this._toA) ? this._toB : this._toA;

        /*
            If update is the initial vector from the timing object,
            we set current time as the official time for the update.
            Else, the new vector is "live" and we use the timestamp
            when it was created as the official time for the update.
            This is represented by the new_vector.
        */
        let new_vector;
        if (eArg.live) {
            new_vector = to.vector;
        } else {
            new_vector = calculateVector(to.vector, to.clock.now());
        }

        /*
            The nature of the vector change
        */
        const delta = new MotionDelta(to.old_vector, new_vector);

        /*
            Sample the state of the other timing object at same time.
        */
        let ts = new_vector.timestamp;
        let other_new_vector = calculateVector(other_to.vector, ts);

        /*
            Reevaluate active state.
            This is required after any discontinuity of the position (jump),
            or if the motion stopped without jumping (pause or halt at range
            restriction)
        */
        const items = [];
        if (delta.posDelta == PosDelta$1.CHANGE || delta.MoveDelta == MoveDelta$1.STOP) {

            // make position interval
            let low = Math.min(new_vector.position, other_new_vector.position);
            let high = Math.max(new_vector.position, other_new_vector.position);
            let itv = new Interval(low, high, true, true);

            // new active cues
            let activeCues = new Map(this._ds.lookup(itv).map(cue => {
                return [cue.key, cue];
            }));
            // exit cues - in old activeCues but not in new activeCues
            let exitCues = map_difference(this._map, activeCues);
            // enter cues - not in old activeCues but in new activeCues
            let enterCues = map_difference(activeCues, this._map);
            // update active cues
            this._map = activeCues;
            // make event items
            for (let cue of exitCues.values()) {
                items.push({key:cue.key, new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                items.push({key:cue.key, new:cue, old:undefined});
            }

            // sort event items according to general movement direction
            let direction = movement_direction(new_vector, other_new_vector);
            BaseSequencer.sort_items(items, direction);

            // event notification
            this._notifyEvents(items);
        }

        /*
            Handle Timing Object Moving
            - on init both shedules must be updated
        */
        if (to == this._toA) {
            this._schedA.setVector(new_vector);
        } else if (to == this._toB) {
            this._schedB.setVector(new_vector);
        }
        if (init) {
            if (other_to == this._toA) {
                this._schedA.setVector(other_new_vector);
            } else if (other_to == this._toB) {
                this._schedB.setVector(other_new_vector);
            }
        }
    };


    /***************************************************************
     SCHEDULE CALLBACK
    ***************************************************************/

    /*
        Handling due Events from Schedules
    */
    _onScheduleCallback = function(now, endpointItems, schedule) {
        if (!this._isReady()) {
            return;
        }

        /*
            figure out which timing object was firing
        */
        const to = schedule.to;
        const other_to = (to == this._toA) ? this._toB : this._toA;

        const items = [];
        endpointItems.forEach(function (item) {

            /*
                figure out if to (event source) is lower than the other to
                at time of event
            */
            // endpoint
            let [pos, right, closed, singular] = item.endpoint;
            // position of other to at time of event
            let ts = item.tsEndpoint[0];
            let other_vector = calculateVector(other_to.vector, ts);
            let pos_other = other_vector.position;

            /*
                Action Code - see sequenceutils
            */
            // to role
            let to_role = (pos < pos_other) ? "L" : (pos == pos_other) ? "S" : "R";
            // movement direction
            let to_dir = (item.direction > 0) ? "R" : "L";
            // endpoint type
            let ep_type = (singular) ? "S": (right) ? "R" : "L";
            // action code, enter, exit, stay, enter-exit
            let action_code = ActiveMap$2.get(`${to_role}${to_dir}${ep_type}`);

            /*
                state of cue
            */
            let cue = item.cue;
            let has_cue = this._map.has(cue.key);

            // filter action code
            if (action_code == Active$2.ENTER_EXIT) {
                /*
                    both timing objects evaluated to same position
                    either
                    1) to is moving and other_to is paused at this point,
                       implying that the cue STAYS active
                    or,
                    2) both are moving. if both are moving in the same
                    direction - EXIT
                    opposite direction - ENTER
                */
                let other_moving = isMoving(other_vector);
                if (!other_moving) {
                    // other not moving
                    action_code = Active$2.ENTER;
                } else {
                    // both moving
                    let direction = calculateDirection(other_vector);                        // movement direction
                    action_code = (direction != item.direction) ? Active$2.ENTER : Active$2.EXIT;
                }
            }
            if (action_code == Active$2.STAY) {
                action_code = Active$2.ENTER;
            }
            if (action_code == Active$2.ENTER && has_cue) {
                return;
            }
            if (action_code == Active$2.EXIT && !has_cue) {
                return;
            }

            // enter or exit
            if (action_code == Active$2.ENTER) {
                // enter
                items.push({key:cue.key, new:cue, old:undefined});
                this._map.set(cue.key, cue);
            } else if (action_code == Active$2.EXIT) {
                // exit
                items.push({key:cue.key, new:undefined, old:cue});
                this._map.delete(cue.key);
            }
        }, this);

        // Event items already sorted

        // event notification
        this._notifyEvents(items);
    }
}

/*
    Common constructor PointModeSequencer and IntervalModeSequencer
*/
function Sequencer(axis, toA, toB) {
    if (toB === undefined) {
        return new PointModeSequencer(axis, toA);
    } else {
        return new IntervalModeSequencer(axis, toA, toB);
    }
}
const version = "v3.0";

export { BinarySearch, Dataset, DelayConverter, Interval, LoopConverter, ObservableMap, RangeConverter, ScaleConverter, Sequencer, SkewConverter, Timeout, TimeshiftConverter, TimingObject, endpoint, eventify, motionutils, utils, version };
//# sourceMappingURL=timingsrc-v3.js.map
