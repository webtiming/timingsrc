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

	covered (other) {
		return compare(this, other) == Relation.COVERED;
	}

	covers (other) {
		return compare(this, other) == Relation.COVERS;
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
    this implements Axis, a datastructure for efficient lookup of
    cues on a timeline

    - cues may be tied to one or two points on the timeline, this
      is expressed by an Interval.
    - cues are indexed both by key and by intervals
    - the timeline index is divided into a set of CueBuckets,
      based on cue interval length, for efficient lookup
*/

class Axis {

    static sort_cues = sort_cues;
    static Delta = Delta;
    static cue_delta = cue_delta;

    constructor() {
        /*
            efficient lookup of cues by key
            key -> cue
        */
        this._cueMap = new Map();

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

        // Change event
        eventify.eventifyInstance(this);
        this.eventifyDefine("update", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    };


    /*
        SIZE
        Number of cues managed by axis
    */
    get size () {
        return this._cueMap.size;
    }


    /***************************************************************
        EVENTIFY

        Immediate events
    */

    eventifyInitEventArgs = function (name) {
        if (name == "update" || name == "change") {
            let events = [...this.values()].map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });
            return (name == "update") ? [events] : events;
        }
    };


    /*
        Event Notification

    */
    _notifyEvents(events) {
        // event notification
        if (events.length == 0) {
            return;
        }
        const has_update_subs = this.eventifySubscriptions("update").length > 0;
        const has_remove_subs = this.eventifySubscriptions("remove").length > 0;
        const has_change_subs = this.eventifySubscriptions("change").length > 0;
        // update
        if (has_update_subs) {
            this.eventifyTrigger("update", events);
        }
        // change, remove
        if (has_remove_subs || has_change_subs) {
            for (let item of events) {
                if (item.new == undefined) {
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
        let init = this._cueMap.size == 0;
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

            current_cue = (init) ? undefined : this._cueMap.get(cue.key);
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
                }
            }

            /*******************************************************
                update cue
                - update cueMap
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
            let events = [...batchMap.values()].map(item => {
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
            this._notifyEvents(events);

            // create relevance Interval
            let relevanceInterval = undefined;
            if (relevance.low != Infinity) {
                relevanceInterval = Interval.fromEndpoints(relevance.low, relevance.high);
            }

            /*
                notify sequencer last so that change events
                from the axis will be applied before change
                events from sequencers.
            */
            this._notify_callbacks(batchMap, relevanceInterval);
            return events;
        }
        return [];
    };



    /***************************************************************
        UPDATE CUE

        update operation for a single cue

        - update cueMap
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
            update cueMap and batchMap
        ***********************************************************/

        if (current_cue == undefined) {
            // INSERT - add cue object to cueMap
            old_cue = undefined;
            new_cue = cue;
            this._cueMap.set(cue.key, new_cue);
        } else if (cue.interval == undefined && cue.data == undefined) {
            // DELETE - remove cue object from cueMap
            old_cue = current_cue;
            new_cue = undefined;
            this._cueMap.delete(cue.key);
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
            // data changes are reflected in cueMap changes,
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
        // remove from cueMap and make events
        const events = [];
        let cue;
        for (let i=0; i<cues.length; i++) {
            cue = cues[i];
            this._cueMap.delete(cue.key);
            // check for equality
            events.push({key:cue.key, new: undefined, old: cue});
        }
        // event notification
        this._notifyEvents(events);
        return events;
    };

    /*
        CLEAR ALL CUES
    */
    clear() {
        // clear cue Buckets
        this._call_buckets("clear");
        // clear cueMap
        let cueMap = this._cueMap;
        this._cueMap = new Map();
        // create change events for all cues
        const events = [];
        for (let cue of cueMap.values()) {
            events.push({key: cue.key, new: undefined, old: cue});
        }
        // event notification
        this._notifyEvents(events);
        return events;
    };


    /*
        Map accessors
    */

    has(key) {
        return this._cueMap.has(key);
    };

    get(key) {
        return this._cueMap.get(key);
    };

    keys() {
        return this._cueMap.keys();
    };

    values() {
        return this._cueMap.values();
    };

    entries() {
        return this._cueMap.entries();
    }


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

        if (cues.length != this._cueMap.size) {
            throw new Error("inconsistent cue count cueMap and aggregate cueBuckets " + cues-this._cueMap.size);
        }

        // check that cues are the same
        for (let cue of cues.values()) {
            if (!this._cueMap.has(cue.key)) {
                throw new Error("inconsistent cues cueMap and aggregate cueBuckets");
            }
        }

        return {
            cues: cues.length,
            points: points.length
        };
    };

}

eventify.eventifyPrototype(Axis.prototype);




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
    return (delta.interval == Axis.Delta.NOOP && delta.data == Axis.Delta.NOOP);
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
 EVENT ORDERING SORTING
*******************************************************************/

function event_cmp_forwards (event_a, event_b) {
    let itv_a = (event_a.new) ? event_a.new.interval : event_a.old.interval;
    let itv_b = (event_b.new) ? event_b.new.interval : event_b.old.interval;
    return Interval.cmpLow(itv_a, itv_b);
}

function event_cmp_backwards (event_a, event_b) {
    let itv_a = (event_a.new) ? event_a.new.interval : event_a.old.interval;
    let itv_b = (event_b.new) ? event_b.new.interval : event_b.old.interval;
    return -1 * Interval.cmpHigh(itv_a, itv_b);
}

function sort_events (events, direction=0) {
    if (direction >= 0) {
        events.sort(event_cmp_forwards);
    } else {
        events.sort(event_cmp_backwards);
    }
}


/*******************************************************************
 BASE SEQUENCER
*******************************************************************/

/*
    This is an abstract base class for sequencers
    It implements common logic related to axis, events and activeCues.
*/

class BaseSequencer {

    static Active = Active;
    static ActiveMap = ActiveMap;
    static sort_events = sort_events;

    constructor (axis) {

        // ActiveCues
        this._activeCues = new Map(); // (key -> cue)

        // Axis
        this._axis = axis;
        let cb = this._onAxisCallback.bind(this);
        this._axis_cb = this._axis.add_callback(cb);

        // Change event
        eventify.eventifyInstance(this);
        this.eventifyDefine("update", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    }


    get_movement_direction() {
        throw new Error("not implemented");
    }


    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "update" || name == "change") {
            let events = [...this._activeCues.values()].map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });
            sort_events(events, this.get_movement_direction());
            return (name == "update") ? [events] : events;
        }
    }


    /*
        Event Notification

    */
    _notifyEvents(events) {
        // event notification
        if (events.length == 0) {
            return;
        }
        const has_update_subs = this.eventifySubscriptions("update").length > 0;
        const has_remove_subs = this.eventifySubscriptions("remove").length > 0;
        const has_change_subs = this.eventifySubscriptions("change").length > 0;
        // update
        if (has_update_subs) {
            this.eventifyTrigger("update", events);
        }
        // change, remove
        if (has_remove_subs || has_change_subs) {
            for (let item of events) {
                if (item.new == undefined) {
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
     AXIS CALLBACK
    ***************************************************************/

    _onAxisCallback(eventMap, relevanceInterval) {
        throw new Error("not implemented");
    }

    /*
        make exit, change and enter events
        - based on eventMap
    */
    _events_from_axis_events(eventMap, interval) {
        const enterEvents = [];
        const changeEvents = [];
        const exitEvents = [];
        const first = this._activeCues.size == 0;
        let is_active, should_be_active, _item;
        for (let item of eventMap.values()) {
            if (isNoop(item.delta)) {
                continue;
            }
            // exit, change, enter events
            is_active = (first) ? false : this._activeCues.has(item.key);
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
        - based on axis.lookup
    */
    _events_from_axis_lookup(eventMap, interval) {

        /*
            Active cues

            find new set of active cues by querying the axis
        */
        const _activeCues = new Map(this._axis.lookup(interval).map(function(cue) {
            return [cue.key, cue];
        }));

        let changeEvents = [];
        let exitEvents = [];
        let first = (this._activeCues.size == 0);
        if (!first){

            /*
                Change Events

                change cues - cues which are modified, yet remain active cues
            */
            let remainCues = map_intersect(this._activeCues, _activeCues);
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
            let exitCues = map_difference(this._activeCues, _activeCues);
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
            enterCues = map_difference(_activeCues, this._activeCues);
        }
        let enterEvents = [...enterCues.values()]
            .map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });

        return [exitEvents, changeEvents, enterEvents];
    }


    /***************************************************************
     MAP ACCESSORS
    ***************************************************************/

    has(key) {
        return this._activeCues.has(key);
    };

    get(key) {
        return this._activeCues.get(key);
    };

    keys() {
        return this._activeCues.keys();
    };

    values() {
        return this._activeCues.values();
    };

    entries() {
        return this._activeCues.entries();
    }
}

eventify.eventifyPrototype(BaseSequencer.prototype);

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


class SingleSequencer extends BaseSequencer {

    constructor (axis, to) {

        super(axis);

        // Timing Object
        this._to = to;
        this._sub = this._to.on("timingsrc", this._onTimingCallback.bind(this));

        // Schedule
        this._sched = new Schedule(this._axis, to);
        let cb = this._onScheduleCallback.bind(this);
        this._sched_cb = this._sched.add_callback(cb);
    }


    get_movement_direction() {
        const now = this._to.clock.now();
        return calculateDirection(this._to.vector, now);
    }


    /***************************************************************
     AXIS CALLBACK
    ***************************************************************/

    /*
        Handling Axis Update Callbacks
    */

    _onAxisCallback(eventMap, relevanceInterval) {
        /*
            process axis events which are relevant to the set
            of activeCues, or to the immediate future (schedule)

            enterCues - inactive -> active
            changeCues - active -> active, but changed
            exitCues - active -> inactive

            Two approaches
            - 1) EVENTS: filter list of events - compare to current active cues
            - 2) LOOKUP: regenerate new activeCues by looking up set of
                 active cues from axis, compare it to current active cues


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
            let get_events = this._events_from_axis_events.bind(this);
            if (EVENTMAP_THRESHOLD < eventMap.size) {
                if (this._activeCues.size < ACTIVECUES_THRESHOLD) {
                    get_events = this._events_from_axis_lookup.bind(this);
                }
            }

            // get events
            const [exit, change, enter] = get_events(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._activeCues.delete(item.key);
            });
            enter.forEach(item => {
                this._activeCues.set(item.key, item.new);
            });

            // notifications
            const events = array_concat([exit, change, enter], {copy:true, order:true});

            // sort events according to general movement direction
            let direction = calculateDirection(now_vector);
            BaseSequencer.sort_events(events, direction);

            // event notification
            this._notifyEvents(events);
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
        const events = [];
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
        if (delta.posDelta == PosDelta.CHANGE || delta.moveDelta == MoveDelta.STOP) {
            // make position interval
            let low = new_vector.position;
            let high = new_vector.position;
            let itv = new Interval(low, high, true, true);
            // new active cues
            let activeCues = new Map(this._axis.lookup(itv).map(cue => {
                return [cue.key, cue];
            }));
            // exit cues - in old activeCues but not in new activeCues
            let exitCues = map_difference(this._activeCues, activeCues);
            // enter cues - not in old activeCues but in new activeCues
            let enterCues = map_difference(activeCues, this._activeCues);
            // update active cues
            this._activeCues = activeCues;
            // make events
            for (let cue of exitCues.values()) {
                events.push({key:cue.key, new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                events.push({key:cue.key, new:cue, old:undefined});
            }

            // sort events according to general movement direction
            let direction = calculateDirection(new_vector);
            BaseSequencer.sort_events(events, direction);

            // event notification
            this._notifyEvents(events);
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

        const events = [];
        endpointItems.forEach(function (item) {
            let cue = item.cue;
            let has_cue = this._activeCues.has(cue.key);
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
                    events.push({key:cue.key, new:undefined, old:cue});
                    this._activeCues.delete(cue.key);
                } else {
                    // enter
                    events.push({key:cue.key, new:cue, old:undefined});
                    // exit
                    events.push({key:cue.key, new:undefined, old:cue});
                    // no need to both add and remove from activeCues
                }
            } else if (action_code == Active$1.ENTER) {
                if (!has_cue) {
                    // enter
                    events.push({key:cue.key, new:cue, old:undefined});
                    this._activeCues.set(cue.key, cue);
                }
            } else if (action_code == Active$1.EXIT) {
                if (has_cue) {
                    // exit
                    events.push({key:cue.key, new:undefined, old:cue});
                    this._activeCues.delete(cue.key);
                }
            }
        }, this);

        // Events already sorted

        // event notification
        this._notifyEvents(events);
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


class DoubleSequencer extends BaseSequencer {

    constructor (axis, toA, toB) {

        super(axis);

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
        this._schedA = new Schedule(this._axis, toA);
        this._schedA_cb = this._schedA.add_callback(sched_cb);
        this._schedB = new Schedule(this._axis, toB);
        this._schedB_cb = this._schedB.add_callback(sched_cb);

    }


    _isReady() {
        return (this._toA_ready && this._toB_ready);
    }

    get_movement_direction() {
        const now = this._toA.clock.now();
        const now_vector_A = calculateVector(this._toA.vector, now);
        const now_vector_B = calculateVector(this._toB.vector, now);
        return movement_direction(now_vector_A, now_vector_B);
    }

    /***************************************************************
     AXIS CALLBACK
    ***************************************************************/

    /*
        Handling Axis Update Callbacks
    */
    _onAxisCallback(eventMap, relevanceInterval) {
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
            let get_events = this._events_from_axis_events.bind(this);
            if (EVENTMAP_THRESHOLD$1 < eventMap.size) {
                if (this._activeCues.size < ACTIVECUES_THRESHOLD$1) {
                    get_events = this._events_from_axis_lookup.bind(this);
                }
            }

            // get events
            const [exit, change, enter] = get_events(eventMap, activeInterval);

            // update activeCues
            exit.forEach(item => {
                this._activeCues.delete(item.key);
            });
            enter.forEach(item => {
                this._activeCues.set(item.key, item.new);
            });

            // notifications
            const events = array_concat([exit, change, enter], {copy:true, order:true});

            // sort events according to general movement direction
            let direction = movement_direction(now_vector_A, now_vector_B);
            BaseSequencer.sort_events(events, direction);

            // event notification
            this._notifyEvents(events, direction);
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
        const events = [];
        if (delta.posDelta == PosDelta$1.CHANGE || delta.MoveDelta == MoveDelta$1.STOP) {

            // make position interval
            let low = Math.min(new_vector.position, other_new_vector.position);
            let high = Math.max(new_vector.position, other_new_vector.position);
            let itv = new Interval(low, high, true, true);

            // new active cues
            let activeCues = new Map(this._axis.lookup(itv).map(cue => {
                return [cue.key, cue];
            }));
            // exit cues - in old activeCues but not in new activeCues
            let exitCues = map_difference(this._activeCues, activeCues);
            // enter cues - not in old activeCues but in new activeCues
            let enterCues = map_difference(activeCues, this._activeCues);
            // update active cues
            this._activeCues = activeCues;
            // make events
            for (let cue of exitCues.values()) {
                events.push({key:cue.key, new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                events.push({key:cue.key, new:cue, old:undefined});
            }

            // sort events according to general movement direction
            let direction = movement_direction(new_vector, other_new_vector);
            BaseSequencer.sort_events(events, direction);

            // event notification
            this._notifyEvents(events);
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

        const events = [];
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
            let has_cue = this._activeCues.has(cue.key);

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
                events.push({key:cue.key, new:cue, old:undefined});
                this._activeCues.set(cue.key, cue);
            } else if (action_code == Active$2.EXIT) {
                // exit
                events.push({key:cue.key, new:undefined, old:cue});
                this._activeCues.delete(cue.key);
            }
        }, this);

        // Events already sorted

        // event notification
        this._notifyEvents(events);
    }
}

/*
    Common constructor SingeSequencer and DoubleSequencer
*/
function Sequencer(axis, toA, toB) {
    if (toB === undefined) {
        return new SingleSequencer(axis, toA);
    } else {
        return new DoubleSequencer(axis, toA, toB);
    }
}
const version = "v3.0";

export { Axis, DelayConverter, Interval, LoopConverter, RangeConverter, ScaleConverter, Sequencer, SkewConverter, TimeshiftConverter, TimingObject, endpoint, eventify, motionutils, utils, version };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltaW5nc3JjLXYzLmpzIiwic291cmNlcyI6WyJ2My91dGlsL3V0aWxzLmpzIiwidjMvdXRpbC9lbmRwb2ludC5qcyIsInYzL3V0aWwvaW50ZXJ2YWwuanMiLCJ2My91dGlsL21vdGlvbnV0aWxzLmpzIiwidjMvdXRpbC9ldmVudGlmeS5qcyIsInYzL3V0aWwvdGltZW91dC5qcyIsInYzL3RpbWluZ29iamVjdC9tYXN0ZXJjbG9jay5qcyIsInYzL3RpbWluZ29iamVjdC9pbnRlcm5hbHByb3ZpZGVyLmpzIiwidjMvdGltaW5nb2JqZWN0L2V4dGVybmFscHJvdmlkZXIuanMiLCJ2My90aW1pbmdvYmplY3QvdGltaW5nb2JqZWN0LmpzIiwidjMvdGltaW5nb2JqZWN0L3NrZXdjb252ZXJ0ZXIuanMiLCJ2My90aW1pbmdvYmplY3QvZGVsYXljb252ZXJ0ZXIuanMiLCJ2My90aW1pbmdvYmplY3Qvc2NhbGVjb252ZXJ0ZXIuanMiLCJ2My90aW1pbmdvYmplY3QvbG9vcGNvbnZlcnRlci5qcyIsInYzL3RpbWluZ29iamVjdC9yYW5nZWNvbnZlcnRlci5qcyIsInYzL3RpbWluZ29iamVjdC90aW1lc2hpZnRjb252ZXJ0ZXIuanMiLCJ2My91dGlsL2JpbmFyeXNlYXJjaC5qcyIsInYzL3NlcXVlbmNpbmcvYXhpcy5qcyIsInYzL3NlcXVlbmNpbmcvc2NoZWR1bGUuanMiLCJ2My9zZXF1ZW5jaW5nL2Jhc2VzZXF1ZW5jZXIuanMiLCJ2My9zZXF1ZW5jaW5nL3NpbmdsZXNlcXVlbmNlci5qcyIsInYzL3NlcXVlbmNpbmcvZG91Ymxlc2VxdWVuY2VyLmpzIiwidjMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcbiAgICBDb3B5cmlnaHQgMjAyMFxuICAgIEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuXG4vKiBTZXQgQ29tcGFyaXNvbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxU2V0KGFzLCBicykge1xuICAgIHJldHVybiBhcy5zaXplID09PSBicy5zaXplICYmIGFsbChpc0luKGJzKSwgYXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWxsKHByZWQsIGFzKSB7XG4gICAgZm9yICh2YXIgYSBvZiBhcykgaWYgKCFwcmVkKGEpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luKGFzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIHJldHVybiBhcy5oYXMoYSk7XG4gICAgfTtcbn1cblxuLypcbiAgICBnZXQgdGhlIGRpZmZlcmVuY2Ugb2YgdHdvIE1hcHNcbiAgICBrZXkgaW4gYSBidXQgbm90IGluIGJcbiovXG5leHBvcnQgY29uc3QgbWFwX2RpZmZlcmVuY2UgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChhLnNpemUgPT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IE1hcCgpO1xuICAgIH0gZWxzZSBpZiAoYi5zaXplID09IDApIHtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXAoWy4uLmFdLmZpbHRlcihmdW5jdGlvbiAoW2tleSwgdmFsdWVdKSB7XG4gICAgICAgICAgICByZXR1cm4gIWIuaGFzKGtleSlcbiAgICAgICAgfSkpO1xuICAgIH1cbn07XG5cbi8qXG4gICAgZ2V0IHRoZSBpbnRlcnNlY3Rpb24gb2YgdHdvIE1hcHNcbiAgICBrZXkgaW4gYSBhbmQgYlxuKi9cbmV4cG9ydCBjb25zdCBtYXBfaW50ZXJzZWN0ID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBbYSwgYl0gPSAoYS5zaXplIDw9IGIuc2l6ZSkgPyBbYSxiXSA6IFtiLGFdO1xuICAgIGlmIChhLnNpemUgPT0gMCkge1xuICAgICAgICAvLyBObyBpbnRlcnNlY3RcbiAgICAgICAgcmV0dXJuIG5ldyBNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBNYXAoWy4uLmFdLmZpbHRlcihmdW5jdGlvbiAoW2tleSwgdmFsdWVdKSB7XG4gICAgICAgIHJldHVybiBiLmhhcyhrZXkpXG4gICAgfSkpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpdm1vZCAobiwgZCkge1xuICAgIGxldCByID0gbiAlIGQ7XG4gICAgbGV0IHEgPSAobi1yKS9kO1xuICAgIHJldHVybiBbcSwgcl07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUob2JqKSB7XG4gICAgLy8gY2hlY2tzIGZvciBudWxsIGFuZCB1bmRlZmluZWRcbiAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZW9mIG9ialtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKlxuICAgIGVmZmVjdGl2ZSBjb25jYXRlbmF0aW9uIG9mIG11bHRpcGxlIGFycmF5c1xuICAgIC0gb3JkZXIgLSBpZiB0cnVlIHByZXNlcnZlcyBvcmRlcmluZyBvZiBpbnB1dCBhcnJheXNcbiAgICAgICAgICAgIC0gZWxzZSBzb3J0cyBpbnB1dCBhcnJheXMgKGxvbmdlc3QgZmlyc3QpXG4gICAgICAgICAgICAtIGRlZmF1bHQgZmFsc2UgaXMgbW9yZSBlZmZlY3RpdmVcbiAgICAtIGNvcHkgIC0gaWYgdHJ1ZSBsZWF2ZXMgaW5wdXQgYXJyYXlzIHVuY2hhbmdlZCwgY29weVxuICAgICAgICAgICAgICB2YWx1ZXMgaW50byBuZXcgYXJyYXlcbiAgICAgICAgICAgIC0gaWYgZmFsc2UgY29waWVzIHJlbWFpbmRlciBhcnJheXMgaW50byB0aGUgZmlyc3RcbiAgICAgICAgICAgICAgYXJyYXlcbiAgICAgICAgICAgIC0gZGVmYXVsdCBmYWxzZSBpcyBtb3JlIGVmZmVjdGl2ZVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBhcnJheV9jb25jYXQoYXJyYXlzLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQge2NvcHk9ZmFsc2UsIG9yZGVyPWZhbHNlfSA9IG9wdGlvbnM7XG4gICAgaWYgKGFycmF5cy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmIChhcnJheXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFycmF5c1swXTtcbiAgICB9XG4gICAgbGV0IHRvdGFsX2xlbiA9IGFycmF5cy5yZWR1Y2UoKGFjYywgY3VyKSA9PiBhY2MgKyBjdXIubGVuZ3RoLCAwKTtcbiAgICAvLyBvcmRlclxuICAgIGlmICghb3JkZXIpIHtcbiAgICAgICAgLy8gc29ydCBhcnJheXMgYWNjb3JkaW5nIHRvIGxlbmd0aCAtIGxvbmdlc3QgZmlyc3RcbiAgICAgICAgYXJyYXlzLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpO1xuICAgIH1cbiAgICAvLyBjb3B5XG4gICAgbGV0IGZpcnN0ID0gKGNvcHkpID8gW10gOiBhcnJheXMuc2hpZnQoKTtcbiAgICBsZXQgc3RhcnQgPSBmaXJzdC5sZW5ndGg7XG4gICAgLy8gcmVzZXJ2ZSBtZW1vcnkgdG90YWwgbGVuZ3RoXG4gICAgZmlyc3QubGVuZ3RoID0gdG90YWxfbGVuO1xuICAgIC8vIGZpbGwgdXAgZmlyc3Qgd2l0aCBlbnRyaWVzIGZyb20gb3RoZXIgYXJyYXlzXG4gICAgbGV0IGVuZCwgbGVuO1xuICAgIGZvciAobGV0IGFyciBvZiBhcnJheXMpIHtcbiAgICAgICAgbGVuID0gYXJyLmxlbmd0aDtcbiAgICAgICAgZW5kID0gc3RhcnQgKyBsZW47XG4gICAgICAgIGZvciAobGV0IGk9MDsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgZmlyc3Rbc3RhcnQgKyBpXSA9IGFycltpXVxuICAgICAgICB9XG4gICAgICAgIHN0YXJ0ID0gZW5kO1xuICAgIH1cbiAgICByZXR1cm4gZmlyc3Q7XG59O1xuXG4vKlxuICAgIGRlZmF1bHQgb2JqZWN0IGVxdWFsc1xuKi9cbmV4cG9ydCBmdW5jdGlvbiBvYmplY3RfZXF1YWxzKGEsIGIpIHtcbiAgICAvLyBDcmVhdGUgYXJyYXlzIG9mIHByb3BlcnR5IG5hbWVzXG4gICAgbGV0IGFQcm9wcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGEpO1xuICAgIGxldCBiUHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiKTtcbiAgICBsZXQgbGVuID0gYVByb3BzLmxlbmd0aDtcbiAgICBsZXQgcHJvcE5hbWU7XG4gICAgLy8gSWYgcHJvcGVydGllcyBsZW5naHQgaXMgZGlmZmVyZW50ID0+IG5vdCBlcXVhbFxuICAgIGlmIChhUHJvcHMubGVuZ3RoICE9IGJQcm9wcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpPTA7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgcHJvcE5hbWUgPSBhUHJvcHNbaV07XG4gICAgICAgIC8vIElmIHByb3BlcnR5IHZhbHVlcyBhcmUgbm90IGVxdWFsID0+IG5vdCBlcXVhbFxuICAgICAgICBpZiAoYVtwcm9wTmFtZV0gIT09IGJbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gZXF1YWxcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuXG4vKiBkb2N1bWVudCByZWFkeXByb21pc2UgKi9cbmV4cG9ydCBjb25zdCBkb2NyZWFkeSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IG9uUmVhZHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgb25SZWFkeSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIG9uUmVhZHksIHRydWUpO1xuICAgICAgICB9O1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgb25SZWFkeSwgdHJ1ZSk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgb25SZWFkeSwgdHJ1ZSk7XG4gICAgfVxufSk7XG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDIwXG5cdEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG5cbmNvbnN0IGlzTnVtYmVyID0gZnVuY3Rpb24obikge1xuXHRsZXQgTiA9IHBhcnNlRmxvYXQobik7XG4gICAgcmV0dXJuIChuPT09TiAmJiAhaXNOYU4oTikpO1xufTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbkVORFBPSU5UXG5cblV0aWxpdGllcyBmb3IgaW50ZXJ2YWwgZW5kcG9pbnRzIGNvbXBhcmlzb25cblxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLypcblx0ZW5kcG9pbnQgbW9kZXMgLSBpbiBlbmRwb2ludCBvcmRlclxuXHRlbmRwb2ludCBvcmRlclxuXHRwKSwgW3AsIFtwXSwgcF0sIChwXG4qL1xuY29uc3QgTU9ERV9SSUdIVF9PUEVOID0gMDtcbmNvbnN0IE1PREVfTEVGVF9DTE9TRUQgPSAxO1xuY29uc3QgTU9ERV9TSU5HVUxBUiA9IDI7XG5jb25zdCBNT0RFX1JJR0hUX0NMT1NFRCA9IDM7XG5jb25zdCBNT0RFX0xFRlRfT1BFTiA9IDQ7XG5cbi8vIGNyZWF0ZSBlbmRwb2ludFxuZnVuY3Rpb24gY3JlYXRlKHZhbCwgcmlnaHQsIGNsb3NlZCwgc2luZ3VsYXIpIHtcblx0Ly8gbWFrZSBzdXJlIGluZmluaXR5IGVuZHBvaW50cyBhcmUgbGVnYWxcblx0aWYgKHZhbCA9PSBJbmZpbml0eSkge1xuXHRcdGlmIChyaWdodCA9PSBmYWxzZSB8fCBjbG9zZWQgPT0gZmFsc2UpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkluZmluaXR5IGVuZHBvaW50IG11c3QgYmUgcmlnaHQtY2xvc2VkIG9yIHNpbmd1bGFyXCIpO1xuXHRcdH1cblx0fVxuXHRpZiAodmFsID09IC1JbmZpbml0eSkge1xuXHRcdGlmIChyaWdodCA9PSB0cnVlIHx8IGNsb3NlZCA9PSBmYWxzZSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiLUluZmluaXR5IGVuZHBvaW50IG11c3QgYmUgbGVmdC1jbG9zZWQgb3Igc2luZ3VsYXJcIilcblx0XHR9XG5cdH1cblx0cmV0dXJuIFt2YWwsIHJpZ2h0LCBjbG9zZWQsIHNpbmd1bGFyXTtcbn1cblxuXG4vKlxuXHRyZXNvbHZlIGVuZHBvaW50IG1vZGVcbiovXG5mdW5jdGlvbiBnZXRfbW9kZShlKSB7XG5cdC8vIGlmIHJpZ2h0LCBjbG9zZWQgaXMgZ2l2ZW5cblx0Ly8gdXNlIHRoYXQgaW5zdGVhZCBvZiBzaW5ndWxhclxuXHRsZXQgW3ZhbCwgcmlnaHQsIGNsb3NlZCwgc2luZ3VsYXJdID0gZTtcblx0aWYgKHJpZ2h0ID09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBNT0RFX1NJTkdVTEFSO1xuXHR9IGVsc2UgaWYgKHJpZ2h0KSB7XG5cdFx0aWYgKGNsb3NlZCkge1xuXHRcdFx0cmV0dXJuIE1PREVfUklHSFRfQ0xPU0VEO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gTU9ERV9SSUdIVF9PUEVOO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRpZiAoY2xvc2VkKSB7XG5cdFx0XHRyZXR1cm4gTU9ERV9MRUZUX0NMT1NFRDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIE1PREVfTEVGVF9PUEVOO1xuXHRcdH1cblx0fVxufVxuXG4vKlxuXHRnZXQgb3JkZXJcblxuXHRnaXZlbiB0d28gZW5kcG9pbnRzXG5cdHJldHVybiB0d28gbnVtYmVycyByZXByZXNlbnRpbmcgdGhlaXIgb3JkZXJcblxuXHRhbHNvIGFjY2VwdHMgcmVndWxhciBudW1iZXJzIGFzIGVuZHBvaW50c1xuXHRyZWd1bGFyIG51bWJlciBhcmUgcmVwcmVzZW50ZWQgYXMgc2luZ3VsYXIgZW5kcG9pbnRzXG5cblx0Zm9yIGVuZHBvaW50IHZhbHVlcyB0aGF0IGFyZSBub3Rcblx0ZXF1YWwsIHRoZXNlIHZhbHVlcyBjb252ZXkgb3JkZXIgZGlyZWN0bHksXG5cdG90aGVyd2lzZSBlbmRwb2ludCBtb2RlIG51bWJlcnMgMC00IGFyZSByZXR1cm5lZFxuXG5cdHBhcmFtZXRlcnMgYXJlIGVpdGhlclxuXHQtIHBvaW50OiBOdW1iZXJcblx0b3IsXG5cdC0gZW5kcG9pbnQ6IFtcblx0XHR2YWx1ZSAobnVtYmVyKSxcblx0XHRyaWdodCAoYm9vbCksXG5cdFx0Y2xvc2VkIChib29sKSxcblx0XHRzaW5ndWxhciAoYm9vbClcblx0ICBdXG4qL1xuXG5mdW5jdGlvbiBnZXRfb3JkZXIoZTEsIGUyKSB7XG5cdC8vIHN1cHBvcnQgcGxhaW4gbnVtYmVycyAobm90IGVuZHBvaW50cylcblx0aWYgKGUxLmxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKCFpc051bWJlcihlMSkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcImUxIG5vdCBhIG51bWJlclwiLCBlMSk7XG5cdFx0fVxuXHRcdGUxID0gY3JlYXRlKGUxLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cdH1cblx0aWYgKGUyLmxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKCFpc051bWJlcihlMikpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcImUyIG5vdCBhIG51bWJlclwiLCBlMik7XG5cdFx0fVxuXHRcdGUyID0gY3JlYXRlKGUyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cdH1cblx0aWYgKGUxWzBdICE9IGUyWzBdKSB7XG5cdFx0Ly8gZGlmZmVyZW50IHZhbHVlc1xuXHRcdHJldHVybiBbZTFbMF0sIGUyWzBdXTtcblx0fSBlbHNlIHtcblx0XHQvLyBlcXVhbCB2YWx1ZXNcblx0XHRyZXR1cm4gW2dldF9tb2RlKGUxKSwgZ2V0X21vZGUoZTIpXTtcblx0fVxufVxuXG4vKlxuXHRyZXR1cm4gdHJ1ZSBpZiBlMSBpcyBvcmRlcmVkIGJlZm9yZSBlMlxuXHRmYWxzZSBpZiBlcXVhbFxuKi9cblxuZnVuY3Rpb24gbGVmdG9mKGUxLCBlMikge1xuXHRsZXQgW29yZGVyMSwgb3JkZXIyXSA9IGdldF9vcmRlcihlMSwgZTIpO1xuXHRyZXR1cm4gKG9yZGVyMSA8IG9yZGVyMik7XG59XG5cbi8qXG5cdHJldHVybiB0cnVlIGlmIGUxIGlzIG9yZGVyZWQgYWZ0ZXIgZTJcblx0ZmFsc2UgaXMgZXF1YWxcbiovXG5cbmZ1bmN0aW9uIHJpZ2h0b2YoZTEsIGUyKSB7XG5cdGxldCBbb3JkZXIxLCBvcmRlcjJdID0gZ2V0X29yZGVyKGUxLCBlMik7XG5cdHJldHVybiAob3JkZXIxID4gb3JkZXIyKTtcbn1cblxuLypcblx0cmV0dXJuIHRydWUgaWYgZTEgaXMgb3JkZXJlZCBlcXVhbCB0byBlMlxuKi9cblxuZnVuY3Rpb24gZXF1YWxzKGUxLCBlMikge1xuXHRsZXQgW29yZGVyMSwgb3JkZXIyXSA9IGdldF9vcmRlcihlMSwgZTIpO1xuXHRyZXR1cm4gKG9yZGVyMSA9PSBvcmRlcjIpO1xufVxuXG4vKlxuXHRyZXR1cm4gLTEgaWYgb3JkZXJpbmcgZTEsIGUyIGlzIGNvcnJlY3Rcblx0cmV0dXJuIDAgaWYgZTEgYW5kIGUyIGlzIGVxdWFsXG5cdHJldHVybiAxIGlmIG9yZGVyaW5nIGUxLCBlMiBpcyBpbmNvcnJlY3RcbiovXG5cbmZ1bmN0aW9uIGNtcChlMSwgZTIpIHtcblx0bGV0IFtvcmRlcjEsIG9yZGVyMl0gPSBnZXRfb3JkZXIoZTEsIGUyKTtcblx0bGV0IGRpZmYgPSBvcmRlcjEgLSBvcmRlcjI7XG5cdGlmIChkaWZmID09IDApIHJldHVybiAwO1xuXHRyZXR1cm4gKGRpZmYgPiAwKSA/IDEgOiAtMTtcbn1cblxuXG5mdW5jdGlvbiBtaW4oZTEsIGUyKSB7XG4gICAgcmV0dXJuIChjbXAoZTEsIGUyKSA8PSAwKSA/IGUxIDogZTI7XG59XG5cblxuZnVuY3Rpb24gbWF4KGUxLCBlMikge1xuICAgIHJldHVybiAoY21wKGUxLCBlMikgPD0gMCkgPyBlMiA6IGUxO1xufVxuXG5cbi8qXG5cdGh1bWFuIGZyaWVuZGx5IGVuZHBvaW50IHJlcHJlc2VudGF0aW9uXG4qL1xuZnVuY3Rpb24gdG9TdHJpbmcoZSkge1xuXHRpZiAoZS5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBlLnRvU3RyaW5nKCk7XG5cdH0gZWxzZSB7XG5cdFx0bGV0IG1vZGUgPSBnZXRfbW9kZShlKTtcblx0XHRsZXQgdmFsID0gZVswXTtcblx0XHRpZiAodmFsID09IEluZmluaXR5IHx8IHZhbCA9PSAtSW5maW5pdHkpIHtcblx0XHRcdHZhbCA9IFwiLS1cIjtcblx0XHR9XG5cdFx0aWYgKG1vZGUgPT0gTU9ERV9SSUdIVF9PUEVOKSB7XG5cdFx0XHRyZXR1cm4gYCR7dmFsfSlgXG5cdFx0fSBlbHNlIGlmIChtb2RlID09IE1PREVfTEVGVF9DTE9TRUQpIHtcblx0XHRcdHJldHVybiBgWyR7dmFsfWBcblx0XHR9IGVsc2UgaWYgKG1vZGUgPT0gTU9ERV9TSU5HVUxBUil7XG5cdFx0XHRyZXR1cm4gYFske3ZhbH1dYFxuXHRcdH0gZWxzZSBpZiAobW9kZSA9PSBNT0RFX1JJR0hUX0NMT1NFRCkge1xuXHRcdFx0cmV0dXJuIGAke3ZhbH1dYFxuXHRcdH0gZWxzZSBpZiAobW9kZSA9PSBNT0RFX0xFRlRfT1BFTikge1xuXHRcdFx0cmV0dXJuIGAoJHt2YWx9YFxuXHRcdH1cblx0fVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0Y21wLFxuXHR0b1N0cmluZyxcblx0ZXF1YWxzLFxuXHRyaWdodG9mLFxuXHRsZWZ0b2YsXG5cdGNyZWF0ZSxcblx0bWluLFxuXHRtYXhcbn07XG4iLCIvKlxuXHRDb3B5cmlnaHQgMjAyMFxuXHRBdXRob3IgOiBJbmdhciBBcm50emVuXG5cblx0VGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFRpbWluZ3NyYyBtb2R1bGUuXG5cblx0VGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcblx0aXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG5cdHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG5cdChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cblx0VGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG5cdGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG5cdE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcblx0R05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cblx0WW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG5cdGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuXG5pbXBvcnQgZW5kcG9pbnQgZnJvbSAnLi9lbmRwb2ludC5qcyc7XG5cblxuY29uc3QgaXNOdW1iZXIgPSBmdW5jdGlvbihuKSB7XG5cdGxldCBOID0gcGFyc2VGbG9hdChuKTtcbiAgICByZXR1cm4gKG49PT1OICYmICFpc05hTihOKSk7XG59O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5JTlRFUlZBTCBFUlJPUlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuY2xhc3MgSW50ZXJ2YWxFcnJvciBleHRlbmRzIEVycm9yIHtcblx0Y29uc3RydWN0b3IobWVzc2FnZSkge1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXHRcdHRoaXMubmFtZSA9PSBcIkludGVydmFsRXJyb3JcIjtcblx0fVxufTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5JTlRFUlZBTFxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gSW50ZXJ2YWwgUmVsYXRpb25zXG5jb25zdCBSZWxhdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuXHRPVVRTSURFX0xFRlQ6IDY0LCAgXHQvLyAwYjEwMDAwMDBcblx0T1ZFUkxBUF9MRUZUOiAzMiwgIFx0Ly8gMGIwMTAwMDAwXG5cdENPVkVSRUQ6IDE2LFx0XHQvLyAwYjAwMTAwMDBcblx0RVFVQUxTOiA4LFx0XHRcdC8vIDBiMDAwMTAwMFxuXHRDT1ZFUlM6IDQsXHRcdFx0Ly8gMGIwMDAwMTAwXG5cdE9WRVJMQVBfUklHSFQ6IDIsXHQvLyAwYjAwMDAwMTBcblx0T1VUU0lERV9SSUdIVDogMVx0Ly8gMGIwMDAwMDAxXG59KTtcblxuLypcbiAgICBNYXNrcyBmb3IgSW50ZXJ2YWwgbWF0Y2hpbmdcbiovXG5jb25zdCBNQVRDSF9PVVRTSURFID0gUmVsYXRpb24uT1VUU0lERV9MRUZUICsgUmVsYXRpb24uT1VUU0lERV9SSUdIVDtcbmNvbnN0IE1BVENIX0lOU0lERSA9IFJlbGF0aW9uLkVRVUFMUyArIFJlbGF0aW9uLkNPVkVSRUQ7XG5jb25zdCBNQVRDSF9PVkVSTEFQID0gTUFUQ0hfSU5TSURFICtcblx0UmVsYXRpb24uT1ZFUkxBUF9MRUZUICsgUmVsYXRpb24uT1ZFUkxBUF9SSUdIVDtcbmNvbnN0IE1BVENIX0NPVkVSUyA9IE1BVENIX09WRVJMQVAgKyBSZWxhdGlvbi5DT1ZFUlM7XG5jb25zdCBNQVRDSF9BTEwgPSBNQVRDSF9DT1ZFUlMgKyBNQVRDSF9PVVRTSURFO1xuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbklOVEVSVkFMXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5jbGFzcyBJbnRlcnZhbCB7XG5cblxuXHRzdGF0aWMgZnJvbUVuZHBvaW50cyhlbmRwb2ludExvdywgZW5kcG9pbnRIaWdoKSB7XG5cdFx0bGV0IFtsb3csIGxvd19yaWdodCwgbG93X2Nsb3NlZCwgbG93X3Npbmd1bGFyXSA9IGVuZHBvaW50TG93O1xuXHRcdGxldCBbaGlnaCwgaGlnaF9yaWdodCwgaGlnaF9jbG9zZWQsIGhpZ2hfc2luZ3VsYXJdID0gZW5kcG9pbnRIaWdoO1xuXHRcdGlmIChsb3dfcmlnaHQpIHtcblx0XHRcdHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwiaWxsZWdhbCBlbmRwb2ludExvdyAtIGJyYWNrZXQgbXVzdCBiZSBsZWZ0XCIpO1xuXHRcdH1cblx0XHRpZiAoIWhpZ2hfcmlnaHQpIHtcblx0XHRcdHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwiaWxsZWdhbCBlbmRwb2ludEhpZ2ggLSBicmFja2V0IG11c3QgYmUgcmlnaHRcIik7XG5cdFx0fVxuXHRcdHJldHVybiBuZXcgSW50ZXJ2YWwobG93LCBoaWdoLCBsb3dfY2xvc2VkLCBoaWdoX2Nsb3NlZCk7XG5cdH07XG5cblxuXHRzdGF0aWMgTWF0Y2ggPSBPYmplY3QuZnJlZXplKHtcblx0XHRPVVRTSURFOiBNQVRDSF9PVVRTSURFLFxuXHRcdElOU0lERTogTUFUQ0hfSU5TSURFLFxuXHRcdE9WRVJMQVA6IE1BVENIX09WRVJMQVAsXG5cdFx0Q09WRVJTOiBNQVRDSF9DT1ZFUlMsXG5cdFx0QUxMOiBNQVRDSF9BTExcblx0fSk7XG5cblxuXHRjb25zdHJ1Y3RvciAobG93LCBoaWdoLCBsb3dJbmNsdWRlLCBoaWdoSW5jbHVkZSkge1xuXHRcdHZhciBsb3dJc051bWJlciA9IGlzTnVtYmVyKGxvdyk7XG5cdFx0dmFyIGhpZ2hJc051bWJlciA9IGlzTnVtYmVyKGhpZ2gpO1xuXHRcdC8vIG5ldyBJbnRlcnZhbCgzLjApIGRlZmluZXMgc2luZ3VsYXIgLSBsb3cgPT09IGhpZ2hcblx0XHRpZiAobG93SXNOdW1iZXIgJiYgaGlnaCA9PT0gdW5kZWZpbmVkKSBoaWdoID0gbG93O1xuXHRcdGlmICghaXNOdW1iZXIobG93KSkgdGhyb3cgbmV3IEludGVydmFsRXJyb3IoXCJsb3cgbm90IGEgbnVtYmVyXCIpO1xuXHRcdGlmICghaXNOdW1iZXIoaGlnaCkpIHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwiaGlnaCBub3QgYSBudW1iZXJcIik7XG5cdFx0aWYgKGxvdyA+IGhpZ2gpIHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwibG93ID4gaGlnaFwiKTtcblx0XHRpZiAobG93ID09PSBoaWdoKSB7XG5cdFx0XHRsb3dJbmNsdWRlID0gdHJ1ZTtcblx0XHRcdGhpZ2hJbmNsdWRlID0gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKGxvdyA9PT0gLUluZmluaXR5KSBsb3dJbmNsdWRlID0gdHJ1ZTtcblx0XHRpZiAoaGlnaCA9PT0gSW5maW5pdHkpIGhpZ2hJbmNsdWRlID0gdHJ1ZTtcblx0XHRpZiAobG93SW5jbHVkZSA9PT0gdW5kZWZpbmVkKSBsb3dJbmNsdWRlID0gdHJ1ZTtcblx0XHRpZiAoaGlnaEluY2x1ZGUgPT09IHVuZGVmaW5lZCkgaGlnaEluY2x1ZGUgPSBmYWxzZTtcblx0XHRpZiAodHlwZW9mIGxvd0luY2x1ZGUgIT09IFwiYm9vbGVhblwiKSB0aHJvdyBuZXcgSW50ZXJ2YWxFcnJvcihcImxvd0luY2x1ZGUgbm90IGJvb2xlYW5cIik7XG5cdFx0aWYgKHR5cGVvZiBoaWdoSW5jbHVkZSAhPT0gXCJib29sZWFuXCIpIHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwiaGlnaEluY2x1ZGUgbm90IGJvb2xlYW5cIik7XG5cdFx0dGhpcy5sb3cgPSBsb3c7XG5cdFx0dGhpcy5oaWdoID0gaGlnaDtcblx0XHR0aGlzLmxvd0luY2x1ZGUgPSBsb3dJbmNsdWRlO1xuXHRcdHRoaXMuaGlnaEluY2x1ZGUgPSBoaWdoSW5jbHVkZTtcblx0XHR0aGlzLmxlbmd0aCA9IHRoaXMuaGlnaCAtIHRoaXMubG93O1xuXHRcdHRoaXMuc2luZ3VsYXIgPSAodGhpcy5sb3cgPT09IHRoaXMuaGlnaCk7XG5cdFx0dGhpcy5maW5pdGUgPSAoaXNGaW5pdGUodGhpcy5sb3cpICYmIGlzRmluaXRlKHRoaXMuaGlnaCkpO1xuXG5cdFx0Lypcblx0XHRcdEFjY2Vzc29ycyBmb3IgZnVsbCBlbmRwb2ludCByZXByZXNlbnRhdGlvbm9cblx0XHRcdFt2YWx1ZSAobnVtYmVyKSwgcmlnaHQgKGJvb2wpLCBjbG9zZWQgKGJvb2wpXVxuXG5cdFx0XHQtIHVzZSB3aXRoIGluc2lkZShlbmRwb2ludCwgaW50ZXJ2YWwpXG5cdFx0Ki9cblx0XHR0aGlzLmVuZHBvaW50TG93ID0gZW5kcG9pbnQuY3JlYXRlKHRoaXMubG93LCBmYWxzZSwgdGhpcy5sb3dJbmNsdWRlLCB0aGlzLnNpbmd1bGFyKTtcblx0XHR0aGlzLmVuZHBvaW50SGlnaCA9IGVuZHBvaW50LmNyZWF0ZSh0aGlzLmhpZ2gsIHRydWUsIHRoaXMuaGlnaEluY2x1ZGUsIHRoaXMuc2luZ3VsYXIpO1xuXHR9XG5cblx0dG9TdHJpbmcgKCkge1xuXHRcdGNvbnN0IHRvU3RyaW5nID0gZW5kcG9pbnQudG9TdHJpbmc7XG5cdFx0aWYgKHRoaXMuc2luZ3VsYXIpIHtcblx0XHRcdGxldCBwID0gdGhpcy5lbmRwb2ludExvd1swXTtcblx0XHRcdHJldHVybiBgWyR7cH1dYDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bGV0IGxvdyA9IGVuZHBvaW50LnRvU3RyaW5nKHRoaXMuZW5kcG9pbnRMb3cpO1xuXHRcdFx0bGV0IGhpZ2ggPSBlbmRwb2ludC50b1N0cmluZyh0aGlzLmVuZHBvaW50SGlnaCk7XG5cdFx0XHRyZXR1cm4gYCR7bG93fSwke2hpZ2h9YDtcblx0XHR9XG5cdH07XG5cblx0Y292ZXJzX2VuZHBvaW50IChwKSB7XG5cdFx0bGV0IGxlZnRvZiA9IGVuZHBvaW50LmxlZnRvZihwLCB0aGlzLmVuZHBvaW50TG93KTtcblx0XHRsZXQgcmlnaHRvZiA9IGVuZHBvaW50LnJpZ2h0b2YocCwgdGhpcy5lbmRwb2ludEhpZ2gpO1xuXHRcdHJldHVybiAhbGVmdG9mICYmICFyaWdodG9mO1xuXHR9XG5cblx0Y29tcGFyZSAob3RoZXIpIHtcblx0XHRyZXR1cm4gY29tcGFyZSh0aGlzLCBvdGhlcik7XG5cdH1cblxuXHRlcXVhbHMgKG90aGVyKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmUodGhpcywgb3RoZXIpID09IFJlbGF0aW9uLkVRVUFMUztcblx0fVxuXG5cdGNvdmVyZWQgKG90aGVyKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmUodGhpcywgb3RoZXIpID09IFJlbGF0aW9uLkNPVkVSRUQ7XG5cdH1cblxuXHRjb3ZlcnMgKG90aGVyKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmUodGhpcywgb3RoZXIpID09IFJlbGF0aW9uLkNPVkVSUztcblx0fVxuXG5cdC8qXG5cdFx0ZGVmYXVsdCBtb2RlIC0gYWxsIGV4Y2VwdCBvdXRzaWRlXG5cdFx0Mis0KzgrMTYrMzIgPSA2MlxuXHQqL1xuXHRtYXRjaCAob3RoZXIsIG1hc2s9TUFUQ0hfQ09WRVJTKSB7XG5cdFx0bGV0IHJlbGF0aW9uID0gY29tcGFyZSh0aGlzLCBvdGhlcik7XG5cdFx0cmV0dXJuIEJvb2xlYW4obWFzayAmIHJlbGF0aW9uKTtcblx0fVxufVxuXG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ09NUEFSRSBJTlRFUlZBTFNcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuY29tcGFyZSAoYSwgYilcbnBhcmFtIGEgSW50ZXJ2YWxcbnBhcmFtIGIgSW50ZXJ2YWxcbnJldHVybnMgSW50ZXJ2YWxSZWxhdGlvblxuXG5jb21wYXJlcyBpbnRlcnZhbCBiIHRvIGludGVydmFsIGFcbmUuZy4gcmV0dXJuIHZhbHVlIENPVkVSRUQgcmVhZHMgYiBpcyBjb3ZlcmVkIGJ5IGEuXG5cbmNtcF8xID0gZW5kcG9pbnRfY29tcGFyZShiX2xvdywgYV9sb3cpO1xuY21wXzIgPSBlbmRwb2ludF9jb21wYXJlKGJfaGlnaCwgYV9oaWdoKTtcblxua2V5ID0gMTAqY21wXzEgKyBjbXBfMlxuXG5jbXBfMSAgY21wXzIgIGtleSAgcmVsYXRpb25cbj09PT09ICA9PT09PSAgPT09ICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4tMSAgICAgLTEgICAgIC0xMSAgT1VUU0lERV9MRUZULCBQQVJUSUFMX0xFRlRcbi0xIFx0ICAgMCAgICAgIC0xMCAgQ09WRVJTXG4tMSAgICAgMSAgICAgICAtOSAgQ09WRVJTXG4wXHQgICAtMSAgICAgIC0xICBDT1ZFUkVEXG4wICAgICAgMCAgICAgICAgMCAgRVFVQUxcbjAgXHQgICAxICAgICAgICAxICBDT1ZFUlNcbjEgICAgICAtMSAgICAgICA5ICBDT1ZFUkVEXG4xIFx0ICAgMCAgICAgICAxMCAgQ09WRVJFRFxuMSBcdCAgIDEgICAgICAgMTEgIE9VVFNJREVfUklHSFQsIE9WRVJMQVBfUklHSFRcbj09PT09ICA9PT09PSAgPT09ICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcblx0aWYgKCEgYSBpbnN0YW5jZW9mIEludGVydmFsKSB7XG5cdFx0Ly8gY291bGQgYmUgYSBudW1iZXJcblx0XHRpZiAoaXNOdW1iZXIoYSkpIHtcblx0XHRcdGEgPSBuZXcgSW50ZXJ2YWwoYSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBJbnRlcnZhbEVycm9yKFwiYSBub3QgaW50ZXJ2YWxcIiwgYSk7XG5cdFx0fVxuXHR9XG5cdGlmICghIGIgaW5zdGFuY2VvZiBJbnRlcnZhbCkge1xuXHRcdC8vIGNvdWxkIGJlIGEgbnVtYmVyXG5cdFx0aWYgKGlzTnVtYmVyKGIpKSB7XG5cdFx0XHRiID0gbmV3IEludGVydmFsKGIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgSW50ZXJ2YWxFcnJvcihcImIgbm90IGludGVydmFsXCIsIGIpO1xuXHRcdH1cblx0fVxuXG5cdGxldCBjbXBfMSA9IGVuZHBvaW50LmNtcChhLmVuZHBvaW50TG93LCBiLmVuZHBvaW50TG93KTtcblx0bGV0IGNtcF8yID0gZW5kcG9pbnQuY21wKGEuZW5kcG9pbnRIaWdoLCBiLmVuZHBvaW50SGlnaCk7XG5cdGxldCBrZXkgPSBjbXBfMSoxMCArIGNtcF8yO1xuXG5cdGlmIChrZXkgPT0gMTEpIHtcblx0XHQvLyBPVVRTSURFX0xFRlQgb3IgUEFSVElBTF9MRUZUXG5cdFx0aWYgKGVuZHBvaW50LmxlZnRvZihiLmVuZHBvaW50SGlnaCwgYS5lbmRwb2ludExvdykpIHtcblx0XHRcdHJldHVybiBSZWxhdGlvbi5PVVRTSURFX1JJR0hUO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gUmVsYXRpb24uT1ZFUkxBUF9SSUdIVDtcblx0XHR9XG5cdH0gZWxzZSBpZiAoWy0xLCA5LCAxMF0uaW5jbHVkZXMoa2V5KSkge1xuXHRcdHJldHVybiBSZWxhdGlvbi5DT1ZFUkVEO1xuXHR9IGVsc2UgaWYgKFsxLCAtOSwgLTEwXS5pbmNsdWRlcyhrZXkpKSB7XG5cdFx0cmV0dXJuIFJlbGF0aW9uLkNPVkVSUztcblx0fSBlbHNlIGlmIChrZXkgPT0gMCkge1xuXHRcdHJldHVybiBSZWxhdGlvbi5FUVVBTFM7XG5cdH0gZWxzZSB7XG5cdFx0Ly8ga2V5ID09IC0xMVxuXHRcdC8vIE9VVFNJREVfUklHSFQsIFBBUlRJQUxfUklHSFRcblx0XHRpZiAoZW5kcG9pbnQucmlnaHRvZihiLmVuZHBvaW50TG93LCBhLmVuZHBvaW50SGlnaCkpIHtcblx0XHRcdHJldHVybiBSZWxhdGlvbi5PVVRTSURFX0xFRlQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBSZWxhdGlvbi5PVkVSTEFQX0xFRlQ7XG5cdFx0fVxuXHR9XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbkNPTVBBUkUgSU5URVJWQUxTIEJZIEVORFBPSU5UXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbmNtcCBmdW5jdGlvbnMgZm9yIHNvcnRpbmcgaW50ZXJ2YWxzIChhc2NlbmRpbmcpIGJhc2VkIG9uXG5lbmRwb2ludCBsb3cgb3IgaGlnaFxuXG51c2Ugd2l0aCBhcnJheS5zb3J0KClcblxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZnVuY3Rpb24gX21ha2VfaW50ZXJ2YWxfY21wKGxvdykge1xuXHRyZXR1cm4gZnVuY3Rpb24gY21wIChhLCBiKSB7XG5cdFx0bGV0IGUxLCBlMjtcblx0XHRpZiAobG93KSB7XG5cdFx0XHRlMSA9IFthLmxvdywgZmFsc2UsIGEubG93SW5jbHVkZSwgYS5zaW5ndWxhcl07XG5cdFx0XHRlMiA9IFtiLmxvdywgZmFsc2UsIGIubG93SW5jbHVkZSwgYS5zaW5ndWxhcl07XG5cdFx0fSBlbHNlIHtcblx0XHRcdGUxID0gW2EuaGlnaCwgdHJ1ZSwgYS5oaWdoSW5jbHVkZSwgYS5zaW5ndWxhcl07XG5cdFx0XHRlMiA9IFtiLmhpZ2gsIHRydWUsIGIuaGlnaEluY2x1ZGUsIGEuc2luZ3VsYXJdO1xuXHRcdH1cblx0XHRyZXR1cm4gZW5kcG9pbnQuY21wKGUxLCBlMik7XG5cdH1cbn1cblxuLypcblx0QWRkIHN0YXRpYyB2YXJpYWJsZXMgdG8gSW50ZXJ2YWwgY2xhc3MuXG4qL1xuSW50ZXJ2YWwuUmVsYXRpb24gPSBSZWxhdGlvbjtcbkludGVydmFsLmNtcExvdyA9IF9tYWtlX2ludGVydmFsX2NtcCh0cnVlKTtcbkludGVydmFsLmNtcEhpZ2ggPSBfbWFrZV9pbnRlcnZhbF9jbXAoZmFsc2UpO1xuXG4vKlxuXHRQb3NzaWJpbGl0eSBmb3IgbW9yZSBpbnRlcnZhbCBtZXRob2RzIHN1Y2ggYXMgdW5pb24sIGludGVyc2VjdGlvbixcbiovXG5cbmV4cG9ydCBkZWZhdWx0IEludGVydmFsO1xuXG4iLCIvKlxuXHRDb3B5cmlnaHQgMjAyMFxuXHRBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbmltcG9ydCBlbmRwb2ludCBmcm9tICcuL2VuZHBvaW50LmpzJztcbmltcG9ydCBJbnRlcnZhbCBmcm9tICcuL2ludGVydmFsLmpzJztcblxuXG4vLyBzb3J0IGZ1bmNcbmNvbnN0IGNtcCA9IGZ1bmN0aW9uIChhLCBiKSB7cmV0dXJuIGEgLSBiO307XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gQkFTSUNcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFZlY3RvcnModmVjdG9yX2EsIHZlY3Rvcl9iKSB7XG4gICAgbGV0IHBvcyA9IHZlY3Rvcl9hLnBvc2l0aW9uID09IHZlY3Rvcl9iLnBvc2l0aW9uO1xuICAgIGxldCB2ZWwgPSB2ZWN0b3JfYS52ZWxvY2l0eSA9PSB2ZWN0b3JfYi52ZWxvY2l0eTtcbiAgICBsZXQgYWNjID0gdmVjdG9yX2EuYWNjZWxlcmF0aW9uID09IHZlY3Rvcl9iLmFjY2VsZXJhdGlvbjtcbiAgICBsZXQgdHMgPSB2ZWN0b3JfYS50aW1lc3RhbXAgPT0gdmVjdG9yX2IudGltZXN0YW1wO1xuICAgIHJldHVybiBwb3MgJiYgdmVsICYmIGFjYyAmJiB0cztcbn07XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlWZWN0b3IodmVjdG9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcG9zaXRpb246IHZlY3Rvci5wb3NpdGlvbixcbiAgICAgICAgdmVsb2NpdHk6IHZlY3Rvci52ZWxvY2l0eSxcbiAgICAgICAgYWNjZWxlcmF0aW9uOiB2ZWN0b3IuYWNjZWxlcmF0aW9uLFxuICAgICAgICB0aW1lc3RhbXA6IHZlY3Rvci50aW1lc3RhbXBcbiAgICB9XG59O1xuXG4vKlxuICAgIENhbGN1bGF0ZSB2ZWN0b3Igc25hcHNob3QgZm9yIG1vdGlvbiBkZWZpbmVkIGJ5IHZlY3RvciBhdCB0aW1lIHRzXG5cbiAgICB2ZWN0b3I6IFtwMCx2MCxhMCx0MF1cbiAgICB0MCBhbmQgdHMgYXJlIGFic29sdXRlIHRpbWUgZnJvbSBzYW1lIGNsb2NrLCBpbiBzZWNvbmRzXG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlVmVjdG9yKHZlY3RvciwgdHMpIHtcblx0aWYgKHRzID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvciAoXCJubyB0cyBwcm92aWRlZCBmb3IgY2FsY3VsYXRlVmVjdG9yXCIpO1xuXHR9XG5cdGNvbnN0IGRlbHRhU2VjID0gdHMgLSB2ZWN0b3IudGltZXN0YW1wO1xuXHRyZXR1cm4ge1xuXHRcdHBvc2l0aW9uIDogdmVjdG9yLnBvc2l0aW9uICsgdmVjdG9yLnZlbG9jaXR5KmRlbHRhU2VjICsgMC41KnZlY3Rvci5hY2NlbGVyYXRpb24qZGVsdGFTZWMqZGVsdGFTZWMsXG5cdFx0dmVsb2NpdHkgOiB2ZWN0b3IudmVsb2NpdHkgKyB2ZWN0b3IuYWNjZWxlcmF0aW9uKmRlbHRhU2VjLFxuXHRcdGFjY2VsZXJhdGlvbiA6IHZlY3Rvci5hY2NlbGVyYXRpb24sXG5cdFx0dGltZXN0YW1wIDogdHNcblx0fTtcbn07XG5cblxuLypcbiAgICBDYWxjdWxhdGUgZGlyZWN0aW9uIG9mIG1vdGlvbiBhdCB0aW1lIHRzXG4gICAgMSA6IGZvcndhcmRzLCAtMSA6IGJhY2t3YXJkczogMCwgbm8gbW92ZW1lbnRcbiovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlRGlyZWN0aW9uKHZlY3RvciwgdHMpIHtcbiAgICAvKlxuICAgICAgR2l2ZW4gaW5pdGlhbCB2ZWN0b3IgY2FsY3VsYXRlIGRpcmVjdGlvbiBvZiBtb3Rpb24gYXQgdGltZSB0XG4gICAgICAoUmVzdWx0IGlzIHZhbGlkIG9ubHkgaWYgKHQgPiB2ZWN0b3JbVF0pKVxuICAgICAgUmV0dXJuIEZvcndhcmRzOjEsIEJhY2t3YXJkcyAtMSBvciBOby1kaXJlY3Rpb24gKGkuZS4gbm8tbW90aW9uKSAwLlxuICAgICAgSWYgdCBpcyB1bmRlZmluZWQgLSB0IGlzIGFzc3VtZWQgdG8gYmUgbm93LlxuICAgICovXG4gICAgbGV0IGZyZXNoVmVjdG9yO1xuICAgIGlmICh0cyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZnJlc2hWZWN0b3IgPSB2ZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJlc2hWZWN0b3IgPSBjYWxjdWxhdGVWZWN0b3IodmVjdG9yLCB0cyk7XG4gICAgfVxuICAgIC8vIGNoZWNrIHZlbG9jaXR5XG4gICAgbGV0IGRpcmVjdGlvbiA9IGNtcChmcmVzaFZlY3Rvci52ZWxvY2l0eSwgMC4wKTtcbiAgICBpZiAoZGlyZWN0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIGNoZWNrIGFjY2VsZXJhdGlvblxuICAgICAgICBkaXJlY3Rpb24gPSBjbXAodmVjdG9yLmFjY2VsZXJhdGlvbiwgMC4wKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpcmVjdGlvbjtcbn07XG5cblxuLypcbiAgICBpc01vdmluZ1xuXG4gICAgcmV0dXJucyB0cnVlIGlmIG1vdGlvbiBpcyBtb3ZpbmcgZWxzZSBmYWxzZVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01vdmluZyh2ZWN0b3IpIHtcbiAgICByZXR1cm4gKHZlY3Rvci52ZWxvY2l0eSAhPT0gMC4wIHx8IHZlY3Rvci5hY2NlbGVyYXRpb24gIT09IDAuMCk7XG59O1xuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gUkFOR0VcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vXHRSQU5HRSBTVEFURSBpcyB1c2VkIGZvciBtYW5hZ2luZy9kZXRlY3RpbmcgcmFuZ2UgdmlvbGF0aW9ucy5cbmV4cG9ydCBjb25zdCBSYW5nZVN0YXRlID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgSU5JVCA6IFwiaW5pdFwiLFxuICAgIElOU0lERTogXCJpbnNpZGVcIixcbiAgICBPVVRTSURFX0xPVzogXCJvdXRzaWRlbG93XCIsXG4gICAgT1VUU0lERV9ISUdIOiBcIm91dHNpZGVoaWdoXCJcbn0pO1xuXG4vKlxuXHRBIHNuYXBzaG90IHZlY3RvciBpcyBjaGVja2VkIHdpdGggcmVzcGVjdCB0byByYW5nZSxcblx0Y2FsY2x1bGF0ZXMgY29ycmVjdCBSYW5nZVN0YXRlIChpLmUuIElOU0lERXxPVVRTSURFKVxuKi9cbmV4cG9ydCBmdW5jdGlvbiBjb3JyZWN0UmFuZ2VTdGF0ZSh2ZWN0b3IsIHJhbmdlKSB7XG4gICAgY29uc3Qge3Bvc2l0aW9uOiBwLCB2ZWxvY2l0eTogdiwgYWNjZWxlcmF0aW9uOiBhfSA9IHZlY3Rvcjtcblx0aWYgKHAgPiByYW5nZVsxXSkgcmV0dXJuIFJhbmdlU3RhdGUuT1VUU0lERV9ISUdIO1xuXHRpZiAocCA8IHJhbmdlWzBdKSByZXR1cm4gUmFuZ2VTdGF0ZS5PVVRTSURFX0xPVztcblx0Ly8gY29ybmVyIGNhc2VzXG5cdGlmIChwID09PSByYW5nZVsxXSkge1xuXHRcdGlmICh2ID4gMC4wKSByZXR1cm4gUmFuZ2VTdGF0ZS5PVVRTSURFX0hJR0g7XG5cdFx0aWYgKHYgPT09IDAuMCAmJiBhID4gMC4wKSByZXR1cm4gUmFuZ2VTdGF0ZS5PVVRTSURFX0hJR0g7XG5cdH0gZWxzZSBpZiAocCA9PT0gcmFuZ2VbMF0pIHtcblx0ICAgIGlmICh2IDwgMC4wKSByZXR1cm4gUmFuZ2VTdGF0ZS5PVVRTSURFX0xPVztcblx0ICAgIGlmICh2ID09IDAuMCAmJiBhIDwgMC4wKSByZXR1cm4gUmFuZ2VTdGF0ZS5PVVRTSURFX0hJR0g7XG5cdH1cblx0cmV0dXJuIFJhbmdlU3RhdGUuSU5TSURFO1xufTtcblxuLypcblxuXHRBIHNuYXBzaG90IHZlY3RvciBpcyBjaGVja2VkIHdpdGggcmVzcGVjdCB0byByYW5nZS5cblx0UmV0dXJucyB2ZWN0b3IgY29ycmVjdGVkIGZvciByYW5nZSB2aW9sYXRpb25zLCBvciBpbnB1dCB2ZWN0b3IgdW5jaGFuZ2VkLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1JhbmdlKHZlY3RvciwgcmFuZ2UpIHtcblx0Y29uc3Qgc3RhdGUgPSBjb3JyZWN0UmFuZ2VTdGF0ZSh2ZWN0b3IsIHJhbmdlKTtcblx0aWYgKHN0YXRlICE9PSBSYW5nZVN0YXRlLklOU0lERSkge1xuXHRcdC8vIHByb3RlY3QgZnJvbSByYW5nZSB2aW9sYXRpb25cblx0XHR2ZWN0b3IudmVsb2NpdHkgPSAwLjA7XG5cdFx0dmVjdG9yLmFjY2VsZXJhdGlvbiA9IDAuMDtcblx0XHRpZiAoc3RhdGUgPT09IFJhbmdlU3RhdGUuT1VUU0lERV9ISUdIKSB7XG5cdFx0XHR2ZWN0b3IucG9zaXRpb24gPSByYW5nZVsxXTtcblx0XHR9IGVsc2UgdmVjdG9yLnBvc2l0aW9uID0gcmFuZ2VbMF07XG5cdH1cblx0cmV0dXJuIHZlY3Rvcjtcbn07XG5cblxuLypcbiAgICBSZXR1cm4gdHNFbmRwb2ludCBvZiAoZmlyc3QpIHJhbmdlIGludGVyc2VjdCBpZiBhbnkuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlSW50ZXJzZWN0KHZlY3RvciwgcmFuZ2UpIHtcbiAgICBsZXQgdDAgPSB2ZWN0b3IudGltZXN0YW1wO1xuICAgIC8vIFRpbWUgZGVsdGEgdG8gaGl0IHJhbmdlTGVmdFxuICAgIGxldCBkZWx0YUxlZnQgPSBjYWxjdWxhdGVNaW5Qb3NpdGl2ZVJlYWxTb2x1dGlvbih2ZWN0b3IsIHJhbmdlWzBdKTtcbiAgICAvLyBUaW1lIGRlbHRhIHRvIGhpdCByYW5nZVJpZ2h0XG4gICAgbGV0IGRlbHRhUmlnaHQgPSBjYWxjdWxhdGVNaW5Qb3NpdGl2ZVJlYWxTb2x1dGlvbih2ZWN0b3IsIHJhbmdlWzFdKTtcbiAgICAvLyBQaWNrIHRoZSBhcHByb3ByaWF0ZSBzb2x1dGlvblxuICAgIGlmIChkZWx0YUxlZnQgIT09IHVuZGVmaW5lZCAmJiBkZWx0YVJpZ2h0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGRlbHRhTGVmdCA8IGRlbHRhUmlnaHQpIHtcbiAgICAgICAgICAgIHJldHVybiBbdDAgKyBkZWx0YUxlZnQsIHJhbmdlWzBdXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gW3QwICsgZGVsdGFSaWdodCwgcmFuZ2VbMV1dO1xuICAgIH1cbiAgICBlbHNlIGlmIChkZWx0YUxlZnQgIT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIFt0MCArIGRlbHRhTGVmdCwgcmFuZ2VbMF1dO1xuICAgIGVsc2UgaWYgKGRlbHRhUmlnaHQgIT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIFt0MCArIGRlbHRhUmlnaHQsIHJhbmdlWzFdXTtcbiAgICBlbHNlIHJldHVybiBbdW5kZWZpbmVkLCB1bmRlZmluZWRdO1xufVxuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gRVFVQVRJT05TXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKlxuICAgIGhhc1JlYWxTb2x1dGlvblxuXG4gICAgR2l2ZW4gbW90aW9uIGRldGVybWluZWQgZnJvbSBwLHYsYSx0LlxuICAgIERldGVybWluZSBpZiBlcXVhdGlvbiBwKHQpID0gcCArIHZ0ICsgMC41YXReMiA9IHhcbiAgICBoYXMgc29sdXRpb25zIGZvciBzb21lIHJlYWwgbnVtYmVyIHQuXG4qL1xuXG5mdW5jdGlvbiBoYXNSZWFsU29sdXRpb24gKHAsdixhLHgpIHtcblx0aWYgKChNYXRoLnBvdyh2LDIpIC0gMiphKihwLXgpKSA+PSAwLjApIHJldHVybiB0cnVlO1xuXHRlbHNlIHJldHVybiBmYWxzZTtcbn07XG5cblxuLypcbiAgICBjYWxjdWxhdGVSZWFsU29sdXRpb25cblxuICAgIEdpdmVuIG1vdGlvbiBkZXRlcm1pbmVkIGZyb20gcCx2LGEsdC5cbiAgICBEZXRlcm1pbmUgaWYgZXF1YXRpb24gcCh0KSA9IHAgKyB2dCArIDAuNWF0XjIgPSB4XG4gICAgaGFzIHNvbHV0aW9ucyBmb3Igc29tZSByZWFsIG51bWJlciB0LlxuICAgIENhbGN1bGF0ZSBhbmQgcmV0dXJuIHJlYWwgc29sdXRpb25zLCBpbiBhc2NlbmRpbmcgb3JkZXIuXG4qL1xuXG5mdW5jdGlvbiBjYWxjdWxhdGVSZWFsU29sdXRpb25zKHAsdixhLHgpIHtcblx0Ly8gQ29uc3RhbnQgUG9zaXRpb25cblx0aWYgKGEgPT09IDAuMCAmJiB2ID09PSAwLjApIHtcblx0ICAgIGlmIChwICE9IHgpIHJldHVybiBbXTtcblx0ICAgIGVsc2UgcmV0dXJuIFswLjBdO1xuXHR9XG5cdC8vIENvbnN0YW50IG5vbi16ZXJvIFZlbG9jaXR5XG5cdGlmIChhID09PSAwLjApIHJldHVybiBbKHgtcCkvdl07XG5cdC8vIENvbnN0YW50IEFjY2VsZXJhdGlvblxuXHRpZiAoaGFzUmVhbFNvbHV0aW9uKHAsdixhLHgpID09PSBmYWxzZSkgcmV0dXJuIFtdO1xuXHQvLyBFeGFjdGx5IG9uZSBzb2x1dGlvblxuXHRjb25zdCBkaXNjcmltaW5hbnQgPSB2KnYgLSAyKmEqKHAteCk7XG5cdGlmIChkaXNjcmltaW5hbnQgPT09IDAuMCkge1xuXHQgICAgcmV0dXJuIFstdi9hXTtcblx0fVxuXHRjb25zdCBzcXJ0ID0gTWF0aC5zcXJ0KE1hdGgucG93KHYsMikgLSAyKmEqKHAteCkpO1xuXHRjb25zdCBkMSA9ICgtdiArIHNxcnQpL2E7XG5cdGNvbnN0IGQyID0gKC12IC0gc3FydCkvYTtcblx0cmV0dXJuIFtNYXRoLm1pbihkMSxkMiksTWF0aC5tYXgoZDEsZDIpXTtcbn07XG5cblxuLypcbiAgICBjYWxjdWxhdGVQb3NpdGl2ZVJlYWxTb2x1dGlvbnNcblxuICAgIEdpdmVuIG1vdGlvbiBkZXRlcm1pbmVkIGZyb20gcCx2LGEsdC5cbiAgICBEZXRlcm1pbmUgaWYgZXF1YXRpb24gcCh0KSA9IHAgKyB2dCArIDAuNWF0XjIgPSB4XG4gICAgaGFzIHNvbHV0aW9ucyBmb3Igc29tZSByZWFsIG51bWJlciB0LlxuICAgIENhbGN1bGF0ZSBhbmQgcmV0dXJuIHBvc2l0aXZlIHJlYWwgc29sdXRpb25zLCBpbiBhc2NlbmRpbmcgb3JkZXIuXG4qL1xuXG5mdW5jdGlvbiBjYWxjdWxhdGVQb3NpdGl2ZVJlYWxTb2x1dGlvbnMocCx2LGEseCkge1xuXHRjb25zdCByZXMgPSBjYWxjdWxhdGVSZWFsU29sdXRpb25zKHAsdixhLHgpO1xuXHRpZiAocmVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuXHRlbHNlIGlmIChyZXMubGVuZ3RoID09IDEpIHtcblx0ICAgIGlmIChyZXNbMF0gPiAwLjApIHtcblx0XHRcdHJldHVybiBbcmVzWzBdXTtcblx0ICAgIH1cblx0ICAgIGVsc2UgcmV0dXJuIFtdO1xuXHR9XG5cdGVsc2UgaWYgKHJlcy5sZW5ndGggPT0gMikge1xuXHQgICAgaWYgKHJlc1sxXSA8IDAuMCkgcmV0dXJuIFtdO1xuXHQgICAgaWYgKHJlc1swXSA+IDAuMCkgcmV0dXJuIFtyZXNbMF0sIHJlc1sxXV07XG5cdCAgICBpZiAocmVzWzFdID4gMC4wKSByZXR1cm4gW3Jlc1sxXV07XG5cdCAgICByZXR1cm4gW107XG5cdH1cblx0ZWxzZSByZXR1cm4gW107XG59O1xuXG5cbi8qXG4gICAgY2FsY3VsYXRlTWluUG9zaXRpdmVSZWFsU29sdXRpb25cblxuICAgIEdpdmVuIG1vdGlvbiBkZXRlcm1pbmVkIGZyb20gcCx2LGEsdC5cbiAgICBEZXRlcm1pbmUgaWYgZXF1YXRpb24gcCh0KSA9IHAgKyB2dCArIDAuNWF0XjIgPSB4XG4gICAgaGFzIHNvbHV0aW9ucyBmb3Igc29tZSByZWFsIG51bWJlciB0LlxuICAgIENhbGN1bGF0ZSBhbmQgcmV0dXJuIHRoZSBsZWFzdCBwb3NpdGl2ZSByZWFsIHNvbHV0aW9uLlxuKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZU1pblBvc2l0aXZlUmVhbFNvbHV0aW9uKHZlY3RvciwgeCkge1xuICAgIGNvbnN0IHtwb3NpdGlvbjogcCwgdmVsb2NpdHk6IHYsIGFjY2VsZXJhdGlvbjogYX0gPSB2ZWN0b3I7XG5cdGNvbnN0IHJlcyA9IGNhbGN1bGF0ZVBvc2l0aXZlUmVhbFNvbHV0aW9ucyhwLHYsYSx4KTtcblx0aWYgKHJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblx0ZWxzZSByZXR1cm4gcmVzWzBdO1xufTtcblxuXG4vKlxuICAgIGNhbGN1bGF0ZURlbHRhXG5cblxuICAgIEdpdmVuIG1vdGlvbiBkZXRlcm1pbmVkIGZyb20gcDAsdjAsYTAgKGluaXRpYWwgY29uZGl0aW9ucyBvciBzbmFwc2hvdCksXG4gICAgU3VwcGx5IHR3byBwb3Npc2lvbnMsIHBvc0JlZm9yZSA8IHAwIDwgcG9zQWZ0ZXIuXG4gICAgQ2FsY3VsYXRlIHdoaWNoIG9mIHRoZXNlIHBvc2l0aW9ucyB3aWxsIGJlIHJlYWNoZWQgZmlyc3QsXG4gICAgaWYgYW55LCBieSB0aGUgbW92ZW1lbnQgZGVzY3JpYmVkIGJ5IHRoZSB2ZWN0b3IuXG4gICAgSW4gYWRkaXRpb24sIGNhbGN1bGF0ZSB3aGVuIHRoaXMgcG9zaXRpb24gd2lsbCBiZSByZWFjaGVkLlxuICAgIFJlc3VsdCB3aWxsIGJlIGV4cHJlc3NlZCBhcyB0aW1lIGRlbHRhIHJlbGF0aXZlIHRvIHQwLCBpZiBzb2x1dGlvbiBleGlzdHMsXG4gICAgYW5kIGEgZmxhZyB0byBpbmRpY2F0ZSBCZWZvcmUgKGZhbHNlKSBvciBBZnRlciAodHJ1ZSlcbiAgICBOb3RlOiB0MSA9PSAoZGVsdGEgKyB0MCkgaXMgb25seSBndWFyYW50ZWVkIHRvIGJlIGluIHRoZVxuICAgIGZ1dHVyZSBhcyBsb25nIGFzIHRoZSBmdW5jdGlvblxuICAgIGlzIGV2YWx1YXRlZCBhdCB0aW1lIHQwIG9yIGltbWVkaWF0ZWx5IGFmdGVyLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVEZWx0YSh2ZWN0b3IsIHJhbmdlKSB7XG5cdC8vIFRpbWUgZGVsdGEgdG8gaGl0IHBvc0JlZm9yZVxuXHRjb25zdCBkZWx0YUJlZm9yZVNlYyA9IGNhbGN1bGF0ZU1pblBvc2l0aXZlUmVhbFNvbHV0aW9uKHZlY3RvciwgcmFuZ2VbMF0pO1xuXHQvLyBUaW1lIGRlbHRhIHRvIGhpdCBwb3NBZnRlclxuXHRjb25zdCBkZWx0YUFmdGVyU2VjID0gY2FsY3VsYXRlTWluUG9zaXRpdmVSZWFsU29sdXRpb24odmVjdG9yLCByYW5nZVsxXSk7XG5cdC8vIFBpY2sgdGhlIGFwcHJvcHJpYXRlIHNvbHV0aW9uXG5cdGlmIChkZWx0YUJlZm9yZVNlYyAhPT0gdW5kZWZpbmVkICYmIGRlbHRhQWZ0ZXJTZWMgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgaWYgKGRlbHRhQmVmb3JlU2VjIDwgZGVsdGFBZnRlclNlYylcblx0XHRcdHJldHVybiBbZGVsdGFCZWZvcmVTZWMsIHJhbmdlWzBdXTtcblx0ICAgIGVsc2Vcblx0XHRcdHJldHVybiBbZGVsdGFBZnRlclNlYywgcmFuZ2VbMV1dO1xuXHR9XG5cdGVsc2UgaWYgKGRlbHRhQmVmb3JlU2VjICE9PSB1bmRlZmluZWQpXG5cdCAgICByZXR1cm4gW2RlbHRhQmVmb3JlU2VjLCByYW5nZVswXV07XG5cdGVsc2UgaWYgKGRlbHRhQWZ0ZXJTZWMgIT09IHVuZGVmaW5lZClcblx0ICAgIHJldHVybiBbZGVsdGFBZnRlclNlYywgcmFuZ2VbMV1dO1xuXHRlbHNlIHJldHVybiBbdW5kZWZpbmVkLCB1bmRlZmluZWRdO1xufTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIFRJTUVfSU5URVJWQUwgUE9TX0lOVEVSVkFMXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKlxuICAgIHBvc0ludGVydmFsX2Zyb21fdGltZUludGVydmFsXG5cbiAgICBnaXZlblxuICAgIC0gYSB0aW1lIGludGVydmFsXG4gICAgLSBhIHZlY3RvciBkZXNjcmliaW5nIG1vdGlvbiB3aXRoaW4gdGhlIHRpbWUgaW50ZXJ2YWxcbiAgICBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbnRlcnZhbCAob2YgcG9zaXRpb25zKVxuICAgIHRoYXQgY292ZXJzIGFsbCBwb3NzaWJsZSBwb3NpdGlvbnMgZHVyaW5nIHRoZSB0aW1lIGludGVydmFsXG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gcG9zSW50ZXJ2YWxfZnJvbV90aW1lSW50ZXJ2YWwgKHRpbWVJbnRlcnZhbCwgdmVjdG9yKSB7XG5cbiAgICAvKlxuICAgICAgICBubyBtb3Rpb24gb3Igc2luZ3VsYXIgdGltZSBpbnRlcnZhbFxuICAgICovXG4gICAgaWYgKCFpc01vdmluZyh2ZWN0b3IpIHx8IHRpbWVJbnRlcnZhbC5zaW5ndWxhcikge1xuICAgICAgICByZXR1cm4gbmV3IEludGVydmFsKHZlY3Rvci5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgbGV0IHQwID0gdGltZUludGVydmFsLmxvdztcbiAgICBsZXQgdDEgPSB0aW1lSW50ZXJ2YWwuaGlnaDtcbiAgICBsZXQgdDBfY2xvc2VkID0gdGltZUludGVydmFsLmxvd0luY2x1ZGU7XG4gICAgbGV0IHQxX2Nsb3NlZCA9IHRpbWVJbnRlcnZhbC5oaWdoSW5jbHVkZTtcblxuICAgIGxldCB2ZWN0b3IwID0gY2FsY3VsYXRlVmVjdG9yKHZlY3RvciwgdDApO1xuICAgIGxldCBwMCA9IHZlY3RvcjAucG9zaXRpb247XG4gICAgbGV0IHYwID0gdmVjdG9yMC52ZWxvY2l0eTtcbiAgICBsZXQgYTAgPSB2ZWN0b3IwLmFjY2VsZXJhdGlvbjtcbiAgICBsZXQgcDEgPSBjYWxjdWxhdGVWZWN0b3IodmVjdG9yLCB0MSkucG9zaXRpb247XG5cbiAgICBpZiAoYTAgIT0gMCkge1xuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBtb3Rpb24sIHdpdGggYWNjZWxlcmF0aW9uXG5cbiAgICAgICAgICAgIHBvc2l0aW9uIG92ZXIgdGltZSBpcyBhIHBhcmFib2xhXG4gICAgICAgICAgICBmaWd1cmUgb3V0IGlmIGV4dHJlbWEgaGFwcGVucyB0byBvY2NvciB3aXRoaW5cbiAgICAgICAgICAgIHRpbWVJbnRlcnZhbC4gSWYgaXQgZG9lcywgZXh0cmVtZSBwb2ludCBpcyBlbmRwb2ludCBpblxuICAgICAgICAgICAgcG9zaXRpb24gSW50ZXJ2YWwuIHAwIG9yIHAxIHdpbGwgYmUgdGhlIG90aGVyXG4gICAgICAgICAgICBpbnRlcnZhbCBlbmRwb2ludC5cblxuICAgICAgICAgICAgSSBleHRyZW1lIHBvaW50IGlzIG5vdCBvY2N1cmluZyB3aXRoaW4gdGltZUludGVydmFsLFxuICAgICAgICAgICAgaW50ZXJ2YWwgZW5kcG9pbnQgd2lsbCBiZSBwMCBhbmQgcDEuXG5cbiAgICAgICAgICAgIGdlbmVyYWwgcGFyYWJvbGFcbiAgICAgICAgICAgIHkgPSBBeCp4ICsgQnggKyBDXG4gICAgICAgICAgICBleHRyZW1hICh4LHkpIDogeCA9IC0gQi8yQSwgeSA9IC1CKkIvNEEgKyBDXG5cbiAgICAgICAgICAgIHdoZXJlIHQwIDw9IHQgPD0gdDFcbiAgICAgICAgICAgIHAodCkgPSAwLjUqYTAqKHQtdDApKih0LXQwKSArIHYwKih0LXQwKSArIHAwLFxuXG4gICAgICAgICAgICBBID0gYTAvMiwgQiA9IHYwLCBDID0gcDBcblxuICAgICAgICAgICAgZXh0cmVtYSAodF9leHRyZW1hLCBwX2V4dHJlbWEpOlxuICAgICAgICAgICAgdF9leHRyZW0gPSAtdjAvYTAgKyB0MFxuICAgICAgICAgICAgcF9leHRyZW0gPSAtdjAqdjAvKDIqYTApICsgcDBcblxuICAgICAgICAqL1xuICAgICAgICBsZXQgdF9leHRyZW0gPSAtdjAvYTAgKyB0MDtcbiAgICAgICAgaWYgKHRpbWVJbnRlcnZhbC5jb3ZlcnNfZW5kcG9pbnQodF9leHRyZW0pKSB7XG4gICAgICAgICAgICBsZXQgcF9leHRyZW0gPSAtdjAqdjAvKDIuMCphMCkgKyBwMDtcbiAgICAgICAgICAgIC8vIG1heGltYWwgcG9pbnQgcmVhY2hlZCBpbiB0aW1lIGludGVydmFsXG4gICAgICAgICAgICBpZiAoYTAgPiAwLjApIHtcbiAgICAgICAgICAgICAgICAvLyBwX2V4dHJlbSBpcyBtaW5pbXVtXG4gICAgICAgICAgICAgICAgLy8gZmlndXJlIG91dCBpZiBwMCBvciBwMSBpcyBtYXhpbXVtXG4gICAgICAgICAgICAgICAgaWYgKHAwIDwgcDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbChwX2V4dHJlbSwgcDEsIHRydWUsIHQxX2Nsb3NlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbChwX2V4dHJlbSwgcDAsIHRydWUsIHQwX2Nsb3NlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBwX2V4dHJlbSBpcyBtYXhpbXVtXG4gICAgICAgICAgICAgICAgLy8gZmlndXJlIG91dCBpZiBwMCBvciBwMSBpcyBtaW5pbXVtXG4gICAgICAgICAgICAgICAgaWYgKHAwIDwgcDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbChwMCwgcF9leHRyZW0sIHQwX2Nsb3NlZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbChwMSwgcF9leHRyZW0sIHQxX2Nsb3NlZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgTW90aW9uLCB3aXRoIG9yIHdpdGhvdXQgYWNjZWxlcmF0aW9uLFxuICAgICAgICB5ZXQgd2l0aCBubyBleHRyZW1lIHBvaW50cyB3aXRoaW4gaW50ZXJ2YWxcblxuICAgICAgICBwb3NpdGl0aW9uIG1vbm90b25pYyBpbmNyZWFzaW5nIChmb3J3YXJkIHZlbG9jaXR5KVxuICAgICAgICBvciBkZWNyZWFzaW5nIChiYWNrd2FyZCB2ZWxvY2l0eSlcblxuICAgICAgICBleHRyZW0gcG9zaXRpb25zIGFyZSBhc3NvY2lhdGVkIHdpdGggcDAgYW5kIHAxLlxuICAgICovXG5cbiAgICBpZiAocDAgPCBwMSkge1xuICAgICAgICAvLyBmb3J3YXJkXG4gICAgICAgIHJldHVybiBuZXcgSW50ZXJ2YWwocDAsIHAxLCB0MF9jbG9zZWQsIHQxX2Nsb3NlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gYmFja3dhcmRcbiAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnZhbChwMSwgcDAsIHQxX2Nsb3NlZCwgdDBfY2xvc2VkKTtcbiAgICB9XG59XG5cblxuLypcbiAgICB0aW1lIGVuZHBvaW50IGFuZCBwb3MgZW5kcG9pbnRzLlxuXG4gICAgdGltZSBpcyBhbHdheXMgaW5jcmVhc2luZyBldmVuIHdoZW4gcG9zaXRpb25cbiAgICBpcyBkZWNyZWFzaW5nLiBXaGVuIG1ha2luZyBhIHRpbWVFbmRwb2ludCBmcm9tXG4gICAgYSBwb3NFbmRwb2luIHRoZSByaWdodC9sZWZ0IGFzcGVjdCBvZiB0aGUgZW5kcG9pbnRcbiAgICBuZWVkcyB0byBiZSBmbGlwcGVkLlxuXG4gICAgdHMgLSB0aGUgdmFsdWUgb2YgdGhlIHRpbWVFbmRwb2ludCwgaWUuIHRoZSB0aW1lIHdoZW5cbiAgICAgICAgIG1vdGlvbiB3aWxsIHBhc3Mgb3ZlciBwb3NFbmRwb2luZ1xuICAgIGRpcmVjdGlvbiAtIGRpcmVjdGlvbiBvZiBtb3Rpb24gYXQgdGltZSB0c1xuKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHRpbWVFbmRwb2ludF9mcm9tX3Bvc0VuZHBvaW50KHBvc0VuZHBvaW50LCB0cywgZGlyZWN0aW9uKSB7XG4gICAgbGV0IFtwb3MsIHJpZ2h0LCBjbG9zZSwgc2luZ3VsYXJdID0gcG9zRW5kcG9pbnQ7XG4gICAgLy8gZmxpcCByaWdodC9sZWZ0IGlmIGRpcmVjdGlvbiBpcyBiYWNrd2FyZHNcbiAgICBpZiAoZGlyZWN0aW9uIDwgMCAmJiByaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJpZ2h0ID0gIXJpZ2h0XG4gICAgfVxuICAgIHJldHVybiBbdHMsIHJpZ2h0LCBjbG9zZSwgc2luZ3VsYXJdO1xufVxuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gRU5EUE9JTlQgRVZFTlRTXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKlxuICAgIGVuZHBvaW50RXZlbnRzXG5cbiAgICBHaXZlbiBhIG1vdGlvbiBhbmQgYSBzZXQgb2YgZW5kcG9pbmcsIGNhbGN1bGF0ZSB3aGVuXG4gICAgdGhlIG1vdGlvbiB3aWxsIHBhc3MgYnkgZWFjaCBlbmRwb2luZy5cblxuICAgIEdpdmVuXG4gICAgLSB0aW1lSW50ZXJ2YWxcbiAgICAtIHBvc0ludGVydmFsXG4gICAgLSB2ZWN0b3IgZGVzY3JpYmluZyBtb3Rpb24gd2l0aGluIHRpbWVJbnRlcnZhbFxuICAgIC0gbGlzdCBvZiBlbmRwb2ludEl0ZW1zXG5cbiAgICBlbmRwb2ludEl0ZW1cbiAgICB7XG4gICAgICAgIGVuZHBvaW50OiBbdmFsdWUsIGhpZ2gsIGNsb3NlZCwgc2luZ3VsYXJdLFxuICAgICAgICBjdWU6IHtcbiAgICAgICAgICAgIGtleTogXCJteWtleVwiLFxuICAgICAgICAgICAgaW50ZXJ2YWw6IG5ldyBJbnRlcnZhbCguLi4pLFxuICAgICAgICAgICAgZGF0YTogey4uLn1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIENyZWF0ZXMgZXZlbnRJdGVtIGJ5IGFkZGluZyB0byBlbmRwb2ludEl0ZW1cbiAgICAtIHRzRW5kcG9pbnQgOiB0aW1lc3RhbXAgZW5kcG9pbnQgKGZ1dHVyZSkgd2hlbiBtb3Rpb24gd2lsbCBwYXNzIHRoZSBlbmRwb2ludFxuICAgIC0gZGlyZWN0aW9uOiB0cnVlIGlmIG1vdGlvbiBwYXNzZXMgZW5kcG9pbnQgd2hpbGUgbW92aW5nIGZvcndhcmRcblxuICAgIEV2ZW50SXRlbXMgd2lsbCBiZSBzb3J0ZWQgYnkgdHNcblxuICAgIElzc3VlOlxuXG4gICAgICAgIHRpbWVJbnRlcnZhbCBbdDAsIHQxKVxuICAgICAgICBwb3NpbnRlcnZhbCBbcDAsIHAxKVxuXG4gICAgICAgIENvbnNpZGVyIGV2ZW50IGF0IHRpbWUgdDEgY29uY2VybmluZyBlbmRwb2ludCBwMSlcbiAgICAgICAgVGhpcyB3aWxsIGJlIG91dHNpZGUgdGhlIHRpbWVJbnRlcnZhbCwgYnV0IGluc2lkZVxuICAgICAgICB0aGUgcG9zSW50ZXJ2YWwuXG5cbiAgICAgICAgQ29udmVyc2VseSwgaXQgd2lsbCBiZSBpbnNpZGUgdGhlIG5leHQgdGltZUludGVydmFsLFxuICAgICAgICBidXQgbm90IHRoZSBuZXh0IHBvc0ludGVydmFsLlxuXG4gICAgICAgIFRoaXMgaXMgYSBwcm9ibGVtIC0gbGlrZSBmYWxsaW5nIGJldHdlZW4gY2hhaXJzLlxuXG4gICAgICAgIFJlc29sdmUgdGhpcyBieSByZXByZXNlbnRpbmcgdGltZXN0YW1wcyBhcyBlbmRwb2ludHMgdG9vXG5cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBlbmRwb2ludEV2ZW50cyAodGltZUludGVydmFsLCBwb3NJbnRlcnZhbCwgdmVjdG9yLCBlbmRwb2ludEl0ZW1zKSB7XG5cbiAgICAvKlxuICAgICAgICBubyBtb3Rpb24gb3Igc2luZ3VsYXIgdGltZSBpbnRlcnZhbFxuICAgICovXG4gICAgaWYgKHRpbWVJbnRlcnZhbC5zaW5ndWxhcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnZXRFdmVudEl0ZW1zOiB0aW1lSW50ZXJ2YWwgaXMgc2luZ3VsYXJcIik7XG4gICAgfVxuICAgIGlmICghaXNNb3ZpbmcodmVjdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnZXRFdmVudEl0ZW1zOiBubyBtb3Rpb25cIilcbiAgICB9XG5cbiAgICBsZXQgcDAgPSB2ZWN0b3IucG9zaXRpb247XG4gICAgbGV0IHYwID0gdmVjdG9yLnZlbG9jaXR5O1xuICAgIGxldCBhMCA9IHZlY3Rvci5hY2NlbGVyYXRpb247XG4gICAgbGV0IHQwID0gdmVjdG9yLnRpbWVzdGFtcDtcblxuICAgIGxldCB2YWx1ZSwgdHMsIGRlbHRhcztcbiAgICBsZXQgdHNFbmRwb2ludCwgZGlyZWN0aW9uO1xuICAgIGxldCBldmVudEl0ZW1zID0gW107XG5cbiAgICBlbmRwb2ludEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAvLyBjaGVjayB0aGF0IGVuZHBvaW50IGlzIGluc2lkZSBnaXZlbiBwb3NJbnRlcnZhbFxuICAgICAgICBpZiAoIXBvc0ludGVydmFsLmNvdmVyc19lbmRwb2ludChpdGVtLmVuZHBvaW50KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gaXRlbS5lbmRwb2ludFswXTtcbiAgICAgICAgLy8gY2hlY2sgaWYgZXF1YXRpb24gaGFzIGFueSBzb2x1dGlvbnNcbiAgICAgICAgaWYgKCFoYXNSZWFsU29sdXRpb24ocDAsIHYwLCBhMCwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluZCB0aW1lIHdoZW4gbW90aW9uIHdpbGwgcGFzcyB2YWx1ZVxuICAgICAgICAvLyB0aW1lIGRlbHRhIGlzIHJlbGF0aXZlIHRvIHQwXG4gICAgICAgIC8vIGNvdWxkIGJlIGJvdGggaW4gaGlzdG9yeSBvciBmdXR1cmVcbiAgICAgICAgZGVsdGFzID0gY2FsY3VsYXRlUmVhbFNvbHV0aW9ucyhwMCx2MCxhMCwgdmFsdWUpO1xuICAgICAgICAvLyBpbmNsdWRlIGFueSB0aW1lc3RhbXAgd2l0aGluIHRoZSB0aW1laW50ZXJ2YWxcbiAgICAgICAgZGVsdGFzLmZvckVhY2goZnVuY3Rpb24oZGVsdGEpIHtcbiAgICAgICAgICAgIHRzID0gdDAgKyBkZWx0YTtcbiAgICAgICAgICAgIGRpcmVjdGlvbiA9IGNhbGN1bGF0ZURpcmVjdGlvbih2ZWN0b3IsIHRzKTtcbiAgICAgICAgICAgIHRzRW5kcG9pbnQgPSB0aW1lRW5kcG9pbnRfZnJvbV9wb3NFbmRwb2ludChpdGVtLmVuZHBvaW50LCB0cywgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIGlmICh0aW1lSW50ZXJ2YWwuY292ZXJzX2VuZHBvaW50KHRzRW5kcG9pbnQpKXtcbiAgICAgICAgICAgICAgICBpdGVtLnRzRW5kcG9pbnQgPSB0c0VuZHBvaW50O1xuICAgICAgICAgICAgICAgIGl0ZW0uZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgICAgICAgICAgICAgIGV2ZW50SXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGV2ZW50SXRlbXMgYWNjb3JkaW5nIHRvIHRzRW5kcG9pbnRzXG4gICAgY29uc3QgY21wID0gZnVuY3Rpb24gKGEsYikge1xuICAgICAgICByZXR1cm4gZW5kcG9pbnQuY21wKGEudHNFbmRwb2ludCwgYi50c0VuZHBvaW50KTtcbiAgICB9O1xuICAgIGV2ZW50SXRlbXMuc29ydChjbXApO1xuICAgIHJldHVybiBldmVudEl0ZW1zO1xufTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIE1PVElPTiBUUkFOU0lUSU9OXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vKlxuICAgIEZpZ3VyZSB0aGUgbmF0dXJlIG9mIHRoZSB0cmFuc2l0aW9uIGZyb20gb25lIG1vdGlvbiB0byBhbm90aGVyLFxuICAgIGkuZS4gd2hlbiBvbGRfdmVjdG9yIGlzIHJlcGxhY2VkIGJ5IG5ld192ZWN0b3IuXG5cbiAgICBUaGUgdGltZSB3aGVuIHRoaXMgdHJhbnNpdGlvbiBvY2N1cmVkIGlzIGdpdmVuIGJleVxuICAgIG5ld192ZWN0b3IudGltZXN0YW1wLCBieSBkZWZpbml0aW9uLlxuXG4gICAgLSB3YXMgbW92aW5nIChib29sZWFuKSAtIHRydWUgaWYgbW92aW5nIGJlZm9yZSBjaGFuZ2VcbiAgICAtIGlzIG1vdmluZyAoYm9vbGVhbikgLSB0cnVlIGlmIG1vdmluZyBhZnRlciBjaGFuZ2VcbiAgICAtIHBvcyBjaGFuZ2VkIChib29sZWFuKSAtIHRydWUgaWYgcG9zaXRpb24gd2FzIGNoYW5nZWQgaW5zdGFudGFuZW91c2x5XG4gICAgLSBtb3ZlIGNoYW5nZWQgKGJvb2xlYW4pIC0gdHJ1ZSBpZiBtb3ZlbWVudCB3YXMgY2hhbmdlZCBpbnN0YW50YW5lb3VzbHlcblxuICAgIHJlcG9ydCBjaGFuZ2VkIGluIHR3byBpbmRlcGVuZGVudCBhc3BlY3RzXG4gICAgLSBjaGFuZ2UgaW4gcG9zaXRpb24gKGkuZS4gZGlzY29udGludWl0eSBpbiBwb3NpdGlvbilcbiAgICAtIGNoYW5nZSBpbiBtb3ZlbWVudCAoaS5lLiBzdGFydGluZywgc3RvcHBpbmcsIGNoYW5nZWQpXG5cbiAgICBUaGVzZSBhcmUgcmVwcmVzZW50ZWQgYXNcbiAgICAtIFBvc0RlbHRhXG4gICAgLSBNb3ZlRGVsdGFcblxuICAgIHJldHVybiBbUG9zRGVsdGEsIE1vdmVEZWx0YV1cbiovXG5cblxuZXhwb3J0IGNsYXNzIE1vdGlvbkRlbHRhIHtcblxuXG4gICAgc3RhdGljIFBvc0RlbHRhID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIE5PT1A6IDAsICAgICAgICAgICAgICAgIC8vIG5vIGNoYW5nZSBpbiBwb3NpdGlvblxuICAgICAgICBDSEFOR0U6IDEgICAgICAgICAgICAgICAvLyBjaGFuZ2UgaW4gcG9zaXRpb25cbiAgICB9KTtcblxuXG4gICAgc3RhdGljIE1vdmVEZWx0YSA9IE9iamVjdC5mcmVlemUoe1xuICAgICAgICBOT09QOiAwLCAgICAgICAgICAgICAgICAvLyBubyBjaGFuZ2UgaW4gbW92ZW1lbnQsIG5vdCBtb3ZpbmdcbiAgICAgICAgTk9PUF9NT1ZJTkc6IDEsICAgICAgICAgLy8gbm8gY2hhbmdlIGluIG1vdmVtZW50LCBtb3ZpbmdcbiAgICAgICAgU1RBUlQ6IDIsICAgICAgICAgICAgICAgLy8gbm90IG1vdmluZyAtPiBtb3ZpbmdcbiAgICAgICAgQ0hBTkdFOiAzLCAgICAgICAgICAgICAgLy8ga2VlcCBtb3ZpbmcsIG1vdmVtZW50IGNoYW5nZWRcbiAgICAgICAgU1RPUDogNCAgICAgICAgICAgICAgICAgLy8gbW92aW5nIC0+IG5vdCBtb3ZpbmdcbiAgICB9KTtcblxuICAgIGNvbnN0cnVjdG9yIChvbGRfdmVjdG9yLCBuZXdfdmVjdG9yKSB7XG4gICAgICAgIGxldCB0cyA9IG5ld192ZWN0b3IudGltZXN0YW1wO1xuICAgICAgICBsZXQgaXNfbW92aW5nID0gaXNNb3ZpbmcobmV3X3ZlY3RvcilcbiAgICAgICAgbGV0IGluaXQgPSAob2xkX3ZlY3RvciA9PSB1bmRlZmluZWQgfHwgb2xkX3ZlY3Rvci5wb3NpdGlvbiA9PSB1bmRlZmluZWQpO1xuICAgICAgICBjb25zdCBQb3NEZWx0YSA9IE1vdGlvbkRlbHRhLlBvc0RlbHRhO1xuICAgICAgICBjb25zdCBNb3ZlRGVsdGEgPSBNb3Rpb25EZWx0YS5Nb3ZlRGVsdGE7XG5cbiAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgUG9zc2libGUgdG8gaW50cm9kdWNlXG4gICAgICAgICAgICAgICAgUG9zRGVsdGEuSU5JVCBoZXJlIGluc3RlYWQgb2YgUG9zRGVsdGEuQ0hBTkdFXG4gICAgICAgICAgICAgICAgTm90IHN1cmUgaWYgdGhpcyBpcyBuZWVkZWQuXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGlzX21vdmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuX21jID0gW1Bvc0RlbHRhLkNIQU5HRSwgTW92ZURlbHRhLlNUQVJUXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWMgPSBbUG9zRGVsdGEuQ0hBTkdFLCBNb3ZlRGVsdGEuTk9PUF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgd2FzX21vdmluZyA9IGlzTW92aW5nKG9sZF92ZWN0b3IpO1xuICAgICAgICAgICAgbGV0IGVuZF92ZWN0b3IgPSBjYWxjdWxhdGVWZWN0b3Iob2xkX3ZlY3RvciwgdHMpO1xuICAgICAgICAgICAgbGV0IHN0YXJ0X3ZlY3RvciA9IGNhbGN1bGF0ZVZlY3RvcihuZXdfdmVjdG9yLCB0cyk7XG5cbiAgICAgICAgICAgIC8vIHBvc2l0aW9uIGNoYW5nZVxuICAgICAgICAgICAgbGV0IHBvc19jaGFuZ2VkID0gKGVuZF92ZWN0b3IucG9zaXRpb24gIT0gc3RhcnRfdmVjdG9yLnBvc2l0aW9uKTtcbiAgICAgICAgICAgIGxldCBwY3QgPSAocG9zX2NoYW5nZWQpID8gUG9zRGVsdGEuQ0hBTkdFIDogUG9zRGVsdGEuTk9PUDtcblxuICAgICAgICAgICAgLy8gbW92ZW1lbnQgY2hhbmdlXG4gICAgICAgICAgICBsZXQgbWN0O1xuICAgICAgICAgICAgaWYgKHdhc19tb3ZpbmcgJiYgaXNfbW92aW5nKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZlbF9jaGFuZ2VkID0gKGVuZF92ZWN0b3IudmVsb2NpdHkgIT0gc3RhcnRfdmVjdG9yLnZlbG9jaXR5KTtcbiAgICAgICAgICAgICAgICBsZXQgYWNjX2NoYW5nZWQgPSAoZW5kX3ZlY3Rvci5hY2NlbGVyYXRpb24gIT0gc3RhcnRfdmVjdG9yLmFjY2VsZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgbGV0IG1vdmVfY2hhbmdlZCA9ICh2ZWxfY2hhbmdlZCB8fCBhY2NfY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgaWYgKG1vdmVfY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBtY3QgPSBNb3ZlRGVsdGEuQ0hBTkdFO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1jdCA9IE1vdmVEZWx0YS5OT09QX01PVklORztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCF3YXNfbW92aW5nICYmIGlzX21vdmluZykge1xuICAgICAgICAgICAgICAgIG1jdCA9IE1vdmVEZWx0YS5TVEFSVDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2FzX21vdmluZyAmJiAhaXNfbW92aW5nKSB7XG4gICAgICAgICAgICAgICAgbWN0ID0gTW92ZURlbHRhLlNUT1A7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCF3YXNfbW92aW5nICYmICFpc19tb3ZpbmcpIHtcbiAgICAgICAgICAgICAgICBtY3QgPSBNb3ZlRGVsdGEuTk9PUDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX21jID0gW3BjdCwgbWN0XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBwb3NEZWx0YSAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tY1swXTtcbiAgICB9XG5cbiAgICBnZXQgbW92ZURlbHRhICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21jWzFdXG4gICAgfVxuXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIGNvbnN0IFBvc0RlbHRhID0gTW90aW9uRGVsdGEuUG9zRGVsdGE7XG4gICAgICAgIGNvbnN0IE1vdmVEZWx0YSA9IE1vdGlvbkRlbHRhLk1vdmVEZWx0YTtcbiAgICAgICAgbGV0IHN0ciA9ICh0aGlzLnBvc0RlbHRhID09IFBvc0RlbHRhLkNIQU5HRSkgPyBcImp1bXAsIFwiIDogXCJcIjtcbiAgICAgICAgaWYgKHRoaXMubW92ZURlbHRhID09IE1vdmVEZWx0YS5TVEFSVCkge1xuICAgICAgICAgICAgc3RyICs9IFwibW92ZW1lbnQgc3RhcnRlZFwiO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubW92ZURlbHRhID09IE1vdmVEZWx0YS5DSEFOR0UpIHtcbiAgICAgICAgICAgIHN0ciArPSBcIm1vdmVtZW50IGNoYW5nZWRcIjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm1vdmVEZWx0YSA9PSBNb3ZlRGVsdGEuU1RPUCkge1xuICAgICAgICAgICAgc3RyICs9IFwibW92ZW1lbnQgc3RvcHBlZFwiO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubW92ZURlbHRhID09IE1vdmVEZWx0YS5OT09QX01PVklORykge1xuICAgICAgICAgICAgc3RyICs9IFwibW92ZW1lbnQgbm9vcCAtIG1vdmluZ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubW92ZURlbHRhID09IE1vdmVEZWx0YS5OT09QKSB7XG4gICAgICAgICAgICBzdHIgKz0gXCJtb3ZlbWVudCBub29wIC0gbm90IG1vdmluZ1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxufVxuXG5cbi8vIHJldHVybiBtb2R1bGUgb2JqZWN0XG4vKlxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGlzTW92aW5nLFxuICAgIC8vIGVxdWFsVmVjdG9ycyxcbiAgICAvLyBjb3B5VmVjdG9yLFxuXHRjYWxjdWxhdGVWZWN0b3IsXG5cdGNhbGN1bGF0ZURpcmVjdGlvbixcblx0Ly8gY2FsY3VsYXRlTWluUG9zaXRpdmVSZWFsU29sdXRpb24sXG5cdGNhbGN1bGF0ZURlbHRhLFxuXHQvLyBjb3JyZWN0UmFuZ2VTdGF0ZSxcblx0Ly8gY2hlY2tSYW5nZSxcblx0Ly8gUmFuZ2VTdGF0ZSxcbiAgICBwb3NJbnRlcnZhbF9mcm9tX3RpbWVJbnRlcnZhbCxcbiAgICBlbmRwb2ludEV2ZW50cyxcbiAgICByYW5nZUludGVyc2VjdCxcbiAgICBNb3Rpb25EZWx0YVxufTtcbiovXG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDIwXG5cdEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG5cblxuLypcblx0RXZlbnRcblx0LSBuYW1lOiBldmVudCBuYW1lXG5cdC0gcHVibGlzaGVyOiB0aGUgb2JqZWN0IHdoaWNoIGRlZmluZWQgdGhlIGV2ZW50XG5cdC0gaW5pdDogdHJ1ZSBpZiB0aGUgZXZlbnQgc3VwcHBvcnRzIGluaXQgZXZlbnRzXG5cdC0gc3Vic2NyaXB0aW9uczogc3Vic2NyaXB0aW5zIHRvIHRoaXMgZXZlbnRcblxuKi9cblxuY2xhc3MgRXZlbnQge1xuXG5cdGNvbnN0cnVjdG9yIChwdWJsaXNoZXIsIG5hbWUsIG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXHRcdHRoaXMucHVibGlzaGVyID0gcHVibGlzaGVyO1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy5pbml0ID0gKG9wdGlvbnMuaW5pdCA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5pbml0O1xuXHRcdHRoaXMuc3Vic2NyaXB0aW9ucyA9IFtdO1xuXHR9XG5cblx0Lypcblx0XHRzdWJzY3JpYmUgdG8gZXZlbnRcblx0XHQtIHN1YnNjcmliZXI6IHN1YnNjcmliaW5nIG9iamVjdFxuXHRcdC0gY2FsbGJhY2s6IGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZVxuXHRcdC0gb3B0aW9uczpcblx0XHRcdGluaXQ6IGlmIHRydWUgc3Vic2NyaWJlciB3YW50cyBpbml0IGV2ZW50c1xuXHQqL1xuXHRzdWJzY3JpYmUgKGNhbGxiYWNrLCBvcHRpb25zKSB7XG5cdFx0aWYgKCFjYWxsYmFjayB8fCB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgbm90IGEgZnVuY3Rpb25cIiwgY2FsbGJhY2spO1xuXHRcdH1cblx0XHRjb25zdCBzdWIgPSBuZXcgU3Vic2NyaXB0aW9uKHRoaXMsIGNhbGxiYWNrLCBvcHRpb25zKTtcblx0XHR0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChzdWIpO1xuXHQgICAgLy8gSW5pdGlhdGUgaW5pdCBjYWxsYmFjayBmb3IgdGhpcyBzdWJzY3JpcHRpb25cblx0ICAgIGlmICh0aGlzLmluaXQgJiYgc3ViLmluaXQpIHtcblx0ICAgIFx0c3ViLmluaXRfcGVuZGluZyA9IHRydWU7XG5cdCAgICBcdGxldCBzZWxmID0gdGhpcztcblx0ICAgIFx0UHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG5cdCAgICBcdFx0Y29uc3QgZUFyZ3MgPSBzZWxmLnB1Ymxpc2hlci5ldmVudGlmeUluaXRFdmVudEFyZ3Moc2VsZi5uYW1lKSB8fCBbXTtcblx0ICAgIFx0XHRmb3IgKGxldCBlQXJnIG9mIGVBcmdzKSB7XG5cdCAgICBcdFx0XHRzZWxmLnRyaWdnZXIoZUFyZywgW3N1Yl0sIHRydWUpO1xuXHQgICAgXHRcdH1cblx0ICAgIFx0XHRzdWIuaW5pdF9wZW5kaW5nID0gZmFsc2U7XG5cdCAgICBcdH0pO1xuXHQgICAgfVxuXHRcdHJldHVybiBzdWJcblx0fVxuXG5cdC8qXG5cdFx0dHJpZ2dlciBldmVudFxuXG5cdFx0LSBpZiBzdWIgaXMgdW5kZWZpbmVkIC0gcHVibGlzaCB0byBhbGwgc3Vic2NyaXB0aW9uc1xuXHRcdC0gaWYgc3ViIGlzIGRlZmluZWQgLSBwdWJsaXNoIG9ubHkgdG8gZ2l2ZW4gc3Vic2NyaXB0aW9uXG5cdCovXG5cdHRyaWdnZXIgKGVBcmcsIHN1YnMsIGluaXQpIHtcblx0XHRsZXQgZUluZm8sIGN0eDtcblx0XHRmb3IgKGNvbnN0IHN1YiBvZiBzdWJzKSB7XG5cdFx0XHQvLyBpZ25vcmUgdGVybWluYXRlZCBzdWJzY3JpcHRpb25zXG5cdFx0XHRpZiAoc3ViLnRlcm1pbmF0ZWQpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRlSW5mbyA9IHtcblx0XHRcdFx0c3JjOiB0aGlzLnB1Ymxpc2hlcixcblx0XHRcdFx0bmFtZTogdGhpcy5uYW1lLFxuXHRcdFx0XHRzdWI6IHN1Yixcblx0XHRcdFx0aW5pdDogaW5pdFxuXHRcdFx0fVxuXHRcdFx0Y3R4ID0gc3ViLmN0eCB8fCB0aGlzLnB1Ymxpc2hlcjtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHN1Yi5jYWxsYmFjay5jYWxsKGN0eCwgZUFyZywgZUluZm8pO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBFcnJvciBpbiAke3RoaXMubmFtZX06ICR7c3ViLmNhbGxiYWNrfSAke2Vycn1gKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKlxuXHR1bnN1YnNjcmliZSBmcm9tIGV2ZW50XG5cdC0gdXNlIHN1YnNjcmlwdGlvbiByZXR1cm5lZCBieSBwcmV2aW91cyBzdWJzY3JpYmVcblx0Ki9cblx0dW5zdWJzY3JpYmUoc3ViKSB7XG5cdFx0bGV0IGlkeCA9IHRoaXMuc3Vic2NyaXB0aW9ucy5pbmRleE9mKHN1Yik7XG5cdFx0aWYgKGlkeCA+IC0xKSB7XG5cdFx0XHR0aGlzLnN1YnNjcmlwdGlvbnMuc3BsaWNlKGlkeCwgMSk7XG5cdFx0XHRzdWIudGVybWluYXRlKCk7XG5cdFx0fVxuXHR9XG59XG5cblxuLypcblx0U3Vic2NyaXB0aW9uIGNsYXNzXG4qL1xuXG5jbGFzcyBTdWJzY3JpcHRpb24ge1xuXG5cdGNvbnN0cnVjdG9yKGV2ZW50LCBjYWxsYmFjaywgb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cdFx0dGhpcy5ldmVudCA9IGV2ZW50O1xuXHRcdHRoaXMubmFtZSA9IGV2ZW50Lm5hbWU7XG5cdFx0dGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrXG5cdFx0dGhpcy5pbml0ID0gKG9wdGlvbnMuaW5pdCA9PT0gdW5kZWZpbmVkKSA/IHRoaXMuZXZlbnQuaW5pdCA6IG9wdGlvbnMuaW5pdDtcblx0XHR0aGlzLmluaXRfcGVuZGluZyA9IGZhbHNlO1xuXHRcdHRoaXMudGVybWluYXRlZCA9IGZhbHNlO1xuXHRcdHRoaXMuY3R4ID0gb3B0aW9ucy5jdHg7XG5cdH1cblxuXHR0ZXJtaW5hdGUoKSB7XG5cdFx0dGhpcy50ZXJtaW5hdGVkID0gdHJ1ZTtcblx0XHR0aGlzLmNhbGxiYWNrID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuZXZlbnQudW5zdWJzY3JpYmUodGhpcyk7XG5cdH1cbn1cblxuXG4vKlxuXG5cdEVWRU5USUZZIElOU1RBTkNFXG5cblx0RXZlbnRpZnkgYnJpbmdzIGV2ZW50aW5nIGNhcGFiaWxpdGllcyB0byBhbnkgb2JqZWN0LlxuXG5cdEluIHBhcnRpY3VsYXIsIGV2ZW50aWZ5IHN1cHBvcnRzIHRoZSBpbml0aWFsLWV2ZW50IHBhdHRlcm4uXG5cdE9wdC1pbiBmb3IgaW5pdGlhbCBldmVudHMgcGVyIGV2ZW50IHR5cGUuXG5cblx0ZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpIHtcblx0XHRpZiAobmFtZSA9PSBcImNoYW5nZVwiKSB7XG5cdFx0XHRyZXR1cm4gW3RoaXMuX3ZhbHVlXTtcblx0XHR9XG5cdH1cblxuKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGV2ZW50aWZ5SW5zdGFuY2UgKG9iamVjdCkge1xuXHRvYmplY3QuX19ldmVudGlmeV9ldmVudE1hcCA9IG5ldyBNYXAoKTtcblx0b2JqZWN0Ll9fZXZlbnRpZnlfYnVmZmVyID0gW107XG5cdHJldHVybiBvYmplY3Q7XG59O1xuXG5cbi8qXG5cdEVWRU5USUZZIFBST1RPVFlQRVxuXG5cdEFkZCBldmVudGlmeSBmdW5jdGlvbmFsaXR5IHRvIHByb3RvdHlwZSBvYmplY3RcbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBldmVudGlmeVByb3RvdHlwZShfcHJvdG90eXBlKSB7XG5cblx0ZnVuY3Rpb24gZXZlbnRpZnlHZXRFdmVudChvYmplY3QsIG5hbWUpIHtcblx0XHRjb25zdCBldmVudCA9IG9iamVjdC5fX2V2ZW50aWZ5X2V2ZW50TWFwLmdldChuYW1lKTtcblx0XHRpZiAoZXZlbnQgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJFdmVudCB1bmRlZmluZWRcIiwgbmFtZSk7XG5cdFx0fVxuXHRcdHJldHVybiBldmVudDtcblx0fVxuXG5cdC8qXG5cdFx0REVGSU5FIEVWRU5UXG5cdFx0LSB1c2VkIG9ubHkgYnkgZXZlbnQgc291cmNlXG5cdFx0LSBuYW1lOiBuYW1lIG9mIGV2ZW50XG5cdFx0LSBvcHRpb25zOiB7aW5pdDp0cnVlfSBzcGVjaWZpZXMgaW5pdC1ldmVudCBzZW1hbnRpY3MgZm9yIGV2ZW50XG5cdCovXG5cdGZ1bmN0aW9uIGV2ZW50aWZ5RGVmaW5lKG5hbWUsIG9wdGlvbnMpIHtcblx0XHQvLyBjaGVjayB0aGF0IGV2ZW50IGRvZXMgbm90IGFscmVhZHkgZXhpc3Rcblx0XHRpZiAodGhpcy5fX2V2ZW50aWZ5X2V2ZW50TWFwLmhhcyhuYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRXZlbnQgYWxyZWFkeSBkZWZpbmVkXCIsIG5hbWUpO1xuXHRcdH1cblx0XHR0aGlzLl9fZXZlbnRpZnlfZXZlbnRNYXAuc2V0KG5hbWUsIG5ldyBFdmVudCh0aGlzLCBuYW1lLCBvcHRpb25zKSk7XG5cdH07XG5cblx0Lypcblx0XHRPTlxuXHRcdC0gdXNlZCBieSBzdWJzY3JpYmVyXG5cdFx0cmVnaXN0ZXIgY2FsbGJhY2sgb24gZXZlbnQuXG5cdCovXG5cdGZ1bmN0aW9uIG9uKG5hbWUsIGNhbGxiYWNrLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIGV2ZW50aWZ5R2V0RXZlbnQodGhpcywgbmFtZSkuc3Vic2NyaWJlKGNhbGxiYWNrLCBvcHRpb25zKTtcblx0fTtcblxuXHQvKlxuXHRcdE9GRlxuXHRcdC0gdXNlZCBieSBzdWJzY3JpYmVyXG5cdFx0VW4tcmVnaXN0ZXIgYSBoYW5kbGVyIGZyb20gYSBzcGVjZmljIGV2ZW50IHR5cGVcblx0Ki9cblx0ZnVuY3Rpb24gb2ZmKHN1Yikge1xuXHRcdHJldHVybiBldmVudGlmeUdldEV2ZW50KHRoaXMsIHN1Yi5uYW1lKS51bnN1YnNjcmliZShzdWIpO1xuXHR9O1xuXG5cblx0ZnVuY3Rpb24gZXZlbnRpZnlTdWJzY3JpcHRpb25zKG5hbWUpIHtcblx0XHRyZXR1cm4gZXZlbnRpZnlHZXRFdmVudCh0aGlzLCBuYW1lKS5zdWJzY3JpcHRpb25zO1xuXHR9XG5cblxuXG5cdC8qXG5cdFx0VHJpZ2dlciBsaXN0IG9mIGV2ZW50SXRlbXMgb24gb2JqZWN0XG5cblx0XHRldmVudEl0ZW06ICB7bmFtZTouLiwgZUFyZzouLn1cblxuXHRcdGNvcHkgYWxsIGV2ZW50SXRlbXMgaW50byBidWZmZXIuXG5cdFx0cmVxdWVzdCBlbXB0eWluZyB0aGUgYnVmZmVyLCBpLmUuIGFjdHVhbGx5IHRyaWdnZXJpbmcgZXZlbnRzLFxuXHRcdGV2ZXJ5IHRpbWUgdGhlIGJ1ZmZlciBnb2VzIGZyb20gZW1wdHkgdG8gbm9uLWVtcHR5XG5cdCovXG5cdGZ1bmN0aW9uIGV2ZW50aWZ5VHJpZ2dlckFsbChldmVudEl0ZW1zKSB7XG5cdFx0aWYgKGV2ZW50SXRlbXMubGVuZ3RoID09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBtYWtlIHRyaWdnZXIgaXRlbXNcblx0XHQvLyByZXNvbHZlIG5vbi1wZW5kaW5nIHN1YnNjcmlwdGlvbnMgbm93XG5cdFx0Ly8gZWxzZSBzdWJzY3JpcHRpb25zIG1heSBjaGFuZ2UgZnJvbSBwZW5kaW5nIHRvIG5vbi1wZW5kaW5nXG5cdFx0Ly8gYmV0d2VlbiBoZXJlIGFuZCBhY3R1YWwgdHJpZ2dlcmluZ1xuXHRcdC8vIG1ha2UgbGlzdCBvZiBbZXYsIGVBcmcsIHN1YnNdIHR1cGxlc1xuXHRcdGxldCB0cmlnZ2VySXRlbXMgPSBldmVudEl0ZW1zLm1hcCgoaXRlbSkgPT4ge1xuXHRcdFx0bGV0IHtuYW1lLCBlQXJnfSA9IGl0ZW07XG5cdFx0XHRsZXQgZXYgPSBldmVudGlmeUdldEV2ZW50KHRoaXMsIG5hbWUpO1xuXHRcdFx0bGV0IHN1YnMgPSBldi5zdWJzY3JpcHRpb25zLmZpbHRlcihzdWIgPT4gc3ViLmluaXRfcGVuZGluZyA9PSBmYWxzZSk7XG5cdFx0XHRyZXR1cm4gW2V2LCBlQXJnLCBzdWJzXTtcblx0XHR9LCB0aGlzKTtcblxuXHRcdC8vIGFwcGVuZCB0cmlnZ2VyIEl0ZW1zIHRvIGJ1ZmZlclxuXHRcdGNvbnN0IGxlbiA9IHRyaWdnZXJJdGVtcy5sZW5ndGg7XG5cdFx0Y29uc3QgYnVmID0gdGhpcy5fX2V2ZW50aWZ5X2J1ZmZlcjtcblx0XHRjb25zdCBidWZfbGVuID0gdGhpcy5fX2V2ZW50aWZ5X2J1ZmZlci5sZW5ndGg7XG5cdFx0Ly8gcmVzZXJ2ZSBtZW1vcnkgLSBzZXQgbmV3IGxlbmd0aFxuXHRcdHRoaXMuX19ldmVudGlmeV9idWZmZXIubGVuZ3RoID0gYnVmX2xlbiArIGxlbjtcblx0XHQvLyBjb3B5IHRyaWdnZXJJdGVtcyB0byBidWZmZXJcblx0XHRmb3IgKGxldCBpPTA7IGk8bGVuOyBpKyspIHtcblx0XHRcdGJ1ZltidWZfbGVuK2ldID0gdHJpZ2dlckl0ZW1zW2ldO1xuXHRcdH1cblx0XHQvLyByZXF1ZXN0IGVtcHR5aW5nIG9mIHRoZSBidWZmZXJcblx0XHRpZiAoYnVmX2xlbiA9PSAwKSB7XG5cdFx0XHRsZXQgc2VsZiA9IHRoaXM7XG5cdFx0XHRQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmb3IgKGxldCBbZXYsIGVBcmcsIHN1YnNdIG9mIHNlbGYuX19ldmVudGlmeV9idWZmZXIpIHtcblx0XHRcdFx0XHQvLyBhY3R1YWwgZXZlbnQgdHJpZ2dlcmluZ1xuXHRcdFx0XHRcdGV2LnRyaWdnZXIoZUFyZywgc3VicywgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYuX19ldmVudGlmeV9idWZmZXIgPSBbXTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdC8qXG5cdFx0VHJpZ2dlciBtdWx0aXBsZSBldmVudHMgb2Ygc2FtZSB0eXBlIChuYW1lKVxuXHQqL1xuXHRmdW5jdGlvbiBldmVudGlmeVRyaWdnZXJBbGlrZShuYW1lLCBlQXJncykge1xuXHRcdHJldHVybiB0aGlzLmV2ZW50aWZ5VHJpZ2dlckFsbChlQXJncy5tYXAoZUFyZyA9PiB7XG5cdFx0XHRyZXR1cm4ge25hbWUsIGVBcmd9O1xuXHRcdH0pKTtcblx0fVxuXG5cdC8qXG5cdFx0VHJpZ2dlciBzaW5nbGUgZXZlbnRcblx0Ki9cblx0ZnVuY3Rpb24gZXZlbnRpZnlUcmlnZ2VyKG5hbWUsIGVBcmcpIHtcblx0XHRyZXR1cm4gdGhpcy5ldmVudGlmeVRyaWdnZXJBbGwoW3tuYW1lLCBlQXJnfV0pO1xuXHR9XG5cblx0X3Byb3RvdHlwZS5ldmVudGlmeURlZmluZSA9IGV2ZW50aWZ5RGVmaW5lO1xuXHRfcHJvdG90eXBlLmV2ZW50aWZ5VHJpZ2dlciA9IGV2ZW50aWZ5VHJpZ2dlcjtcblx0X3Byb3RvdHlwZS5ldmVudGlmeVRyaWdnZXJBbGlrZSA9IGV2ZW50aWZ5VHJpZ2dlckFsaWtlO1xuXHRfcHJvdG90eXBlLmV2ZW50aWZ5VHJpZ2dlckFsbCA9IGV2ZW50aWZ5VHJpZ2dlckFsbDtcblx0X3Byb3RvdHlwZS5ldmVudGlmeVN1YnNjcmlwdGlvbnMgPSBldmVudGlmeVN1YnNjcmlwdGlvbnM7XG5cdF9wcm90b3R5cGUub24gPSBvbjtcblx0X3Byb3RvdHlwZS5vZmYgPSBvZmY7XG59O1xuXG5cbi8qXG5cdEV2ZW50IFZhcmlhYmxlXG5cblx0T2JqZWN0cyB3aXRoIGEgc2luZ2xlIFwiY2hhbmdlXCIgZXZlbnRcbiovXG5cbmV4cG9ydCBjbGFzcyBFdmVudFZhcmlhYmxlIHtcblxuXHRjb25zdHJ1Y3RvciAodmFsdWUpIHtcblx0XHRldmVudGlmeUluc3RhbmNlKHRoaXMpO1xuXHRcdHRoaXMuX3ZhbHVlID0gdmFsdWU7XG5cdFx0dGhpcy5ldmVudGlmeURlZmluZShcImNoYW5nZVwiLCB7aW5pdDp0cnVlfSk7XG5cdH1cblxuXHRldmVudGlmeUluaXRFdmVudEFyZ3MobmFtZSkge1xuXHRcdGlmIChuYW1lID09IFwiY2hhbmdlXCIpIHtcblx0XHRcdHJldHVybiBbdGhpcy5fdmFsdWVdO1xuXHRcdH1cblx0fVxuXG5cdGdldCB2YWx1ZSAoKSB7cmV0dXJuIHRoaXMuX3ZhbHVlfTtcblx0c2V0IHZhbHVlICh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSAhPSB0aGlzLl92YWx1ZSkge1xuXHRcdFx0dGhpcy5fdmFsdWUgPSB2YWx1ZTtcblx0XHRcdHRoaXMuZXZlbnRpZnlUcmlnZ2VyKFwiY2hhbmdlXCIsIHZhbHVlKTtcblx0XHR9XG5cdH1cbn1cbmV2ZW50aWZ5UHJvdG90eXBlKEV2ZW50VmFyaWFibGUucHJvdG90eXBlKTtcblxuLypcblx0RXZlbnQgQm9vbGVhblxuXG5cblx0Tm90ZSA6IGltcGxlbWVudGF0aW9uIHVzZXMgZmFsc2luZXNzIG9mIGlucHV0IHBhcmFtZXRlciB0byBjb25zdHJ1Y3RvciBhbmQgc2V0KCkgb3BlcmF0aW9uLFxuXHRzbyBldmVudEJvb2xlYW4oLTEpIHdpbGwgYWN0dWFsbHkgc2V0IGl0IHRvIHRydWUgYmVjYXVzZVxuXHQoLTEpID8gdHJ1ZSA6IGZhbHNlIC0+IHRydWUgIVxuKi9cblxuZXhwb3J0IGNsYXNzIEV2ZW50Qm9vbGVhbiBleHRlbmRzIEV2ZW50VmFyaWFibGUge1xuXHRjb25zdHJ1Y3Rvcih2YWx1ZSkge1xuXHRcdHN1cGVyKEJvb2xlYW4odmFsdWUpKTtcblx0fVxuXG5cdHNldCB2YWx1ZSAodmFsdWUpIHtcblx0XHRzdXBlci52YWx1ZSA9IEJvb2xlYW4odmFsdWUpO1xuXHR9XG5cdGdldCB2YWx1ZSAoKSB7cmV0dXJuIHN1cGVyLnZhbHVlfTtcbn1cblxuXG4vKlxuXHRtYWtlIGEgcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aGVuIEV2ZW50Qm9vbGVhbiBjaGFuZ2VzXG5cdHZhbHVlLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlUHJvbWlzZShldmVudE9iamVjdCwgY29uZGl0aW9uRnVuYykge1xuXHRjb25kaXRpb25GdW5jID0gY29uZGl0aW9uRnVuYyB8fCBmdW5jdGlvbih2YWwpIHtyZXR1cm4gdmFsID09IHRydWV9O1xuXHRyZXR1cm4gbmV3IFByb21pc2UgKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRsZXQgc3ViID0gZXZlbnRPYmplY3Qub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRpZiAoY29uZGl0aW9uRnVuYyh2YWx1ZSkpIHtcblx0XHRcdFx0cmVzb2x2ZSh2YWx1ZSk7XG5cdFx0XHRcdGV2ZW50T2JqZWN0Lm9mZihzdWIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn07XG5cbi8vIG1vZHVsZSBhcGlcbmV4cG9ydCBkZWZhdWx0IHtcblx0ZXZlbnRpZnlQcm90b3R5cGUsXG5cdGV2ZW50aWZ5SW5zdGFuY2UsXG5cdEV2ZW50VmFyaWFibGUsXG5cdEV2ZW50Qm9vbGVhbixcblx0bWFrZVByb21pc2Vcbn07XG5cbiIsIi8qXG4gICAgQ29weXJpZ2h0IDIwMjBcbiAgICBBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cblxuLypcbiAgICBXcmFwcyB0aGUgYnVpbHQgaW4gc2V0VGltZW91dCB0byBwcm92aWRlIGFcbiAgICBUaW1lb3V0IHRoYXQgZG9lcyBub3QgZmlyZSB0b28gZWFybHkuXG5cbiAgICBJbXBvcnRhbnRseSwgdGhlIFRpbWVvdXQgb2JqZWN0IG1hbmFnZXMgYXQgbW9zdFxuICAgIG9uZSB0aW1lb3V0LlxuXG4gICAgLSBHaXZlbiBjbG9jay5ub3coKSByZXR1cm5zIGEgdmFsdWUgaW4gc2Vjb25kcy5cbiAgICAtIFRoZSB0aW1lb3V0IGlzIHNldCB3aXRoIGFuZCBhYnNvbHV0ZSB0aW1lc3RhbXAsXG4gICAgICBub3QgYSBkZWxheS5cbiovXG5cbmNsYXNzIFRpbWVvdXQge1xuXG4gICAgY29uc3RydWN0b3IgKHRpbWluZ09iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy50aWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudG8gPSB0aW1pbmdPYmplY3Q7XG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB9XG5cbiAgICBpc1NldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGlkICE9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKlxuICAgICAgICBzZXQgdGltZW91dCB0byBwb2ludCBpbiB0aW1lIChzZWNvbmRzKVxuICAgICovXG4gICAgc2V0VGltZW91dCh0YXJnZXRfdHMsIGFyZykge1xuICAgICAgICBpZiAodGhpcy50aWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhdCBtb3N0IG9uIHRpbWVvdXRcIik7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG5vdyA9IHRoaXMudG8uY2xvY2subm93KCk7XG4gICAgICAgIGxldCBkZWxheSA9IE1hdGgubWF4KHRhcmdldF90cyAtIG5vdywgMCkgKiAxMDAwO1xuICAgICAgICB0aGlzLnRpZCA9IHNldFRpbWVvdXQodGhpcy5vblRpbWVvdXQuYmluZCh0aGlzKSwgZGVsYXksIHRhcmdldF90cywgYXJnKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAgICBoYW5kbGUgdGltZW91dCBpbnRlbmRlZCBmb3IgcG9pbnQgaW4gdGltZSAoc2Vjb25kcylcbiAgICAqL1xuICAgIG9uVGltZW91dCh0YXJnZXRfdHMsIGFyZykge1xuICAgICAgICBpZiAodGhpcy50aWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRpbWVvdXQgd2FzIHRvbyBlYXJseVxuICAgICAgICAgICAgbGV0IG5vdyA9IHRoaXMudG8uY2xvY2subm93KClcbiAgICAgICAgICAgIGlmIChub3cgPCB0YXJnZXRfdHMpIHtcbiAgICAgICAgICAgICAgICAvLyBzY2hlZHVsZSBuZXcgdGltZW91dFxuICAgICAgICAgICAgICAgIHRoaXMuc2V0VGltZW91dCh0YXJnZXRfdHMsIGFyZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSB0aW1lb3V0XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhub3csIGFyZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKlxuICAgICAgICBjYW5jZWwgYW5kIGNsZWFyIHRpbWVvdXQgaWYgYWN0aXZlXG4gICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgaWYgKHRoaXMudGlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGlkKTtcbiAgICAgICAgICAgIHRoaXMudGlkID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUaW1lb3V0O1xuIiwiLypcblx0Q29weXJpZ2h0IDIwMTUgTm9ydXQgTm9ydGhlcm4gUmVzZWFyY2ggSW5zdGl0dXRlXG5cdEF1dGhvciA6IEluZ2FyIE3DpmhsdW0gQXJudHplblxuXG5cdFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG5cdFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG5cdGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuXHR0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuXHQoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG5cdFRpbWluZ3NyYyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuXHRidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuXHRNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG5cdEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG5cdFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuXHRhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cblxuLypcblx0TUFTVEVSIENMT0NLXG5cblxuXHRNYXN0ZXJDbG9jayBpcyB0aGUgcmVmZXJlbmNlIGNsb2NrIHVzZWQgYnkgVGltaW5nT2JqZWN0cy5cblxuXHRJdCBpcyBpbXBsZW1lbnRlZCB1c2luZyBwZXJmb3JtYW5jZS5ub3csXG5cdGJ1dCBpcyBza2V3ZWQgYW5kIHJhdGUtYWRqdXN0ZWQgcmVsYXRpdmUgdG8gdGhpcyBsb2NhbCBjbG9jay5cblxuXHRUaGlzIGFsbG93cyBpdCB0byBiZSB1c2VkIGFzIGEgbWFzdGVyIGNsb2NrIGluIGEgZGlzdHJpYnV0ZWQgc3lzdGVtLFxuXHR3aGVyZSBzeW5jaHJvbml6YXRpb24gaXMgZ2VuZXJhbGx5IHJlbGF0aXZlIHRvIHNvbWUgb3RoZXIgY2xvY2sgdGhhbiB0aGUgbG9jYWwgY2xvY2suXG5cblx0VGhlIG1hc3RlciBjbG9jayBtYXkgbmVlZCB0byBiZSBhZGp1c3RlZCBpbiB0aW1lLCBmb3IgaW5zdGFuY2UgYXMgYSByZXNwb25zZSB0b1xuXHR2YXJ5aW5nIGVzdGltYXRpb24gb2YgY2xvY2sgc2tldyBvciBkcmlmdC4gVGhlIG1hc3RlciBjbG9jayBzdXBwb3J0cyBhbiBhZGp1c3QgcHJpbWl0aXZlIGZvciB0aGlzIHB1cnBvc2UuXG5cblx0V2hhdCBwb2xpY3kgaXMgdXNlZCBmb3IgYWRqdXN0aW5nIHRoZSBtYXN0ZXIgY2xvY2sgbWF5IGRlcGVuZCBvbiB0aGUgY2lyY3Vtc3RhbmNlc1xuXHRhbmQgaXMgb3V0IG9mIHNjb3BlIGZvciB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlIE1hc3RlckNsb2NrLlxuXHRUaGlzIHBvbGljeSBpcyBpbXBsZW1lbnRlZCBieSB0aGUgdGltaW5nIG9iamVjdC4gVGhpcyBwb2xpY3kgbWF5IG9yIG1heSBub3Rcblx0cHJvdmlkZSBtb25vdG9uaWNpdHkuXG5cblx0QSBjaGFuZ2UgZXZlbnQgaXMgZW1pdHRlZCBldmVyeSB0aW1lIHRoZSBtYXN0ZXJjbG9jayBpcyBhZGp1c3RlZC5cblxuXHRWZWN0b3IgdmFsdWVzIGRlZmluZVxuXHQtIHBvc2l0aW9uIDogYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGNsb2NrIGluIHNlY29uZHNcblx0LSB2ZWxvY2l0eSA6IGhvdyBtYW55IHNlY29uZHMgYWRkZWQgcGVyIHNlY29uZCAoMS4wIGV4YWN0bHkgLSBvciB2ZXJ5IGNsb3NlKVxuXHQtIHRpbWVzdGFtcCA6IHRpbXN0YW1wIGZyb20gbG9jYWwgc3lzdGVtIGNsb2NrIChwZXJmb3JtYW5jZSkgaW4gc2Vjb25kcy4gRGVmaW5lcyBwb2ludCBpbiB0aW1lIHdoZXJlIHBvc2l0aW9uIGFuZCB2ZWxvY2l0eSBhcmUgdmFsaWQuXG5cblx0SWYgaW5pdGlhbCB2ZWN0b3IgaXMgbm90IHByb3ZpZGVkLCBkZWZhdWx0IHZhbHVlIGlzXG5cdHtwb3NpdGlvbjogbm93LCB2ZWxvY2l0eTogMS4wLCB0aW1lc3RhbXA6IG5vd307XG5cdGltcGx5aW5nIHRoYXQgbWFzdGVyIGNsb2NrIGlzIGVxdWFsIHRvIGxvY2FsIGNsb2NrLlxuKi9cblxuaW1wb3J0IGV2ZW50aWZ5IGZyb20gJy4uL3V0aWwvZXZlbnRpZnkuanMnO1xuXG5cbi8vIE5lZWQgYSBwb2x5ZmlsbCBmb3IgcGVyZm9ybWFuY2Usbm93IGFzIFNhZmFyaSBvbiBpb3MgZG9lc24ndCBoYXZlIGl0Li4uXG4oZnVuY3Rpb24oKXtcbiAgICBpZiAoXCJwZXJmb3JtYW5jZVwiIGluIHdpbmRvdyA9PT0gZmFsc2UpIHtcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlID0ge307XG4gICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5vZmZzZXQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG4gICAgaWYgKFwibm93XCIgaW4gd2luZG93LnBlcmZvcm1hbmNlID09PSBmYWxzZSl7XG4gICAgICB3aW5kb3cucGVyZm9ybWFuY2Uubm93ID0gZnVuY3Rpb24gbm93KCl7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHdpbmRvdy5wZXJmb3JtYW5jZS5vZmZzZXQ7XG4gICAgICB9O1xuICAgIH1cblx0fSkoKTtcblxuLy8gbG9jYWwgY2xvY2sgaW4gc2Vjb25kc1xuY29uc3QgbG9jYWxfY2xvY2sgPSB7XG5cdG5vdyA6IGZ1bmN0aW9uICgpIHtyZXR1cm4gcGVyZm9ybWFuY2Uubm93KCkvMTAwMC4wO31cbn07XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVZlY3Rvcih2ZWN0b3IsIHRzU2VjKSB7XG5cdGlmICh0c1NlYyA9PT0gdW5kZWZpbmVkKSB0c1NlYyA9IGxvY2FsX2Nsb2NrLm5vdygpO1xuXHR2YXIgZGVsdGFTZWMgPSB0c1NlYyAtIHZlY3Rvci50aW1lc3RhbXA7XG5cdHJldHVybiB7XG5cdFx0cG9zaXRpb24gOiB2ZWN0b3IucG9zaXRpb24gKyB2ZWN0b3IudmVsb2NpdHkqZGVsdGFTZWMsXG5cdFx0dmVsb2NpdHkgOiB2ZWN0b3IudmVsb2NpdHksXG5cdFx0dGltZXN0YW1wIDogdHNTZWNcblx0fTtcbn07XG5cbmNsYXNzIE1hc3RlckNsb2NrIHtcblxuXHRjb25zdHJ1Y3RvciAob3B0aW9ucykge1xuXHRcdHZhciBub3cgPSBsb2NhbF9jbG9jay5ub3coKTtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHR0aGlzLl92ZWN0b3IgID0ge3Bvc2l0aW9uOiBub3csIHZlbG9jaXR5OiAxLjAsIHRpbWVzdGFtcDogbm93fTtcblx0XHQvLyBldmVudCBzdXBwb3J0XG5cdFx0ZXZlbnRpZnkuZXZlbnRpZnlJbnN0YW5jZSh0aGlzKTtcblx0XHR0aGlzLmV2ZW50aWZ5RGVmaW5lKFwiY2hhbmdlXCIsIHtpbml0OmZhbHNlfSk7IC8vIGRlZmluZSBjaGFuZ2UgZXZlbnQgKG5vIGluaXQtZXZlbnQpXG5cdFx0Ly8gYWRqdXN0XG5cdFx0dGhpcy5hZGp1c3Qob3B0aW9ucyk7XG5cdH07XG5cblx0Lypcblx0XHRBREpVU1Rcblx0XHQtIGNvdWxkIGFsc28gYWNjZXB0IHRpbWVzdGFtcCBmb3IgdmVsb2NpdHkgaWYgbmVlZGVkP1xuXHRcdC0gZ2l2ZW4gc2tldyBpcyByZWxhdGl2ZSB0byBsb2NhbCBjbG9ja1xuXHRcdC0gZ2l2ZW4gcmF0ZSBpcyByZWxhdGl2ZSB0byBsb2NhbCBjbG9ja1xuXHQqL1xuXHRhZGp1c3Qob3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdHZhciBub3cgPSBsb2NhbF9jbG9jay5ub3coKTtcblx0XHR2YXIgbm93VmVjdG9yID0gdGhpcy5xdWVyeShub3cpO1xuXHRcdGlmIChvcHRpb25zLnNrZXcgPT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnJhdGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLl92ZWN0b3IgPSB7XG5cdFx0XHRwb3NpdGlvbiA6IChvcHRpb25zLnNrZXcgIT09IHVuZGVmaW5lZCkgPyBub3cgKyBvcHRpb25zLnNrZXcgOiBub3dWZWN0b3IucG9zaXRpb24sXG5cdFx0XHR2ZWxvY2l0eSA6IChvcHRpb25zLnJhdGUgIT09IHVuZGVmaW5lZCkgPyBvcHRpb25zLnJhdGUgOiBub3dWZWN0b3IudmVsb2NpdHksXG5cdFx0XHR0aW1lc3RhbXAgOiBub3dWZWN0b3IudGltZXN0YW1wXG5cdFx0fVxuXHRcdHRoaXMuZXZlbnRpZnlUcmlnZ2VyKFwiY2hhbmdlXCIpO1xuXHR9O1xuXG5cdC8qXG5cdFx0Tk9XXG5cdFx0LSBjYWxjdWxhdGVzIHRoZSB2YWx1ZSBvZiB0aGUgY2xvY2sgcmlnaHQgbm93XG5cdFx0LSBzaG9ydGhhbmQgZm9yIHF1ZXJ5XG5cdCovXG5cdG5vdygpIHtcblx0XHRyZXR1cm4gY2FsY3VsYXRlVmVjdG9yKHRoaXMuX3ZlY3RvciwgbG9jYWxfY2xvY2subm93KCkpLnBvc2l0aW9uO1xuXHR9O1xuXG5cdC8qXG5cdFx0UVVFUllcblx0XHQtIGNhbGN1bGF0ZXMgdGhlIHN0YXRlIG9mIHRoZSBjbG9jayByaWdodCBub3dcblx0XHQtIHJlc3VsdCB2ZWN0b3IgaW5jbHVkZXMgcG9zaXRpb24gYW5kIHZlbG9jaXR5XG5cdCovXG5cdHF1ZXJ5KG5vdykge1xuXHRcdHJldHVybiBjYWxjdWxhdGVWZWN0b3IodGhpcy5fdmVjdG9yLCBub3cpO1xuXHR9O1xuXG59XG5ldmVudGlmeS5ldmVudGlmeVByb3RvdHlwZShNYXN0ZXJDbG9jay5wcm90b3R5cGUpO1xuXG5leHBvcnQgZGVmYXVsdCBNYXN0ZXJDbG9jaztcbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG5cbmltcG9ydCBNYXN0ZXJDbG9jayBmcm9tICcuL21hc3RlcmNsb2NrLmpzJztcbmltcG9ydCB7Y2FsY3VsYXRlVmVjdG9yLCBjaGVja1JhbmdlfSBmcm9tICcuLi91dGlsL21vdGlvbnV0aWxzLmpzJztcblxuXG4vKlxuXHRJTlRFUk5BTCBQUk9WSURFUlxuXG5cdFRpbWluZyBwcm92aWRlciBpbnRlcm5hbCB0byB0aGUgYnJvd3NlciBjb250ZXh0XG5cblx0VXNlZCBieSB0aW1pbmcgb2JqZWN0cyBhcyB0aW1pbmdzcmMgaWYgbm8gdGltaW5nc3JjIGlzIHNwZWNpZmllZC5cbiovXG5cbmNsYXNzIEludGVybmFsUHJvdmlkZXIge1xuXG5cdGNvbnN0cnVjdG9yIChjYWxsYmFjaywgb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRcdC8vIGluaXRpYWxpc2UgaW50ZXJuYWwgc3RhdGVcblx0XHR0aGlzLl9jbG9jayA9IG5ldyBNYXN0ZXJDbG9jayh7c2tldzowfSk7XG5cdFx0dGhpcy5fcmFuZ2UgPSBbLUluZmluaXR5LCBJbmZpbml0eV07XG5cdFx0dGhpcy5fdmVjdG9yO1xuXHRcdHRoaXMuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0Ly8gb3B0aW9uc1xuXHRcdG9wdGlvbnMudGltZXN0YW1wID0gb3B0aW9ucy50aW1lc3RhbXAgfHwgdGhpcy5fY2xvY2subm93KCk7XG5cdFx0dGhpcy5fcHJvY2Vzc191cGRhdGUob3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gaW50ZXJuYWwgY2xvY2tcblx0Z2V0IGNsb2NrKCkge3JldHVybiB0aGlzLl9jbG9jazt9O1xuXHRnZXQgcmFuZ2UoKSB7cmV0dXJuIHRoaXMuX3JhbmdlO307XG5cdGdldCB2ZWN0b3IoKSB7cmV0dXJuIHRoaXMuX3ZlY3Rvcjt9O1xuXG5cdGlzUmVhZHkoKSB7cmV0dXJuIHRydWU7fTtcblxuXHQvLyB1cGRhdGVcblx0X3Byb2Nlc3NfdXBkYXRlKGFyZykge1xuXHRcdC8vIHByb2Nlc3MgYXJnXG5cdFx0bGV0IHtcblx0XHRcdHBvc2l0aW9uOiBwb3MsXG5cdFx0XHR2ZWxvY2l0eTogdmVsLFxuXHRcdFx0YWNjZWxlcmF0aW9uOiBhY2MsXG5cdFx0XHR0aW1lc3RhbXA6IHRzLFxuXHRcdFx0cmFuZ2U6IHJhbmdlLFxuXHRcdFx0Li4ucmVzdFxuXHRcdH0gPSBhcmc7XG5cblx0XHQvLyByZWNvcmQgc3RhdGUgZnJvbSBjdXJyZW50IG1vdGlvblxuXHRcdGxldCBwID0gMCwgdiA9IDAsIGEgPSAwO1xuXHRcdGlmICh0aGlzLl92ZWN0b3IgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgbm93VmVjdG9yID0gY2FsY3VsYXRlVmVjdG9yKHRoaXMuX3ZlY3RvciwgdHMpO1xuXHRcdFx0bm93VmVjdG9yID0gY2hlY2tSYW5nZShub3dWZWN0b3IsIHRoaXMuX3JhbmdlKTtcblx0XHRcdHAgPSBub3dWZWN0b3IucG9zaXRpb247XG5cdFx0XHR2ID0gbm93VmVjdG9yLnZlbG9jaXR5O1xuXHRcdFx0YSA9IG5vd1ZlY3Rvci5hY2NlbGVyYXRpb247XG5cdFx0fVxuXG5cdFx0Ly8gZmlsbCBpbiBmcm9tIGN1cnJlbnQgbW90aW9uLCBmb3IgbWlzc2luZyBwcm9wZXJ0aWVzXG5cdFx0bGV0IHZlY3RvciA9IHtcblx0XHRcdHBvc2l0aW9uIDogKHBvcyAhPSB1bmRlZmluZWQpID8gcG9zIDogcCxcblx0XHRcdHZlbG9jaXR5IDogKHZlbCAhPSB1bmRlZmluZWQpID8gdmVsIDogdixcblx0XHRcdGFjY2VsZXJhdGlvbiA6IChhY2MgIT0gdW5kZWZpbmVkKSA/IGFjYyA6IGEsXG5cdFx0XHR0aW1lc3RhbXAgOiB0c1xuXHRcdH07XG5cblx0XHQvLyB1cGRhdGUgcmFuZ2Vcblx0XHRpZiAocmFuZ2UgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXQgW2xvdywgaGlnaF0gPSByYW5nZTtcblx0XHRcdGlmIChsb3cgPCBoaWdoKSB7XG5cdFx0XHRcdGlmIChsb3cgIT0gdGhpcy5fcmFuZ2VbMF0gfHwgaGlnaCAhPSB0aGlzLl9yYW5nZVsxXSkge1xuXHRcdFx0XHRcdHRoaXMuX3JhbmdlID0gW2xvdywgaGlnaF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjaGVjayB2ZWN0b3Igd2l0aCByZXNwZWN0IHRvIHJhbmdlXG5cdFx0dmVjdG9yID0gY2hlY2tSYW5nZSh2ZWN0b3IsIHRoaXMuX3JhbmdlKTtcblx0XHQvLyBzYXZlIG9sZCB2ZWN0b3Jcblx0XHR0aGlzLl9vbGRfdmVjdG9yID0gdGhpcy5fdmVjdG9yO1xuXHRcdC8vIHVwZGF0ZSB2ZWN0b3Jcblx0XHR0aGlzLl92ZWN0b3IgPSB2ZWN0b3I7XG5cdFx0cmV0dXJuIHtyYW5nZSwgLi4udmVjdG9yLCAuLi5yZXN0fTtcblx0fTtcblxuXHQvLyB1cGRhdGVcblx0dXBkYXRlKGFyZykge1xuXHRcdGFyZyA9IHRoaXMuX3Byb2Nlc3NfdXBkYXRlKGFyZyk7XG5cdFx0cmV0dXJuIHRoaXMuX2NhbGxiYWNrKGFyZyk7XG5cdH1cblxuXHRjbG9zZSgpIHtcblx0XHR0aGlzLl9jYWxsYmFjayA9IHVuZGVmaW5lZDtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcm5hbFByb3ZpZGVyO1xuXG4iLCIvKlxuXHRDb3B5cmlnaHQgMjAxNSBOb3J1dCBOb3J0aGVybiBSZXNlYXJjaCBJbnN0aXR1dGVcblx0QXV0aG9yIDogSW5nYXIgTcOmaGx1bSBBcm50emVuXG5cblx0VGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFRpbWluZ3NyYyBtb2R1bGUuXG5cblx0VGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcblx0aXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG5cdHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG5cdChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cblx0VGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG5cdGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG5cdE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcblx0R05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cblx0WW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG5cdGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuXG4qL1xuXG5cblxuaW1wb3J0IE1hc3RlckNsb2NrIGZyb20gJy4vbWFzdGVyY2xvY2suanMnO1xuXG5cbmZ1bmN0aW9uIGNoZWNrVGltaW5nUHJvdmlkZXIob2JqKXtcblx0bGV0IHJlcXVpcmVkID0gW1wib25cIiwgXCJza2V3XCIsIFwidmVjdG9yXCIsIFwicmFuZ2VcIiwgXCJ1cGRhdGVcIl07XG5cdGZvciAobGV0IHByb3Agb2YgcmVxdWlyZWQpIHtcblx0XHRpZiAoIShwcm9wIGluIG9iaikpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGltaW5nUHJvdmlkZXIgJHtvYmp9IG1pc3NpbmcgcHJvcGVydHkgJHtwcm9wfWApO1xuXHRcdH1cblx0fVxufVxuXG5cbi8qXG5cdEVYVEVSTkFMIFBST1ZJREVSXG5cblx0RXh0ZXJuYWwgUHJvdmlkZXIgYnJpZGdlcyB0aGUgZ2FwIGJldHdlZW4gdGhlIFBST1ZJREVSIEFQSSAoaW1wbGVtZW50ZWQgYnkgZXh0ZXJuYWwgdGltaW5nIHByb3ZpZGVycylcblx0YW5kIHRoZSBUSU1JTkdTUkMgQVBJXG5cblx0T2JqZWN0cyBpbXBsZW1lbnRpbmcgdGhlIFRJTUlOR1NSQyBBUEkgbWF5IGJlIHVzZWQgYXMgdGltaW5nc3JjIChwYXJlbnQpIGZvciBhbm90aGVyIHRpbWluZyBvYmplY3QuXG5cblx0LSB3cmFwcyBhIHRpbWluZyBwcm92aWRlciBleHRlcm5hbFxuXHQtIGhhbmRsZXMgc29tZSBjb21wbGV4aXR5IHRoYXQgYXJpc2VzIGR1ZSB0byB0aGUgdmVyeSBzaW1wbGUgQVBJIG9mIHByb3ZpZGVyc1xuXHQtIGltcGxlbWVudHMgYSBjbG9jayBmb3IgdGhlIHByb3ZpZGVyXG4qL1xuXG5jbGFzcyBFeHRlcm5hbFByb3ZpZGVyIHtcblxuXHRjb25zdHJ1Y3Rvcihwcm92aWRlciwgY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0XHRjaGVja1RpbWluZ1Byb3ZpZGVyKHByb3ZpZGVyKTtcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdHRoaXMuX3Byb3ZpZGVyID0gcHJvdmlkZXI7XG5cdFx0dGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHR0aGlzLl9yYW5nZTtcblx0XHR0aGlzLl92ZWN0b3I7XG5cdFx0dGhpcy5fcmVhZHkgPSBmYWxzZVxuXG5cdFx0Lypcblx0XHRcdHByb3ZpZGVyIGNsb2NrIChtYXkgZmx1Y3R1YXRlIGJhc2VkIG9uIGxpdmUgc2tldyBlc3RpbWF0ZXMpXG5cdFx0Ki9cblx0XHR0aGlzLl9wcm92aWRlcl9jbG9jaztcblx0XHQvKlxuXHRcdFx0bG9jYWwgY2xvY2tcblx0XHRcdHByb3ZpZGVyIGNsb2NrIG5vcm1hbGlzZWQgdG8gdmFsdWVzIG9mIHBlcmZvcm1hbmNlIG5vd1xuXHRcdFx0bm9ybWFsaXNhdGlvbiBiYXNlZCBvbiBmaXJzdCBza2V3IG1lYXN1cmVtZW50LCBzb1xuXHRcdCovXG5cdFx0dGhpcy5fY2xvY2s7XG5cblxuXHRcdC8vIHJlZ2lzdGVyIGV2ZW50IGhhbmRsZXJzXG5cdFx0dGhpcy5fcHJvdmlkZXIub24oXCJ2ZWN0b3JjaGFuZ2VcIiwgdGhpcy5fb25WZWN0b3JDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5fcHJvdmlkZXIub24oXCJza2V3Y2hhbmdlXCIsIHRoaXMuX29uU2tld0NoYW5nZS5iaW5kKHRoaXMpKTtcblxuXHRcdC8vIGNoZWNrIGlmIHByb3ZpZGVyIGlzIHJlYWR5XG5cdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9wcm92aWRlci5za2V3ICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IHNlbGYgPSB0aGlzO1xuXHRcdFx0UHJvbWlzZS5yZXNvbHZlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2VsZi5fb25Ta2V3Q2hhbmdlKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0aXNSZWFkeSgpIHtyZXR1cm4gdGhpcy5fcmVhZHk7fTtcblxuXHQvLyBpbnRlcm5hbCBjbG9ja1xuXHRnZXQgY2xvY2soKSB7cmV0dXJuIHRoaXMuX2Nsb2NrO307XG5cdGdldCByYW5nZSgpIHtyZXR1cm4gdGhpcy5fcmFuZ2U7fTtcblxuXG5cdC8qXG5cdFx0LSBsb2NhbCB0aW1lc3RhbXAgb2YgdmVjdG9yIGlzIHNldCBmb3IgZWFjaCBuZXcgdmVjdG9yLCB1c2luZyB0aGUgc2tldyBhdmFpbGFibGUgYXQgdGhhdCB0aW1lXG5cdFx0LSB0aGUgdmVjdG9yIHRoZW4gcmVtYWlucyB1bmNoYW5nZWRcblx0XHQtIHNrZXcgY2hhbmdlcyBhZmZlY3QgbG9jYWwgY2xvY2ssIHRoZXJlYnkgYWZmZWN0aW5nIHRoZSByZXN1bHQgb2YgcXVlcnkgb3BlcmF0aW9uc1xuXG5cdFx0LSBvbmUgY291bGQgaW1hZ2luZSByZWV2YWx1YXRpbmcgdGhlIHZlY3RvciBhcyB3ZWxsIHdoZW4gdGhlIHNrZXcgY2hhbmdlcyxcblx0XHRcdGJ1dCB0aGVuIHRoaXMgc2hvdWxkIGJlIGRvbmUgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudHNcblxuXHRcdC0gaWRlYWxseSB0aGUgdmVjdG9yIHRpbWVzdGFtcCBzaG91bGQgYmUgYSBmdW5jdGlvbiBvZiB0aGUgcHJvdmlkZXIgY2xvY2tcblx0Ki9cblxuXHRnZXQgdmVjdG9yKCkge1xuXHRcdC8vIGxvY2FsX3RzID0gcHJvdmlkZXJfdHMgLSBza2V3XG5cdFx0bGV0IGxvY2FsX3RzID0gdGhpcy5fdmVjdG9yLnRpbWVzdGFtcCAtIHRoaXMuX3Byb3ZpZGVyLnNrZXc7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBvc2l0aW9uIDogdGhpcy5fdmVjdG9yLnBvc2l0aW9uLFxuXHRcdFx0dmVsb2NpdHkgOiB0aGlzLl92ZWN0b3IudmVsb2NpdHksXG5cdFx0XHRhY2NlbGVyYXRpb24gOiB0aGlzLl92ZWN0b3IuYWNjZWxlcmF0aW9uLFxuXHRcdFx0dGltZXN0YW1wIDogbG9jYWxfdHNcblx0XHR9XG5cdH1cblxuXG5cdC8vIGludGVybmFsIHByb3ZpZGVyIG9iamVjdFxuXHRnZXQgcHJvdmlkZXIoKSB7cmV0dXJuIHRoaXMuX3Byb3ZpZGVyO307XG5cblxuXHRfb25Ta2V3Q2hhbmdlKCkge1xuXHRcdGlmICghdGhpcy5fY2xvY2spIHtcblx0XHRcdHRoaXMuX3Byb3ZpZGVyX2Nsb2NrID0gbmV3IE1hc3RlckNsb2NrKHtza2V3OiB0aGlzLl9wcm92aWRlci5za2V3fSk7XG5cdFx0XHR0aGlzLl9jbG9jayA9IG5ldyBNYXN0ZXJDbG9jayh7c2tldzowfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3Byb3ZpZGVyX2Nsb2NrLmFkanVzdCh7c2tldzogdGhpcy5fcHJvdmlkZXIuc2tld30pO1xuXHRcdFx0Ly8gcHJvdmlkZXIgY2xvY2sgYWRqdXN0ZWQgd2l0aCBuZXcgc2tldyAtIGNvcnJlY3QgbG9jYWwgY2xvY2sgc2ltaWxhcmx5XG5cdFx0XHQvLyBjdXJyZW50X3NrZXcgPSBjbG9ja19wcm92aWRlciAtIGNsb2NrX2xvY2FsXG5cdFx0XHRsZXQgY3VycmVudF9za2V3ID0gdGhpcy5fcHJvdmlkZXJfY2xvY2subm93KCkgLSB0aGlzLl9jbG9jay5ub3coKTtcblx0XHRcdC8vIHNrZXcgZGVsdGEgPSBuZXdfc2tldyAtIGN1cnJlbnRfc2tld1xuXHRcdFx0bGV0IHNrZXdfZGVsdGEgPSB0aGlzLl9wcm92aWRlci5za2V3IC0gY3VycmVudF9za2V3O1xuXHRcdFx0dGhpcy5fY2xvY2suYWRqdXN0KHtza2V3OiBza2V3X2RlbHRhfSk7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5pc1JlYWR5KCkgJiYgdGhpcy5fcHJvdmlkZXIudmVjdG9yICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0Ly8ganVzdCBiZWNhbWUgcmVhZHlcblx0XHRcdHRoaXMuX3JlYWR5ID0gdHJ1ZTtcblx0XHRcdHRoaXMuX3JhbmdlID0gdGhpcy5fcHJvdmlkZXIucmFuZ2U7XG5cdFx0XHR0aGlzLl92ZWN0b3IgPSB0aGlzLl9wcm92aWRlci52ZWN0b3I7XG5cdFx0XHRsZXQgZUFyZyA9IHtcblx0XHRcdFx0cmFuZ2U6IHRoaXMucmFuZ2UsXG5cdFx0XHRcdC4uLnRoaXMudmVjdG9yLFxuXHRcdFx0XHRsaXZlOiBmYWxzZVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5fY2FsbGJhY2soZUFyZyk7XG5cdFx0fVxuXHR9O1xuXG5cdF9vblZlY3RvckNoYW5nZSgpIHtcblx0XHRpZiAodGhpcy5fY2xvY2spIHtcblx0XHRcdC8vIGlzIHJlYWR5IChvblNrZXdDaGFuZ2UgaGFzIGZpcmVkIGVhcmxpZXIpXG5cdFx0XHRpZiAoIXRoaXMuX3JlYWR5KSB7XG5cdFx0XHRcdHRoaXMuX3JlYWR5ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5fcmFuZ2UpIHtcblx0XHRcdFx0dGhpcy5fcmFuZ2UgPSB0aGlzLl9wcm92aWRlci5yYW5nZTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3ZlY3RvciA9IHRoaXMuX3Byb3ZpZGVyLnZlY3Rvcjtcblx0XHRcdGxldCBlQXJnID0ge1xuXHRcdFx0XHRyYW5nZTogdGhpcy5yYW5nZSxcblx0XHRcdFx0Li4udGhpcy52ZWN0b3Jcblx0XHRcdH1cblx0XHRcdHRoaXMuX2NhbGxiYWNrKGVBcmcpO1xuXHRcdH1cblx0fTtcblxuXG5cdC8vIHVwZGF0ZVxuXHQvKlxuXHRcdFRPRE8gLSBzdXBwb3J0IHNldHRpbmcgcmFuZ2Ugb24gcHJvdmlkZXJcblx0XHRUT0RPIC0gc3VwcHBvcnQgdHVubmVsXG5cdFx0VE9ETyAtIHN1cHBvcnQgb25SYW5nZUNoYW5nZSBmcm9tIHByb3ZpZGVyXG5cdCovXG5cdHVwZGF0ZShhcmcpIHtcblx0XHRsZXQgdmVjdG9yID0ge1xuXHRcdFx0cG9zaXRpb246IGFyZy5wb3NpdGlvbixcblx0XHRcdHZlbG9jaXR5OiBhcmcudmVsb2NpdHksXG5cdFx0XHRhY2NlbGVyYXRpb246IGFyZy5hY2NlbGVyYXRpb24sXG5cdFx0XHR0aW1lc3RhbXA6IGFyZy50aW1lc3RhbXBcblx0XHR9O1xuXHRcdC8vIGNhbGMgYmFjayB0byBwcm92aWRlciB0c1xuXHRcdC8vIGxvY2FsX3RzID0gcHJvdmlkZXJfdHMgLSBza2V3XG5cdFx0dmVjdG9yLnRpbWVzdGFtcCA9IHZlY3Rvci50aW1lc3RhbXAgKyB0aGlzLl9wcm92aWRlci5za2V3O1xuXHRcdGxldCByZXMgPSB0aGlzLl9wcm92aWRlci51cGRhdGUodmVjdG9yKTtcblx0XHQvLyByZXR1cm4gc3VjY2Vzc1xuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBFeHRlcm5hbFByb3ZpZGVyO1xuXG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDIwXG5cdEF1dGhvciA6IEluZ2FyIE3DpmhsdW0gQXJudHplblxuXG5cdFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG5cdFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG5cdGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuXHR0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuXHQoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG5cdFRpbWluZ3NyYyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuXHRidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuXHRNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG5cdEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG5cdFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuXHRhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cblxuaW1wb3J0IGV2ZW50aWZ5IGZyb20gJy4uL3V0aWwvZXZlbnRpZnkuanMnO1xuaW1wb3J0IFRpbWVvdXQgZnJvbSAnLi4vdXRpbC90aW1lb3V0LmpzJztcbmltcG9ydCAqIGFzIG1vdGlvbnV0aWxzIGZyb20gJy4uL3V0aWwvbW90aW9udXRpbHMuanMnO1xuaW1wb3J0IEludGVybmFsUHJvdmlkZXIgZnJvbSAnLi9pbnRlcm5hbHByb3ZpZGVyLmpzJztcbmltcG9ydCBFeHRlcm5hbFByb3ZpZGVyIGZyb20gJy4vZXh0ZXJuYWxwcm92aWRlci5qcyc7XG5cbmNvbnN0IE1BWF9OT05DRSA9IDEwMDAwO1xuXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQoKSB7XG4gXHRyZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTUFYX05PTkNFKTtcbn07XG5cbmZ1bmN0aW9uIGlzVGltaW5nUHJvdmlkZXIob2JqKXtcblx0bGV0IHJlcXVpcmVkID0gW1wib25cIiwgXCJza2V3XCIsIFwidmVjdG9yXCIsIFwicmFuZ2VcIiwgXCJ1cGRhdGVcIl07XG5cdGZvciAobGV0IHByb3Agb2YgcmVxdWlyZWQpIHtcblx0XHRpZiAoIShwcm9wIGluIG9iaikpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUmFuZ2UobGl2ZSwgbm93LCB2ZWN0b3IsIHJhbmdlKSB7XG5cdGlmIChsaXZlKSB7XG5cdFx0cmV0dXJuIG1vdGlvbnV0aWxzLmNoZWNrUmFuZ2UodmVjdG9yLCByYW5nZSk7XG5cdH0gZWxzZSB7XG5cdFx0bGV0IG5vd192ZWN0b3IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodmVjdG9yLCBub3cpO1xuXHRcdHJldHVybiBtb3Rpb251dGlscy5jaGVja1JhbmdlKG5vd192ZWN0b3IsIHJhbmdlKTtcblx0fVxufVxuXG5cblxuLypcblx0VElNSU5HIEJBU0VcblxuXHRhYnN0cmFjdCBiYXNlIGNsYXNzIGZvciBvYmplY3RzIHRoYXQgbWF5IGJlIHVzZWQgYXMgdGltaW5nc3JjXG5cblx0ZXNzZW50aWFsIGludGVybmFsIHN0YXRlXG5cdC0gcmFuZ2UsIHZlY3RvclxuXG5cdGV4dGVybmFsIG1ldGhvZHNcblx0cXVlcnksIHVwZGF0ZVxuXG5cdGV2ZW50c1xuXHRvbi9vZmYgXCJjaGFuZ2VcIiwgXCJ0aW1ldXBkYXRlXCJcblxuXHRpbnRlcm5hbCBtZXRob2RzIGZvciByYW5nZSB0aW1lb3V0c1xuXG5cdGRlZmluZXMgaW50ZXJuYWwgcHJvY2Vzc2luZyBzdGVwc1xuXHQtIGhhbmRsZUV2ZW50KGFyZykgPC0gZnJvbSBleHRlcm5hbCB0aW1pbmdvYmplY3Rcblx0XHQtIHZlY3RvciA9IG9uQ2hhbmdlKHZlY3Rvcilcblx0XHQtIHByb2Nlc3ModmVjdG9yKSA8LSBmcm9tIHRpbWVvdXQgb3IgcHJlUHJvY2Vzc1xuXHQtIGhhbmRsZVRpbWVvdXQoYXJnKSA8LSB0aW1lb3V0IG9uIHJhbmdlIHJlc3RyaWN0aW9uc1xuXHQtIHByb2Nlc3MgKGFyZylcblx0XHQtIHNldCBpbnRlcm5hbCB2ZWN0b3IsIHJhbmdlXG5cdFx0LSBkaXNwYXRjaEV2ZW50cyhhcmcpXG5cdFx0LSByZW5ldyByYW5nZSB0aW1lb3V0XG5cdC0gZGlzcGF0Y2hFdmVudCAoYXJnKVxuXHRcdC0gZW1pdCBjaGFuZ2UgZXZlbnQgYW5kIHRpbWV1cGRhdGUgZXZlbnRcblx0XHQtIHR1cm4gcGVyaW9kaWMgdGltZXVwZGF0ZSBvbiBvciBvZmZcblxuXHRpbmRpdmlkdWFsIHN0ZXBzIGluIHRoaXMgc3RydWN0dXJlIG1heSBiZSBzcGVjaWFsaXplZFxuXHRieSBzdWJjbGFzc2VzIChpLmUuIHRpbWluZyBjb252ZXJ0ZXJzKVxuKi9cblxuXG5jbGFzcyBUaW1pbmdPYmplY3Qge1xuXG5cdGNvbnN0cnVjdG9yICh0aW1pbmdzcmMsIG9wdGlvbnMpIHtcblxuXHRcdC8vIHNwZWNpYWwgc3VwcG9ydCBmb3Igb3B0aW9ucyBnaXZlbiBhcyBmaXJzdCBhbmQgb25seSBhcmd1bWVudFxuXHRcdC8vIGVxdWl2YWxlbnQgdG8gbmV3IFRpbWluZ09iamVjdCh1bmRlZmluZWQsIG9wdGlvbnMpXG5cdFx0Ly8gaW4gdGhpcyBjYXNlLCB0aW1pbmdzcmMgbWF5IGJlIGZvdW5kIGluIG9wdGlvbnNcblx0XHRpZiAodGltaW5nc3JjICE9IHVuZGVmaW5lZCAmJiBvcHRpb25zID09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKCEodGltaW5nc3JjIGluc3RhbmNlb2YgVGltaW5nT2JqZWN0KSAmJiAhaXNUaW1pbmdQcm92aWRlcih0aW1pbmdzcmMpKSB7XG5cdFx0XHRcdC8vIHRpbWluZ3NyYyBpcyBuZWl0aGVyIHRpbWluZyBvYmplY3Qgbm9yIHRpbWluZ3Byb3ZpZGVyXG5cdFx0XHRcdC8vIGFzc3VtZSB0aW1pbmdzcmMgaXMgb3B0aW9uc1xuXHRcdFx0XHRvcHRpb25zID0gdGltaW5nc3JjO1xuXHRcdFx0XHR0aW1pbmdzcmMgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmIChvcHRpb25zLnByb3ZpZGVyKSB7XG5cdFx0XHRcdFx0dGltaW5nc3JjID0gb3B0aW9ucy5wcm92aWRlcjtcblx0XHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLnRpbWluZ3NyYykge1xuXHRcdFx0XHRcdHRpbWluZ3NyYyA9IG9wdGlvbnMudGltaW5nc3JjO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIG9wdGlvbnNcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHR0aGlzLl9fb3B0aW9ucyA9IG9wdGlvbnM7XG5cblxuXHRcdC8vIGRlZmF1bHQgdGltZW91dCBvcHRpb25cblx0XHRpZiAob3B0aW9ucy50aW1lb3V0ID09IHVuZGVmaW5lZCkge1xuXHRcdFx0b3B0aW9ucy50aW1lb3V0ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBjYWNoZWQgdmVjdG9ycyBhbmQgcmFuZ2Vcblx0XHR0aGlzLl9fb2xkX3ZlY3Rvcjtcblx0XHR0aGlzLl9fdmVjdG9yO1xuXHRcdHRoaXMuX19yYW5nZSA9IFstSW5maW5pdHksIEluZmluaXR5XTtcblxuXHRcdC8vIHJhbmdlIHJlc3RyaWN0aW9uIHRpbWVvdXRcblx0XHR0aGlzLl9fdGltZW91dCA9IG5ldyBUaW1lb3V0KHRoaXMsIHRoaXMuX19oYW5kbGVUaW1lb3V0LmJpbmQodGhpcykpO1xuXG5cdFx0Ly8gdGltZW91dGlkIGZvciB0aW1ldXBkYXRlIGV2ZW50XG5cdFx0dGhpcy5fX3RpZCA9IHVuZGVmaW5lZDtcblxuXHRcdC8vIHRpbWluZ3NyY1xuXHRcdHRoaXMuX190aW1pbmdzcmM7XG5cdFx0dGhpcy5fX3N1YjtcblxuXHRcdC8vIHVwZGF0ZSBwcm9taXNlc1xuXHRcdHRoaXMuX191cGRhdGVfZXZlbnRzID0gbmV3IE1hcCgpO1xuXG5cdFx0Ly8gcmVhZGluZXNzXG5cdFx0dGhpcy5fX3JlYWR5ID0gbmV3IGV2ZW50aWZ5LkV2ZW50Qm9vbGVhbigpO1xuXG5cdFx0Ly8gZXhwb3J0ZWQgZXZlbnRzXG5cdFx0ZXZlbnRpZnkuZXZlbnRpZnlJbnN0YW5jZSh0aGlzKTtcblx0XHR0aGlzLmV2ZW50aWZ5RGVmaW5lKFwidGltaW5nc3JjXCIsIHtpbml0OnRydWV9KTtcblx0XHR0aGlzLmV2ZW50aWZ5RGVmaW5lKFwiY2hhbmdlXCIsIHtpbml0OnRydWV9KTtcblx0XHR0aGlzLmV2ZW50aWZ5RGVmaW5lKFwicmFuZ2VjaGFuZ2VcIiwge2luaXQ6dHJ1ZX0pO1xuXHRcdHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJ0aW1ldXBkYXRlXCIsIHtpbml0OnRydWV9KTtcblxuXHRcdC8vIGluaXRpYWxpc2UgdGltaW5nc3JjXG5cdFx0dGhpcy5fX3NldF90aW1pbmdzcmModGltaW5nc3JjLCBvcHRpb25zKTtcblx0fTtcblxuXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXHRcdEVWRU5UU1xuXG5cdCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXHQvKlxuXHQgIFx0b3ZlcnJpZGVzIGhvdyBpbW1lZGlhdGUgZXZlbnRzIGFyZSBjb25zdHJ1Y3RlZFxuXHQgIFx0c3BlY2lmaWMgdG8gZXZlbnR1dGlsc1xuXHQgIFx0LSBvdmVycmlkZXMgdG8gYWRkIHN1cHBvcnQgZm9yIHRpbWV1cGRhdGUgZXZlbnRzXG5cdCovXG5cdGV2ZW50aWZ5SW5pdEV2ZW50QXJncyhuYW1lKSB7XG5cdFx0aWYgKHRoaXMuX19yZWFkeS52YWx1ZSkge1xuXHRcdFx0aWYgKG5hbWUgPT0gXCJ0aW1pbmdzcmNcIikge1xuXHRcdFx0XHRsZXQgZUFyZyA9IHtcblx0XHRcdFx0XHQuLi50aGlzLl9fdmVjdG9yLFxuXHRcdFx0XHRcdHJhbmdlOiB0aGlzLl9fcmFuZ2UsXG5cdFx0XHRcdFx0bGl2ZTpmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBbZUFyZ107XG5cdFx0XHR9IGVsc2UgaWYgKG5hbWUgPT0gXCJ0aW1ldXBkYXRlXCIpIHtcblx0XHRcdFx0cmV0dXJuIFt1bmRlZmluZWRdO1xuXHRcdFx0fSBlbHNlIGlmIChuYW1lID09IFwiY2hhbmdlXCIpIHtcblx0XHRcdFx0cmV0dXJuIFt0aGlzLl9fdmVjdG9yXTtcblx0XHRcdH0gZWxzZSBpZiAobmFtZSA9PSBcInJhbmdlY2hhbmdlXCIpIHtcblx0XHRcdFx0cmV0dXJuIFt0aGlzLl9fcmFuZ2VdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXHRcdEFDQ0VTU09SU1xuXG5cdCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXHQvLyByZWFkeSBvciBub3Rcblx0aXNSZWFkeSgpIHtyZXR1cm4gdGhpcy5fX3JlYWR5LnZhbHVlO307XG5cblx0Ly8gcmVhZHkgcHJvbWlzZVxuICAgIGdldCByZWFkeSgpIHtyZXR1cm4gZXZlbnRpZnkubWFrZVByb21pc2UodGhpcy5fX3JlYWR5KTt9O1xuXG4gICAgLy8gcmFuZ2VcbiAgICBnZXQgcmFuZ2UoKSB7XG4gICAgXHQvLyBjb3B5XG4gICAgXHRyZXR1cm4gW3RoaXMuX19yYW5nZVswXSwgdGhpcy5fX3JhbmdlWzFdXTtcbiAgICB9O1xuXG4gICAgLy8gdmVjdG9yXG4gICAgZ2V0IHZlY3RvcigpIHtcbiAgICBcdC8vIGNvcHlcblx0XHRyZXR1cm4ge1xuXHRcdFx0cG9zaXRpb24gOiB0aGlzLl9fdmVjdG9yLnBvc2l0aW9uLFxuXHRcdFx0dmVsb2NpdHkgOiB0aGlzLl9fdmVjdG9yLnZlbG9jaXR5LFxuXHRcdFx0YWNjZWxlcmF0aW9uIDogdGhpcy5fX3ZlY3Rvci5hY2NlbGVyYXRpb24sXG5cdFx0XHR0aW1lc3RhbXAgOiB0aGlzLl9fdmVjdG9yLnRpbWVzdGFtcFxuXHRcdH07XG4gICAgfTtcblxuICAgIC8vIG9sZCB2ZWN0b3JcbiAgICBnZXQgb2xkX3ZlY3RvcigpIHtyZXR1cm4gdGhpcy5fX29sZF92ZWN0b3I7fTtcblxuICAgIC8vIGRlbHRhXG4gICAgZ2V0IGRlbHRhKCkge1xuICAgIFx0cmV0dXJuIG5ldyBtb3Rpb251dGlscy5Nb3Rpb25EZWx0YSh0aGlzLl9fb2xkX3ZlY3RvciwgdGhpcy5fX3ZlY3Rvcik7XG4gICAgfVxuXG5cdC8vIGNsb2NrIC0gZnJvbSB0aW1pbmdzcmMgb3IgcHJvdmlkZXJcblx0Z2V0IGNsb2NrKCkge3JldHVybiB0aGlzLl9fdGltaW5nc3JjLmNsb2NrfTtcblxuXG5cblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cdFx0UVVFUllcblxuXHQqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblx0Ly8gcXVlcnlcblx0cXVlcnkoKSB7XG5cdFx0aWYgKHRoaXMuX19yZWFkeS52YWx1ZSA9PSBmYWxzZSkgIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcInF1ZXJ5IGJlZm9yZSB0aW1pbmcgb2JqZWN0IGlzIHJlYWR5XCIpO1xuXHRcdH1cblx0XHQvLyByZWV2YWx1YXRlIHN0YXRlIHRvIGhhbmRsZSByYW5nZSB2aW9sYXRpb25cblx0XHRsZXQgdmVjdG9yID0gbW90aW9udXRpbHMuY2FsY3VsYXRlVmVjdG9yKHRoaXMuX192ZWN0b3IsIHRoaXMuY2xvY2subm93KCkpO1xuXHRcdC8vIGRldGVjdCByYW5nZSB2aW9sYXRpb24gLSBvbmx5IGlmIHRpbWVvdXQgaXMgc2V0IHtcblx0XHRpZiAodGhpcy5fX3RpbWVvdXQuaXNTZXQoKSkge1xuXHRcdFx0aWYgKHZlY3Rvci5wb3NpdGlvbiA8IHRoaXMuX19yYW5nZVswXSB8fCB0aGlzLl9fcmFuZ2VbMV0gPCB2ZWN0b3IucG9zaXRpb24pIHtcblx0XHRcdFx0Ly8gZW11bGF0ZSB1cGRhdGUgZXZlbnQgdG8gdHJpZ2dlciByYW5nZSByZXN0cmljdGlvblxuXHRcdFx0XHR0aGlzLl9fcHJvY2Vzcyh7Li4udGhpcy5vblJhbmdlVmlvbGF0aW9uKHZlY3Rvcil9KTtcblx0XHRcdH1cblx0XHRcdC8vIHJlLWV2YWx1YXRlIHF1ZXJ5IGFmdGVyIHN0YXRlIHRyYW5zaXRpb25cblx0XHRcdHJldHVybiBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodGhpcy5fX3ZlY3RvciwgdGhpcy5jbG9jay5ub3coKSk7XG5cdFx0fVxuXHRcdHJldHVybiB2ZWN0b3I7XG5cdH07XG5cblx0Ly8gc2hvcnRoYW5kIHF1ZXJ5XG5cdGdldCBwb3MoKSB7cmV0dXJuIHRoaXMucXVlcnkoKS5wb3NpdGlvbjt9O1xuXHRnZXQgdmVsKCkge3JldHVybiB0aGlzLnF1ZXJ5KCkudmVsb2NpdHk7fTtcblx0Z2V0IGFjYygpIHtyZXR1cm4gdGhpcy5xdWVyeSgpLmFjY2VsZXJhdGlvbjt9O1xuXG5cblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cdFx0VVBEQVRFXG5cblx0KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cdC8vIGludGVybmFsIHVwZGF0ZVxuXHRfX3VwZGF0ZShhcmcpIHtcblx0XHRpZiAodGhpcy5fX3RpbWluZ3NyYyBpbnN0YW5jZW9mIFRpbWluZ09iamVjdCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX190aW1pbmdzcmMuX191cGRhdGUoYXJnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcHJvdmlkZXJcblx0XHRcdHJldHVybiB0aGlzLl9fdGltaW5nc3JjLnVwZGF0ZShhcmcpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBleHRlcm5hbCB1cGRhdGVcblx0dXBkYXRlKGFyZykge1xuXHRcdC8vIGNoZWNrIGlmIG5vb3Bcblx0XHRsZXQgb2sgPSAoYXJnLnJhbmdlICE9IHVuZGVmaW5lZCk7XG5cdFx0b2sgPSBvayB8fCAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCk7XG5cdFx0b2sgPSBvayB8fCAoYXJnLnZlbG9jaXR5ICE9IHVuZGVmaW5lZCk7XG5cdFx0b2sgPSBvayB8fCAoYXJnLmFjY2VsZXJhdGlvbiAhPSB1bmRlZmluZWQpO1xuXHRcdGlmICghb2spIHtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoYXJnKTtcblx0XHR9XG5cdFx0YXJnLnR1bm5lbCA9IGdldFJhbmRvbUludCgpO1xuXHRcdGlmIChhcmcudGltZXN0YW1wID09IHVuZGVmaW5lZCkge1xuXHRcdFx0YXJnLnRpbWVzdGFtcCA9IHRoaXMuY2xvY2subm93KCk7XG5cdFx0fVxuXHRcdGxldCBldmVudCA9IG5ldyBldmVudGlmeS5FdmVudFZhcmlhYmxlKCk7XG5cdFx0dGhpcy5fX3VwZGF0ZV9ldmVudHMuc2V0KGFyZy50dW5uZWwsIGV2ZW50KTtcblx0XHRsZXQgcHJvbWlzZSA9IGV2ZW50aWZ5Lm1ha2VQcm9taXNlKGV2ZW50LCB2YWwgPT4gKHZhbCAhPSB1bmRlZmluZWQpKTtcblx0XHR0aGlzLl9fdXBkYXRlKGFyZyk7XG5cdFx0cmV0dXJuIHByb21pc2U7XG5cdH1cblxuXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXHRcdENPUkUgVVBEQVRFIFBST0NFU1NJTkdcblxuXHQqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblx0Lypcblx0XHRkbyBub3Qgb3ZlcnJpZGVcblx0XHRoYW5kbGUgaW5jb21pbmcgY2hhbmdlIGV2ZW50XG5cdFx0ZUFyZyA9IHt2ZWN0b3I6dmVjdG9yLCByYW5nZTpyYW5nZSwgbGl2ZTp0cnVlfVxuXG5cdFx0c3ViY2xhc3NlcyBtYXkgc3BlY2lhbGlzZSBiZWhhdmlvdXIgYnkgb3ZlcnJpZGluZ1xuXHRcdG9uVmVjdG9yQ2hhbmdlXG5cblx0Ki9cblx0X19oYW5kbGVFdmVudChhcmcpIHtcblx0XHRsZXQge1xuXHRcdFx0cmFuZ2UsXG5cdFx0XHRsaXZlID0gdHJ1ZSxcblx0XHRcdC4uLnJlc3Rcblx0XHR9ID0gYXJnO1xuXHRcdC8vIGNvcHkgcmFuZ2Ugb2JqZWN0XG5cdFx0aWYgKHJhbmdlICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0cmFuZ2UgPSBbcmFuZ2VbMF0sIHJhbmdlWzFdXTtcblx0XHR9XG5cdFx0Ly8gbmV3IGFyZyBvYmplY3Rcblx0XHRsZXQgX2FyZyA9IHtcblx0XHRcdHJhbmdlLFxuXHRcdFx0bGl2ZSxcblx0XHRcdC4uLnJlc3QsXG5cdFx0fTtcblx0XHRfYXJnID0gdGhpcy5vblVwZGF0ZVN0YXJ0KF9hcmcpO1xuXHRcdGlmIChfYXJnICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX19wcm9jZXNzKF9hcmcpO1xuXHRcdH1cblx0fTtcblxuXHQvKlxuXHRcdGRvIG5vdCBvdmVycmlkZVxuXHRcdGhhbmRsZSB0aW1lb3V0XG5cdCovXG5cdF9faGFuZGxlVGltZW91dChub3csIHZlY3Rvcikge1xuXHRcdHRoaXMuX19wcm9jZXNzKHsuLi50aGlzLm9uUmFuZ2VWaW9sYXRpb24odmVjdG9yKX0pO1xuXHR9XG5cblx0Lypcblx0XHRjb3JlIHByb2Nlc3Npbmcgc3RlcCBhZnRlciBjaGFuZ2UgZXZlbnQgb3IgdGltZW91dFxuXHRcdGFzc2lnbmVzIHRoZSBpbnRlcm5hbCB2ZWN0b3Jcblx0Ki9cblx0X19wcm9jZXNzKGFyZykge1xuXHRcdGxldCB7XG5cdFx0XHRyYW5nZSxcblx0XHRcdHBvc2l0aW9uLFxuXHRcdFx0dmVsb2NpdHksXG5cdFx0XHRhY2NlbGVyYXRpb24sXG5cdFx0XHR0aW1lc3RhbXAsXG5cdFx0XHRsaXZlPXRydWUsXG5cdFx0XHQuLi5yZXN0XG5cdFx0fSA9IGFyZztcblxuXG5cdFx0Ly8gdXBkYXRlIHJhbmdlXG5cdFx0bGV0IHJhbmdlX2NoYW5nZSA9IGZhbHNlO1xuXHRcdGlmIChyYW5nZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBbbG93LCBoaWdoXSA9IHJhbmdlO1xuXHRcdFx0aWYgKGxvdyA8IGhpZ2gpIHtcblx0XHRcdFx0aWYgKGxvdyAhPSB0aGlzLl9fcmFuZ2VbMF0gfHwgaGlnaCAhPSB0aGlzLl9fcmFuZ2VbMV0pIHtcblx0XHRcdFx0XHR0aGlzLl9fcmFuZ2UgPSBbbG93LCBoaWdoXTtcblx0XHRcdFx0XHRyYW5nZSA9IFtsb3csIGhpZ2hdO1xuXHRcdFx0XHRcdHJhbmdlX2NoYW5nZSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgdmVjdG9yXG5cdFx0bGV0IHZlY3Rvcjtcblx0XHRsZXQgdmVjdG9yX2NoYW5nZSA9IGZhbHNlO1xuXHRcdGxldCBub3cgPSB0aGlzLmNsb2NrLm5vdygpO1xuXG5cdFx0Ly8gbWFrZSBzdXJlIHZlY3RvciBpcyBjb25zaXN0ZW50IHdpdGggcmFuZ2Vcblx0XHRpZiAocG9zaXRpb24gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHQvLyB2ZWN0b3IgY2hhbmdlXG5cdFx0XHR2ZWN0b3IgPSB7cG9zaXRpb24sIHZlbG9jaXR5LCBhY2NlbGVyYXRpb24sIHRpbWVzdGFtcH07XG5cdFx0XHQvLyBtYWtlIHN1cmUgdmVjdG9yIGlzIGNvbnNpc3RlbnQgd2l0aCByYW5nZVxuXHRcdFx0dmVjdG9yID0gY2hlY2tSYW5nZShsaXZlLCBub3csIHZlY3RvciwgdGhpcy5fX3JhbmdlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gdGhlcmUgaXMgbm8gdmVjdG9yIGNoYW5nZSwgYnV0IGlmIHJhbmdlIHdhcyBjaGFuZ2VkLFxuXHRcdFx0Ly8gdGhlIGN1cnJlbnQgdmVjdG9yIG11c3QgYmUgY2hlY2tlZCBmb3IgbmV3IHJhbmdlLlxuXHRcdFx0aWYgKHJhbmdlX2NoYW5nZSkge1xuXHRcdFx0XHR2ZWN0b3IgPSBjaGVja1JhbmdlKGZhbHNlLCBub3csIHRoaXMuX192ZWN0b3IsIHRoaXMuX19yYW5nZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHZlY3RvciAhPSB1bmRlZmluZWQpIHtcblx0XHRcdC8vIHVwZGF0ZSB2ZWN0b3Jcblx0XHRcdGlmICh0aGlzLl9fdmVjdG9yICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR2ZWN0b3JfY2hhbmdlID0gIW1vdGlvbnV0aWxzLmVxdWFsVmVjdG9ycyh2ZWN0b3IsIHRoaXMuX192ZWN0b3IpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmVjdG9yX2NoYW5nZSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodmVjdG9yX2NoYW5nZSkge1xuXHRcdFx0XHQvLyBzYXZlIG9sZCB2ZWN0b3Jcblx0XHRcdFx0dGhpcy5fX29sZF92ZWN0b3IgPSB0aGlzLl9fdmVjdG9yO1xuXHRcdFx0XHQvLyB1cGRhdGUgdmVjdG9yXG5cdFx0XHRcdHRoaXMuX192ZWN0b3IgPSB2ZWN0b3I7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IF9hcmc7XG5cdFx0aWYgKHJhbmdlX2NoYW5nZSAmJiB2ZWN0b3JfY2hhbmdlKSB7XG5cdFx0XHRfYXJnID0ge3JhbmdlLCAuLi52ZWN0b3IsIGxpdmUsIC4uLnJlc3R9O1xuXHRcdH0gZWxzZSBpZiAocmFuZ2VfY2hhbmdlKSB7XG5cdFx0XHRfYXJnID0ge3JhbmdlLCBsaXZlLCAuLi5yZXN0fTtcblx0XHR9IGVsc2UgaWYgKHZlY3Rvcl9jaGFuZ2UpIHtcblx0XHRcdF9hcmcgPSB7Li4udmVjdG9yLCBsaXZlLCAuLi5yZXN0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0X2FyZyA9IHtsaXZlLCAuLi5yZXN0fTtcblx0XHR9XG5cblx0XHQvLyB0cmlnZ2VyIGV2ZW50c1xuXHRcdHRoaXMuX19yZWFkeS52YWx1ZSA9IHRydWU7XG5cdFx0dGhpcy5fX2Rpc3BhdGNoRXZlbnRzKF9hcmcsIHJhbmdlX2NoYW5nZSwgdmVjdG9yX2NoYW5nZSk7XG5cdFx0Ly8gcmVuZXcgdGltZW91dFxuXHRcdGlmICh0aGlzLl9fb3B0aW9ucy50aW1lb3V0KSB7XG5cdFx0XHR0aGlzLl9fcmVuZXdUaW1lb3V0KCk7XG5cdFx0fVxuXHRcdC8vIHJlbGVhc2UgdXBkYXRlIHByb21pc2VzXG5cdFx0aWYgKF9hcmcudHVubmVsICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGV2ZW50ID0gdGhpcy5fX3VwZGF0ZV9ldmVudHMuZ2V0KF9hcmcudHVubmVsKTtcblx0XHRcdGlmIChldmVudCkge1xuXHRcdFx0XHR0aGlzLl9fdXBkYXRlX2V2ZW50cy5kZWxldGUoX2FyZy50dW5uZWwpO1xuXHRcdFx0XHRkZWxldGUgX2FyZy50dW5uZWw7XG5cdFx0XHRcdGV2ZW50LnZhbHVlID0gX2FyZztcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gVE9ET1xuXHRcdC8vIHNpbmNlIGV4dGVybmFscHJvdmlkZXIgZG9lcyBub3Qgc3VwcG9ydCB0dW5uZWwgeWV0XG5cdFx0Ly8gZnJlZSBhbGwgcmVtYWluaW5nIHByb21pc2VzXG5cdFx0Zm9yIChsZXQgZXZlbnQgb2YgdGhpcy5fX3VwZGF0ZV9ldmVudHMudmFsdWVzKCkpIHtcblx0XHRcdGV2ZW50LnZhbHVlID0ge307XG5cdFx0fVxuXHRcdHRoaXMub25VcGRhdGVEb25lKF9hcmcpO1xuXHRcdHJldHVybiBfYXJnO1xuXHR9O1xuXG5cdC8qXG5cdFx0cHJvY2VzcyBhIG5ldyB2ZWN0b3IgYXBwbGllZCBpbiBvcmRlciB0byB0cmlnZ2VyIGV2ZW50c1xuXHRcdG92ZXJyaWRpbmcgdGhpcyBpcyBvbmx5IG5lY2Vzc2FyeSBpZiBleHRlcm5hbCBjaGFuZ2UgZXZlbnRzXG5cdFx0bmVlZCB0byBiZSBzdXBwcmVzc2VkLFxuXHQqL1xuXHRfX2Rpc3BhdGNoRXZlbnRzKGFyZywgcmFuZ2VfY2hhbmdlLCB2ZWN0b3JfY2hhbmdlKSB7XG5cdFx0bGV0IHtcblx0XHRcdHJhbmdlLFxuXHRcdFx0cG9zaXRpb24sXG5cdFx0XHR2ZWxvY2l0eSxcblx0XHRcdGFjY2VsZXJhdGlvbixcblx0XHRcdHRpbWVzdGFtcFxuXHRcdH0gPSBhcmc7XG5cdFx0Ly8gdHJpZ2dlciB0aW1pbmdzcmMgZXZlbnRzXG5cdFx0dGhpcy5ldmVudGlmeVRyaWdnZXIoXCJ0aW1pbmdzcmNcIiwgYXJnKTtcblx0XHQvLyB0cmlnZ2VyIHB1YmxpYyBjaGFuZ2UgZXZlbnRzXG5cdFx0aWYgKHZlY3Rvcl9jaGFuZ2UpIHtcblx0XHRcdGxldCB2ZWN0b3IgPSB7cG9zaXRpb24sIHZlbG9jaXR5LCBhY2NlbGVyYXRpb24sIHRpbWVzdGFtcH07XG5cdFx0XHR0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcImNoYW5nZVwiLCB2ZWN0b3IpO1xuXHRcdH1cblx0XHRpZiAocmFuZ2VfY2hhbmdlKSB7XG5cdFx0XHR0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcInJhbmdlY2hhbmdlXCIsIHJhbmdlKTtcblx0XHR9XG5cdFx0Ly8gdHJpZ2dlciB0aW1ldXBkYXRlIGV2ZW50c1xuXHRcdHRoaXMuZXZlbnRpZnlUcmlnZ2VyKFwidGltZXVwZGF0ZVwiKTtcblx0XHRsZXQgbW92aW5nID0gbW90aW9udXRpbHMuaXNNb3ZpbmcodGhpcy5fX3ZlY3Rvcik7XG5cdFx0aWYgKG1vdmluZyAmJiB0aGlzLl9fdGlkID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuX190aWQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHNlbGYuZXZlbnRpZnlUcmlnZ2VyKFwidGltZXVwZGF0ZVwiKTtcblx0XHRcdH0sIDIwMCk7XG5cdFx0fSBlbHNlIGlmICghbW92aW5nICYmIHRoaXMuX190aWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX190aWQpO1xuXHRcdFx0dGhpcy5fX3RpZCA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH07XG5cblxuXHQvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblx0XHRTVUJDTEFTUyBNQVkgT1ZFUlJJREVcblxuXHQqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblx0Lypcblx0XHRtYXkgYmUgb3ZlcnJpZGRlblxuXHQqL1xuXHRvblJhbmdlVmlvbGF0aW9uKHZlY3Rvcikge3JldHVybiB2ZWN0b3I7fTtcblxuXHQvKlxuXHRcdG1heSBiZSBvdmVycmlkZGVuXG5cdCovXG5cdG9uVXBkYXRlU3RhcnQoYXJnKSB7cmV0dXJuIGFyZzt9O1xuXG5cdC8qXG5cdFx0bWF5IGJlIG92ZXJyaWRkZW5cblx0Ki9cblx0b25VcGRhdGVEb25lKGFyZykge307XG5cblxuXHQvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblx0XHRUSU1FT1VUU1xuXG5cdCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXHQvKlxuXHRcdHJlbmV3IHRpbWVvdXQgaXMgY2FsbGVkIGR1cmluZyBldmVyeSBwcm9jZXNzaW5nIHN0ZXBcblx0XHRpbiBvcmRlciB0byByZWNhbGN1bGF0ZSB0aW1lb3V0cy5cblxuXHRcdC0gb3B0aW9uYWwgdmVjdG9yIC0gZGVmYXVsdCBpcyBvd24gdmVjdG9yXG5cdFx0LSBvcHRpb25hbCByYW5nZSAtIGRlZmF1bHQgaXMgb3duIHJhbmdlXG5cdCovXG5cdF9fcmVuZXdUaW1lb3V0KHZlY3RvciwgcmFuZ2UpIHtcblx0XHR0aGlzLl9fdGltZW91dC5jbGVhcigpO1xuXHRcdGxldCB0aW1lb3V0X3ZlY3RvciA9IHRoaXMuX19jYWxjdWxhdGVUaW1lb3V0VmVjdG9yKHZlY3RvciwgcmFuZ2UpO1xuXHRcdGlmICh0aW1lb3V0X3ZlY3RvciA9PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dGhpcy5fX3RpbWVvdXQuc2V0VGltZW91dCh0aW1lb3V0X3ZlY3Rvci50aW1lc3RhbXAsIHRpbWVvdXRfdmVjdG9yKTtcblx0fTtcblxuXG5cdC8qXG5cdFx0Y2FsY3VsYXRlIGEgdmVjdG9yIHRoYXQgd2lsbCBiZSBkZWxpdmVyZWQgdG8gX3Byb2Nlc3MoKS5cblx0XHR0aGUgdGltZXN0YW1wIGluIHRoZSB2ZWN0b3IgZGV0ZXJtaW5lcyB3aGVuIGl0IGlzIGRlbGl2ZXJlZC5cblxuXHRcdC0gb3B0aW9uYWwgdmVjdG9yIC0gZGVmYXVsdCBpcyBvd24gdmVjdG9yXG5cdFx0LSBvcHRpb25hbCByYW5nZSAtIGRlZmF1bHQgaXMgb3duIHJhbmdlXG5cdCovXG5cdF9fY2FsY3VsYXRlVGltZW91dFZlY3Rvcih2ZWN0b3IsIHJhbmdlKSB7XG5cdFx0dmVjdG9yID0gdmVjdG9yIHx8IHRoaXMuX192ZWN0b3I7XG5cdFx0cmFuZ2UgPSByYW5nZSB8fCB0aGlzLl9fcmFuZ2U7XG5cdFx0bGV0IG5vdyA9IHRoaXMuY2xvY2subm93KCk7XG5cdFx0bGV0IG5vd192ZWN0b3IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodmVjdG9yLCBub3cpO1xuXHRcdGxldCBbZGVsdGEsIHBvc10gPSBtb3Rpb251dGlscy5jYWxjdWxhdGVEZWx0YShub3dfdmVjdG9yLCByYW5nZSk7XG5cdFx0aWYgKGRlbHRhID09IHVuZGVmaW5lZCB8fCBkZWx0YSA9PSBJbmZpbml0eSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQvLyB2ZWN0b3Igd2hlbiByYW5nZSByZXN0cmljdGlvbiB3aWxsIGJlIHJlYWNoZWRcblx0XHRsZXQgdGltZW91dF92ZWN0b3IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodmVjdG9yLCBub3cgKyBkZWx0YSk7XG5cdFx0Ly8gcG9zc2libHkgYXZvaWQgcm91bmRpbmcgZXJyb3JzXG5cdFx0dGltZW91dF92ZWN0b3IucG9zaXRpb24gPSBwb3M7XG5cdFx0cmV0dXJuIHRpbWVvdXRfdmVjdG9yO1xuXHR9O1xuXG5cblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cdFx0VElNSU5HU1JDXG5cblx0KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cdC8qXG5cblx0XHR0aW1pbmdzcmMgcHJvcGVydHkgYW5kIHN3aXRjaGluZyBvbiBhc3NpZ25tZW50XG5cblx0Ki9cblx0X19jbGVhcl90aW1pbmdzcmMoKSB7XG5cdFx0Ly8gY2xlYXIgdGltaW5nc3JjXG5cdFx0aWYgKHRoaXMuX190aW1pbmdzcmMgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpZiAodGhpcy5fX3RpbWluZ3NyYyBpbnN0YW5jZW9mIFRpbWluZ09iamVjdCkge1xuXHRcdFx0XHR0aGlzLl9fdGltaW5nc3JjLm9mZih0aGlzLl9fc3ViKTtcblx0XHRcdFx0dGhpcy5fX3N1YiA9IHVuZGVmaW5lZDtcblx0XHRcdFx0dGhpcy5fX3RpbWluZ3NyYyA9IHVuZGVmaW5lZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIHByb3ZpZGVyXG5cdFx0XHRcdHRoaXMuX190aW1pbmdzcmMuY2xvc2UoKTtcblx0XHRcdFx0dGhpcy5fX3RpbWluZ3NyYyA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRfX3NldF90aW1pbmdzcmModGltaW5nc3JjLCBvcHRpb25zKSB7XG5cdFx0Ly8gc2V0IHRpbWluZ3NyY1xuXHRcdGxldCBjYWxsYmFjayA9IHRoaXMuX19oYW5kbGVFdmVudC5iaW5kKHRoaXMpO1xuXHRcdGlmICh0aW1pbmdzcmMgaW5zdGFuY2VvZiBUaW1pbmdPYmplY3QpIHtcblx0XHRcdC8vIHRpbWluZ3NyY1xuXHRcdFx0dGhpcy5fX3RpbWluZ3NyYyA9IHRpbWluZ3NyYztcblx0XHRcdHRoaXMuX19zdWIgPSB0aGlzLl9fdGltaW5nc3JjLm9uKFwidGltaW5nc3JjXCIsIGNhbGxiYWNrKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcHJvdmlkZXJcblx0XHRcdGlmICh0aW1pbmdzcmMgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIEludGVybmFsIFByb3ZpZGVyXG5cdFx0XHRcdHRoaXMuX190aW1pbmdzcmMgPSBuZXcgSW50ZXJuYWxQcm92aWRlcihjYWxsYmFjaywgb3B0aW9ucyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBFeHRlcm5hbCBQcm92aWRlclxuXHRcdFx0XHR0aGlzLl9fdGltaW5nc3JjID0gbmV3IEV4dGVybmFsUHJvdmlkZXIodGltaW5nc3JjLCBjYWxsYmFjaywgb3B0aW9ucyk7XG5cdFx0XHR9XG5cdFx0XHQvLyBlbXVsYXRpbmcgaW5pdGlhbCBldmVudCBmcm9tIHByb3ZpZGVyLCBjYXVzaW5nXG5cdFx0XHQvLyB0aGlzIHRpbWluZ29iamVjdCB0byBpbml0aWFsaXNlXG5cdFx0XHRpZiAodGhpcy5fX3RpbWluZ3NyYy5pc1JlYWR5KCkpIHtcblx0XHRcdFx0bGV0IGFyZyA9IHtcblx0XHRcdFx0XHRyYW5nZTogdGhpcy5fX3RpbWluZ3NyYy5yYW5nZSxcblx0XHRcdFx0XHQuLi50aGlzLl9fdGltaW5nc3JjLnZlY3Rvcixcblx0XHRcdFx0XHRsaXZlOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGdlbmVyYXRlIGluaXRpYWwgZXZlbnRcblx0XHRcdFx0Y2FsbGJhY2soYXJnKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXQgdGltaW5nc3JjICgpIHtyZXR1cm4gdGhpcy5fX3RpbWluZ3NyYzt9O1xuXHRzZXQgdGltaW5nc3JjKHRpbWluZ3NyYykge1xuXHRcdHRoaXMuX19jbGVhcl90aW1pbmdzcmMoKTtcblx0XHR0aGlzLl9fc2V0X3RpbWluZ3NyYyh0aW1pbmdzcmMpO1xuXHR9XG5cbn1cblxuZXZlbnRpZnkuZXZlbnRpZnlQcm90b3R5cGUoVGltaW5nT2JqZWN0LnByb3RvdHlwZSk7XG5cbmV4cG9ydCBkZWZhdWx0IFRpbWluZ09iamVjdDtcblxuXG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuXG4vKlxuXHRTS0VXIENPTlZFUlRFUlxuXG5cdFNrZXdpbmcgdGhlIHRpbWVsaW5lIGJ5IDIgbWVhbnMgdGhhdCB0aGUgdGltZWxpbmUgcG9zaXRpb24gMCBvZiB0aGUgdGltaW5nc3JjIGJlY29tZXMgcG9zaXRpb24gMiBvZiBDb252ZXJ0ZXIuXG5cbiovXG5cblxuaW1wb3J0IFRpbWluZ09iamVjdCBmcm9tICcuL3RpbWluZ29iamVjdC5qcyc7XG5cblxuY2xhc3MgU2tld0NvbnZlcnRlciBleHRlbmRzIFRpbWluZ09iamVjdCB7XG5cblx0Y29uc3RydWN0b3IgKHRpbWluZ3NyYywgc2tldywgb3B0aW9ucykge1xuXHRcdHN1cGVyKHRpbWluZ3NyYywgb3B0aW9ucyk7XG5cdFx0dGhpcy5fc2tldyA9IHNrZXc7XG4gICAgICAgIHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJza2V3Y2hhbmdlXCIsIHtpbml0OnRydWV9KTtcblx0fVxuXG4gICAgLy8gZXh0ZW5kXG4gICAgZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpIHtcbiAgICAgICAgaWYgKG5hbWUgPT0gXCJza2V3Y2hhbmdlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5fc2tld107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3VwZXIuZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpXG4gICAgICAgIH1cbiAgICB9XG5cblx0Ly8gb3ZlcnJpZGVzXG5cdG9uVXBkYXRlU3RhcnQoYXJnKSB7XG4gICAgICAgIGlmIChhcmcucmFuZ2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhcmcucmFuZ2VbMF0gKz0gdGhpcy5fc2tldztcbiAgICAgICAgICAgIGFyZy5yYW5nZVsxXSArPSB0aGlzLl9za2V3O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcmcucG9zaXRpb24gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhcmcucG9zaXRpb24gKz0gdGhpcy5fc2tldztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJnO1xuXHR9O1xuXG5cdC8vIG92ZXJyaWRlc1xuXHR1cGRhdGUoYXJnKSB7XG4gICAgICAgIGlmIChhcmcucG9zaXRpb24gIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhcmcucG9zaXRpb24gLT0gdGhpcy5fc2tldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnJhbmdlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IFtsb3csIGhpZ2hdID0gYXJnLnJhbmdlO1xuICAgICAgICAgICAgYXJnLnJhbmdlID0gW2xvdyAtIHRoaXMuX3NrZXcsIGhpZ2ggLSB0aGlzLl9za2V3XTtcbiAgICAgICAgfVxuXHRcdHJldHVybiBzdXBlci51cGRhdGUoYXJnKTtcblx0fTtcblxuXHRnZXQgc2tldygpIHtyZXR1cm4gdGhpcy5fc2tldzt9O1xuXG5cdHNldCBza2V3KHNrZXcpIHtcbiAgICAgICAgaWYgKHNrZXcgIT0gdGhpcy5fc2tldykge1xuICAgICAgICAgICAgLy8gc2V0IHNrZXcgYW5kIGVtdWxhdGUgbmV3IGV2ZW50IGZyb20gdGltaW5nc3JjXG5cdFx0XHR0aGlzLl9za2V3ID0gc2tldztcblx0XHRcdHRoaXMuX19oYW5kbGVFdmVudCh7XG4gICAgICAgICAgICAgICAgLi4udGhpcy50aW1pbmdzcmMudmVjdG9yLFxuICAgICAgICAgICAgICAgIHJhbmdlOiB0aGlzLnRpbWluZ3NyYy5yYW5nZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcInNrZXdjaGFuZ2VcIiwgc2tldyk7XG4gICAgICAgIH1cblx0fVxufTtcblxuZXhwb3J0IGRlZmF1bHQgU2tld0NvbnZlcnRlcjtcbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG5cbi8qXG5cdERFTEFZIENPTlZFUlRFUlxuXG5cdERlbGF5IENvbnZlcnRlciBpbnRyb2R1Y2VzIGEgcG9zaXRpdmUgdGltZSBkZWxheSBvbiBhIHNvdXJjZSB0aW1pbmcgb2JqZWN0LlxuXG5cdEdlbmVyYWxseSAtIGlmIHRoZSBzb3VyY2UgdGltaW5nIG9iamVjdCBoYXMgc29tZSB2YWx1ZSBhdCB0aW1lIHQsXG5cdHRoZW4gdGhlIGRlbGF5Q29udmVydGVyIHdpbGwgcHJvdmlkZSB0aGUgc2FtZSB2YWx1ZSBhdCB0aW1lIHQgKyBkZWxheS5cblxuXHRTaW5jZSB0aGUgZGVsYXkgQ29udmVydGVyIGlzIGVmZmVjdGl2ZWx5IHJlcGxheWluZyBwYXN0IGV2ZW50cyBhZnRlciB0aGUgZmFjdCxcblx0aXQgaXMgbm90IExJVkUgYW5kIG5vdCBvcGVuIHRvIGludGVyYWN0aXZpdHkgKGkuZS4gdXBkYXRlKVxuXG4qL1xuXG5pbXBvcnQgVGltaW5nT2JqZWN0IGZyb20gJy4vdGltaW5nb2JqZWN0LmpzJztcbmltcG9ydCBUaW1lb3V0IGZyb20gJy4uL3V0aWwvdGltZW91dC5qcyc7XG5cblxuY2xhc3MgRGVsYXlDb252ZXJ0ZXIgZXh0ZW5kcyBUaW1pbmdPYmplY3Qge1xuXHRjb25zdHJ1Y3RvciAodGltaW5nT2JqZWN0LCBkZWxheSkge1xuXHRcdGlmIChkZWxheSA8IDApIHt0aHJvdyBuZXcgRXJyb3IgKFwibmVnYXRpdmUgZGVsYXkgbm90IHN1cHBvcnRlZFwiKTt9XG5cdFx0aWYgKGRlbGF5ID09PSAwKSB7dGhyb3cgbmV3IEVycm9yIChcInplcm8gZGVsYXkgbWFrZXMgZGVsYXljb252ZXJ0ZXIgcG9pbnRsZXNzXCIpO31cblx0XHRzdXBlcih0aW1pbmdPYmplY3QpO1xuXHRcdC8vIGZpeGVkIGRlbGF5XG5cdFx0dGhpcy5fZGVsYXkgPSBkZWxheTtcblx0XHQvLyBidWZmZXJcblx0XHR0aGlzLl9idWZmZXIgPSBbXTtcblx0XHQvLyB0aW1lb3V0aWRcblx0XHR0aGlzLl90aW1lb3V0ID0gbmV3IFRpbWVvdXQodGhpcywgdGhpcy5fX2hhbmRsZURlbGF5ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJkZWxheWNoYW5nZVwiLCB7aW5pdDp0cnVlfSk7XG5cdH07XG5cbiAgICAvLyBleHRlbmRcbiAgICBldmVudGlmeUluaXRFdmVudEFyZ3MobmFtZSkge1xuICAgICAgICBpZiAobmFtZSA9PSBcImRlbGF5Y2hhbmdlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5fZGVsYXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHN1cGVyLmV2ZW50aWZ5SW5pdEV2ZW50QXJncyhuYW1lKVxuICAgICAgICB9XG4gICAgfVxuXG5cdC8vIG92ZXJyaWRlc1xuXHRvblVwZGF0ZVN0YXJ0KGFyZykge1xuXHRcdC8qXG5cdFx0XHRWZWN0b3IncyB0aW1lc3RhbXAgYWx3YXlzIHRpbWUtc2hpZnRlZCAoYmFjay1kYXRlZCkgYnkgZGVsYXlcblxuXHRcdFx0Tm9ybWFsIG9wZXJhdGlvbiBpcyB0byBkZWxheSBldmVyeSBpbmNvbWluZyB2ZWN0b3IgdXBkYXRlLlxuXHRcdFx0VGhpcyBpbXBsaWVzIHJldHVybmluZyBudWxsIHRvIGFib3J0IGZ1cnRoZXIgcHJvY2Vzc2luZyBhdCB0aGlzIHRpbWUsXG5cdFx0XHRhbmQgaW5zdGVhZCB0cmlnZ2VyIGEgbGF0ZXIgY29udGludWF0aW9uLlxuXG5cdFx0XHRIb3dldmVyLCBkZWxheSBpcyBjYWxjdWxhdGVkIGJhc2VkIG9uIHRoZSB0aW1lc3RhbXAgb2YgdGhlIHZlY3RvciAoYWdlKSwgbm90IHdoZW4gdGhlIHZlY3RvciBpc1xuXHRcdFx0cHJvY2Vzc2VkIGluIHRoaXMgbWV0aG9kLiBTbywgZm9yIHNtYWxsIHNtYWxsIGRlbGF5cyB0aGUgYWdlIG9mIHRoZSB2ZWN0b3IgY291bGQgYWxyZWFkeSBiZVxuXHRcdFx0Z3JlYXRlciB0aGFuIGRlbGF5LCBpbmRpY2F0aW5nIHRoYXQgdGhlIHZlY3RvciBpcyBpbW1lZGlhdGVseSB2YWxpZCBhbmQgZG8gbm90IHJlcXVpcmUgZGVsYXllZCBwcm9jZXNzaW5nLlxuXG5cdFx0XHRUaGlzIGlzIHBhcnRpY3VsYXJseSB0cnVlIGZvciB0aGUgZmlyc3QgdmVjdG9yLCB3aGljaCBtYXkgYmUgb2xkLlxuXG5cdFx0XHRTbyB3ZSBnZW5lcmFsbHkgY2hlY2sgdGhlIGFnZSB0byBmaWd1cmUgb3V0IHdoZXRoZXIgdG8gYXBwbHkgdGhlIHZlY3RvciBpbW1lZGlhdGVseSBvciB0byBkZWxheSBpdC5cblx0XHQqL1xuXG5cdFx0dGhpcy5fYnVmZmVyLnB1c2goYXJnKTtcblx0XHQvLyBpZiB0aW1lb3V0IGZvciBuZXh0IGFscmVhZHkgZGVmaW5lZCwgbm90aGluZyB0byBkb1xuXHRcdGlmICghdGhpcy5fdGltZW91dC5pc1NldCgpKSB7XG5cdFx0XHR0aGlzLl9faGFuZGxlRGVsYXllZCgpO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH07XG5cblx0X19oYW5kbGVEZWxheWVkKCkge1xuXHRcdC8vIHJ1biB0aHJvdWdoIGJ1ZmZlciBhbmQgYXBwbHkgdmVjdG9ycyB0aGF0IGFyZSBkdWVcblx0XHRsZXQgbm93ID0gdGhpcy5jbG9jay5ub3coKTtcblx0XHRsZXQgYXJnLCBkdWU7XG5cdFx0d2hpbGUgKHRoaXMuX2J1ZmZlci5sZW5ndGggPiAwKSB7XG5cdFx0XHRkdWUgPSB0aGlzLl9idWZmZXJbMF0udGltZXN0YW1wICsgdGhpcy5fZGVsYXk7XG5cdFx0XHRpZiAobm93IDwgZHVlKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXJnID0gdGhpcy5fYnVmZmVyLnNoaWZ0KCk7XG5cdFx0XHRcdC8vIGFwcGx5XG5cdFx0XHRcdGFyZy50aW1lc3RhbXAgPSBkdWU7XG5cdFx0XHRcdHRoaXMuX19wcm9jZXNzKGFyZyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIHNldCBuZXcgdGltZW91dFxuXHRcdGlmICh0aGlzLl9idWZmZXIubGVuZ3RoID4gMCkge1xuXHRcdFx0ZHVlID0gdGhpcy5fYnVmZmVyWzBdLnRpbWVzdGFtcCArIHRoaXMuX2RlbGF5O1xuXHRcdFx0dGhpcy5fdGltZW91dC5zZXRUaW1lb3V0KGR1ZSk7XG5cdFx0fVxuXHR9O1xuXG5cdHVwZGF0ZShhcmcpIHtcblx0XHQvLyBVcGRhdGVzIGFyZSBwcm9oaWJpdGVkIG9uIGRlbGF5ZWQgdGltaW5nb2JqZWN0c1xuXHRcdHRocm93IG5ldyBFcnJvciAoXCJ1cGRhdGUgaXMgbm90IGxlZ2FsIG9uIGRlbGF5ZWQgKG5vbi1saXZlKSB0aW1pbmdvYmplY3RcIik7XG5cdH07XG5cbiAgICBnZXQgZGVsYXkoKSB7cmV0dXJuIHRoaXMuX2RlbGF5O307XG5cblx0c2V0IGRlbGF5KGRlbGF5KSB7XG4gICAgICAgIGlmIChkZWxheSAhPSB0aGlzLl9kZWxheSkge1xuICAgICAgICAgICAgLy8gc2V0IGRlbGF5IGFuZCBlbXVsYXRlIG5ldyBldmVudCBmcm9tIHRpbWluZ3NyY1xuICAgICAgICAgICAgdGhpcy5fZGVsYXkgPSBkZWxheTtcbiAgICAgICAgICAgIHRoaXMuX3RpbWVvdXQuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX19oYW5kbGVEZWxheWVkKCk7XG4gICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcImRlbGF5Y2hhbmdlXCIsIGRlbGF5KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRGVsYXlDb252ZXJ0ZXI7XG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuLypcblx0U0NBTEUgQ09OVkVSVEVSXG5cblx0U2NhbGluZyBieSBhIGZhY3RvciAyIG1lYW5zIHRoYXQgdmFsdWVzIG9mIHRoZSB0aW1pbmcgb2JqZWN0IChwb3NpdGlvbiwgdmVsb2NpdHkgYW5kIGFjY2VsZXJhdGlvbikgYXJlIG11bHRpcGxpZWQgYnkgdHdvLlxuXHRGb3IgZXhhbXBsZSwgaWYgdGhlIHRpbWluZyBvYmplY3QgcmVwcmVzZW50cyBhIG1lZGlhIG9mZnNldCBpbiBzZWNvbmRzLCBzY2FsaW5nIGl0IHRvIG1pbGxpc2Vjb25kcyBpbXBsaWVzIGEgc2NhbGluZyBmYWN0b3Igb2YgMTAwMC5cblxuKi9cblxuaW1wb3J0IFRpbWluZ09iamVjdCBmcm9tICcuL3RpbWluZ29iamVjdC5qcyc7XG5cblxuY2xhc3MgU2NhbGVDb252ZXJ0ZXIgZXh0ZW5kcyBUaW1pbmdPYmplY3Qge1xuICAgIGNvbnN0cnVjdG9yICh0aW1pbmdzcmMsIGZhY3Rvcikge1xuXHRcdHN1cGVyKHRpbWluZ3NyYyk7XG5cdFx0dGhpcy5fZmFjdG9yID0gZmFjdG9yO1xuICAgICAgICB0aGlzLmV2ZW50aWZ5RGVmaW5lKFwic2NhbGVjaGFuZ2VcIiwge2luaXQ6dHJ1ZX0pO1xuXHR9O1xuXG4gICAgLy8gZXh0ZW5kXG4gICAgZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpIHtcbiAgICAgICAgaWYgKG5hbWUgPT0gXCJzY2FsZWNoYW5nZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gW3RoaXMuX2ZhY3Rvcl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3VwZXIuZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpXG4gICAgICAgIH1cbiAgICB9XG5cblx0Ly8gb3ZlcnJpZGVzXG4gICAgb25VcGRhdGVTdGFydChhcmcpIHtcbiAgICAgICAgaWYgKGFyZy5yYW5nZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGFyZy5yYW5nZSA9IFthcmcucmFuZ2VbMF0qdGhpcy5fZmFjdG9yLCBhcmcucmFuZ2VbMV0qdGhpcy5fZmFjdG9yXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXJnLnBvc2l0aW9uICo9IHRoaXMuX2ZhY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnZlbG9jaXR5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXJnLnZlbG9jaXR5ICo9IHRoaXMuX2ZhY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLmFjY2VsZXJhdGlvbiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGFyZy5hY2NlbGVyYXRpb24gKj0gdGhpcy5fZmFjdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcmc7XG4gICAgfVxuXG5cdHVwZGF0ZShhcmcpIHtcblx0XHRpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXJnLnBvc2l0aW9uIC89IHRoaXMuX2ZhY3RvcjtcbiAgICAgICAgfVxuXHRcdGlmIChhcmcudmVsb2NpdHkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhcmcudmVsb2NpdHkgLz0gdGhpcy5fZmFjdG9yO1xuICAgICAgICB9XG5cdFx0aWYgKGFyZy5hY2NlbGVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhcmcuYWNjZWxlcmF0aW9uIC89IHRoaXMuX2ZhY3RvcjtcbiAgICAgICAgfVxuXHRcdHJldHVybiBzdXBlci51cGRhdGUoYXJnKTtcblx0fTtcblxuICAgIGdldCBzY2FsZSgpIHtyZXR1cm4gdGhpcy5fZmFjdG9yO307XG5cbiAgICBzZXQgc2NhbGUoZmFjdG9yKSB7XG4gICAgICAgIGlmIChmYWN0b3IgIT0gdGhpcy5fZmFjdG9yKSB7XG4gICAgICAgICAgICAvLyBzZXQgc2NhbGUgYW5kIGVtdWxhdGUgbmV3IGV2ZW50IGZyb20gdGltaW5nc3JjXG4gICAgICAgICAgICB0aGlzLl9mYWN0b3IgPSBmYWN0b3I7XG4gICAgICAgICAgICB0aGlzLl9faGFuZGxlRXZlbnQoe1xuICAgICAgICAgICAgICAgIC4uLnRoaXMudGltaW5nc3JjLnZlY3RvcixcbiAgICAgICAgICAgICAgICByYW5nZTogdGhpcy50aW1pbmdzcmMucmFuZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5ldmVudGlmeVRyaWdnZXIoXCJzY2FsZWNoYW5nZVwiLCBmYWN0b3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0IGRlZmF1bHQgU2NhbGVDb252ZXJ0ZXI7XG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG5cbi8qXG5cdExPT1AgQ09OVkVSVEVSXG5cblx0VGhpcyBpcyBhIG1vZHVsbyB0eXBlIHRyYW5zZm9ybWF0aW9uIHdoZXJlIHRoZSBjb252ZXJ0ZXIgd2lsbCBiZSBsb29waW5nIHdpdGhpblxuXHRhIGdpdmVuIHJhbmdlLiBQb3RlbnRpYWxseSBvbmUgY291bGQgY3JlYXRlIGFuIGFzc29jaWF0ZWQgdGltaW5nIG9iamVjdCBrZWVwaW5nIHRyYWNrIG9mIHRoZVxuXHRsb29wIG51bWJlci5cbiovXG5cblxuaW1wb3J0IHtjYWxjdWxhdGVWZWN0b3J9IGZyb20gJy4uL3V0aWwvbW90aW9udXRpbHMuanMnO1xuaW1wb3J0IFRpbWluZ09iamVjdCBmcm9tICcuL3RpbWluZ29iamVjdC5qcyc7XG5cblxuLy8gb3Z2ZXJyaWRlIG1vZHVsbyB0byBiZWhhdmUgYmV0dGVyIGZvciBuZWdhdGl2ZSBudW1iZXJzXG5mdW5jdGlvbiBtb2QobiwgbSkge1xuXHRyZXR1cm4gKChuICUgbSkgKyBtKSAlIG07XG59O1xuXG5mdW5jdGlvbiB0cmFuc2Zvcm0oeCwgcmFuZ2UpIHtcblx0bGV0IHNrZXcgPSByYW5nZVswXTtcblx0bGV0IGxlbmd0aCA9IHJhbmdlWzFdIC0gcmFuZ2VbMF07XG5cdHJldHVybiBza2V3ICsgbW9kKHgtc2tldywgbGVuZ3RoKTtcbn1cblxuXG4vKlxuXHRMT09QIENPTlZFUlRFUlxuKi9cblxuY2xhc3MgTG9vcENvbnZlcnRlciBleHRlbmRzIFRpbWluZ09iamVjdCB7XG5cblx0Y29uc3RydWN0b3IodGltaW5nc3JjLCByYW5nZSkge1xuXHRcdHN1cGVyKHRpbWluZ3NyYywge3RpbWVvdXQ6dHJ1ZX0pO1xuXHRcdHRoaXMuX19yYW5nZSA9IHJhbmdlO1xuXHR9O1xuXG5cdHVwZGF0ZShhcmcpIHtcblx0XHQvLyByYW5nZSBjaGFuZ2UgLSBvbmx5IGEgbG9jYWwgb3BlcmF0aW9uXG5cdFx0aWYgKGFyZy5yYW5nZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdC8vIGltcGxlbWVudCBsb2NhbCByYW5nZSB1cGRhdGVcblx0XHRcdGxldCBbbG93LCBoaWdoXSA9IGFyZy5yYW5nZTtcblx0XHRcdGlmIChsb3cgPj0gaGlnaCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJpbGxlZ2FsIHJhbmdlXCIsIGFyZy5yYW5nZSlcblx0XHRcdH1cblx0XHRcdGlmIChsb3cgIT0gdGhpcy5fX3JhbmdlWzBdIHx8IGhpZ2ggIT0gdGhpcy5fX3JhbmdlWzFdKSB7XG5cdFx0XHRcdHRoaXMuX19yYW5nZSA9IFtsb3csIGhpZ2hdO1xuXHRcdFx0XHRsZXQgdmVjdG9yID0gdGhpcy50aW1pbmdzcmMucXVlcnkoKTtcblx0XHRcdFx0dmVjdG9yLnBvc2l0aW9uID0gdHJhbnNmb3JtKHZlY3Rvci5wb3NpdGlvbiwgdGhpcy5fX3JhbmdlKTtcblx0XHRcdFx0dGhpcy5fX3ZlY3RvciA9IHZlY3Rvcjtcblx0XHRcdFx0Ly8gdHJpZ2dlciB2ZWN0b3IgY2hhbmdlXG5cdFx0XHRcdGxldCBfYXJnID0ge3JhbmdlOiB0aGlzLl9fcmFuZ2UsIC4uLnRoaXMuX192ZWN0b3IsIGxpdmU6dHJ1ZX07XG5cdFx0XHRcdHRoaXMuX19kaXNwYXRjaEV2ZW50cyhfYXJnLCB0cnVlLCB0cnVlKTtcblx0XHRcdH1cblx0XHRcdGRlbGV0ZSBhcmcucmFuZ2U7XG5cdFx0fVxuXHRcdC8vIHZlY3RvciBjaGFuZ2Vcblx0XHRpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0Ly8gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvbiBvZiBwb3NpdGlvbiwgZnJvbSBsb29wZXJcblx0XHRcdC8vIGNvb3JkaW5hdGVzIHRvIHRpbWluZ3NyYyBjb29yZGluYXRlc1xuXHRcdFx0Ly8gcHJlc2VydmUgcmVsYXRpdmUgcG9zaXRpb24gZGlmZlxuXHRcdFx0bGV0IG5vdyA9IHRoaXMuY2xvY2subm93KCk7XG5cdFx0XHRsZXQgbm93X3ZlY3RvciA9IGNhbGN1bGF0ZVZlY3Rvcih0aGlzLnZlY3Rvciwgbm93KTtcblx0XHRcdGxldCBkaWZmID0gbm93X3ZlY3Rvci5wb3NpdGlvbiAtIGFyZy5wb3NpdGlvbjtcblx0XHRcdGxldCBub3dfdmVjdG9yX3NyYyA9IGNhbGN1bGF0ZVZlY3Rvcih0aGlzLnRpbWluZ3NyYy52ZWN0b3IsIG5vdyk7XG5cdFx0XHRhcmcucG9zaXRpb24gPSBub3dfdmVjdG9yX3NyYy5wb3NpdGlvbiAtIGRpZmY7XG5cdFx0fVxuXHRcdHJldHVybiBzdXBlci51cGRhdGUoYXJnKTtcblx0fTtcblxuXHQvLyBvdmVycmlkZXNcblx0b25SYW5nZVZpb2xhdGlvbih2ZWN0b3IpIHtcblx0XHQvLyB2ZWN0b3IgaXMgbW92aW5nXG5cdFx0aWYgKHZlY3Rvci5wb3NpdGlvbiA8PSB0aGlzLl9fcmFuZ2VbMF0pIHtcblx0XHRcdHZlY3Rvci5wb3NpdGlvbiA9IHRoaXMuX19yYW5nZVsxXTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuX19yYW5nZVsxXSA8PSB2ZWN0b3IucG9zaXRpb24pIHtcblx0XHRcdHZlY3Rvci5wb3NpdGlvbiA9IHRoaXMuX19yYW5nZVswXTtcblx0XHR9XG5cdFx0cmV0dXJuIHZlY3Rvcjtcblx0fTtcblxuXHQvLyBvdmVycmlkZXNcblx0b25VcGRhdGVTdGFydChhcmcpIHtcbiAgICAgICAgaWYgKGFyZy5yYW5nZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIGlnbm9yZSByYW5nZSBjaGFuZ2UgZnJvbSB0aW1pbmdzcmNcbiAgICAgICAgICAgIC8vIGluc3RlYWQsIGluc2lzdCB0aGF0IHRoaXMuX3JhbmdlIGlzIGNvcnJlY3RcbiAgICAgICAgICAgIGFyZy5yYW5nZSA9IHRoaXMuX19yYW5nZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuICAgICAgICBcdC8vIHZlY3RvciBjaGFuZ2VcbiAgICAgICAgXHRhcmcucG9zaXRpb24gPSB0cmFuc2Zvcm0oYXJnLnBvc2l0aW9uLCB0aGlzLl9fcmFuZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcmc7XG5cdH07XG5cbn1cbmV4cG9ydCBkZWZhdWx0IExvb3BDb252ZXJ0ZXI7XG5cbiIsIi8qXG5cdENvcHlyaWdodCAyMDE1IE5vcnV0IE5vcnRoZXJuIFJlc2VhcmNoIEluc3RpdHV0ZVxuXHRBdXRob3IgOiBJbmdhciBNw6ZobHVtIEFybnR6ZW5cblxuXHRUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuXHRUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuXHRpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcblx0dGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3Jcblx0KGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuXHRUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcblx0YnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2Zcblx0TUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuXHRHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuXHRZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2Vcblx0YWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG4vKlxuXG5cdFJBTkdFIENPTlZFUlRFUlxuXG5cdFRoZSBjb252ZXJ0ZXIgZW5mb3JjZSBhIHJhbmdlIG9uIHBvc2l0aW9uLlxuXG5cdEl0IG9ubHkgaGFzIGVmZmVjdCBpZiBnaXZlbiByYW5nZSBpcyBhIHJlc3RyaWN0aW9uIG9uIHRoZSByYW5nZSBvZiB0aGUgdGltaW5nc3JjLlxuXHRSYW5nZSBjb252ZXJ0ZXIgd2lsbCBwYXVzZSBvbiByYW5nZSBlbmRwb2ludHMgaWYgdGltaW5nc3JjIGxlYXZlcyB0aGUgcmFuZ2UuXG5cdFJhbmdlIGNvbnZlcnRlcnMgd2lsbCBjb250aW51ZSBtaXJyb3JpbmcgdGltaW5nc3JjIG9uY2UgaXQgY29tZXMgaW50byB0aGUgcmFuZ2UuXG4qL1xuXG5cbmltcG9ydCB7UmFuZ2VTdGF0ZSwgY29ycmVjdFJhbmdlU3RhdGUsIGNoZWNrUmFuZ2V9IGZyb20gJy4uL3V0aWwvbW90aW9udXRpbHMuanMnO1xuaW1wb3J0IFRpbWluZ09iamVjdCBmcm9tICcuL3RpbWluZ29iamVjdC5qcyc7XG5cblxuZnVuY3Rpb24gc3RhdGUoKSB7XG5cdHZhciBfc3RhdGUgPSBSYW5nZVN0YXRlLklOSVQ7XG5cdHZhciBfcmFuZ2UgPSBudWxsO1xuXHR2YXIgaXNfc3BlY2lhbF9zdGF0ZV9jaGFuZ2UgPSBmdW5jdGlvbiAob2xkX3N0YXRlLCBuZXdfc3RhdGUpIHtcblx0XHQvLyBvbmx5IHN0YXRlIGNoYW5nZXMgYmV0d2VlbiBJTlNJREUgYW5kIE9VVFNJREUqIGFyZSBzcGVjaWFsIHN0YXRlIGNoYW5nZXMuXG5cdFx0aWYgKG9sZF9zdGF0ZSA9PT0gUmFuZ2VTdGF0ZS5PVVRTSURFX0hJR0ggJiYgbmV3X3N0YXRlID09PSBSYW5nZVN0YXRlLk9VVFNJREVfTE9XKSByZXR1cm4gZmFsc2U7XG5cdFx0aWYgKG9sZF9zdGF0ZSA9PT0gUmFuZ2VTdGF0ZS5PVVRTSURFX0xPVyAmJiBuZXdfc3RhdGUgPT09IFJhbmdlU3RhdGUuT1VUU0lERV9ISUdIKSByZXR1cm4gZmFsc2U7XG5cdFx0aWYgKG9sZF9zdGF0ZSA9PT0gUmFuZ2VTdGF0ZS5JTklUKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0dmFyIGdldCA9IGZ1bmN0aW9uICgpIHtyZXR1cm4gX3N0YXRlO307XG5cdHZhciBzZXQgPSBmdW5jdGlvbiAobmV3X3N0YXRlLCBuZXdfcmFuZ2UpIHtcblxuXHRcdHZhciBhYnNvbHV0ZSA9IGZhbHNlOyAvLyBhYnNvbHV0ZSBjaGFuZ2Vcblx0XHR2YXIgc3BlY2lhbCA9IGZhbHNlOyAgLy8gc3BlY2lhbCBjaGFuZ2VcblxuXHRcdC8vIGNoZWNrIGFic29sdXRlIGNoYW5nZVxuXHRcdGlmIChuZXdfc3RhdGUgIT09IF9zdGF0ZSB8fCBuZXdfcmFuZ2UgIT09IF9yYW5nZSkge1xuXHRcdFx0YWJzb2x1dGUgPSB0cnVlO1xuXHRcdH1cblx0XHQvLyBjaGVjayBzcGVjaWFsIGNoYW5nZVxuXHRcdGlmIChuZXdfc3RhdGUgIT09IF9zdGF0ZSkge1xuXHRcdFx0c3BlY2lhbCA9IGlzX3NwZWNpYWxfc3RhdGVfY2hhbmdlKF9zdGF0ZSwgbmV3X3N0YXRlKTtcblx0XHR9XG5cdFx0Ly8gcmFuZ2UgY2hhbmdlXG5cdFx0aWYgKG5ld19yYW5nZSAhPT0gX3JhbmdlKSB7XG5cdFx0XHRfcmFuZ2UgPSBuZXdfcmFuZ2U7XG5cdFx0fVxuXHRcdC8vIHN0YXRlIGNoYW5nZVxuXHRcdGlmIChuZXdfc3RhdGUgIT09IF9zdGF0ZSkge1xuXHRcdFx0X3N0YXRlID0gbmV3X3N0YXRlO1xuXHRcdH1cblx0XHRyZXR1cm4ge3NwZWNpYWw6c3BlY2lhbCwgYWJzb2x1dGU6YWJzb2x1dGV9O1xuXG5cdH1cblx0cmV0dXJuIHtnZXQ6IGdldCwgc2V0OnNldH07XG59O1xuXG5cbi8qXG5cdFJhbmdlIGNvbnZlcnRlciBhbGxvd3MgYSBuZXcgKHNtYWxsZXIpIHJhbmdlIHRvIGJlIHNwZWNpZmllZC5cblxuXHQtIGlnbm9yZXMgdGhlIHJhbmdlIG9mIGl0cyB0aW1pbmdzcmNcblx0LSB2ZWN0b3IgY2hhbmdlIGZyb20gdGltaW5nc3JjXG5cdCAgLSBvdXRzaWRlIG93biByYW5nZSAtIGRyb3AgLSBzZXQgdGltZW91dCB0byBpbnNpZGVcblx0ICAtIGluc2lkZSBvd24gcmFuZ2UgLSBub3JtYWwgcHJvY2Vzc2luZ1xuXHQtIGV4dHJhIHZlY3RvciBjaGFuZ2VzIChjb21wYXJlZCB0byB0aW1pbmdzcmMpXG5cdFx0LSBlbnRlciBpbnNpZGVcblx0XHQtIHJhbmdlIHZpb2xhdGlvbiBvd24gcmFuZ2Vcblx0LSByYW5nZSB1cGRhdGVkIGxvY2FsbHlcblxuKi9cblxuY2xhc3MgUmFuZ2VDb252ZXJ0ZXIgZXh0ZW5kcyBUaW1pbmdPYmplY3Qge1xuXG5cdGNvbnN0cnVjdG9yICh0aW1pbmdPYmplY3QsIHJhbmdlKSB7XG5cdFx0c3VwZXIodGltaW5nT2JqZWN0LCB7dGltZW91dDp0cnVlfSk7XG5cdFx0dGhpcy5fX3N0YXRlID0gc3RhdGUoKTtcblx0XHR0aGlzLl9fcmFuZ2UgPSByYW5nZTtcblx0fTtcblxuXG5cdHVwZGF0ZShhcmcpIHtcblx0XHR0aHJvdyBFcnJvcihcIk5vdCBJbXBsZW1lbnRlZCFcIik7XG5cdFx0Lypcblx0XHRcdHJhbmdlIGNoYW5nZSAtIG9ubHkgYSBsb2NhbCBvcGVyYXRpb25cblxuXHRcdFx0XHQtIG5lZWQgdG8gdHJpZ2dlciBsb2NhbCBwcm9jZXNzaW5nIG9mIG5ldyByYW5nZSxcblx0XHRcdFx0c28gdGhhdCByYW5nZSBpcyBjaGFuZ2VkIGFuZCBldmVudHMgdHJpZ2dlcmVkXG5cdFx0XHRcdC0gYWxzbyBuZWVkIHRvIHRyaWdnZXIgYSByZWV2YWx1YXRpb24gb2Zcblx0XHRcdFx0dmVjdG9yIGZyb20gdGltaW5nc3JjIHZlY3RvciwgZm9yIGluc3RhbmNlLCBpZlxuXHRcdFx0XHRyYW5nZSBncm93cyB3aGlsZSB0aW1pbmdzcmMgaXMgb3V0c2lkZSwgdGhlXG5cdFx0XHRcdHBvc2l0aW9uIG9mIHRoZSB2ZWN0b3IgbmVlZHMgdG8gY2hhbmdlXG5cdFx0XHRcdC0gY2Fubm90IGRvIGJvdGggdGhlc2UgdGhpbmdzIHZpYSBlbXVsYXRpb25cblx0XHRcdFx0b2YgdGltaW5nc3JjIGV2ZW50IC0gYmVjYXVzZSByYW5nZWNvbnZlcnRlclxuXHRcdFx0XHRpcyBzdXBwb3NlZCB0byBpZ25vcmUgcmFuZ2UgY2hhbmdlIGZyb20gdGltaW5nc3JjXG5cdFx0XHRcdC0gY291bGQgZG8gYm90aCBsb2NhbGx5LCBidXQgdGhpcyB3b3VsZCBlZmZlY3RpdmVseVxuXHRcdFx0XHRyZXF1aXJlIHJlaW1wbGVtZW50YXRpb24gb2YgbG9naWMgaW4gX19wcm9jZXNzXG5cdFx0XHRcdC0gaW4gYWRkaXRpb24sIHRoaXMgY291bGQgYmUgYSByZXF1ZXN0IHRvIHVwZGF0ZVxuXHRcdFx0XHRib3RoIHJhbmdlIGFuZCB2ZWN0b3IgYXQgdGhlIHNhbWUgdGltZSwgaW4gd2hpY2ggY2FzZVxuXHRcdFx0XHRpdCB3b3VsZCBiZSBnb29kIHRvIGRvIHRoZW0gYm90aCBhdCB0aGUgc2FtZSB0aW1lXG5cblx0XHRcdC0gcG9zc2libGUgc29sdXRpb24gLSBzb21laG93IGxldCByYW5nZSBjb252ZXJ0ZXJcblx0XHRcdCAgZGlzY3JpbWluYXRlIHJhbmdlIGNoYW5nZXMgYmFzZWQgb24gb3JpZ2luP1xuXG5cdFx0Ki9cblx0XHRpZiAoYXJnLnJhbmdlICE9IHVuZGVmaW5lZCkge1xuXG5cdFx0XHQvLyBsb2NhbCBwcm9jZXNzaW5nIG9mIHJhbmdlIGNoYW5nZVxuXHRcdFx0Ly8gdG8gdHJpZ2dlciByYW5nZSBjaGFuZ2UgZXZlbnRcblx0XHRcdGxldCBfYXJnID0ge3JhbmdlOiBhcmcucmFuZ2UsIC4uLnRoaXMudGltaW5nc3JjLnZlY3RvciwgbGl2ZTp0cnVlfTtcblx0XHRcdHRoaXMuX19wcm9jZXNzKF9hcmcpO1xuXHRcdFx0Ly8gYXZvaWQgdGhhdCByYW5nZSBjaGFuZ2UgYWZmZWN0cyB0aW1pbmdzcmNcblx0XHRcdGRlbGV0ZSBhcmcucmFuZ2U7XG5cblx0XHR9XG5cdFx0cmV0dXJuIHN1cGVyLnVwZGF0ZShhcmcpO1xuXHR9O1xuXG5cblxuXHQvLyBvdmVycmlkZXNcblx0b25VcGRhdGVTdGFydChhcmcpIHtcbiAgICAgICAgaWYgKGFyZy5yYW5nZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgXHQvLyBpZ25vcmUgcmFuZ2UgY2hhbmdlIGZyb20gdGltaW5nc3JjXG4gICAgICAgIFx0Ly8gZGVsZXRlIGNhdXNlcyB1cGRhdGUgdG8gYmUgZHJvcHBlZFxuICAgICAgICAgICAgZGVsZXRlIGFyZy5yYW5nZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuICAgICAgICBcdC8vIHZlY3RvciBjaGFuZ2UgZnJvbSB0aW1pbmdzcmNcbiAgICAgICAgXHRsZXQge3Bvc2l0aW9uLCB2ZWxvY2l0eSwgYWNjZWxlcmF0aW9uLCB0aW1lc3RhbXB9ID0gYXJnO1xuICAgICAgICBcdGxldCB2ZWN0b3IgPSB7cG9zaXRpb24sIHZlbG9jaXR5LCBhY2NlbGVyYXRpb24sIHRpbWVzdGFtcH07XG4gICAgICAgIFx0dmVjdG9yID0gdGhpcy5vblZlY3RvckNoYW5nZSh2ZWN0b3IpO1xuICAgICAgICBcdGlmICh2ZWN0b3IgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIFx0XHQvLyBkcm9wIGJlY2F1c2UgbW90aW9uIGlzIG91dHNpZGVcblx0XHRcdFx0Ly8gY3JlYXRlIG5ldyB0aW1lb3V0IGZvciBlbnRlcmluZyBpbnNpZGVcblx0XHRcdFx0dGhpcy5fX3JlbmV3VGltZW91dCh0aGlzLnRpbWluZ3NyYy52ZWN0b3IsIHRoaXMuX19yYW5nZSk7XG5cdFx0XHRcdHJldHVybjtcbiAgICAgICAgXHR9IGVsc2Uge1xuICAgICAgICBcdFx0Ly8gcmVndWxhclxuICAgICAgICBcdFx0YXJnLnBvc2l0aW9uID0gdmVjdG9yLnBvc2l0aW9uO1xuICAgICAgICBcdFx0YXJnLnZlbG9jaXR5ID0gdmVjdG9yLnZlbG9jaXR5O1xuICAgICAgICBcdFx0YXJnLmFjY2VsZXJhdGlvbiA9IHZlY3Rvci5hY2NlbGVyYXRpb247XG4gICAgICAgIFx0XHRhcmcudGltZXN0YW1wID0gdmVjdG9yLnRpbWVzdGFtcDtcbiAgICAgICAgXHR9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFyZztcblx0fTtcblxuXG5cdG9uVmVjdG9yQ2hhbmdlKHZlY3Rvcikge1xuXHRcdHZhciBuZXdfc3RhdGUgPSBjb3JyZWN0UmFuZ2VTdGF0ZSh2ZWN0b3IsIHRoaXMuX19yYW5nZSk7XG5cdFx0dmFyIHN0YXRlX2NoYW5nZWQgPSB0aGlzLl9fc3RhdGUuc2V0KG5ld19zdGF0ZSwgdGhpcy5fX3JhbmdlKTtcblx0XHRpZiAoc3RhdGVfY2hhbmdlZC5zcGVjaWFsKSB7XG5cdFx0XHQvLyBzdGF0ZSB0cmFuc2l0aW9uIGJldHdlZW4gSU5TSURFIGFuZCBPVVRTSURFXG5cdFx0XHRpZiAodGhpcy5fX3N0YXRlLmdldCgpID09PSBSYW5nZVN0YXRlLklOU0lERSkge1xuXHRcdFx0XHQvLyBPVVRTSURFIC0+IElOU0lERSwgZ2VuZXJhdGUgZmFrZSBzdGFydCBldmVudFxuXHRcdFx0XHQvLyB2ZWN0b3IgZGVsaXZlcmVkIGJ5IHRpbWVvdXRcblx0XHRcdFx0Ly8gZm9yd2FyZCBldmVudCB1bmNoYW5nZWRcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIElOU0lERSAtPiBPVVRTSURFLCBnZW5lcmF0ZSBmYWtlIHN0b3AgZXZlbnRcblx0XHRcdFx0dmVjdG9yID0gY2hlY2tSYW5nZSh2ZWN0b3IsIHRoaXMuX19yYW5nZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gbm8gc3RhdGUgdHJhbnNpdGlvbiBiZXR3ZWVuIElOU0lERSBhbmQgT1VUU0lERVxuXHRcdFx0aWYgKHRoaXMuX19zdGF0ZS5nZXQoKSA9PT0gUmFuZ2VTdGF0ZS5JTlNJREUpIHtcblx0XHRcdFx0Ly8gc3RheSBpbnNpZGUgb3IgZmlyc3QgZXZlbnQgaW5zaWRlXG5cdFx0XHRcdC8vIGZvcndhcmQgZXZlbnQgdW5jaGFuZ2VkXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBzdGF5IG91dHNpZGUgb3IgZmlyc3QgZXZlbnQgb3V0c2lkZVxuXHRcdFx0XHQvLyBmb3J3YXJkIGlmXG5cdFx0XHRcdC8vIC0gZmlyc3QgZXZlbnQgb3V0c2lkZVxuXHRcdFx0XHQvLyAtIHNraXAgZnJvbSBvdXRzaWRlLWhpZ2ggdG8gb3V0c2lkZS1sb3dcblx0XHRcdFx0Ly8gLSBza2lwIGZyb20gb3V0c2lkZS1sb3cgdG8gb3V0c2lkZS1oaWdoXG5cdFx0XHRcdC8vIC0gcmFuZ2UgY2hhbmdlXG5cdFx0XHRcdC8vIGVsc2UgZHJvcFxuXHRcdFx0XHQvLyAtIG91dHNpZGUtaGlnaCB0byBvdXRzaWRlLWhpZ2ggKG5vIHJhbmdlIGNoYW5nZSlcblx0XHRcdFx0Ly8gLSBvdXRzaWRlLWxvdyB0byBvdXRzaWRlLWxvdyAobm8gcmFuZ2UgY2hhbmdlKVxuXHRcdFx0XHRpZiAoc3RhdGVfY2hhbmdlZC5hYnNvbHV0ZSkge1xuXHRcdFx0XHRcdHZlY3RvciA9IGNoZWNrUmFuZ2UodmVjdG9yLCB0aGlzLl9fcmFuZ2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdmVjdG9yO1xuXHR9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBSYW5nZUNvbnZlcnRlcjtcblxuIiwiLypcblx0Q29weXJpZ2h0IDIwMTUgTm9ydXQgTm9ydGhlcm4gUmVzZWFyY2ggSW5zdGl0dXRlXG5cdEF1dGhvciA6IEluZ2FyIE3DpmhsdW0gQXJudHplblxuXG4gICAgVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFRpbWluZ3NyYyBtb2R1bGUuXG5cbiAgICBUaW1pbmdzcmMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICAgIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICAgIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24sIGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gICAgKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cblxuICAgIFRpbWluZ3NyYyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICAgIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gICAgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICAgIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuXG4gICAgWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gICAgYWxvbmcgd2l0aCBUaW1pbmdzcmMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4qL1xuXG4vKlxuXHRUSU1FU0hJRlQgQ09OVkVSVEVSXG5cblx0VGltZXNoaWZ0IENvbnZlcnRlciB0aW1lc2hpZnRzIGEgdGltaW5nIG9iamVjdCBieSB0aW1lb2Zmc2V0LlxuXHRQb3NpdGl2ZSB0aW1lb2Zmc2V0IG1lYW5zIHRoYXQgdGhlIGNvbnZlcnRlciB3aWxsIHJ1biBhaGVhZCBvZiB0aGUgc291cmNlIHRpbWluZyBvYmplY3QuXG5cdE5lZ2F0aXZlIHRpbWVvZmZzZXQgbWVhbnMgdGhhdCB0aGUgY29udmVydGVyIHdpbGwgcnVuIGJlaGluZCB0aGUgc291cmNlIHRpbWluZyBvYmplY3QuXG5cblx0VXBkYXRlcyBhZmZlY3QgdGhlIGNvbnZlcnRlciBpbW1lZGlhdGVseS5cbiAgICBUaGlzIG1lYW5zIHRoYXQgdXBkYXRlIHZlY3RvciBtdXN0IGJlIHJlLWNhbGN1bGF0ZWRcblx0dG8gdGhlIHZhbHVlIGl0IHdvdWxkIGhhdmUgYXQgdGltZS1zaGlmdGVkIHRpbWUuXG4gICAgVGltZXN0YW1wcyBhcmUgbm90IHRpbWUtc2hpZnRlZCwgc2luY2UgdGhlIG1vdGlvbiBpcyBzdGlsbCBsaXZlLlxuXHRGb3IgaW5zdGFuY2UsICgwLCAxLCB0cykgYmVjb21lcyAoMCsoMSp0aW1lc2hpZnQpLCAxLCB0cylcblxuXHRIb3dldmVyLCB0aGlzIHRyYW5zZm9ybWF0aW9uIG1heSBjYXVzZSByYW5nZSB2aW9sYXRpb25cblx0XHQtIHRoaXMgaGFwcGVucyBvbmx5IHdoZW4gdGltaW5nIG9iamVjdCBpcyBtb3ZpbmcuXG5cdFx0LSBpbXBsZW1lbnRhdGlvbiByZXF1aXJlcyByYW5nZSBjb252ZXJ0ZXIgbG9naWNcblxuXHQtIHJhbmdlIGlzIGluZmluaXRlXG4qL1xuXG5pbXBvcnQgVGltaW5nT2JqZWN0IGZyb20gJy4vdGltaW5nb2JqZWN0LmpzJztcbmltcG9ydCB7Y2FsY3VsYXRlVmVjdG9yfSBmcm9tICcuLi91dGlsL21vdGlvbnV0aWxzLmpzJztcblxuXG5jbGFzcyBUaW1lc2hpZnRDb252ZXJ0ZXIgZXh0ZW5kcyBUaW1pbmdPYmplY3Qge1xuXG4gICAgY29uc3RydWN0b3IgKHRpbWluZ3NyYywgb2Zmc2V0KSB7XG5cdFx0c3VwZXIodGltaW5nc3JjKTtcblx0XHR0aGlzLl9vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJvZmZzZXRjaGFuZ2VcIiwge2luaXQ6dHJ1ZX0pO1xuXHR9O1xuXG4gICAgLy8gZXh0ZW5kXG4gICAgZXZlbnRpZnlJbml0RXZlbnRBcmdzKG5hbWUpIHtcbiAgICAgICAgaWYgKG5hbWUgPT0gXCJvZmZzZXRjaGFuZ2VcIikge1xuICAgICAgICAgICAgcmV0dXJuIFt0aGlzLl9vZmZzZXRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHN1cGVyLmV2ZW50aWZ5SW5pdEV2ZW50QXJncyhuYW1lKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gb3ZlcnJpZGVzXG4gICAgb25VcGRhdGVTdGFydChhcmcpIHtcbiAgICAgICAgaWYgKGFyZy5yYW5nZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGFyZy5yYW5nZSA9IFstSW5maW5pdHksIEluZmluaXR5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJnLnBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRpbWVzaGlmdGVkIHZlY3RvclxuICAgICAgICAgICAgbGV0IHRzID0gYXJnLnRpbWVzdGFtcDtcbiAgICAgICAgICAgIGxldCBuZXdfdmVjdG9yID0gY2FsY3VsYXRlVmVjdG9yKGFyZywgdHMgKyB0aGlzLl9vZmZzZXQpO1xuICAgICAgICAgICAgYXJnLnBvc2l0aW9uID0gbmV3X3ZlY3Rvci5wb3NpdGlvbjtcbiAgICAgICAgICAgIGFyZy52ZWxvY2l0eSA9IG5ld192ZWN0b3IudmVsb2NpdHk7XG4gICAgICAgICAgICBhcmcuYWNjZWxlcmF0aW9uID0gbmV3X3ZlY3Rvci5hY2NlbGVyYXRpb247XG4gICAgICAgICAgICBhcmcudGltZXN0YW1wID0gdHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFyZztcbiAgICB9O1xuXG4gICAgZ2V0IG9mZnNldCgpIHtyZXR1cm4gdGhpcy5fb2Zmc2V0O307XG5cbiAgICBzZXQgb2Zmc2V0KG9mZnNldCkge1xuICAgICAgICBpZiAob2Zmc2V0ICE9IHRoaXMuX29mZnNldCkge1xuICAgICAgICAgICAgLy8gc2V0IG9mZnNldCBhbmQgZW11bGF0ZSBuZXcgZXZlbnQgZnJvbSB0aW1pbmdzcmNcbiAgICAgICAgICAgIHRoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgICAgIHRoaXMuX19oYW5kbGVFdmVudCh7XG4gICAgICAgICAgICAgICAgLi4udGhpcy50aW1pbmdzcmMudmVjdG9yLFxuICAgICAgICAgICAgICAgIHJhbmdlOiB0aGlzLnRpbWluZ3NyYy5yYW5nZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcIm9mZnNldGNoYW5nZVwiLCBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFRpbWVzaGlmdENvbnZlcnRlcjtcbiIsIi8qXG4gICAgQ29weXJpZ2h0IDIwMjBcbiAgICBBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbmltcG9ydCBJbnRlcnZhbCBmcm9tICcuL2ludGVydmFsLmpzJztcblxuLy8gY2hlY2sgaWYgbiBpcyBhIG51bWJlclxuZnVuY3Rpb24gaXNfbnVtYmVyKG4pIHtcblx0dmFyIE4gPSBwYXJzZUZsb2F0KG4pO1xuICAgIHJldHVybiAobj09TiAmJiAhaXNOYU4oTikpO1xufTtcblxuXG4vKlxuICAgIHV0aWxpdHkgZnVuY3Rpb24gZm9yIHByb3RlY3RpbmcgYWdhaW5zdCBkdXBsaWNhdGVzXG4qL1xuZnVuY3Rpb24gdW5pcXVlKEEpIHtcbiAgICByZXR1cm4gWy4uLm5ldyBTZXQoQSldO1xufTtcblxuXG5cbi8qXG4gICAgYmF0Y2ggaW5zZXJ0cyBhbmQgcmVtb3ZlcyBoYXZlIHR3byBzdHJhdGVnaWVzXG4gICAgMSkgY2hhbmdlLXNvcnRcbiAgICAyKSBzcGxpY2VcblxuICAgIHNpbXBsZSBydWxlIGJ5IG1lYXN1cmVtZW50XG4gICAgc3BsaWNlIGlzIGJldHRlciBmb3IgYmF0Y2hsZW5ndGggPD0gMTAwIGZvciBib3RoIGluc2VydCBhbmQgcmVtb3ZlXG4qL1xuZnVuY3Rpb24gcmVzb2x2ZV9hcHByb2FjaChhcnJheUxlbmd0aCwgYmF0Y2hMZW5ndGgpIHtcbiAgICBpZiAoYXJyYXlMZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm4gXCJzb3J0XCI7XG4gICAgfVxuICAgIHJldHVybiAoYmF0Y2hMZW5ndGggPD0gMTAwKSA/IFwic3BsaWNlXCIgOiBcInNvcnRcIjtcbn07XG5cblxuY2xhc3MgQmluYXJ5U2VhcmNoRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG5cbiAgICBjb25zdHJ1Y3RvcihtZXNzYWdlKSB7XG4gICAgICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLm5hbWUgPSBcIkJpbmFyeVNlYXJjaEVycm9yXCI7XG4gICAgfVxuXG59XG5cblxuLypcblxuQklOQVJZIFNFQVJDSFxuXG4tIGJhc2VkIG9uIHNvcnRlZCBsaXN0IG9mIHVuaXF1ZSBlbGVtZW50c1xuLSBpbXBsZW1lbnRzIHByb3RlY3Rpb24gYWdhaW5zdCBkdXBsaWNhdGVzXG5cblxuUHVibGljIEFQSVxuLSB1cGRhdGUgKHJlbW92ZV9lbGVtZW50cywgaW5zZXJ0X2VsZW1lbnRzKVxuLSBsb29rdXAgKGludGVydmFsKSAtIHJldHVybnMgbGlzdCBmb3IgYWxsIGVsZW1lbnRzXG4tIHJlbW92ZSAoaW50ZXJ2YWwpIC0gcmVtb3ZlcyBlbGVtZW50cyB3aXRoaW4gaW50ZXJ2YWxcbi0gaGFzIChlbGVtZW50KSAgICAgLSByZXR1cm5zIHRydWUgaWYgZWxlbWVudCBleGlzdHMgd2l0aCB2YWx1ZSA9PSBlbGVtZW50LCBlbHNlIGZhbHNlXG4tIGdldCAoZWxlbWVudCkgICAgIC0gcmV0dXJucyBlbGVtZW50IHdpdGggdmFsdWUgaWYgZXhpc3RzLCBlbHNlIHVuZGVmaW5lZFxuLSB2YWx1ZXMgKCkgICAgICAgICAtIHJldHVybnMgaXRlcmFibGUgZm9yIGFsbCBlbGVtZW50c1xuLSBpbmRleE9mKGVsZW1lbnQpICAtIHJldHVybnMgaW5kZXggb2YgZWxlbWVudFxuLSBpbmRleE9mRWxlbWVudHMoZWxlbWVudHMpXG4tIGdldEJ5SW5kZXgoaW5kZXgpIC0gcmV0dXJucyBlbGVtZW50IGF0IGdpdmVuIGluZGV4XG5cblxuKi9cblxuZnVuY3Rpb24gY21wKGEsIGIpIHtyZXR1cm4gYS1iO307XG5cblxuY2xhc3MgQmluYXJ5U2VhcmNoIHtcblxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5hcnJheSA9IFtdO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQmluYXJ5IHNlYXJjaCBvbiBzb3J0ZWQgYXJyYXlcbiAgICAgKiBAcGFyYW0geyp9IHNlYXJjaEVsZW1lbnQgVGhlIGl0ZW0gdG8gc2VhcmNoIGZvciB3aXRoaW4gdGhlIGFycmF5LlxuICAgICAqIEByZXR1cm4ge051bWJlcn0gVGhlIGluZGV4IG9mIHRoZSBlbGVtZW50IHdoaWNoIGRlZmF1bHRzIHRvIC0xIHdoZW4gbm90IGZvdW5kLlxuICAgICAqL1xuICAgIGJpbmFyeUluZGV4T2Yoc2VhcmNoRWxlbWVudCkge1xuICAgICAgICBsZXQgbWluSW5kZXggPSAwO1xuICAgICAgICBsZXQgbWF4SW5kZXggPSB0aGlzLmFycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIGxldCBjdXJyZW50SW5kZXg7XG4gICAgICAgIGxldCBjdXJyZW50RWxlbWVudDtcbiAgICAgICAgd2hpbGUgKG1pbkluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgXHRcdGN1cnJlbnRJbmRleCA9IChtaW5JbmRleCArIG1heEluZGV4KSAvIDIgfCAwO1xuICAgIFx0XHRjdXJyZW50RWxlbWVudCA9IHRoaXMuYXJyYXlbY3VycmVudEluZGV4XTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50RWxlbWVudCA8IHNlYXJjaEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtaW5JbmRleCA9IGN1cnJlbnRJbmRleCArIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRFbGVtZW50ID4gc2VhcmNoRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZm91bmRcbiAgICBcdFx0ICAgIHJldHVybiBjdXJyZW50SW5kZXg7XG4gICAgXHRcdH1cbiAgICAgICAgfVxuICAgICAgICAvLyBub3QgZm91bmQgLSBpbmRpY2F0ZSBhdCB3aGF0IGluZGV4IHRoZSBlbGVtZW50IHNob3VsZCBiZSBpbnNlcnRlZFxuICAgIFx0cmV0dXJuIH5tYXhJbmRleDtcblxuICAgICAgICAvLyBOT1RFIDogYW1iaWd1aXR5XG5cbiAgICAgICAgLypcbiAgICAgICAgc2VhcmNoIGZvciBhbiBlbGVtZW50IHRoYXQgaXMgbGVzcyB0aGFuIGFycmF5WzBdXG4gICAgICAgIHNob3VsZCByZXR1cm4gYSBuZWdhdGl2ZSB2YWx1ZSBpbmRpY2F0aW5nIHRoYXQgdGhlIGVsZW1lbnRcbiAgICAgICAgd2FzIG5vdCBmb3VuZC4gRnVydGhlcm1vcmUsIGFzIGl0IGVzY2FwZXMgdGhlIHdoaWxlIGxvb3BcbiAgICAgICAgdGhlIHJldHVybmVkIHZhbHVlIHNob3VsZCBpbmRpY2F0ZSB0aGUgaW5kZXggdGhhdCB0aGlzIGVsZW1lbnRcbiAgICAgICAgd291bGQgaGF2ZSBoYWQgLSBoYWQgaXQgYmVlbiB0aGVyZSAtIGFzIGlzIHRoZSBpZGVhIG9mIHRoaXMgYml0d2lzZVxuICAgICAgICBvcGVyYXRvciB0cmlja1xuXG4gICAgICAgIHNvLCBpdCBmb2xsb3dzIHRoYXQgc2VhcmNoIGZvciB2YWx1ZSBvZiBtaW5pbXVtIGVsZW1lbnQgcmV0dXJucyAwIGlmIGl0IGV4aXN0cywgYW5kIDAgaWYgaXQgZG9lcyBub3QgZXhpc3RzXG4gICAgICAgIHRoaXMgYW1iaWd1aXR5IGlzIGNvbXBlbnNhdGVkIGZvciBpbiByZWxldmFudCBtZXRob2RzXG4gICAgICAgICovXG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICAgdXRpbGl0eSBmdW5jdGlvbiBmb3IgcmVzb2x2aW5nIGFtYmlndWl0eVxuICAgICovXG4gICAgaXNGb3VuZChpbmRleCwgeCkge1xuICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5kZXggPT0gMCAmJiB0aGlzLmFycmF5Lmxlbmd0aCA+IDAgJiYgdGhpcy5hcnJheVswXSA9PSB4KSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIC8qXG4gICAgICAgIHJldHVybnMgaW5kZXggb2YgdmFsdWUgb3IgLTFcbiAgICAqL1xuICAgIGluZGV4T2YoeCkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmJpbmFyeUluZGV4T2YoeCk7XG4gICAgICAgIHJldHVybiAodGhpcy5pc0ZvdW5kKGluZGV4LCB4KSkgPyBpbmRleCA6IC0xO1xuICAgIH07XG5cbiAgICBpbmRleE9mRWxlbWVudHMoZWxlbWVudHMpIHtcbiAgICAgICAgbGV0IHgsIGluZGV4O1xuICAgICAgICBsZXQgaW5kZXhlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpPTA7IGk8ZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5pbmRleE9mKHgpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICBpbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbmRleGVzO1xuICAgIH07XG5cbiAgICAvKlxuICAgICAgICBlbGVtZW50IGV4aXN0cyB3aXRoIHZhbHVlXG4gICAgKi9cbiAgICBoYXMoeCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuaW5kZXhPZih4KSA+IC0xKSA/IHRydWUgOiBmYWxzZTtcbiAgICB9O1xuXG4gICAgZ2V0KGluZGV4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFycmF5W2luZGV4XTtcbiAgICB9O1xuXG5cblxuICAgIC8qXG4gICAgICAgIFJFTU9WRVxuICAgICAgICBSZW1vdmVzIGFsbCBlbGVtZW50cyB3aXRoIGdpdmVuIHZhbHVlc1xuICAgICAgICBzZWFyY2ggZm9yIGVhY2ggb25lIGFuZCBzcGxpY2UgcmVtb3ZlIHRoZW0gaW5kaXZpZHVhbGx5XG4gICAgICAgIChyZXZlcnNlIG9yZGVyKVxuXG4gICAgICAgIElOU0VSVFxuICAgICAgICBiaW5hcnlzZWFyY2ggYW5kIHNwbGljZVxuICAgICAgICBpbnNlcnQgLSBiaW5hcnlzZWFyY2ggYW5kIHNwbGljZVxuXG4gICAgICAgIFdBUk5JTkcgLSB0aGVyZSBzaG91bGQgYmUgbm8gbmVlZCB0byBpbnNlcnQgZWxlbWVudHMgdGhhdCBhcmUgYWxyZWFkeVxuICAgICAgICBwcmVzZW50IGluIHRoZSBhcnJheS4gVGhpcyBmdW5jdGlvbiBkcm9wcyBzdWNoIGR1cGxpY2F0ZXNcbiAgICAqL1xuICAgIF91cGRhdGVfc3BsaWNlKHRvX3JlbW92ZSwgdG9faW5zZXJ0LCBvcHRpb25zKSB7XG5cbiAgICAgICAgLy8gUkVNT1ZFXG4gICAgICAgIGlmICh0aGlzLmFycmF5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCBpbmRleGVzID0gdGhpcy5pbmRleE9mRWxlbWVudHModG9fcmVtb3ZlKTtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgc29ydCBpbmRleGVzIHRvIG1ha2Ugc3VyZSB3ZSBhcmUgcmVtb3ZpbmcgZWxlbWVudHNcbiAgICAgICAgICAgICAgICBpbiBiYWNrd2FyZHMgb3JkZXJcbiAgICAgICAgICAgICAgICBvcHRpbWl6YXRpb25cbiAgICAgICAgICAgICAgICAtIGlmIGVsZW1lbnRzIHdlcmUgc29ydGVkIGluIHRoZSBmaXJzdCBwbGFjZSB0aGlzIHNob3VsZCBub3QgYmUgbmVjZXNzYXJ5XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5kZXhlcy5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEtYjt9KTtcbiAgICAgICAgICAgIGZvciAobGV0IGk9aW5kZXhlcy5sZW5ndGgtMTsgaSA+IC0xOyBpLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFycmF5LnNwbGljZShpbmRleGVzW2ldLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElOU0VSVFxuICAgICAgICBsZXQgeCwgaW5kZXg7XG4gICAgICAgIGxldCBsZW4gPSB0b19pbnNlcnQubGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpPTA7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgIHggPSB0b19pbnNlcnRbaV07XG4gICAgICAgICAgICBpbmRleCA9IHRoaXMuYmluYXJ5SW5kZXhPZih4KTtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc0ZvdW5kKGluZGV4LCB4KSkge1xuICAgICAgICAgICAgICAgIC8vIGluc2VydCBhdCBjb3JyZWN0IHBsYWNlXG4gICAgICAgICAgICAgICAgdGhpcy5hcnJheS5zcGxpY2UoTWF0aC5hYnMoaW5kZXgpLCAwLCB4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIHJlbW92ZSAtIGZsYWcgLSBzb3J0IHRvIGVuZCBhbmQgcmVtb3ZlXG5cbiAgICAgICAgUmVtb3ZlcyBhbGwgZWxlbWVudHMgd2l0aCBnaXZlbiB2YWx1ZXNcbiAgICAgICAgLSB2aXNpdCBhbGwgZWxlbWVudHMgLSBzZXQgdGhlaXIgdmFsdWUgdG8gSW5maW5pdGVcbiAgICAgICAgLSBzb3J0IE8oTikgLSBuYXRpdmVcbiAgICAgICAgLSBzcGxpY2Ugb2ZmIEluZmluaXR5IHZhbHVlcyBhdCBlbmRcblxuICAgICAgICBpbnNlcnQgLSBjb25jYXQgYW5kIHNvcnRcblxuICAgICAgICBieSBkb2luZyBib3RoIHJlbW92ZSBhbmQgaW5zZXJ0IGluIG9uZSBvcGVyYXRpb24sXG4gICAgICAgIHNvcnRpbmcgY2FuIGJlIGRvbmUgb25seSBvbmNlLlxuICAgICovXG4gICAgX3VwZGF0ZV9zb3J0KHRvX3JlbW92ZSwgdG9faW5zZXJ0LCBvcHRpb25zKSB7XG4gICAgICAgIC8vIFJFTU9WRVxuICAgICAgICBpZiAodGhpcy5hcnJheS5sZW5ndGggPiAwICYmIHRvX3JlbW92ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyB2aXNpdCBhbGwgZWxlbWVudHMgYW5kIHNldCB0aGVpciB2YWx1ZSB0byB1bmRlZmluZWRcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCB2YWx1ZXMgd2lsbCBiZSBzb3J0ZWQgdG8gdGhlIGVuZCBvZiB0aGUgYXJyYXlcbiAgICAgICAgICAgIGxldCBpbmRleGVzID0gdGhpcy5pbmRleE9mRWxlbWVudHModG9fcmVtb3ZlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGk9MDsgaTxpbmRleGVzLmxlbmd0aDtpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFycmF5W2luZGV4ZXNbaV1dID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIElOU0VSVFxuICAgICAgICAvLyBjb25jYXRcbiAgICAgICAgdGhpcy5hcnJheSA9IHRoaXMuYXJyYXkuY29uY2F0KHRvX2luc2VydCk7XG4gICAgICAgIC8vIHNvcnRcbiAgICAgICAgdGhpcy5hcnJheS5zb3J0KGNtcCk7XG4gICAgICAgIC8vIHJlbW92ZSB1bmRlZmluZWQgdmFsdWVzIGF0IHRoZSBlbmQgaWYgYW55XG4gICAgICAgIGlmICh0b19yZW1vdmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IGluZGV4ID0gdGhpcy5hcnJheS5pbmRleE9mKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXJyYXkuc3BsaWNlKGluZGV4LCB0aGlzLmFycmF5Lmxlbmd0aC1pbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVtb3ZlIGR1cGxpY2F0ZXNcbiAgICAgICAgdGhpcy5hcnJheSA9IHVuaXF1ZSh0aGlzLmFycmF5KTtcbiAgICB9O1xuXG5cbiAgICAvKlxuICAgICAgICBVcGRhdGUgLSByZW1vdmluZyBhbmQgaW5zZXJ0aW5nIGVsZW1lbnRzIGluIG9uZSBvcGVyYXRpb25cblxuICAgICAgICBhIHNpbmdsZSBlbGVtZW50IHNob3VsZCBvbmx5IGJlIHByZXNlbnQgb25jZSBpbiB0aGUgbGlzdCwgdGh1cyBhdm9pZGluZ1xuICAgICAgICBtdWx0aXBsZSBvcGVyYXRpb25zIHRvIG9uZSBlbGVtZW50LiBUaGlzIGlzIHByZXN1bWVkIHNvbHZlZCBleHRlcm5hbGx5LlxuICAgICAgICAtIGFsc28gb2JqZWN0cyBtdXN0IG5vdCBiZSBtZW1iZXJzIG9mIGJvdGggbGlzdHMuXG5cbiAgICAgICAgLSBpbnRlcm5hbGx5IHNlbGVjdHMgdGhlIGJlc3QgbWV0aG9kIC0gc2VhcmNoc3BsaWNlIG9yIGNvbmNhdHNvcnRcbiAgICAgICAgLSBzZWxlY3Rpb24gYmFzZWQgb24gcmVsYXRpdmUgc2l6ZXMgb2YgZXhpc3RpbmcgZWxlbWVudHMgYW5kIG5ldyBlbGVtZW50c1xuXG4gICAgKi9cbiAgICB1cGRhdGUodG9fcmVtb3ZlLCB0b19pbnNlcnQsIG9wdGlvbnMpIHtcbiAgICAgICAgbGV0IHNpemUgPSB0b19yZW1vdmUubGVuZ3RoICsgdG9faW5zZXJ0Lmxlbmd0aDtcbiAgICAgICAgaWYgKHNpemUgPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVndWxhciBjYXNlXG4gICAgICAgIGxldCBhcHByb2FjaCA9IHJlc29sdmVfYXBwcm9hY2godGhpcy5hcnJheS5sZW5ndGgsIHNpemUpO1xuICAgICAgICBpZiAoYXBwcm9hY2ggPT0gXCJzcGxpY2VcIikge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlX3NwbGljZSh0b19yZW1vdmUsIHRvX2luc2VydCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXBwcm9hY2ggPT0gXCJzb3J0XCIpe1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlX3NvcnQodG9fcmVtb3ZlLCB0b19pbnNlcnQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICAgQWNjZXNzb3JzXG4gICAgKi9cblxuICAgIGdldE1pbmltdW0oKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5hcnJheS5sZW5ndGggPiAwKSA/IHRoaXMuYXJyYXlbMF0gOiB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIGdldE1heGltdW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5hcnJheS5sZW5ndGggPiAwKSA/IHRoaXMuYXJyYXlbdGhpcy5hcnJheS5sZW5ndGggLSAxXSA6IHVuZGVmaW5lZDtcbiAgICB9O1xuXG5cbiAgICAvKlxuICAgICAgICBJbnRlcm5hbCBzZWFyY2ggZnVuY3Rpb25zXG4gICAgKi9cblxuICAgIC8qXG4gICAgICAgRmluZCBpbmRleCBvZiBsYXJnZXN0IHZhbHVlIGxlc3MgdGhhbiB4XG4gICAgICAgUmV0dXJucyAtMSBpZiBub2UgdmFsdWVzIGV4aXN0IHRoYXQgYXJlIGxlc3MgdGhhbiB4XG4gICAgICovXG4gICAgbHRJbmRleE9mKHgpIHtcbiAgICAgICAgdmFyIGkgPSB0aGlzLmJpbmFyeUluZGV4T2YoeCk7XG4gICAgICAgIGlmICh0aGlzLmlzRm91bmQoaSwgeCkpIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgZm91bmQgLSB4IGlzIGZvdW5kIG9uIGluZGV4IGlcbiAgICAgICAgICAgICAgICBjb25zaWRlciBlbGVtZW50IHRvIHRoZSBsZWZ0XG4gICAgICAgICAgICAgICAgaWYgd2UgYXJlIGF0IHRoZSBsZWZ0IGVuZCBvZiB0aGUgYXJyYXkgbm90aGluZyBpcyBmb3VuZFxuICAgICAgICAgICAgICAgIHJldHVybiAtMVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpLTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgbm90IGZvdW5kIC0gTWF0aC5hYnMoaSkgaXMgaW5kZXggd2hlcmUgeCBzaG91bGQgYmUgaW5zZXJ0ZWRcbiAgICAgICAgICAgICAgICA9PiBNYXRoLmFicyhpKSAtIDEgaXMgdGhlIGxhcmdlc3QgdmFsdWUgbGVzcyB0aGFuIHhcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5hYnMoaSktMTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKlxuICAgICAgIEZpbmQgaW5kZXggb2YgcmlnaHRtb3N0IHZhbHVlIGxlc3MgdGhhbiB4IG9yIGVxdWFsIHRvIHhcbiAgICAgICBSZXR1cm5zIC0xIGlmIG5vZSB2YWx1ZXMgZXhpc3QgdGhhdCBhcmUgbGVzcyB0aGFuIHggb3IgZXF1YWwgdG8geFxuICAgICAqL1xuICAgIGxlSW5kZXhPZih4KSB7XG4gICAgICAgIHZhciBpID0gdGhpcy5iaW5hcnlJbmRleE9mKHgpO1xuICAgICAgICBpZiAodGhpcy5pc0ZvdW5kKGksIHgpKSB7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGVsZW1lbnQgZm91bmRcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vdCBmb3VuZCAtIGNvbnNpZGVyIGVsZW1lbnQgdG8gdGhlIGxlZnRcbiAgICAgICAgICAgIGkgPSBNYXRoLmFicyhpKSAtIDE7XG4gICAgICAgICAgICByZXR1cm4gKGkgPj0gMCkgPyBpIDogLTE7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLypcbiAgICAgICBcdEZpbmQgaW5kZXggb2YgbGVmdG1vc3QgdmFsdWUgZ3JlYXRlciB0aGFuIHhcbiAgICAgICBcdFJldHVybnMgLTEgaWYgbm8gdmFsdWVzIGV4aXN0IHRoYXQgYXJlIGdyZWF0ZXIgdGhhbiB4XG4gICAgKi9cblxuICAgIGd0SW5kZXhPZih4KSB7XG4gICAgICAgIHZhciBpID0gdGhpcy5iaW5hcnlJbmRleE9mKHgpO1xuICAgICAgICBpZiAodGhpcy5pc0ZvdW5kKGksIHgpKSB7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGZvdW5kIC0geCBpcyBmb3VuZCBvbiBpbmRleCBpXG4gICAgICAgICAgICAgICAgaWYgdGhlcmUgYXJlIG5vIGVsZW1lbnRzIHRvIHRoZSByaWdodCByZXR1cm4gLTFcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoaSA8IHRoaXMuYXJyYXkubGVuZ3RoIC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkrMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICBub3QgZm91bmQgLSBNYXRoLmFicyhpKSBpcyBpbmRleCB3aGVyZSB4IHNob3VsZCBiZSBpbnNlcnRlZFxuICAgICAgICAgICAgICAgID0+IE1hdGguYWJzKGkpIGlzIHRoZSBzbWFsbGVzdCB2YWx1ZSBncmVhdGVyIHRoYW4geFxuICAgICAgICAgICAgICAgIHVubGVzcyB3ZSBoaXQgdGhlIGVuZCBvZiB0aGUgYXJyYXksIGluIHdoaWNoIGNhcyBubyBzbWFsbGVzIHZhbHVlXG4gICAgICAgICAgICAgICAgZXhpc3Qgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHhcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBsZXQgaWR4ID0gTWF0aC5hYnMoaSk7XG4gICAgICAgICAgICByZXR1cm4gKGlkeCA8IHRoaXMuYXJyYXkubGVuZ3RoKSA/IGlkeCA6IC0xO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICBGaW5kIGluZGV4IG9mIGxlZnRtb3N0IHZhbHVlIHdoaWNoIGlzIGdyZWF0ZXIgdGhhbiB4IG9yIGVxdWFsIHRvIHhcbiAgICAgICBSZXR1cm5zIC0xIGlmIG5vZSB2YWx1ZXMgZXhpc3QgdGhhdCBhcmUgZ3JlYXRlciB0aGFuIHggb3IgZXF1YWwgdG8geFxuICAgICAqL1xuXG4gICAgZ2VJbmRleE9mKHgpIHtcbiAgICAgICAgdmFyIGkgPSB0aGlzLmJpbmFyeUluZGV4T2YoeCk7XG4gICAgICAgIGlmICh0aGlzLmlzRm91bmQoaSwgeCkpIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgZm91bmQgZWxlbWVudFxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm90IGZvdW5kIC0gY29uc2lkZXIgdGhlIGVsZW1lbnQgd2hlcmUgeCB3b3VsZCBiZSBpbnNlcnRlZFxuICAgICAgICAgICAgaSA9IE1hdGguYWJzKGkpO1xuICAgICAgICAgICAgcmV0dXJuIChpPHRoaXMuYXJyYXkubGVuZ3RoKSA/IGkgOiAtMTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKlxuICAgICAgICBsb29rdXAgc3RhcnQgYW5kIGVuZCBpbmRleGVzIG9mIGVsZW1lbnRzIHdpdGhpbiBpbnRlcnZhbFxuICAgICAgICBmb3IgdXNlIHdpdGggc2xpY2Ugb3BlcmF0aW9uXG4gICAgICAgIHJldHVybnMgdW5kZWZpbmVkIGlmIG5vIGVsZW1lbnRzIGFyZSBmb3VuZFxuICAgICovXG4gICAgbG9va3VwSW5kZXhlcyhpbnRlcnZhbCkge1xuICAgICAgICBpZiAoaW50ZXJ2YWwgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGludGVydmFsID0gbmV3IEludGVydmFsKC1JbmZpbml0eSwgSW5maW5pdHksIHRydWUsIHRydWUpO1xuICAgICAgICBpZiAoaW50ZXJ2YWwgaW5zdGFuY2VvZiBJbnRlcnZhbCA9PT0gZmFsc2UpXG4gICAgICAgICAgICB0aHJvdyBuZXcgQmluYXJ5U2VhcmNoRXJyb3IoXCJsb29rdXAgcmVxdWlyZXMgSW50ZXJ2YWwgYXJndW1lbnRcIik7XG5cbiAgICAgICAgLy8gaW50ZXJ2YWwgcmVwcmVzZW50cyBhIHNpbmdsZSBwb2ludFxuICAgICAgICBpZiAoaW50ZXJ2YWwuc2luZ3VsYXIpIHtcbiAgICAgICAgICAgIGxldCBpbmRleCA9IHRoaXMuaW5kZXhPZihpbnRlcnZhbC5sb3cpO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2luZGV4LCBpbmRleCArIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3VuZGVmaW5lZCwgdW5kZWZpbmVkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlZ3VsYXIgbm9uLXNpbmd1bGFyIGludGVydmFsXG4gICAgICAgIHZhciBzdGFydF9pbmRleCA9IC0xLCBlbmRfaW5kZXggPSAtMTtcbiAgICAgICAgaWYgKGludGVydmFsLmxvd0luY2x1ZGUpIHtcbiAgICAgICAgICAgIHN0YXJ0X2luZGV4ID0gdGhpcy5nZUluZGV4T2YoaW50ZXJ2YWwubG93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXJ0X2luZGV4ID0gdGhpcy5ndEluZGV4T2YoaW50ZXJ2YWwubG93KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhcnRfaW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gW3VuZGVmaW5lZCwgdW5kZWZpbmVkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW50ZXJ2YWwuaGlnaEluY2x1ZGUpIHtcbiAgICAgICAgICAgIGVuZF9pbmRleCA9IHRoaXMubGVJbmRleE9mKGludGVydmFsLmhpZ2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZW5kX2luZGV4ID0gdGhpcy5sdEluZGV4T2YoaW50ZXJ2YWwuaGlnaCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuZF9pbmRleCA9PT0gLTEpIHsgLy8gbm90IHJlYWNoYWJsZSAtIEkgdGhpbmtcbiAgICAgICAgICAgIHJldHVybiBbdW5kZWZpbmVkLCB1bmRlZmluZWRdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCArIDFdO1xuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIGxvb2t1cCBieSBpbnRlcnZhbFxuICAgICovXG4gICAgbG9va3VwKGludGVydmFsKSB7XG4gICAgICAgIGxldCBbc3RhcnQsIGVuZF0gPSB0aGlzLmxvb2t1cEluZGV4ZXMoaW50ZXJ2YWwpO1xuICAgICAgICByZXR1cm4gKHN0YXJ0ICE9IHVuZGVmaW5lZCkgPyB0aGlzLmFycmF5LnNsaWNlKHN0YXJ0LCBlbmQpIDogW107XG4gICAgfTtcblxuICAgIC8qXG4gICAgICAgIHJlbW92ZSBieSBpbnRlcnZhbFxuICAgICovXG4gICAgcmVtb3ZlKGludGVydmFsKSB7XG4gICAgICAgIGxldCBbc3RhcnQsIGVuZF0gPSB0aGlzLmxvb2t1cEluZGV4ZXMoaW50ZXJ2YWwpO1xuICAgICAgICByZXR1cm4gKHN0YXJ0ICE9IHVuZGVmaW5lZCkgPyB0aGlzLmFycmF5LnNwbGljZShzdGFydCwgZW5kLXN0YXJ0KSA6IFtdO1xuICAgIH07XG5cblxuICAgIHNsaWNlKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJyYXkuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgfTtcblxuICAgIHNwbGljZShzdGFydCwgbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFycmF5LnNwbGljZShzdGFydCwgbGVuZ3RoKTtcbiAgICB9O1xuXG5cblxuICAgIC8qXG4gICAgICAgIG1ldGhvZCBmb3IgcmVtb3ZpbmcgbXVsdGlwbGUgY2xvc2VseSBwbGFjZWQgZWxlbWVudHMgaW4gcGxhY2VcbiAgICAgICAgLSByZW1vdmVMaXN0IGlzIHNvcnRlZFxuICAgICAgICAtIGNoYW5nZXMgb25seSBhZmZlY3QgdGhlIHBhcnQgb2YgdGhlIGluZGV4IGJldHdlZW4gZmlyc3QgYW5kIGxhc3QgZWxlbWVudFxuICAgICAgICAtIG1vdmUgcmVtYWluaW5nIGVsZW1lbnRzIHRvIHRoZSBsZWZ0LCByZW1vdmUgZWxlbWVudHMgd2l0aCBhIHNpbmdsZSBzcGxpY2VcbiAgICAgICAgLSBlZmZpY2VudCBpZiByZW1vdmVsaXN0IHJlZmVyZW5jZXMgZWxlbWVudHMgdGhhdCBhcmUgY2xvc2UgdG8gZWFjaG90aGVyXG4gICAgKi9cblxuICAgIHJlbW92ZUluU2xpY2UocmVtb3ZlTGlzdCkge1xuICAgICAgICBpZiAocmVtb3ZlTGlzdC5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG93ID0gcmVtb3ZlTGlzdFswXTtcbiAgICAgICAgY29uc3QgaGlnaCA9IHJlbW92ZUxpc3RbcmVtb3ZlTGlzdC5sZW5ndGgtMV07XG4gICAgICAgIGxldCBbc3RhcnQsIGVuZF0gPSB0aGlzLmxvb2t1cEluZGV4ZXMobmV3IEludGVydmFsKGxvdywgaGlnaCwgdHJ1ZSwgdHJ1ZSkpO1xuXG4gICAgICAgIGxldCByZF9wdHIgPSBzdGFydDtcbiAgICAgICAgbGV0IHdyX3B0ciA9IHN0YXJ0O1xuICAgICAgICBsZXQgcm1fcHRyID0gMDtcblxuICAgICAgICB3aGlsZSAocmRfcHRyIDwgZW5kKSB7XG4gICAgICAgICAgICBsZXQgcmRfZWxlbSA9IHRoaXMuYXJyYXlbcmRfcHRyXTtcbiAgICAgICAgICAgIGxldCBybV9lbGVtID0gcmVtb3ZlTGlzdFtybV9wdHJdO1xuICAgICAgICAgICAgaWYgKHJkX2VsZW0gPCBybV9lbGVtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcnJheVt3cl9wdHJdID0gdGhpcy5hcnJheVtyZF9wdHJdO1xuICAgICAgICAgICAgICAgIHdyX3B0cisrO1xuICAgICAgICAgICAgICAgIHJkX3B0cisrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZF9lbGVtID09IHJtX2VsZW0pIHtcbiAgICAgICAgICAgICAgICByZF9wdHIrKztcbiAgICAgICAgICAgICAgICBybV9wdHIrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcmRfZWxlbSA+IHJtX2VsZW1cbiAgICAgICAgICAgICAgICBybV9wdHIrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChybV9wdHIgPT0gcmVtb3ZlTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXJyYXkuc3BsaWNlKHdyX3B0ciwgcmRfcHRyLXdyX3B0cik7XG4gICAgfTtcblxuXG4gICAgdmFsdWVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5hcnJheS52YWx1ZXMoKTtcbiAgICB9O1xuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuYXJyYXkgPSBbXTtcbiAgICB9O1xuXG4gICAgZ2V0IGxlbmd0aCAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFycmF5Lmxlbmd0aDtcbiAgICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQmluYXJ5U2VhcmNoO1xuXG5cblxuIiwiLypcbiAgICBDb3B5cmlnaHQgMjAyMFxuICAgIEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlsL3V0aWxzLmpzJztcbmltcG9ydCBlbmRwb2ludCBmcm9tICcuLi91dGlsL2VuZHBvaW50LmpzJztcbmltcG9ydCBJbnRlcnZhbCBmcm9tICcuLi91dGlsL2ludGVydmFsLmpzJztcbmltcG9ydCBldmVudGlmeSBmcm9tICcuLi91dGlsL2V2ZW50aWZ5LmpzJztcbmltcG9ydCBCaW5hcnlTZWFyY2ggZnJvbSAnLi4vdXRpbC9iaW5hcnlzZWFyY2guanMnO1xuXG5jb25zdCBSZWxhdGlvbiA9IEludGVydmFsLlJlbGF0aW9uO1xuXG4vKlxuICAgIFVUSUxJVFlcbiovXG5cblxuLypcbiAgICBBZGQgY3VlIHRvIGFycmF5XG4gICAgLSBkb2VzIG5vdCBhZGQgaWYgY3VlIGFscmVhZHkgZXhpc3RzXG4gICAgLSByZXR1cm5zIGFycmF5IGxlbmd0aFxuKi9cbnZhciBhZGRDdWVUb0FycmF5ID0gZnVuY3Rpb24gKGFyciwgY3VlKSB7XG4gICAgLy8gY3VlIGVxdWFsaXR5IGRlZmluZWQgYnkga2V5IHByb3BlcnR5XG4gICAgaWYgKGFyci5sZW5ndGggPT0gMCkge1xuICAgICAgICBhcnIucHVzaChjdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBpZHggPSBhcnIuZmluZEluZGV4KGZ1bmN0aW9uIChfY3VlKSB7XG4gICAgICAgICAgICByZXR1cm4gX2N1ZS5rZXkgPT0gY3VlLmtleTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpZHggPT0gLTEpIHtcbiAgICAgICAgICAgIGFyci5wdXNoKGN1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFyci5sZW5ndGg7XG59O1xuXG4vKlxuICAgIFJlbW92ZSBjdWUgZnJvbSBhcnJheVxuICAgIC0gbm9vcCBpZiBjdWUgZG9lcyBub3QgZXhpc3RcbiAgICAtIHJldHVybnMgYXJyYXkgZW1wdHlcbiovXG52YXIgcmVtb3ZlQ3VlRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFyciwgY3VlKSB7XG4gICAgLy8gY3VlIGVxdWFsaXR5IGRlZmluZWQgYnkga2V5IHByb3BlcnR5XG4gICAgaWYgKGFyci5sZW5ndGggPT0gMSkge1xuICAgICAgICBpZiAoYXJyWzBdLmtleSA9PSBjdWUua2V5KSB7XG4gICAgICAgICAgICBhcnIuc2hpZnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJyLmxlbmd0aCA9PSAwO1xuICAgIH1cbiAgICBlbHNlIGlmIChhcnIubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGlkeCA9IGFyci5maW5kSW5kZXgoZnVuY3Rpb24gKF9jdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfY3VlLmtleSA9PSBjdWUua2V5O1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICAgICAgICBhcnIuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFyci5sZW5ndGggPT0gMDtcbiAgICB9XG59O1xuXG4vKlxuICAgIFNldHVwIElEJ3MgZm9yIGN1ZSBidWNrZXRzLlxuKi9cbmNvbnN0IEN1ZUJ1Y2tldElkcyA9IFswLCAxMCwgMTAwLCAxMDAwLCAxMDAwMCwgMTAwMDAwLCBJbmZpbml0eV07XG52YXIgZ2V0Q3VlQnVja2V0SWQgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgZm9yIChsZXQgaT0wOyBpPEN1ZUJ1Y2tldElkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAobGVuZ3RoIDw9IEN1ZUJ1Y2tldElkc1tpXSkge1xuICAgICAgICAgICAgcmV0dXJuIEN1ZUJ1Y2tldElkc1tpXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLypcbiAgICBEZWx0YVxuXG4gICAgVXNlZCB0byByZXByZXNlbnQgc3RhdGVjaGFuZ2VzIGluIGJhdGNoTWFwLFxuICAgIGZvciBpbnRlcnZhbHMgYW5kIGRhdGEuXG4qL1xuY29uc3QgRGVsdGEgPSBPYmplY3QuZnJlZXplKHtcbiAgICBOT09QOiAwLFxuICAgIElOU0VSVDogMSxcbiAgICBSRVBMQUNFOiAyLFxuICAgIERFTEVURTogM1xufSk7XG5cbi8qXG4gICAgbWFrZSBhIHNoYWxsb3cgY29weSBvZiBhIGN1ZVxuKi9cbmZ1bmN0aW9uIGN1ZV9jb3B5KGN1ZSkge1xuICAgIGlmIChjdWUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5OiBjdWUua2V5LFxuICAgICAgICBpbnRlcnZhbDogY3VlLmludGVydmFsLFxuICAgICAgICBkYXRhOiBjdWUuZGF0YVxuICAgIH07XG59XG5cbi8qXG4gICAgQ2hhcmFjdGVyaXplIHRoZSB0cmFuc2l0aW9uIGZyb20gY3VlX2EgdG8gY3VlX2JcbiAgICBpbiB0ZXJtcyBvZiBkZWx0YSB2YWx1ZXMgZm9yIGludGVydmFsIGFuZCBkYXRhXG5cbiAgICBGb3IgaW5zdGFuY2UsIGludGVydmFsIGhhc1xuICAgIC0gSU5TRVJUOiB2YWx1ZSBub3QgaW4gYSBidXQgaW4gYlxuICAgIC0gREVMRVRFOiB2YWx1ZSBpbiBhIGJ1dCBub3QgaW4gYlxuICAgIC0gUkVQTEFDRTogdmFsdWUgaW4gYSBhbmQgaW4gYmUgYW5kIG5vdCBlcXVhbFxuICAgIC0gTk9PUDogZWl0aGVyIHJlbWFpbnMgdW5kZWZpbmVkIG9yIHJlbWFpbnMgZXF1YWxcblxuICAgIG9wdGlvbmFsIGVxdWFscyBmdW5jdGlvbiBmb3IgZGF0YSBjb21wYXJpc29uXG4gICAgb3RoZXJ3aXNlIHNpbXBsZSBvYmplY3QgZXF1YWxpdHkgKD09KSBpcyB1c2VkXG4qL1xuZnVuY3Rpb24gY3VlX2RlbHRhKGN1ZV9hLCBjdWVfYiwgZXF1YWxzKSB7XG4gICAgbGV0IGludGVydmFsX2RlbHRhLCBkYXRhX2RlbHRhLCBlcTtcbiAgICAvLyBpbnRlcnZhbCBkZWx0YVxuICAgIGxldCBhX2ludGVydmFsX2RlZmluZWQgPSBjdWVfYSAhPSB1bmRlZmluZWQgJiYgY3VlX2EuaW50ZXJ2YWwgIT0gdW5kZWZpbmVkO1xuICAgIGxldCBiX2ludGVydmFsX2RlZmluZWQgPSBjdWVfYiAhPSB1bmRlZmluZWQgJiYgY3VlX2IuaW50ZXJ2YWwgIT0gdW5kZWZpbmVkO1xuICAgIGlmICghYV9pbnRlcnZhbF9kZWZpbmVkICYmICFiX2ludGVydmFsX2RlZmluZWQpIHtcbiAgICAgICAgaW50ZXJ2YWxfZGVsdGEgPSBEZWx0YS5OT09QO1xuICAgIH0gZWxzZSBpZiAoIWFfaW50ZXJ2YWxfZGVmaW5lZCkge1xuICAgICAgICBpbnRlcnZhbF9kZWx0YSA9IERlbHRhLklOU0VSVDtcbiAgICB9IGVsc2UgaWYgKCFiX2ludGVydmFsX2RlZmluZWQpIHtcbiAgICAgICAgaW50ZXJ2YWxfZGVsdGEgPSBEZWx0YS5ERUxFVEU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY2hlY2sgaW50ZXJ2YWwgZXF1YWxpdHlcbiAgICAgICAgZXEgPSBjdWVfYS5pbnRlcnZhbC5lcXVhbHMoY3VlX2IuaW50ZXJ2YWwpO1xuICAgICAgICBpbnRlcnZhbF9kZWx0YSA9IChlcSkgPyBEZWx0YS5OT09QIDogRGVsdGEuUkVQTEFDRTtcbiAgICB9XG4gICAgLy8gZGF0YSBkZWx0YVxuICAgIGxldCBhX2RhdGFfZGVmaW5lZCA9IGN1ZV9hICE9IHVuZGVmaW5lZCAmJiBjdWVfYS5kYXRhICE9IHVuZGVmaW5lZDtcbiAgICBsZXQgYl9kYXRhX2RlZmluZWQgPSBjdWVfYiAhPSB1bmRlZmluZWQgJiYgY3VlX2IuZGF0YSAhPSB1bmRlZmluZWQ7XG4gICAgaWYgKCFhX2RhdGFfZGVmaW5lZCAmJiAhYl9kYXRhX2RlZmluZWQpIHtcbiAgICAgICAgZGF0YV9kZWx0YSA9IERlbHRhLk5PT1A7XG4gICAgfSBlbHNlIGlmICghYV9kYXRhX2RlZmluZWQpIHtcbiAgICAgICAgZGF0YV9kZWx0YSA9IERlbHRhLklOU0VSVDtcbiAgICB9IGVsc2UgaWYgKCFiX2RhdGFfZGVmaW5lZCkge1xuICAgICAgICBkYXRhX2RlbHRhID0gRGVsdGEuREVMRVRFO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNoZWNrIGRhdGEgZXF1YWxpdHlcbiAgICAgICAgaWYgKGVxdWFscykge1xuICAgICAgICAgICAgZXEgPSBlcXVhbHMoY3VlX2EuZGF0YSwgY3VlX2IuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcSA9IHV0aWxzLm9iamVjdF9lcXVhbHMoY3VlX2EuZGF0YSwgY3VlX2IuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YV9kZWx0YSA9IChlcSkgPyBEZWx0YS5OT09QIDogRGVsdGEuUkVQTEFDRTtcbiAgICB9XG4gICAgcmV0dXJuIHtpbnRlcnZhbDogaW50ZXJ2YWxfZGVsdGEsIGRhdGE6IGRhdGFfZGVsdGF9O1xufVxuXG5cblxuLypcbiAgICBDVUUgT1JERVJJTkcgQU5EIFNPUlRJTkdcbiovXG5cbmZ1bmN0aW9uIGN1ZV9jbXBfZm9yd2FyZHMgKGN1ZV9hLCBjdWVfYikge1xuICAgIHJldHVybiBJbnRlcnZhbC5jbXBMb3coY3VlX2EuaXRlcnZhbCwgY3VlX2IuaW50ZXJ2YWwpO1xufVxuXG5mdW5jdGlvbiBjdWVfY21wX2JhY2t3YXJkcyAoY3VlX2EsIGN1ZV9iKSB7XG4gICAgcmV0dXJuIC0xICogSW50ZXJ2YWwuY21wSGlnaChjdWVfYS5pdGVydmFsLCBjdWVfYi5pbnRlcnZhbCk7XG59XG5cbmZ1bmN0aW9uIHNvcnRfY3VlcyAoY3VlcywgZGlyZWN0aW9uPTApIHtcbiAgICBpZiAoZGlyZWN0aW9uID49IDApIHtcbiAgICAgICAgY3Vlcy5zb3J0KGN1ZV9jbXBfZm9yd2FyZHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN1ZXNzLnNvcnQoY3VlX2NtcF9iYWNrd2FyZHMpO1xuICAgIH1cbn1cblxuXG4vKlxuICAgIHRoaXMgaW1wbGVtZW50cyBBeGlzLCBhIGRhdGFzdHJ1Y3R1cmUgZm9yIGVmZmljaWVudCBsb29rdXAgb2ZcbiAgICBjdWVzIG9uIGEgdGltZWxpbmVcblxuICAgIC0gY3VlcyBtYXkgYmUgdGllZCB0byBvbmUgb3IgdHdvIHBvaW50cyBvbiB0aGUgdGltZWxpbmUsIHRoaXNcbiAgICAgIGlzIGV4cHJlc3NlZCBieSBhbiBJbnRlcnZhbC5cbiAgICAtIGN1ZXMgYXJlIGluZGV4ZWQgYm90aCBieSBrZXkgYW5kIGJ5IGludGVydmFsc1xuICAgIC0gdGhlIHRpbWVsaW5lIGluZGV4IGlzIGRpdmlkZWQgaW50byBhIHNldCBvZiBDdWVCdWNrZXRzLFxuICAgICAgYmFzZWQgb24gY3VlIGludGVydmFsIGxlbmd0aCwgZm9yIGVmZmljaWVudCBsb29rdXBcbiovXG5cbmNsYXNzIEF4aXMge1xuXG4gICAgc3RhdGljIHNvcnRfY3VlcyA9IHNvcnRfY3VlcztcbiAgICBzdGF0aWMgRGVsdGEgPSBEZWx0YTtcbiAgICBzdGF0aWMgY3VlX2RlbHRhID0gY3VlX2RlbHRhO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgICBlZmZpY2llbnQgbG9va3VwIG9mIGN1ZXMgYnkga2V5XG4gICAgICAgICAgICBrZXkgLT4gY3VlXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuX2N1ZU1hcCA9IG5ldyBNYXAoKTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgSW5pdGlhbGlzZSBzZXQgb2YgQ3VlQnVja2V0c1xuICAgICAgICAgICAgRWFjaCBDdWVCdWNrZXQgaXMgcmVzcG9uc2libGUgZm9yIGN1ZXMgb2YgYSBjZXJ0YWluIGxlbmd0aFxuICAgICAgICAqL1xuICAgICAgICB0aGlzLl9jdWVCdWNrZXRzID0gbmV3IE1hcCgpOyAgLy8gQ3VlQnVja2V0SWQgLT4gQ3VlQnVja2V0XG4gICAgICAgIGZvciAobGV0IGk9MDsgaTxDdWVCdWNrZXRJZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBjdWVCdWNrZXRJZCA9IEN1ZUJ1Y2tldElkc1tpXTtcbiAgICAgICAgICAgIHRoaXMuX2N1ZUJ1Y2tldHMuc2V0KGN1ZUJ1Y2tldElkLCBuZXcgQ3VlQnVja2V0KGN1ZUJ1Y2tldElkKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbmxpbmUgdXBkYXRlIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLl91cGRhdGVfY2FsbGJhY2tzID0gW107XG5cbiAgICAgICAgLy8gQ2hhbmdlIGV2ZW50XG4gICAgICAgIGV2ZW50aWZ5LmV2ZW50aWZ5SW5zdGFuY2UodGhpcyk7XG4gICAgICAgIHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJ1cGRhdGVcIiwge2luaXQ6dHJ1ZX0pO1xuICAgICAgICB0aGlzLmV2ZW50aWZ5RGVmaW5lKFwiY2hhbmdlXCIsIHtpbml0OnRydWV9KTtcbiAgICAgICAgdGhpcy5ldmVudGlmeURlZmluZShcInJlbW92ZVwiLCB7aW5pdDpmYWxzZX0pO1xuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIFNJWkVcbiAgICAgICAgTnVtYmVyIG9mIGN1ZXMgbWFuYWdlZCBieSBheGlzXG4gICAgKi9cbiAgICBnZXQgc2l6ZSAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdWVNYXAuc2l6ZTtcbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgRVZFTlRJRllcblxuICAgICAgICBJbW1lZGlhdGUgZXZlbnRzXG4gICAgKi9cblxuICAgIGV2ZW50aWZ5SW5pdEV2ZW50QXJncyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lID09IFwidXBkYXRlXCIgfHwgbmFtZSA9PSBcImNoYW5nZVwiKSB7XG4gICAgICAgICAgICBsZXQgZXZlbnRzID0gWy4uLnRoaXMudmFsdWVzKCldLm1hcChjdWUgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7a2V5OmN1ZS5rZXksIG5ldzpjdWUsIG9sZDp1bmRlZmluZWR9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gKG5hbWUgPT0gXCJ1cGRhdGVcIikgPyBbZXZlbnRzXSA6IGV2ZW50cztcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIEV2ZW50IE5vdGlmaWNhdGlvblxuXG4gICAgKi9cbiAgICBfbm90aWZ5RXZlbnRzKGV2ZW50cykge1xuICAgICAgICAvLyBldmVudCBub3RpZmljYXRpb25cbiAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGhhc191cGRhdGVfc3VicyA9IHRoaXMuZXZlbnRpZnlTdWJzY3JpcHRpb25zKFwidXBkYXRlXCIpLmxlbmd0aCA+IDA7XG4gICAgICAgIGNvbnN0IGhhc19yZW1vdmVfc3VicyA9IHRoaXMuZXZlbnRpZnlTdWJzY3JpcHRpb25zKFwicmVtb3ZlXCIpLmxlbmd0aCA+IDA7XG4gICAgICAgIGNvbnN0IGhhc19jaGFuZ2Vfc3VicyA9IHRoaXMuZXZlbnRpZnlTdWJzY3JpcHRpb25zKFwiY2hhbmdlXCIpLmxlbmd0aCA+IDA7XG4gICAgICAgIC8vIHVwZGF0ZVxuICAgICAgICBpZiAoaGFzX3VwZGF0ZV9zdWJzKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcInVwZGF0ZVwiLCBldmVudHMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoYW5nZSwgcmVtb3ZlXG4gICAgICAgIGlmIChoYXNfcmVtb3ZlX3N1YnMgfHwgaGFzX2NoYW5nZV9zdWJzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpdGVtIG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLm5ldyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc19yZW1vdmVfc3Vicykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudGlmeVRyaWdnZXIoXCJyZW1vdmVcIiwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzX2NoYW5nZV9zdWJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcImNoYW5nZVwiLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBVUERBVEUgQ0FMTEJBQ0tTXG4gICAgKi9cblxuICAgIGFkZF9jYWxsYmFjayAoaGFuZGxlcikge1xuICAgICAgICBsZXQgaGFuZGxlID0ge1xuICAgICAgICAgICAgaGFuZGxlcjogaGFuZGxlclxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3VwZGF0ZV9jYWxsYmFja3MucHVzaChoYW5kbGUpO1xuICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgIH07XG5cblxuICAgIGRlbF9jYWxsYmFjayAoaGFuZGxlKSB7XG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMuX3VwZGF0ZV9jYWxsYmFja3MuaW5kZXhvZihoYW5kbGUpO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlX2NhbGxiYWNrcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgX25vdGlmeV9jYWxsYmFja3MgKGJhdGNoTWFwLCByZWxldmFuY2VJbnRlcnZhbCkge1xuICAgICAgICB0aGlzLl91cGRhdGVfY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICBoYW5kbGUuaGFuZGxlcihiYXRjaE1hcCwgcmVsZXZhbmNlSW50ZXJ2YWwpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFVQREFURVxuXG4gICAgICAgIC0gaW5zZXJ0LCByZXBsYWNlIG9yIGRlbGV0ZSBjdWVzXG5cbiAgICAgICAgdXBkYXRlKGN1ZXMsIGVxdWFscywgY2hlY2spXG5cbiAgICAgICAgPGN1ZXM+IG9yZGVyZWQgbGlzdCBvZiBjdWVzIHRvIGJlIHVwZGF0ZWRcbiAgICAgICAgPGVxdWFscz4gLSBlcXVhbGl0eSBmdW5jdGlvbiBmb3IgZGF0YSBvYmplY3RzXG4gICAgICAgIDxjaGVjaz4gLSBjaGVjayBjdWUgaW50ZWdyaXR5IGlmIHRydWVcblxuICAgICAgICBjdWUgPSB7XG4gICAgICAgICAgICBrZXk6a2V5LFxuICAgICAgICAgICAgaW50ZXJ2YWw6IEludGVydmFsLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9XG5cbiAgICAgICAgcmVxdWlyZWRcbiAgICAgICAgLSBjdWUua2V5IHByb3BlcnR5IGlzIGRlZmluZWQgYW5kIHZhbHVlIGlzICE9IHVuZGVmaW5lZFxuICAgICAgICAtIGlmIGN1ZS5pbnRlcnZhbCAhPSB1bmRlZmluZWQsIGl0IG11c3QgYmUgaW5zdGFuY2Ugb2YgSW50ZXJ2YWxcblxuICAgICAgICBFWEFNUExFU1xuXG4gICAgICAgIC8vIElOU0VSVCAobm8gcHJlLWV4aXN0aW5nIGN1ZSlcblxuICAgICAgICBjdWUgPSB7a2V5OjEsIGludGVydmFsOiBuZXcgSW50ZXJ2YWwoMyw0KSwgZGF0YToge319XG4gICAgICAgIC8vIGluc2VydCBjdWUgd2l0aCBvbmx5IGludGVydmFsXG4gICAgICAgIGN1ZSA9IHtrZXk6MSwgaW50ZXJ2YWw6IG5ldyBJbnRlcnZhbCgzLDQpfVxuICAgICAgICAvLyBpbnNlcnQgY3VlIHdpdGggb25seSBkYXRhXG4gICAgICAgIGN1ZSA9IHtrZXk6MSwgZGF0YToge319XG5cblxuICAgICAgICAvLyBSRVBMQUNFIChwcmUtZXhpc3RpbmcgY3VlKVxuICAgICAgICBwcmVleGlzdGluZ19jdWUgPSB7a2V5OjEsIGludGVydmFsOiBuZXcgSW50ZXJ2YWwoMyw0KSwgZGF0YToge319XG5cbiAgICAgICAgY3VlID0ge2tleToxLCBpbnRlcnZhbDogbmV3IEludGVydmFsKDMsNSksIGRhdGE6IHtmb286XCJiYXJcIn19XG4gICAgICAgIC8vIHJlcGxhY2UgaW50ZXJ2YWwsIGtlZXAgZGF0YVxuICAgICAgICBjdWUgPSB7a2V5OjEsIGludGVydmFsOiBuZXcgSW50ZXJ2YWwoMyw1KX1cbiAgICAgICAgLy8gcmVwbGFjZSBpbnRlcnZhbCwgZGVsZXRlIGRhdGFcbiAgICAgICAgY3VlID0ge2tleToxLCBpbnRlcnZhbDogbmV3IEludGVydmFsKDMsNSksIGRhdGE6IHVuZGVmaW5lZFxuICAgICAgICAvLyByZXBsYWNlIGRhdGEsIGtlZXAgaW50ZXJ2YWxcbiAgICAgICAgY3VlID0ge2tleToxLCBkYXRhOiB7Zm9vOlwiYmFyXCJ9fVxuICAgICAgICAvLyByZXBsYWNlIGRhdGEsIGRlbGV0ZSBpbnRlcnZhbFxuICAgICAgICBjdWUgPSB7a2V5OjEsIGludGVydmFsOiB1bmRlZmluZWQsIGRhdGE6IHtmb286XCJiYXJcIn19XG5cbiAgICAgICAgLy8gREVMRVRFIChwcmUtZXhpc3RpbmcpXG4gICAgICAgIGN1ZSA9IHtrZXk6MX1cbiAgICAgICAgLy8gZGVsZXRlIGludGVydmFsLCBrZWVwIGRhdGFcbiAgICAgICAgY3VlID0ge2tleToxLCBpbnRlcnZhbDogdW5kZWZpbmVkfVxuICAgICAgICAvLyBkZWxldGUgZGF0YSwga2VlcCBpbnRlcnZhbFxuICAgICAgICBjdWUgPSB7a2V5OjEsIGRhdGE6IHVuZGVmaW5lZH1cblxuXG4gICAgICAgIFVwZGF0ZSByZXR1cm5zIGEgbGlzdCBvZiBldmVudCBpdGVtcyAtIGRlc2NyaWJlcyB0aGUgZWZmZWN0cyBvZiBhbiB1cGRhdGUuXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmV3OiBuZXdfY3VlLFxuICAgICAgICAgICAgICAgIG9sZDogb2xkX2N1ZSxcbiAgICAgICAgICAgICAgICBkZWx0YToge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbDogRGVsdGEsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IERlbHRhXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIHdpdGggaW5kZXBlbmRlbnQgZGVsdGEgdmFsdWVzIGZvciBpbnRlcnZhbCBhbmQgZGF0YTpcbiAgICAgICAgRGVsdGEuTk9PUDogMFxuICAgICAgICBEZWx0YS5JTlNFUlQ6IDFcbiAgICAgICAgRGVsdGEuUkVQTEFDRTogMlxuICAgICAgICBEZWx0YS5ERUxFVEU6IDNcblxuICAgICAgICBEdXBsaWNhdGVzXG4gICAgICAgIC0gaWYgdGhlcmUgYXJlIG11bHRpcGxlIGN1ZSBvcGVyYXRpb25zIGZvciB0aGUgc2FtZSBrZXksXG4gICAgICAgICAgd2l0aGluIHRoZSBzYW1lIGJhdGNoIG9mIGN1ZXMsXG4gICAgICAgICAgdGhlc2Ugd2lsbCBiZSBwcm9jZXNzZWQgaW4gb3JkZXIuXG5cbiAgICAgICAgLSBUaGUgb2xkIGN1ZSB3aWxsIGFsd2F5cyBiZSB0aGUgc3RhdGUgb2YgdGhlIGN1ZSxcbiAgICAgICAgICBiZWZvcmUgdGhlIGJhdGNoIHN0YXJ0ZWQuXG5cbiAgICAgICAgLSBUaGUgcmV0dXJuZWQgZGVsdGEgdmFsdWVzIHdpbGwgYmUgY2FsY3VsdGF0ZWQgcmVsYXRpdmUgdG9cbiAgICAgICAgICB0aGUgY3VlIGJlZm9yZSB0aGUgYmF0Y2ggc3RhcnRlZCAob2xkKS5cblxuICAgICAgICAgIFRoaXMgd2F5LCBleHRlcm5hbCBtaXJyb3Jpbmcgb2JzZXJ2ZXJzIG1heSB3aWxsIGJlIGFibGUgdG9cbiAgICAgICAgICByZXBsaWNhdGUgdGhlIGVmZmVjdHMgb2YgdGhlIHVwZGF0ZSBvcGVyYXRpb24uXG5cbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICB1cGRhdGUoY3Vlcywgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBiYXRjaE1hcCA9IG5ldyBNYXAoKTtcbiAgICAgICAgbGV0IGN1cnJlbnRfY3VlO1xuICAgICAgICBsZXQgaGFzX2ludGVydmFsLCBoYXNfZGF0YTtcbiAgICAgICAgbGV0IGluaXQgPSB0aGlzLl9jdWVNYXAuc2l6ZSA9PSAwO1xuICAgICAgICAvLyBvcHRpb25zXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAvLyBjaGVjayBpcyBmYWxzZSBieSBkZWZhdWx0XG4gICAgICAgIGlmIChvcHRpb25zLmNoZWNrID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgb3B0aW9ucy5jaGVjayA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoYWluaW5nIGlzIHRydWUgYnkgZGVmYXVsdFxuICAgICAgICBpZiAob3B0aW9ucy5jaGFpbmluZyA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG9wdGlvbnMuY2hhaW5pbmcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF1dGlscy5pc0l0ZXJhYmxlKGN1ZXMpKSB7XG4gICAgICAgICAgICBjdWVzID0gW2N1ZXNdO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgICAgICBwcm9jZXNzIGFsbCBjdWVzXG4gICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgICAgICBmb3IgKGxldCBjdWUgb2YgY3Vlcykge1xuXG4gICAgICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgICAgIGNoZWNrIHZhbGlkaXR5IG9mIGN1ZSBhcmd1bWVudFxuICAgICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoIShjdWUpIHx8ICFjdWUuaGFzT3duUHJvcGVydHkoXCJrZXlcIikgfHwgY3VlLmtleSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCBjdWVcIiwgY3VlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoYXNfaW50ZXJ2YWwgPSBjdWUuaGFzT3duUHJvcGVydHkoXCJpbnRlcnZhbFwiKTtcbiAgICAgICAgICAgIGhhc19kYXRhID0gY3VlLmhhc093blByb3BlcnR5KFwiZGF0YVwiKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNoZWNrICYmIGhhc19pbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGlmICghY3VlLmludGVydmFsIGluc3RhbmNlb2YgSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW50ZXJ2YWwgbXVzdCBiZSBJbnRlcnZhbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgICAgICAgICAgYWRqdXN0IGN1ZSBzbyB0aGF0IGl0IGNvcnJlY3RseSByZXByZXNlbnRzXG4gICAgICAgICAgICAgICAgdGhlIG5ldyBjdWUgdG8gcmVwbGFjZSB0aGUgY3VycmVudCBjdWVcbiAgICAgICAgICAgICAgICAtIGluY2x1ZGVkcyBwcmVzZXJ2YXRpb24gb2YgdmFsdWVzIGZyb20gY3VycmVudCBjdWVcbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgICAgIGN1cnJlbnRfY3VlID0gKGluaXQpID8gdW5kZWZpbmVkIDogdGhpcy5fY3VlTWFwLmdldChjdWUua2V5KTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X2N1ZSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgcHJvcGVydGllcyBhcmUgZGVmaW5lZFxuICAgICAgICAgICAgICAgIGlmICghaGFzX2ludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1ZS5pbnRlcnZhbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFoYXNfZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjdWUuZGF0YSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfY3VlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghaGFzX2ludGVydmFsICYmICFoYXNfZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgcHJvcGVydGllcyBhcmUgZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICBjdWUuaW50ZXJ2YWwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGN1ZS5kYXRhID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWhhc19kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJFUExBQ0VfSU5URVJWQUwsIHByZXNlcnZlIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY3VlLmRhdGEgPSBjdXJyZW50X2N1ZS5kYXRhO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWhhc19pbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSRVBMQUNFX0RBVEEsIHByZXNlcnZlIGludGVydmFsXG4gICAgICAgICAgICAgICAgICAgIGN1ZS5pbnRlcnZhbCA9IGN1cnJlbnRfY3VlLmludGVydmFsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJFUExBQ0UgQ1VFXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgICAgIHVwZGF0ZSBjdWVcbiAgICAgICAgICAgICAgICAtIHVwZGF0ZSBjdWVNYXBcbiAgICAgICAgICAgICAgICAtIHVwZGF0ZSBjdWVCdWNrZXRzXG4gICAgICAgICAgICAgICAgLSBjcmVhdGUgYmF0Y2hNYXBcbiAgICAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgICAgIHRoaXMuX3VwZGF0ZV9jdWUoYmF0Y2hNYXAsIGN1cnJlbnRfY3VlLCBjdWUsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZsdXNoIGFsbCBidWNrZXRzIHNvIHVwZGF0ZXMgdGFrZSBlZmZlY3RcbiAgICAgICAgdGhpcy5fY2FsbF9idWNrZXRzKFwiZmx1c2hcIik7XG4gICAgICAgIGlmIChiYXRjaE1hcC5zaXplID4gMCkge1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGNyZWF0ZSBldmVudHMgd2l0aG91dCBkZWx0YSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGFuZCBhY2N1bXVsYXRlIHJlbGV2YW5jZSBpbnRlcnZhbCBmb3IgYmF0Y2hcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBsZXQgcmVsZXZhbmNlID0ge2xvdzogSW5maW5pdHksIGhpZ2g6IC1JbmZpbml0eX07XG5cbiAgICAgICAgICAgIC8vIGNyZWF0ZSBsaXN0IG9mIGV2ZW50cyBhbmQgcmVtb3ZlIGRlbHRhIHByb3BlcnR5XG4gICAgICAgICAgICBsZXQgZXZlbnRzID0gWy4uLmJhdGNoTWFwLnZhbHVlcygpXS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0ubmV3ICYmIGl0ZW0ubmV3LmludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZS5sb3cgPSBlbmRwb2ludC5taW4ocmVsZXZhbmNlLmxvdywgaXRlbS5uZXcuaW50ZXJ2YWwuZW5kcG9pbnRMb3cpO1xuICAgICAgICAgICAgICAgICAgICByZWxldmFuY2UuaGlnaCA9IGVuZHBvaW50Lm1heChyZWxldmFuY2UuaGlnaCwgaXRlbS5uZXcuaW50ZXJ2YWwuZW5kcG9pbnRIaWdoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0ub2xkICYmIGl0ZW0ub2xkLmludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW5jZS5sb3cgPSBlbmRwb2ludC5taW4ocmVsZXZhbmNlLmxvdywgaXRlbS5vbGQuaW50ZXJ2YWwuZW5kcG9pbnRMb3cpO1xuICAgICAgICAgICAgICAgICAgICByZWxldmFuY2UuaGlnaCA9IGVuZHBvaW50Lm1heChyZWxldmFuY2UuaGlnaCwgaXRlbS5vbGQuaW50ZXJ2YWwuZW5kcG9pbnRIaWdoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtrZXk6aXRlbS5rZXksIG5ldzppdGVtLm5ldywgb2xkOml0ZW0ub2xkfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICB0aGlzLl9ub3RpZnlFdmVudHMoZXZlbnRzKTtcblxuICAgICAgICAgICAgLy8gY3JlYXRlIHJlbGV2YW5jZSBJbnRlcnZhbFxuICAgICAgICAgICAgbGV0IHJlbGV2YW5jZUludGVydmFsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHJlbGV2YW5jZS5sb3cgIT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZWxldmFuY2VJbnRlcnZhbCA9IEludGVydmFsLmZyb21FbmRwb2ludHMocmVsZXZhbmNlLmxvdywgcmVsZXZhbmNlLmhpZ2gpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIG5vdGlmeSBzZXF1ZW5jZXIgbGFzdCBzbyB0aGF0IGNoYW5nZSBldmVudHNcbiAgICAgICAgICAgICAgICBmcm9tIHRoZSBheGlzIHdpbGwgYmUgYXBwbGllZCBiZWZvcmUgY2hhbmdlXG4gICAgICAgICAgICAgICAgZXZlbnRzIGZyb20gc2VxdWVuY2Vycy5cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLl9ub3RpZnlfY2FsbGJhY2tzKGJhdGNoTWFwLCByZWxldmFuY2VJbnRlcnZhbCk7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9O1xuXG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgVVBEQVRFIENVRVxuXG4gICAgICAgIHVwZGF0ZSBvcGVyYXRpb24gZm9yIGEgc2luZ2xlIGN1ZVxuXG4gICAgICAgIC0gdXBkYXRlIGN1ZU1hcFxuICAgICAgICAtIGdlbmVyYXRlIGVudHJ5IGZvciBiYXRjaE1hcFxuICAgICAgICAtIHVwZGF0ZSBDdWVCdWNrZXRcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBfdXBkYXRlX2N1ZShiYXRjaE1hcCwgY3VycmVudF9jdWUsIGN1ZSwgb3B0aW9ucykge1xuICAgICAgICBsZXQgb2xkX2N1ZSwgbmV3X2N1ZTtcbiAgICAgICAgbGV0IGl0ZW0sIF9pdGVtO1xuICAgICAgICBsZXQgb2xkQ3VlQnVja2V0LCBuZXdDdWVCdWNrZXQ7XG4gICAgICAgIGxldCBsb3dfY2hhbmdlZCwgaGlnaF9jaGFuZ2VkO1xuICAgICAgICBsZXQgcmVtb3ZlX25lZWRlZCwgYWRkX25lZWRlZDtcbiAgICAgICAgbGV0IGVxdWFscyA9IG9wdGlvbnMuZXF1YWxzO1xuICAgICAgICBsZXQgY2hhaW5pbmcgPSBvcHRpb25zLmNoYWluaW5nO1xuXG4gICAgICAgIC8vIGNoZWNrIGZvciBlcXVhbGl0eVxuICAgICAgICBsZXQgZGVsdGEgPSBjdWVfZGVsdGEoY3VycmVudF9jdWUsIGN1ZSwgZXF1YWxzKTtcblxuICAgICAgICAvLyAoTk9PUCwgTk9PUClcbiAgICAgICAgaWYgKGRlbHRhLmludGVydmFsID09IERlbHRhLk5PT1AgJiYgZGVsdGEuZGF0YSA9PSBEZWx0YS5OT09QKSB7XG4gICAgICAgICAgICBpdGVtID0ge1xuICAgICAgICAgICAgICAgIGtleTpjdWUua2V5LCBuZXc6Y3VycmVudF9jdWUsXG4gICAgICAgICAgICAgICAgb2xkOmN1cnJlbnRfY3VlLCBkZWx0YTogZGVsdGFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJhdGNoTWFwLnNldChjdWUua2V5LCBpdGVtKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgICAgdXBkYXRlIGN1ZU1hcCBhbmQgYmF0Y2hNYXBcbiAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgaWYgKGN1cnJlbnRfY3VlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSU5TRVJUIC0gYWRkIGN1ZSBvYmplY3QgdG8gY3VlTWFwXG4gICAgICAgICAgICBvbGRfY3VlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbmV3X2N1ZSA9IGN1ZTtcbiAgICAgICAgICAgIHRoaXMuX2N1ZU1hcC5zZXQoY3VlLmtleSwgbmV3X2N1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY3VlLmludGVydmFsID09IHVuZGVmaW5lZCAmJiBjdWUuZGF0YSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIERFTEVURSAtIHJlbW92ZSBjdWUgb2JqZWN0IGZyb20gY3VlTWFwXG4gICAgICAgICAgICBvbGRfY3VlID0gY3VycmVudF9jdWU7XG4gICAgICAgICAgICBuZXdfY3VlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5fY3VlTWFwLmRlbGV0ZShjdWUua2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJFUExBQ0VcbiAgICAgICAgICAgIC8vIGluLXBsYWNlIG1vZGlmaWNhdGlvbiBvZiBjdXJyZW50IGN1ZVxuICAgICAgICAgICAgLy8gY29weSBvbGQgY3VlIGJlZm9yZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIG9sZF9jdWUgPSBjdWVfY29weShjdXJyZW50X2N1ZSk7XG4gICAgICAgICAgICBuZXdfY3VlID0gY3VycmVudF9jdWU7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY3VycmVudCBjdWUgaW4gcGxhY2VcbiAgICAgICAgICAgIG5ld19jdWUuaW50ZXJ2YWwgPSBjdWUuaW50ZXJ2YWw7XG4gICAgICAgICAgICBuZXdfY3VlLmRhdGEgPSBjdWUuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBpdGVtID0ge2tleTpjdWUua2V5LCBuZXc6bmV3X2N1ZSwgb2xkOm9sZF9jdWUsIGRlbHRhOmRlbHRhfTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgaWYgdGhpcyBpdGVtIGhhcyBiZWVuIHNldCBlYXJsaWVyIGluIGJhdGNoTWFwXG4gICAgICAgICAgICByZXN0b3JlIHRoZSBjb3JyZWN0IG9sZF9jdWUgYnkgZ2V0dGluZyBpdCBmcm9tXG4gICAgICAgICAgICB0aGUgcHJldmlvdXMgYmF0Y2hNYXAgaXRlbVxuXG4gICAgICAgICAgICByZWNhbGN1bGF0ZSBkZWx0YSByZWxhdGl2ZSB0byBvbGRfY3VlXG4gICAgICAgICAgICAtIHRoaXMgZGVsdGEgaXMgb25seSBmb3Igc2VxdWVuY2Vyc1xuICAgICAgICAgICAgLSBjb250aW51ZSBwcm9jZXNzaW5nIHdpdGggdGhlIG9yaWdpbmFsIGRlbHRhIGRlZmluZWRcbiAgICAgICAgICAgIGFib3ZlLCBhcyB0aGlzIGlzIHJlcXVpcmVkIHRvIGNvcnJlY3RseSBjaGFuZ2UgY3VlQnVja2V0c1xuICAgICAgICAgICAgd2hpY2ggaGF2ZSBhbHJlYWR5IGJlZW4gYWZmZWN0ZWQgYnkgcHJldmlvdXMgaXRlbS5cbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGNoYWluaW5nKSB7XG4gICAgICAgICAgICBfaXRlbSA9IGJhdGNoTWFwLmdldChjdWUua2V5KTtcbiAgICAgICAgICAgIGlmIChfaXRlbSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpdGVtLm9sZCA9IF9pdGVtLm9sZDtcbiAgICAgICAgICAgICAgICBpdGVtLmRlbHRhID0gY3VlX2RlbHRhKG5ld19jdWUsIGl0ZW0ub2xkLCBlcXVhbHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYmF0Y2hNYXAuc2V0KGN1ZS5rZXksIGl0ZW0pXG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgICAgICB1cGRhdGUgY3VlQnVja2V0c1xuXG4gICAgICAgICAgICAtIHVzZSBkZWx0YS5pbnRlcnZhbCB0byBhdm9pZCB1bm5lc3Nlc2FyeSBjaGFuZ2VzXG5cbiAgICAgICAgICAgIC0gaW50ZXJ2YWwgbWF5IGNoYW5nZSBpbiBzZXZlcmFsIHdheXM6XG4gICAgICAgICAgICAgICAgLSBsb3cgY2hhbmdlZFxuICAgICAgICAgICAgICAgIC0gaGlnaCBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgLSBsb3cgYW5kIGhpZ2ggY2hhbmdlZFxuICAgICAgICAgICAgLSBjaGFuZ2VkIGludGVydmFscyBtYXkgc3RheSBpbiBidWNrZXQgb3IgY2hhbmdlIGJ1Y2tldDpcbiAgICAgICAgICAgIC0gY2hhbmdpbmcgdG8vZnJvbSBzaW5ndWxhciBtYXkgcmVxdWlyZSBzcGVjaWFsIGNvbnNpZGVyYXRpb25cbiAgICAgICAgICAgICAgd2l0aCByZXNwZWN0IHRvIGhvdyBtYW55IGVuZHBvaW50cyBhcmUgYmVpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC0gc2luZ3VsYXIgLT4gc2luZ3VsYXJcbiAgICAgICAgICAgICAgICAtIHNpbmd1bGFyIC0+IHJlZ3VsYXJcbiAgICAgICAgICAgICAgICAtIHJlZ3VsYXIgLT4gc2luZ3VsYXJcbiAgICAgICAgICAgICAgICAtIHJlZ3VsYXIgLT4gcmVndWxhclxuICAgICAgICAgICAgLSBjaGFuZ2VzIHRvIGludGVydmFsLmxvd0luY2x1ZGUgYW5kIGludGVydmFsIGhpZ2hJbmNsdWRlXG4gICAgICAgICAgICAgIGRvIG5vdCByZXF1aXJlIGFueSBjaGFuZ2VzIHRvIEN1ZUJ1Y2tldHMsIGFzIGxvbmdcbiAgICAgICAgICAgICAgYXMgaW50ZXJ2YWwubG93IGFuZCBpbnRlcnZhbC5oaWdoIHZhbHVlcyBzdGF5IHVuY2hhbmdlZC5cbiAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAgICAgaWYgKGRlbHRhLmludGVydmFsID09IERlbHRhLk5PT1ApIHtcbiAgICAgICAgICAgIC8vIGRhdGEgY2hhbmdlcyBhcmUgcmVmbGVjdGVkIGluIGN1ZU1hcCBjaGFuZ2VzLFxuICAgICAgICAgICAgLy8gc2luY2UgZGF0YSBjaGFuZ2VzIGFyZSBtYWRlIGluLXBsYWNlLCB0aGVzZVxuICAgICAgICAgICAgLy8gY2hhbmdlcyB3aWxsIGJlIHZpc2libGUgaW4gY3VlcyByZWdpc3RlcmVkIGluXG4gICAgICAgICAgICAvLyBDdWVCdWNrZXRzXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoZGVsdGEuaW50ZXJ2YWwgPT0gRGVsdGEuSU5TRVJUKSB7XG4gICAgICAgICAgICByZW1vdmVfbmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICBhZGRfbmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvd19jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGhpZ2hfY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVsdGEuaW50ZXJ2YWwgPT0gRGVsdGEuREVMRVRFKSB7XG4gICAgICAgICAgICByZW1vdmVfbmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGFkZF9uZWVkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGxvd19jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGhpZ2hfY2hhbmdlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVsdGEuaW50ZXJ2YWwgPT0gRGVsdGEuUkVQTEFDRSkge1xuICAgICAgICAgICAgcmVtb3ZlX25lZWRlZCA9IHRydWU7XG4gICAgICAgICAgICBhZGRfbmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGxvd19jaGFuZ2VkID0gaXRlbS5uZXcuaW50ZXJ2YWwubG93ICE9IGl0ZW0ub2xkLmludGVydmFsLmxvdztcbiAgICAgICAgICAgIGhpZ2hfY2hhbmdlZCA9IGl0ZW0ubmV3LmludGVydmFsLmhpZ2ggIT0gaXRlbS5vbGQuaW50ZXJ2YWwuaGlnaDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBvbGQgY3VlIGFuZCBuZXcgY3VlIG1pZ2h0IG5vdCBiZWxvbmcgdG8gdGhlIHNhbWUgY3VlIGJ1Y2tldFxuICAgICAgICAqL1xuICAgICAgICBpZiAocmVtb3ZlX25lZWRlZCl7XG4gICAgICAgICAgICBsZXQgb2xkX2JpZCA9IGdldEN1ZUJ1Y2tldElkKGl0ZW0ub2xkLmludGVydmFsLmxlbmd0aCk7XG4gICAgICAgICAgICBvbGRDdWVCdWNrZXQgPSB0aGlzLl9jdWVCdWNrZXRzLmdldChvbGRfYmlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWRkX25lZWRlZCkge1xuICAgICAgICAgICAgbGV0IG5ld19iaWQgPSBnZXRDdWVCdWNrZXRJZChpdGVtLm5ldy5pbnRlcnZhbC5sZW5ndGgpO1xuICAgICAgICAgICAgbmV3Q3VlQnVja2V0ID0gdGhpcy5fY3VlQnVja2V0cy5nZXQobmV3X2JpZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgICAgaWYgb2xkIEN1ZUJ1Y2tldCBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgbmV3IGN1ZSBCdWNrZXRzXG4gICAgICAgICAgICBib3RoIGxvdyBhbmQgaGlnaCBtdXN0IGJlIG1vdmVkLCBldmVuIGl0IG9uZSB3YXMgbm90XG4gICAgICAgICAgICBjaGFuZ2VkXG4gICAgICAgICovXG4gICAgICAgIGlmIChvbGRDdWVCdWNrZXQgJiYgbmV3Q3VlQnVja2V0KSB7XG4gICAgICAgICAgICBpZiAob2xkQ3VlQnVja2V0ICE9IG5ld0N1ZUJ1Y2tldCkge1xuICAgICAgICAgICAgICAgIHJlbW92ZV9uZWVkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGFkZF9uZWVkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxvd19jaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBoaWdoX2NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIGRpc3BhdGNoIGFkZCBhbmQgcmVtb3ZlIG9wZXJhdGlvbnMgZm9yIGludGVydmFsIHBvaW50c1xuXG4gICAgICAgICAgICBjdWVzIGluIEN1ZUJ1Y2tldCBtYXkgYmUgcmVtb3ZlZCB1c2luZyBhIGNvcHkgb2YgdGhlIGN1ZSxcbiAgICAgICAgICAgIGJlY2F1c2UgcmVtb3ZlIGlzIGJ5IGtleS5cblxuICAgICAgICAgICAgY3VlcyBhZGRlZCB0byBDdWVCdWNrZXQgbXVzdCBiZSB0aGUgY29ycmVjdCBvYmplY3RcbiAgICAgICAgICAgIChjdXJyZW50X2N1ZSksIHNvIHRoYXQgbGF0ZXIgaW4tcGxhY2UgbW9kaWZpY2F0aW9ucyBiZWNvbWVcbiAgICAgICAgICAgIHJlZmxlY3RlZCBpbiBDdWVCdWNrZXQuXG4gICAgICAgICAgICBiYXRjaE1hcCBpdGVtLm5ldyBpcyB0aGUgY3VycmVudCBjdWUgb2JqZWN0LlxuICAgICAgICAqL1xuXG4gICAgICAgIC8vIHVwZGF0ZSBsb3cgcG9pbnQgLSBpZiBjaGFuZ2VkXG4gICAgICAgIGlmIChsb3dfY2hhbmdlZCkge1xuICAgICAgICAgICAgaWYgKHJlbW92ZV9uZWVkZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInJlbW92ZSBvbGQgbG93XCIsIGl0ZW0ub2xkLmludGVydmFsLmxvdyk7XG4gICAgICAgICAgICAgICAgb2xkQ3VlQnVja2V0LmRlbF9lbmRwb2ludChpdGVtLm9sZC5pbnRlcnZhbC5sb3csIGl0ZW0ub2xkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhZGRfbmVlZGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJhZGQgbmV3IGxvd1wiLCBpdGVtLm5ldy5pbnRlcnZhbC5sb3cpO1xuICAgICAgICAgICAgICAgIG5ld0N1ZUJ1Y2tldC5hZGRfZW5kcG9pbnQoaXRlbS5uZXcuaW50ZXJ2YWwubG93LCBpdGVtLm5ldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gdXBkYXRlIGhpZ2ggcG9pbnQgLSBpZiBjaGFuZ2VkXG4gICAgICAgIGlmIChoaWdoX2NoYW5nZWQpIHtcbiAgICAgICAgICAgIGlmIChyZW1vdmVfbmVlZGVkICYmICFpdGVtLm9sZC5pbnRlcnZhbC5zaW5ndWxhcikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmVtb3ZlIG9sZCBoaWdoXCIsIGl0ZW0ub2xkLmludGVydmFsLmhpZ2gpO1xuICAgICAgICAgICAgICAgIG9sZEN1ZUJ1Y2tldC5kZWxfZW5kcG9pbnQoaXRlbS5vbGQuaW50ZXJ2YWwuaGlnaCwgaXRlbS5vbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFkZF9uZWVkZWQgJiYgIWl0ZW0ubmV3LmludGVydmFsLnNpbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJhZGQgbmV3IGhpZ2hcIiwgaXRlbS5uZXcuaW50ZXJ2YWwuaGlnaCk7XG4gICAgICAgICAgICAgICAgbmV3Q3VlQnVja2V0LmFkZF9lbmRwb2ludChpdGVtLm5ldy5pbnRlcnZhbC5oaWdoLCBpdGVtLm5ldyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qXG4gICAgICAgIElOVEVSTkFMIEZVTkNUSU9OXG4gICAgICAgIGV4ZWN1dGUgbWV0aG9kIGFjcm9zcyBhbGwgY3VlIGJ1Y2tldHNcbiAgICAgICAgYW5kIGFnZ3JlZ2F0ZSByZXN1bHRzXG4gICAgKi9cbiAgICBfY2FsbF9idWNrZXRzKG1ldGhvZCwgLi4uYXJncykge1xuICAgICAgICBjb25zdCBhcnJheXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgY3VlQnVja2V0IG9mIHRoaXMuX2N1ZUJ1Y2tldHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGxldCBjdWVzID0gY3VlQnVja2V0W21ldGhvZF0oLi4uYXJncyk7XG4gICAgICAgICAgICBpZiAoY3VlcyAhPSB1bmRlZmluZWQgJiYgY3Vlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXJyYXlzLnB1c2goY3Vlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzLmFycmF5X2NvbmNhdChhcnJheXMpO1xuICAgIH07XG5cbiAgICAvKlxuICAgICAgICBMT09LVVAgRU5EUE9JTlRTXG5cbiAgICAgICAgcmV0dXJucyAoZW5kcG9pbnQsIGN1ZSkgZm9yIGFsbCBlbmRwb2ludHMgY292ZXJlZCBieSBnaXZlbiBpbnRlcnZhbFxuXG4gICAgICAgIHJldHVybnM6XG4gICAgICAgICAgICAtIFt7ZW5kcG9pbnQ6IGVuZHBvaW50LCBjdWU6Y3VlfV1cbiAgICAqL1xuXG4gICAgbG9va3VwX2VuZHBvaW50cyhpbnRlcnZhbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FsbF9idWNrZXRzKFwibG9va3VwX2VuZHBvaW50c1wiLCBpbnRlcnZhbCk7XG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICAgTE9PS1VQXG4gICAgKi9cblxuICAgIGxvb2t1cChpbnRlcnZhbCwgbWFzaykge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FsbF9idWNrZXRzKFwibG9va3VwXCIsIGludGVydmFsLCBtYXNrKTtcbiAgICB9O1xuXG5cbiAgICAvKlxuICAgICAgICBSRU1PVkUgQ1VFUyBCWSBJTlRFUlZBTFxuICAgICovXG4gICAgbG9va3VwX2RlbGV0ZShpbnRlcnZhbCwgbWFzaykge1xuICAgICAgICBjb25zdCBjdWVzID0gdGhpcy5fY2FsbF9idWNrZXRzKFwibG9va3VwX2RlbGV0ZVwiLCBpbnRlcnZhbCwgbWFzayk7XG4gICAgICAgIC8vIHJlbW92ZSBmcm9tIGN1ZU1hcCBhbmQgbWFrZSBldmVudHNcbiAgICAgICAgY29uc3QgZXZlbnRzID0gW107XG4gICAgICAgIGxldCBjdWU7XG4gICAgICAgIGZvciAobGV0IGk9MDsgaTxjdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjdWUgPSBjdWVzW2ldO1xuICAgICAgICAgICAgdGhpcy5fY3VlTWFwLmRlbGV0ZShjdWUua2V5KTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGZvciBlcXVhbGl0eVxuICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6IHVuZGVmaW5lZCwgb2xkOiBjdWV9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBldmVudCBub3RpZmljYXRpb25cbiAgICAgICAgdGhpcy5fbm90aWZ5RXZlbnRzKGV2ZW50cyk7XG4gICAgICAgIHJldHVybiBldmVudHM7XG4gICAgfTtcblxuICAgIC8qXG4gICAgICAgIENMRUFSIEFMTCBDVUVTXG4gICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgLy8gY2xlYXIgY3VlIEJ1Y2tldHNcbiAgICAgICAgdGhpcy5fY2FsbF9idWNrZXRzKFwiY2xlYXJcIik7XG4gICAgICAgIC8vIGNsZWFyIGN1ZU1hcFxuICAgICAgICBsZXQgY3VlTWFwID0gdGhpcy5fY3VlTWFwO1xuICAgICAgICB0aGlzLl9jdWVNYXAgPSBuZXcgTWFwKCk7XG4gICAgICAgIC8vIGNyZWF0ZSBjaGFuZ2UgZXZlbnRzIGZvciBhbGwgY3Vlc1xuICAgICAgICBjb25zdCBldmVudHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgY3VlIG9mIGN1ZU1hcC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTogY3VlLmtleSwgbmV3OiB1bmRlZmluZWQsIG9sZDogY3VlfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgIHRoaXMuX25vdGlmeUV2ZW50cyhldmVudHMpO1xuICAgICAgICByZXR1cm4gZXZlbnRzO1xuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIE1hcCBhY2Nlc3NvcnNcbiAgICAqL1xuXG4gICAgaGFzKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3VlTWFwLmhhcyhrZXkpO1xuICAgIH07XG5cbiAgICBnZXQoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdWVNYXAuZ2V0KGtleSk7XG4gICAgfTtcblxuICAgIGtleXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdWVNYXAua2V5cygpO1xuICAgIH07XG5cbiAgICB2YWx1ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdWVNYXAudmFsdWVzKCk7XG4gICAgfTtcblxuICAgIGVudHJpZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jdWVNYXAuZW50cmllcygpO1xuICAgIH1cblxuXG4gICAgLypcbiAgICAgICAgdXRpbGl0eVxuICAgICovXG4gICAgaW50ZWdyaXR5KCkge1xuICAgICAgICBjb25zdCByZXMgPSB0aGlzLl9jYWxsX2J1Y2tldHMoXCJpbnRlZ3JpdHlcIik7XG5cbiAgICAgICAgLy8gc3VtIHVwIGN1ZXMgYW5kIHBvaW50c1xuICAgICAgICBsZXQgY3VlcyA9IFtdO1xuICAgICAgICBsZXQgcG9pbnRzID0gW107XG4gICAgICAgIGZvciAobGV0IGJ1Y2tldEluZm8gb2YgcmVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBjdWVzLnB1c2goYnVja2V0SW5mby5jdWVzKTtcbiAgICAgICAgICAgIHBvaW50cy5wdXNoKGJ1Y2tldEluZm8ucG9pbnRzKTtcbiAgICAgICAgfVxuICAgICAgICBjdWVzID0gW10uY29uY2F0KC4uLmN1ZXMpO1xuICAgICAgICBwb2ludHMgPSBbXS5jb25jYXQoLi4ucG9pbnRzKTtcbiAgICAgICAgLy8gcmVtb3ZlIHBvaW50IGR1cGxpY2F0ZXMgaWYgYW55XG4gICAgICAgIHBvaW50cyA9IFsuLi5uZXcgU2V0KHBvaW50cyldO1xuXG4gICAgICAgIGlmIChjdWVzLmxlbmd0aCAhPSB0aGlzLl9jdWVNYXAuc2l6ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5jb25zaXN0ZW50IGN1ZSBjb3VudCBjdWVNYXAgYW5kIGFnZ3JlZ2F0ZSBjdWVCdWNrZXRzIFwiICsgY3Vlcy10aGlzLl9jdWVNYXAuc2l6ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjaGVjayB0aGF0IGN1ZXMgYXJlIHRoZSBzYW1lXG4gICAgICAgIGZvciAobGV0IGN1ZSBvZiBjdWVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2N1ZU1hcC5oYXMoY3VlLmtleSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbmNvbnNpc3RlbnQgY3VlcyBjdWVNYXAgYW5kIGFnZ3JlZ2F0ZSBjdWVCdWNrZXRzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGN1ZXM6IGN1ZXMubGVuZ3RoLFxuICAgICAgICAgICAgcG9pbnRzOiBwb2ludHMubGVuZ3RoXG4gICAgICAgIH07XG4gICAgfTtcblxufVxuXG5ldmVudGlmeS5ldmVudGlmeVByb3RvdHlwZShBeGlzLnByb3RvdHlwZSk7XG5cblxuXG5cbi8qXG4gICAgQ3VlQnVja2V0IGlzIGEgYnVja2V0IG9mIGN1ZXMgbGltaXRlZCB0byBzcGVjaWZpYyBsZW5ndGhcbiovXG5cblxuY2xhc3MgQ3VlQnVja2V0IHtcblxuXG4gICAgY29uc3RydWN0b3IobWF4TGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gbWF4IGxlbmd0aCBvZiBjdWVzIGluIHRoaXMgYnVja2V0XG4gICAgICAgIHRoaXMuX21heExlbmd0aCA9IG1heExlbmd0aDtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgcG9pbnRNYXAgbWFpbnRhaW5zIHRoZSBhc3NvY2lhdGlvbnMgYmV0d2VlbiB2YWx1ZXMgKHBvaW50cyBvblxuICAgICAgICAgICAgdGhlIHRpbWVsaW5lKSBhbmQgY3VlcyB0aGF0IHJlZmVyZW5jZSBzdWNoIHBvaW50cy4gQSBzaW5nbGUgcG9pbnQgdmFsdWUgbWF5IGJlXG4gICAgICAgICAgICByZWZlcmVuY2VkIGJ5IG11bHRpcGxlIGN1ZXMsIHNvIG9uZSBwb2ludCB2YWx1ZSBtYXBzIHRvIGEgbGlzdCBvZiBjdWVzLlxuXG4gICAgICAgICAgICB2YWx1ZSAtPiBbY3VlLCAuLi4uXVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLl9wb2ludE1hcCA9IG5ldyBNYXAoKTtcblxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBwb2ludEluZGV4IG1haW50YWlucyBhIHNvcnRlZCBsaXN0IG9mIG51bWJlcnMgZm9yIGVmZmljaWVudCBsb29rdXAuXG4gICAgICAgICAgICBBIGxhcmdlIHZvbHVtZSBvZiBpbnNlcnQgYW5kIHJlbW92ZSBvcGVyYXRpb25zIG1heSBiZSBwcm9ibGVtYXRpY1xuICAgICAgICAgICAgd2l0aCByZXNwZWN0IHRvIHBlcmZvcm1hbmNlLCBzbyB0aGUgaW1wbGVtZW50YXRpb24gc2Vla3MgdG9cbiAgICAgICAgICAgIGRvIGEgc2luZ2xlIGJ1bGsgdXBkYXRlIG9uIHRoaXMgc3RydWN0dXJlLCBmb3IgZWFjaCBiYXRjaCBvZiBjdWVcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgKGkuZS4gZWFjaCBpbnZvY2F0aW9ucyBvZiBhZGRDdWVzKS4gSW4gb3JkZXIgdG8gZG8gdGhpc1xuICAgICAgICAgICAgYWxsIGN1ZSBvcGVyYXRpb25zIGFyZSBwcm9jZXNzZWQgdG8gY2FsY3VsYXRlIGEgc2luZ2xlIGJhdGNoXG4gICAgICAgICAgICBvZiBkZWxldGVzIGFuZCBhIHNpbmdsZSBiYXRjaCBvZiBpbnNlcnRzIHdoaWNoIHRoZW4gd2lsbCBiZSBhcHBsaWVkIHRvXG4gICAgICAgICAgICB0aGUgcG9pbnRJbmRleCBpbiBvbmUgYXRvbWljIG9wZXJhdGlvbi5cblxuICAgICAgICAgICAgWzEuMiwgMywgNCwgOC4xLCAuLi4uXVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLl9wb2ludEluZGV4ID0gbmV3IEJpbmFyeVNlYXJjaCgpO1xuXG4gICAgICAgIC8vIGJvb2tlZXBpbmcgZHVyaW5nIGJhdGNoIHByb2Nlc3NpbmdcbiAgICAgICAgdGhpcy5fY3JlYXRlZCA9IG5ldyBTZXQoKTsgLy8gcG9pbnRcbiAgICAgICAgdGhpcy5fZGlydHkgPSBuZXcgU2V0KCk7IC8vIHBvaW50XG5cbiAgICB9O1xuXG5cbiAgICAvKlxuXG4gICAgICAgIEVORFBPSU5UIEJBVENIIFBST0NFU1NJTkdcblxuICAgICAgICBOZWVkcyB0byB0cmFuc2xhdGUgZW5kcG9pbnQgb3BlcmF0aW9ucyBpbnRvIGEgbWluaW11bSBzZXQgb2ZcbiAgICAgICAgb3BlcmF0aW9ucyBvbiB0aGUgcG9pbnRJbmRleC5cblxuICAgICAgICBUbyBkbyB0aGlzLCB3ZSBuZWVkIHRvIHJlY29yZCBwb2ludHMgdGhhdCBhcmUgY3JlYXRlZCBhbmRcbiAgICAgICAgcG9pbnRzIHRoYXQgYXJlIHJlbW92ZWQuXG5cbiAgICAgICAgVGhlIHRvdGFsIGRpZmZlcmVuY2UgdGhhdCB0aGUgYmF0Y2ggb2YgY3VlIG9wZXJhdGlvbnNcbiAgICAgICAgYW1vdW50cyB0byBpcyBleHByZXNzZWQgYXMgb25lIGxpc3Qgb2YgdmFsdWVzIHRvIGJlXG4gICAgICAgIGRlbGV0ZWQsIGFuZCBhbmQgb25lIGxpc3Qgb2YgdmFsdWVzIHRvIGJlIGluc2VydGVkLlxuICAgICAgICBUaGUgdXBkYXRlIG9wZXJhdGlvbiBvZiB0aGUgcG9pbnRJbmRleCB3aWxsIHByb2Nlc3MgYm90aFxuICAgICAgICBpbiBvbmUgYXRvbWljIG9wZXJhdGlvbi5cblxuICAgICAgICBPbiBmbHVzaCBib3RoIHRoZSBwb2ludE1hcCBhbmQgdGhlIHBvaW50SW5kZXggd2lsbCBiZSBicm91Z2h0XG4gICAgICAgIHVwIHRvIHNwZWVkXG5cbiAgICAgICAgY3JlYXRlZCBhbmQgZGlydHkgYXJlIHVzZWQgZm9yIGJvb2tlZXBpbmcgZHVyaW5nXG4gICAgICAgIHByb2Nlc3Npbmcgb2YgYSBjdWUgYmF0Y2guIFRoZXkgYXJlIG5lZWRlZCB0b1xuICAgICAgICBjcmVhdGUgdGhlIGNvcnJlY3QgZGlmZiBvcGVyYXRpb24gdG8gYmUgYXBwbGllZCBvbiBwb2ludEluZGV4LlxuXG4gICAgICAgIGNyZWF0ZWQgOiBpbmNsdWRlcyB2YWx1ZXMgdGhhdCB3ZXJlIG5vdCBpbiBwb2ludE1hcFxuICAgICAgICBiZWZvcmUgY3VycmVudCBiYXRjaCB3YXMgcHJvY2Vzc2VkXG5cbiAgICAgICAgZGlydHkgOiBpbmNsdWRlcyB2YWx1ZXMgdGhhdCB3ZXJlIGluIHBvaW50TWFwXG4gICAgICAgIGJlZm9yZSBjdXJyZW50IGJhdGNoIHdhcyBwcm9jZXNzZWQsIGFuZCB0aGF0XG4gICAgICAgIGhhdmUgYmVlbiBiZWNvbWUgZW1wdHkgYXQgbGVhc3QgYXQgb25lIHBvaW50IGR1cmluZyBjdWVcbiAgICAgICAgcHJvY2Vzc2luZy5cblxuICAgICAgICBjcmVhdGVkIGFuZCBkaXJ0eSBhcmUgdXNlZCBhcyB0ZW1wb3JhcnkgYWx0ZXJuYXRpdmVzIHRvIHBvaW50TWFwLlxuICAgICAgICBhZnRlciB0aGUgY3VlIHByb2Nlc3NpbmcsIHBvaW50bWFwIHdpbGwgdXBkYXRlZCBiYXNlZCBvbiB0aGVcbiAgICAgICAgY29udGVudHMgb2YgdGhlc2UgdHdvLlxuXG4gICAgICAgIHByb2Nlc3MgYnVmZmVycyBvcGVyYXRpb25zIGZvciBwb2ludE1hcCBhbmQgaW5kZXggc28gdGhhdFxuICAgICAgICBhbGwgb3BlcmF0aW9ucyBtYXkgYmUgYXBwbGllZCBpbiBvbmUgYmF0Y2guIFRoaXMgaGFwcGVucyBpbiBmbHVzaFxuICAgICovXG5cbiAgICBhZGRfZW5kcG9pbnQocG9pbnQsIGN1ZSkge1xuICAgICAgICBsZXQgaW5pdCA9ICh0aGlzLl9wb2ludE1hcC5zaXplID09IDApO1xuICAgICAgICBsZXQgY3VlcyA9IChpbml0KSA/IHVuZGVmaW5lZCA6IHRoaXMuX3BvaW50TWFwLmdldChwb2ludCk7XG4gICAgICAgIGlmIChjdWVzID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fcG9pbnRNYXAuc2V0KHBvaW50LCBbY3VlXSk7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVkLmFkZChwb2ludCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdWVzLnB1c2goY3VlKTtcbiAgICAgICAgICAgIC8vYWRkQ3VlVG9BcnJheShjdWVzLCBjdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVsX2VuZHBvaW50KHBvaW50LCBjdWUpIHtcbiAgICAgICAgbGV0IGluaXQgPSAodGhpcy5fcG9pbnRNYXAuc2l6ZSA9PSAwKTtcbiAgICAgICAgbGV0IGN1ZXMgPSAoaW5pdCkgPyB1bmRlZmluZWQgOiB0aGlzLl9wb2ludE1hcC5nZXQocG9pbnQpO1xuICAgICAgICBpZiAoY3VlcyAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBlbXB0eSA9IHJlbW92ZUN1ZUZyb21BcnJheShjdWVzLCBjdWUpO1xuICAgICAgICAgICAgaWYgKGVtcHR5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGlydHkuYWRkKHBvaW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKlxuICAgICAgICBCYXRjaCBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlZFxuICAgICAgICBDb21taXQgY2hhbmdlcyB0byBwb2ludEluZGV4IGFuZCBwb2ludE1hcC5cblxuICAgICAgICBwb2ludE1hcFxuICAgICAgICAtIHVwZGF0ZSB3aXRoIGNvbnRlbnRzIG9mIGNyZWF0ZWRcblxuICAgICAgICBwb2ludEluZGV4XG4gICAgICAgIC0gcG9pbnRzIHRvIGRlbGV0ZSAtIGRpcnR5IGFuZCBlbXB0eVxuICAgICAgICAtIHBvaW50cyB0byBpbnNlcnQgLSBjcmVhdGVkIGFuZCBub24tZW1wdHlcblxuICAgICAgICBpdCBpcyBwb3NzaWJsZSB0aGF0IGEgY3VlIGVuZHMgdXAgaW4gYm90aCBjcmVhdGVkIGFuZCBkaXJ0eVxuXG4gICAgKi9cbiAgICBmbHVzaCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NyZWF0ZWQuc2l6ZSA9PSAwICYmIHRoaXMuX2RpcnR5LnNpemUgPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIHBvaW50SW5kZXhcbiAgICAgICAgbGV0IHRvX3JlbW92ZSA9IFtdO1xuICAgICAgICBsZXQgdG9faW5zZXJ0ID0gW107XG4gICAgICAgIGZvciAobGV0IHBvaW50IG9mIHRoaXMuX2NyZWF0ZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGxldCBjdWVzID0gdGhpcy5fcG9pbnRNYXAuZ2V0KHBvaW50KTtcbiAgICAgICAgICAgIGlmIChjdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0b19pbnNlcnQucHVzaChwb2ludCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BvaW50TWFwLmRlbGV0ZShwb2ludCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcG9pbnQgb2YgdGhpcy5fZGlydHkudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGxldCBjdWVzID0gdGhpcy5fcG9pbnRNYXAuZ2V0KHBvaW50KTtcbiAgICAgICAgICAgIGlmIChjdWVzID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIHBvaW50IGFscmVhZHkgZGVsZXRlZCBmcm9tIGNyZWF0ZWQgc2V0IC0gaWdub3JlXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3Vlcy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIHRvX3JlbW92ZS5wdXNoKHBvaW50KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb2ludE1hcC5kZWxldGUocG9pbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BvaW50SW5kZXgudXBkYXRlKHRvX3JlbW92ZSwgdG9faW5zZXJ0KTtcbiAgICAgICAgLy8gY2xlYW51cFxuICAgICAgICB0aGlzLl9jcmVhdGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX2RpcnR5LmNsZWFyKCk7XG4gICAgfTtcblxuXG4gICAgLypcbiAgICAgICAgTE9PS1VQX0VORFBPSU5UU1xuXG4gICAgICAgIHJldHVybnMgYWxsIChlbmRwb2ludCwgY3VlKSBwYWlycyB3aGVyZVxuICAgICAgICAgICAgLSBlbmRwb2ludCBpcyBhIGN1ZSBlbmRwb2ludCAoY3VlLmVuZHBvaW50TG93IG9yIGN1ZS5lbmRwb2ludEhpZ2gpXG4gICAgICAgICAgICAtIGVuZHBvaW50IGlzIElOU0lERSBzZWFyY2ggaW50ZXJ2YWxcbiAgICAgICAgICAgIC0gW3tlbmRwb2ludDplbmRwb2ludCwgY3VlOiBjdWV9XVxuXG4gICAgICAgIC0gYSBnaXZlbiBlbmRwb2ludCBtYXkgYXBwZWFyIG11bHRpcGxlIHRpbWVzIGluIHRoZSByZXN1bHQsXG4gICAgICAgICAgYXMgbXVsdGlwbGUgY3VlcyBtYXkgYmUgdGllZCB0byB0aGUgc2FtZSBlbmRwb2ludFxuICAgICAgICAtIGEgZ2l2ZW4gY3VlIG1heSBhcHBlYXIgdHdvIHRpbWVzIGluIHRoZSByZXN1bHQsIGlmXG4gICAgICAgICAgYm90aCBjdWUuZW5kcG9pbnRMb3cgYW5kIGN1ZS5lbmRwb2ludEhpZ2ggYXJlIGJvdGggSU5TSURFIGludGVydmFsXG4gICAgICAgIC0gYSBzaW5ndWxhciBjdWUgd2lsbCBhcHBlYXIgb25seSBvbmNlXG4gICAgICAgIC0gb3JkZXJpbmc6IG5vIHNwZWNpZmljIG9yZGVyIGlzIGd1YXJhbnRlZWRcbiAgICAgICAgICAtIHJlc3VsdHMgYXJlIGNvbmNhdGVuYXRlZCBmcm9tIG11bHRpcGxlIEN1ZUJ1Y2tldHNcbiAgICAgICAgICAtIGludGVybmFsbHkgaW4gYSBzaW5nbGUgQ3VlQnVja2V0XG4gICAgICAgICAgICAtIG5vIGRlZmluZWQgb3JkZXIgZm9yIGN1ZXMgdGllZCB0byB0aGUgc2FtZSBlbmRwb2ludFxuICAgICAgICAgIC0gdGhlIG5hdHVyYWwgb3JkZXIgaXMgZW5kcG9pbnQgb3JkZXJcbiAgICAgICAgICAgIC0gYnV0IHRoaXMgY2FuIGJlIGFkZGVkIG9uIHRoZSBvdXRzaWRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgLSBubyBvcmRlciBpcyBkZWZpbmVkIGlmIHR3byBjdWVzIGhhdmUgZXhhY3RseSB0aGVcbiAgICAgICAgICAgICAgc2FtZSBlbmRwb2ludFxuXG4gICAgKi9cblxuICAgIGxvb2t1cF9lbmRwb2ludHMoaW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3QgYnJvYWRlcl9pbnRlcnZhbCA9IG5ldyBJbnRlcnZhbChpbnRlcnZhbC5sb3csIGludGVydmFsLmhpZ2gsIHRydWUsIHRydWUpO1xuICAgICAgICBjb25zdCBwb2ludHMgPSB0aGlzLl9wb2ludEluZGV4Lmxvb2t1cChicm9hZGVyX2ludGVydmFsKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgICAgIGNvbnN0IGxlbiA9IHBvaW50cy5sZW5ndGg7XG4gICAgICAgIGxldCBwb2ludCwgX2VuZHBvaW50O1xuICAgICAgICBmb3IgKGxldCBpPTA7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5fcG9pbnRNYXAuZ2V0KHBvaW50KVxuICAgICAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uIChjdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZ3VyZSBvdXQgaWYgcG9pbnQgaXMgZW5kcG9pbnQgbG93IG9yIGhpZ2hcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGUgY3VlIGlmIHRoZSBlbmRwb2ludCBpcyBpbnNpZGUgc2VhcmNoIGludGVydmFsXG4gICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb2ludCA9PSBjdWUuaW50ZXJ2YWwubG93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZW5kcG9pbnQgPSBjdWUuaW50ZXJ2YWwuZW5kcG9pbnRMb3c7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9pbnQgPT0gY3VlLmludGVydmFsLmhpZ2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbmRwb2ludCA9IGN1ZS5pbnRlcnZhbC5lbmRwb2ludEhpZ2g7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwb2ludClcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGN1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhdGFsOiBwb2ludCBjdWUgbWlzbWF0Y2hcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGludGVydmFsLmNvdmVyc19lbmRwb2ludChfZW5kcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh7ZW5kcG9pbnQ6X2VuZHBvaW50LCBjdWU6Y3VlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgLypcbiAgICAgICAgX0xPT0tVUCBDVUVTXG5cbiAgICAgICAgSW50ZXJuYWwgZnVuY3Rpb24sIHVzZWQgYnkgTE9PS1VQLlxuXG4gICAgICAgIFJldHVybiBsaXN0IG9mIGN1ZXNcbiAgICAgICAgLSBhbGwgY3VlcyB3aXRoIGF0IGxlYXN0IG9uZSBlbmRwb2ludCB2YWx1ZSB2LFxuICAgICAgICAgIHdoZXJlIGludGVydmFsLmxvdyA8PSB2IDw9IGludGVydmFsLmhpZ2hcbiAgICAgICAgLSBubyBkdXBsaWNhdGVzXG5cbiAgICAgICAgTm90ZSAtIHNvbWUgY3VlcyBtYXkgYmUgb3V0c2lkZSB0aGUgc2VhcmNoIGludGVydmFsXG4gICAgICAgIGUuZy4gaWYgdGhlIHNlYXJjaCBpbnRlcnZhbCBpcyBbLi4sIDQpIHRoZW5cbiAgICAgICAgKDQsIC4uLl0gd2lsbCBiZSByZXR1cm5lZCwgZXZlbiBpZiB0aGlzIHN0cmljdGx5XG4gICAgICAgIGlzIE9VVFNJREVfUklHSFQgdGhlIHNlYXJjaCBpbnRlcnZhbC5cbiAgICAgICAgVGhpcyBpcyBuZWNlc3NhcnkgaW4gbG9va3VwIGZvciBjb3JyZWN0IGNhbGN1bGF0aW9uIG9mIGNvdmVyc1xuICAgICAgICBmcm9tIGxlZnRfaW50ZXJ2YWwuXG4gICAgKi9cblxuICAgIF9sb29rdXBfY3VlcyhpbnRlcnZhbCkge1xuICAgICAgICBjb25zdCBicm9hZGVyX2ludGVydmFsID0gbmV3IEludGVydmFsKGludGVydmFsLmxvdywgaW50ZXJ2YWwuaGlnaCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHBvaW50cyA9IHRoaXMuX3BvaW50SW5kZXgubG9va3VwKGJyb2FkZXJfaW50ZXJ2YWwpO1xuICAgICAgICBjb25zdCBsZW4gPSBwb2ludHMubGVuZ3RoO1xuICAgICAgICBjb25zdCBjdWVTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuICAgICAgICBsZXQgbG93X2luc2lkZSwgaGlnaF9pbnNpZGU7XG4gICAgICAgIGZvciAobGV0IGk9MDsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgdGhpcy5fcG9pbnRNYXAuZ2V0KHBvaW50c1tpXSlcbiAgICAgICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihjdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXZvaWQgZHVwbGljYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VlU2V0LmhhcyhjdWUua2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VlU2V0LmFkZChjdWUua2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG5cblxuICAgIC8qXG4gICAgICAgIExPT0tVUFxuXG4gICAgICAgIFN0cmF0ZWd5IHNwbGl0IHRhc2sgaW50byB0d28gc3VidGFza3MsXG5cbiAgICAgICAgMSkgZmluZCBjdWVzIFtPVkVSTEFQX0xFRlQsIENPVkVSRUQsIEVRVUFMUywgT1ZFUkxBUF9SSUdIVF1cbiAgICAgICAgMikgZmluZCBjdWVzIFtDT1ZFUlNdXG5cbiAgICAgICAgLy8gbW9kZSBvcmRlclxuICAgICAgICBSZWxhdGlvbi5PVkVSTEFQX0xFRlQsXG4gICAgICAgIFJlbGF0aW9uLkNPVkVSRUQsXG4gICAgICAgIFJlbGF0aW9uLkVRVUFMUyxcbiAgICAgICAgUmVsYXRpb24uQ09WRVJTLFxuICAgICAgICBSZWxhdGlvbi5PVkVSTEFQX1JJR0hUXG4gICAgKi9cblxuXG4gICAgbG9va3VwKGludGVydmFsLCBtYXNrPUludGVydmFsLk1hdGNoLkNPVkVSUykge1xuXG4gICAgICAgIGxldCBjdWVzID0gW107XG5cbiAgICAgICAgLy8gaWdub3JlIGlsbGVnYWwgdmFsdWVzXG4gICAgICAgIG1hc2sgJj0gSW50ZXJ2YWwuTWF0Y2guQ09WRVJTO1xuXG4gICAgICAgIC8vIHNwZWNpYWwgY2FzZSBvbmx5IFtFUVVBTFNdXG4gICAgICAgIGlmIChtYXNrID09IFJlbGF0aW9uLkVRVUFMUykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BvaW50TWFwLmdldChpbnRlcnZhbC5sb3cpLmZpbHRlcihmdW5jdGlvbihjdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VlLmludGVydmFsLm1hdGNoKGludGVydmFsLCBSZWxhdGlvbi5FUVVBTFMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYW5kbGUgbWF0Y2ggd2l0aCB0aGUgYmFzaWMgbG9va3VwIG1hc2sgZmlyc3RcbiAgICAgICAgLy8gW09WRVJMQVBfTEVGVCwgQ09WRVJFRCwgRVFVQUxTLCBPVkVSTEFQX1JJR0hUXVxuICAgICAgICBsZXQgX21hc2sgPSBtYXNrICYgSW50ZXJ2YWwuTWF0Y2guT1ZFUkxBUDtcbiAgICAgICAgaWYgKF9tYXNrKSB7XG4gICAgICAgICAgICAvLyBrZWVwIGN1ZXMgd2hpY2ggbWF0Y2ggbG9va3VwIHBhcnQgb2YgYmFzaWMgbWFzayxcbiAgICAgICAgICAgIGN1ZXMgPSB0aGlzLl9sb29rdXBfY3VlcyhpbnRlcnZhbClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGN1ZSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdWUuaW50ZXJ2YWwubWF0Y2goaW50ZXJ2YWwsIF9tYXNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBpbnRlcnZhbHMgaW4gdGhpcyBDdWVCdWNrZXQgYXJlIGxpbWl0ZWQgYnkgbWF4TGVuZ3RoXG4gICAgICAgICAgICBpZiBpbnRlcnZhbC5sZW5ndGggaXMgbGFyZ2VyIHRoYW4gbWF4TGVuZ3RoLCBubyBjdWVcbiAgICAgICAgICAgIGluIHRoaXMgQ3VlQnVja2V0IGNhbiBjb3ZlciBpbnRlcnZhbFxuICAgICAgICAqL1xuICAgICAgICBpZiAoaW50ZXJ2YWwubGVuZ3RoID4gdGhpcy5fbWF4TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VlcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBoYW5kbGUgbWF0Y2ggd2l0aCBDT1ZFUlMgc2VwYXJhdGVseVxuXG4gICAgICAgICAgICBzZWFyY2ggbGVmdCBvZiBzZWFyY2ggaW50ZXJ2YWwgZm9yIGN1ZXNcbiAgICAgICAgICAgIHRoYXQgY292ZXJzIHRoZSBzZWFyY2ggaW50ZXJ2YWxcbiAgICAgICAgICAgIHNlYXJjaCBsZWZ0IGlzIGxpbWl0ZWQgYnkgQ3VlQnVja2V0IG1heGxlbmd0aFxuICAgICAgICAgICAgbGVmdF9pbnRlcnZhbDogW2ludGVydmFsLmhpZ2gtbWF4TGVuZ3RoLCBpbnRlcnZhbC5sb3ddXG5cbiAgICAgICAgICAgIGl0IHdvdWxkIGJlIHBvc3NpYmxlIHRvIHNlYXJjaCByaWdodCB0b28sIGJ1dCB3ZVxuICAgICAgICAgICAgaGF2ZSB0byBjaG9vc2Ugb25lLlxuICAgICAgICAqL1xuICAgICAgICBpZiAobWFzayAmIFJlbGF0aW9uLkNPVkVSUykge1xuICAgICAgICAgICAgbGV0IGxvdyA9IGludGVydmFsLmhpZ2ggLSB0aGlzLl9tYXhMZW5ndGg7XG4gICAgICAgICAgICBsZXQgaGlnaCA9IGludGVydmFsLmxvdztcbiAgICAgICAgICAgIGxldCBsZWZ0X2ludGVydmFsID0gbmV3IEludGVydmFsKGxvdywgaGlnaCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLl9sb29rdXBfY3VlcyhsZWZ0X2ludGVydmFsKVxuICAgICAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGN1ZSl7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdWUuaW50ZXJ2YWwubWF0Y2goaW50ZXJ2YWwsIFJlbGF0aW9uLkNPVkVSUykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ZXMucHVzaChjdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3VlcztcbiAgICB9XG5cblxuICAgIC8qXG4gICAgICAgIFJFTU9WRSBDVUVTXG4gICAgKi9cbiAgICBsb29rdXBfZGVsZXRlKGludGVydmFsLCBtYXNrKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgICB1cGRhdGUgcG9pbnRNYXBcbiAgICAgICAgICAgIC0gcmVtb3ZlIGFsbCBjdWVzIGZyb20gcG9pbnRNYXBcbiAgICAgICAgICAgIC0gcmVtb3ZlIGVtcHR5IGVudHJpZXMgaW4gcG9pbnRNYXBcbiAgICAgICAgICAgIC0gcmVjb3JkIHBvaW50cyB0aGF0IGJlY2FtZSBlbXB0eSwgYXMgdGhlc2UgbmVlZCB0byBiZSBkZWxldGVkIGluIHBvaW50SW5kZXhcbiAgICAgICAgICAgIC0gc2VwYXJhdGUgaW50byB0d28gYnVja2V0ZXMsIGluc2lkZSBhbmQgb3V0c2lkZVxuICAgICAgICAqL1xuICAgICAgICBjb25zdCBjdWVzID0gdGhpcy5sb29rdXAoaW50ZXJ2YWwsIG1hc2spO1xuICAgICAgICBjb25zdCB0b19yZW1vdmUgPSBbXTtcbiAgICAgICAgbGV0IGN1ZSwgcG9pbnQsIHBvaW50cztcbiAgICAgICAgZm9yIChsZXQgaT0wOyBpPGN1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGN1ZSA9IGN1ZXNbaV07XG4gICAgICAgICAgICAvLyBwb2ludHMgb2YgY3VlXG4gICAgICAgICAgICBpZiAoY3VlLmludGVydmFsLnNpbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgcG9pbnRzID0gW2N1ZS5pbnRlcnZhbC5sb3ddO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb2ludHMgPSBbY3VlLmludGVydmFsLmxvdywgY3VlLmludGVydmFsLmhpZ2hdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaj0wOyBqPHBvaW50cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2pdO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBjdWUgZnJvbSBwb2ludE1hcFxuICAgICAgICAgICAgICAgIC8vIGRlbGV0ZSBwb2ludE1hcCBlbnRyeSBvbmx5IGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgbGV0IGVtcHR5ID0gcmVtb3ZlQ3VlRnJvbUFycmF5KHRoaXMuX3BvaW50TWFwLmdldChwb2ludCksIGN1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGVtcHR5KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BvaW50TWFwLmRlbGV0ZShwb2ludCk7XG4gICAgICAgICAgICAgICAgICAgIHRvX3JlbW92ZS5wdXNoKHBvaW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgICAgdXBkYXRlIHBvaW50SW5kZXhcblxuICAgICAgICAgICAgLSByZW1vdmUgYWxsIHBvaW50cyB3aXRoaW4gcG9pbnRJbmRleFxuICAgICAgICAgICAgLSBleHBsb2l0IGxvY2FsaXR5LCB0aGUgb3BlcmF0aW9uIGlzIGxpbWl0ZWQgdG8gYSBzZWdtZW50IG9mIHRoZSBpbmRleCwgc29cbiAgICAgICAgICAgICAgdGhlIGJhc2ljIGlkZWEgaXMgdG8gdGFrZSBvdXQgYSBjb3B5IG9mIHNlZ21lbnQgKHNsaWNlKSwgZG8gbW9kaWZpY2F0aW9ucywgYW5kIHRoZW4gcmVpbnNlcnQgKHNwbGljZSlcbiAgICAgICAgICAgIC0gdGhlIHNlZ21lbnQgdG8gbW9kaWZ5IGlzIGxpbWl0ZWQgYnkgW2ludGVydmFsLmxvdyAtIG1heExlbmd0aCwgaW50ZXJ2YWwuaGlnaCArIG1heExlbmdodF0gYXMgdGhpcyB3aWxsIGNvdmVyXG4gICAgICAgICAgICAgIGJvdGggY3VlcyBpbnNpZGUsIHBhcnRpYWwgYW5kIG92ZXJsYXBwaW5nLlxuXG4gICAgICAgICAgICAjIFBvc3NpYmxlIC0gb3B0aW1pemF0aW9uXG4gICAgICAgICAgICBhbHRlcm5hdGl2ZSBhcHByb2FjaCB1c2luZyByZWd1bGFyIHVwZGF0ZSBjb3VsZCBiZSBtb3JlIGVmZmljaWVudCBmb3IgdmVyeSBzYW1sbCBiYXRjaGVzXG4gICAgICAgICAgICB0aGlzLl9wb2ludEluZGV4LnVwZGF0ZSh0b19yZW1vdmUsIFtdKTtcbiAgICAgICAgICAgIGl0IGNvdWxkIGFsc28gYmUgY29tcGFyYWJsZSBmb3IgaHVnZSBsb2FkcyAoMjUwLjAwMCBjdWVzKVxuICAgICAgICAqL1xuXG4gICAgICAgIHRvX3JlbW92ZS5zb3J0KGZ1bmN0aW9uKGEsYil7cmV0dXJuIGEtYn0pO1xuICAgICAgICB0aGlzLl9wb2ludEluZGV4LnJlbW92ZUluU2xpY2UodG9fcmVtb3ZlKTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgYWx0ZXJuYXRpdmUgc29sdXRpb25cbiAgICAgICAgICAgIHRoaXMuX3BvaW50SW5kZXgudXBkYXRlKHRvX3JlbW92ZSwgW10pO1xuICAgICAgICAqL1xuXG4gICAgICAgIHJldHVybiBjdWVzO1xuICAgIH07XG5cblxuICAgIC8qXG4gICAgICAgIFBvc3NpYmxlIG9wdGltaXphdGlvbi4gSW1wbGVtZW50IGEgcmVtb3ZlY3VlcyBtZXRob2QgdGhhdFxuICAgICAgICBleHBsb2l0cyBsb2NhbGl0eSBieSByZW1vdmluZyBhbiBlbnRpcmUgc2xpY2Ugb2YgcG9pbnRJbmRleC5cbiAgICAgICAgLSB0aGlzIGNhbiBzYWZlbHkgYmUgZG9uZSBmb3IgTG9va3VwTWV0aG9kLk9WRVJMQVAgYW5kIFBBUlRJQUwuXG4gICAgICAgIC0gaG93ZXZlciwgZm9yIExvb2t1cE1ldGhvZC5JTlNJREUsIHdoaWNoIGlzIGxpa2VseSB0aGUgbW9zdCB1c2VmdWxcbiAgICAgICAgICBvbmx5IHNvbWUgb2YgdGhlIHBvaW50cyBpbiBwb2ludEluZGV4IHNoYWxsIGJlIHJlbW92ZWRcbiAgICAgICAgICBzb2x1dGlvbiBjb3VsZCBiZSB0byByZW1vdmUgZW50aXJlIHNsaWNlLCBjb25zdHJ1Y3QgYSBuZXcgc2xpY2VcbiAgICAgICAgICB3aXRoIHRob3NlIHBvaW50cyB0aGF0IHNob3VsZCBub3QgYmUgZGVsZXRlZCwgYW5kIHNldCBpdCBiYWNrIGluLlxuICAgICovXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuX3BvaW50TWFwLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3BvaW50SW5kZXggPSBuZXcgQmluYXJ5U2VhcmNoKCk7XG4gICAgICAgIHRoaXMuX2NyZWF0ZWQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fZGlydHkuY2xlYXIoKTtcbiAgICB9O1xuXG5cbiAgICAvKlxuICAgICAgICBJbnRlZ3JpdHkgdGVzdCBmb3IgY3VlIGJ1Y2tldCBkYXRhc3RydWN0dXJlc1xuICAgICAgICBwb2ludE1hcCBhbmQgcG9pbnRJbmRleFxuICAgICovXG4gICAgaW50ZWdyaXR5KCkge1xuXG4gICAgICAgIGlmICh0aGlzLl9wb2ludE1hcC5zaXplICE9PSB0aGlzLl9wb2ludEluZGV4Lmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5lcXVhbCBudW1iZXIgb2YgcG9pbnRzIFwiICsgKHRoaXMuX3BvaW50TWFwLnNpemUgLSB0aGlzLl9wb2ludEluZGV4Lmxlbmd0aCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgdGhhdCB0aGUgc2FtZSBjdWVzIGFyZSBwcmVzZW50IGluIGJvdGggcG9pbnRNYXAgYW5kIHBvaW50SW5kZXhcbiAgICAgICAgY29uc3QgbWlzc2luZyA9IG5ldyBTZXQoKTtcbiAgICAgICAgZm9yIChsZXQgcG9pbnQgb2YgdGhpcy5fcG9pbnRJbmRleC52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9wb2ludE1hcC5oYXMocG9pbnQpKXtcbiAgICAgICAgICAgICAgICBtaXNzaW5nLmFkZChwb2ludCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1pc3Npbmcuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImRpZmZlcmVuY2VzIGluIHBvaW50cyBcIiArIFsuLi5taXNzaW5nXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb2xsZWN0IGFsbCBjdWVzXG4gICAgICAgIGxldCBjdWVzID0gW107XG4gICAgICAgIGZvciAobGV0IF9jdWVzIG9mIHRoaXMuX3BvaW50TWFwLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBjdWUgb2YgX2N1ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBjdWVzLnB1c2goY3VlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmUgZHVwbGljYXRlc1xuICAgICAgICBjdWVzID0gWy4uLm5ldyBNYXAoY3Vlcy5tYXAoZnVuY3Rpb24oY3VlKXtcbiAgICAgICAgICAgIHJldHVybiBbY3VlLmtleSwgY3VlXTtcbiAgICAgICAgfSkpLnZhbHVlcygpXTtcblxuICAgICAgICAvLyBjaGVjayBhbGwgY3Vlc1xuICAgICAgICBmb3IgKGxldCBjdWUgb2YgY3Vlcy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGN1ZS5pbnRlcnZhbC5sZW5ndGggPiB0aGlzLl9tYXhMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjdWUgaW50ZXJ2YWwgdmlvbGF0ZXMgbWF4TGVuZ3RoIFwiLCAgY3VlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBwb2ludHM7XG4gICAgICAgICAgICBpZiAoY3VlLnNpbmd1bGFyKSB7XG4gICAgICAgICAgICAgICAgcG9pbnRzID0gW2N1ZS5pbnRlcnZhbC5sb3ddO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb2ludHMgPSBbY3VlLmludGVydmFsLmxvdywgY3VlLmludGVydmFsLmhpZ2hdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgcG9pbnQgb2YgcG9pbnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9wb2ludEluZGV4Lmhhcyhwb2ludCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicG9pbnQgZnJvbSBwb2ludE1hcCBjdWUgbm90IGZvdW5kIGluIHBvaW50SW5kZXggXCIsIHBvaW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgIG1heExlbmd0aDogdGhpcy5fbWF4TGVuZ3RoLFxuICAgICAgICAgICAgcG9pbnRzOiBbLi4udGhpcy5fcG9pbnRNYXAua2V5cygpXSxcbiAgICAgICAgICAgIGN1ZXM6IGN1ZXNcbiAgICAgICAgfV07XG4gICAgfTtcblxufVxuXG5cblxuXG4vLyBtb2R1bGUgZGVmaW5pdGlvblxuZXhwb3J0IGRlZmF1bHQgQXhpcztcbiIsIi8qXG4gICAgQ29weXJpZ2h0IDIwMjBcbiAgICBBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cblxuaW1wb3J0IGVuZHBvaW50IGZyb20gJy4uL3V0aWwvZW5kcG9pbnQuanMnO1xuaW1wb3J0IEludGVydmFsIGZyb20gJy4uL3V0aWwvaW50ZXJ2YWwuanMnO1xuaW1wb3J0IFRpbWVvdXQgZnJvbSAnLi4vdXRpbC90aW1lb3V0LmpzJztcbmltcG9ydCAqIGFzIG1vdGlvbnV0aWxzIGZyb20gJy4uL3V0aWwvbW90aW9udXRpbHMuanMnO1xuXG5jb25zdCBwZnQgPSBtb3Rpb251dGlscy5wb3NJbnRlcnZhbF9mcm9tX3RpbWVJbnRlcnZhbDtcblxuZnVuY3Rpb24gcXVldWVDbXAoYSxiKSB7XG4gICAgcmV0dXJuIGVuZHBvaW50LmNtcChhLnRzRW5kcG9pbnQsIGIudHNFbmRwb2ludCk7XG59O1xuXG5jbGFzcyBTY2hlZHVsZSB7XG5cbiAgICAvLyBEZWZhdWx0IGxvb2thaGVhZCBpbiBzZWNvbmRzXG4gICAgc3RhdGljIExPT0tBSEVBRCA9IDVcblxuICAgIGNvbnN0cnVjdG9yKGF4aXMsIHRvLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIHRpbWluZ29iamVjdFxuICAgICAgICB0aGlzLnRvID0gdG87XG4gICAgICAgIC8vIGN1cnJlbnQgdGltZW91dFxuICAgICAgICB0aGlzLnRpbWVvdXQgPSBuZXcgVGltZW91dCh0bywgdGhpcy5ydW4uYmluZCh0aGlzKSk7XG4gICAgICAgIC8vIGN1cnJlbnQgdmVjdG9yXG4gICAgICAgIHRoaXMudmVjdG9yO1xuICAgICAgICAvLyBjdXJyZW50IHRpbWUgaW50ZXJ2YWxcbiAgICAgICAgdGhpcy50aW1lSW50ZXJ2YWw7XG4gICAgICAgIC8vIGN1cnJlbnQgcG9zaXRpb24gaW50ZXJ2YWxcbiAgICAgICAgdGhpcy5wb3NJbnRlcnZhbDtcbiAgICAgICAgLy8gYXhpc1xuICAgICAgICB0aGlzLmF4aXMgPSBheGlzO1xuICAgICAgICAvLyB0YXNrIHF1ZXVlXG4gICAgICAgIHRoaXMucXVldWUgPSBbXTtcbiAgICAgICAgLy8gY2FsbGJhY2tzXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgIC8vIG9wdGlvbnNcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9wdGlvbnMubG9va2FoZWFkID0gb3B0aW9ucy5sb29rYWhlYWQgfHwgU2NoZWR1bGUuTE9PS0FIRUFEO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBDQUxMQkFDS1NcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBhZGRfY2FsbGJhY2sgKGhhbmRsZXIpIHtcbiAgICAgICAgbGV0IGhhbmRsZSA9IHtcbiAgICAgICAgICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKGhhbmRsZSk7XG4gICAgICAgIHJldHVybiBoYW5kbGU7XG4gICAgfTtcblxuICAgIGRlbF9jYWxsYmFjayAoaGFuZGxlKSB7XG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMuY2FsbGJhY2tzLmluZGV4b2YoaGFuZGxlKTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgX25vdGlmeV9jYWxsYmFja3MgKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIGhhbmRsZS5oYW5kbGVyKC4uLmFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBNT1RJT04gQ0hBTkdFXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgLypcbiAgICAgICAgdXBkYXRlIHNjaGVkdWxlIHdpdGggbmV3IG1vdGlvbiB2ZWN0b3JcbiAgICAqL1xuICAgIHNldFZlY3Rvcih2ZWN0b3IpIHtcbiAgICAgICAgbGV0IG5vdyA9IHZlY3Rvci50aW1lc3RhbXA7XG4gICAgICAgIC8vIGNsZWFuIHVwIGN1cnJlbnQgbW90aW9uXG4gICAgICAgIGxldCBjdXJyZW50X3ZlY3RvciA9IHRoaXMudmVjdG9yO1xuICAgICAgICBpZiAodGhpcy52ZWN0b3IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMudGltZUludGVydmFsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5wb3NJbnRlcnZhbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMucXVldWUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgdmVjdG9yXG4gICAgICAgIHRoaXMudmVjdG9yID0gdmVjdG9yO1xuICAgICAgICAvLyBzdGFydCBzY2hlZHVsZXIgaWYgbW92aW5nXG4gICAgICAgIGlmIChtb3Rpb251dGlscy5pc01vdmluZyh0aGlzLnZlY3RvcikpIHtcbiAgICAgICAgICAgIHRoaXMucnVuKG5vdyk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgVEFTSyBRVUVVRVxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIC8qXG4gICAgICAgIHB1c2ggZXZlbnRJdGVtIG9udG8gcXVldWVcbiAgICAqL1xuICAgIHB1c2goZXZlbnRJdGVtcykge1xuICAgICAgICBldmVudEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZUludGVydmFsLmNvdmVyc19lbmRwb2ludChpdGVtLnRzRW5kcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5xdWV1ZS5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgLy8gbWFpbnRhaW4gb3JkZXJpbmdcbiAgICAgICAgdGhpcy5xdWV1ZS5zb3J0KHF1ZXVlQ21wKTtcbiAgICB9O1xuXG4gICAgLypcbiAgICAgICAgcG9wIGR1ZSBldmVudEl0ZW1zIGZyb20gcXVldWVcbiAgICAqL1xuICAgIHBvcChub3cpIHtcbiAgICAgICAgbGV0IGV2ZW50SXRlbSwgcmVzID0gW107XG4gICAgICAgIGxldCBsZW4gPSB0aGlzLnF1ZXVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKHRoaXMucXVldWUubGVuZ3RoID4gMCAmJiB0aGlzLnF1ZXVlWzBdLnRzRW5kcG9pbnRbMF0gPD0gbm93KSB7XG4gICAgICAgICAgICByZXMucHVzaCh0aGlzLnF1ZXVlLnNoaWZ0KCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcblxuICAgIC8qXG4gICAgICAgIHJldHVybiB0aW1lc3RhbXAgb2YgbmV4dCBldmVudEl0ZW1cbiAgICAqL1xuICAgIG5leHQoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5xdWV1ZS5sZW5ndGggPiAwKSA/IHRoaXMucXVldWVbMF0udHNFbmRwb2ludFswXTogdW5kZWZpbmVkO1xuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICBBRFZBTkNFIFRJTUVJTlRFUlZBTC9QT1NJTlRFUlZBTFxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG4gICAgLypcbiAgICAgICAgYWR2YW5jZSB0aW1lSW50ZXJ2YWwgYW5kIHBvc0ludGVydmFsIGlmIG5lZWRlZFxuICAgICovXG4gICAgYWR2YW5jZShub3cpIHtcbiAgICAgICAgbGV0IHN0YXJ0LCBkZWx0YSA9IHRoaXMub3B0aW9ucy5sb29rYWhlYWQ7XG4gICAgICAgIGxldCBhZHZhbmNlID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnRpbWVJbnRlcnZhbCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gbm93O1xuICAgICAgICAgICAgYWR2YW5jZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoZW5kcG9pbnQubGVmdG9mKHRoaXMudGltZUludGVydmFsLmVuZHBvaW50SGlnaCwgbm93KSkge1xuICAgICAgICAgICAgc3RhcnQgPSB0aGlzLnRpbWVJbnRlcnZhbC5oaWdoO1xuICAgICAgICAgICAgYWR2YW5jZSA9IHRydWVcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWR2YW5jZSkge1xuICAgICAgICAgICAgLy8gYWR2YW5jZSBpbnRlcnZhbHNcbiAgICAgICAgICAgIHRoaXMudGltZUludGVydmFsID0gbmV3IEludGVydmFsKHN0YXJ0LCBzdGFydCArIGRlbHRhLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLnBvc0ludGVydmFsID0gcGZ0KHRoaXMudGltZUludGVydmFsLCB0aGlzLnZlY3Rvcik7XG4gICAgICAgICAgICAvLyBjbGVhciB0YXNrIHF1ZXVlXG4gICAgICAgICAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFkdmFuY2U7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIExPQURcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAvKlxuICAgICAgICBsb2FkIGV2ZW50c1xuICAgICovXG5cbiAgICBsb2FkKGVuZHBvaW50cywgbWluaW11bV90c0VuZHBvaW50KSB7XG4gICAgICAgIGxldCBlbmRwb2ludEV2ZW50cyA9IG1vdGlvbnV0aWxzLmVuZHBvaW50RXZlbnRzKHRoaXMudGltZUludGVydmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvc0ludGVydmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnRzKTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgSVNTVUUgMVxuXG4gICAgICAgICAgICBSYW5nZSB2aW9sYXRpb24gbWlnaHQgb2NjdXIgd2l0aGluIHRpbWVJbnRlcnZhbC5cbiAgICAgICAgICAgIEFsbCBlbmRwb2ludEV2ZW50cyB3aXRoIC50c0VuZHBvaW50IGxhdGVyIG9yIGVxdWFsIHRvIHJhbmdlXG4gICAgICAgICAgICB2aW9sYXRpb24gd2lsbCBiZSBjYW5jZWxsZWQuXG4gICAgICAgICovXG4gICAgICAgIGxldCByYW5nZV90cyA9IG1vdGlvbnV0aWxzLnJhbmdlSW50ZXJzZWN0KHRoaXMudmVjdG9yLCB0aGlzLnRvLnJhbmdlKVswXTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgSVNTVUUgMlxuXG4gICAgICAgICAgICBJZiBsb2FkIGlzIHVzZWQgaW4gcmVzcG9uc2UgdG8gZHluYW1pY2FsbHkgYWRkZWQgY3VlcywgdGhlXG4gICAgICAgICAgICBpbnZvY2F0aW9uIG9mIGxvYWQgbWlnaHQgb2Njb3IgYXQgYW55IHRpbWUgZHVyaW5nIHRoZSB0aW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICBhcyBvcHBvc2VkIHRvIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBzdGFydCBvZiB0aW1lSW50ZXJ2YWwuXG4gICAgICAgICAgICBUaGlzIGFnYWluIGltcGxpZXMgdGhhdCBzb21lIG9mIHRoZSBlbmRQb2ludEV2ZW50cyB3ZSBoYXZlIGZvdW5kXG4gICAgICAgICAgICBmcm9tIHRoZSBlbnRpcmUgdGltZUludGVydmFsIG1pZ2h0IGFscmVhZHkgYmUgaGlzdG9yaWMgYXQgdGltZSBvZlxuICAgICAgICAgICAgaW52b2NhdGlvbi5cblxuICAgICAgICAgICAgQ2FuY2VsIGVuZHBvaW50RXZlbnRzIHdpdGggLnRzRW5kcG9pbnQgPCBtaW5pbXVtX3RzLlxuXG4gICAgICAgICAgICBGb3IgcmVndWxhciBsb2FkcyB0aGlzIHdpbGwgaGF2ZSBubyBlZmZlY3Qgc2luY2Ugd2VcbiAgICAgICAgICAgIGRvIG5vdCBzcGVjaWZ5IGEgbWluaW11bV90cywgYnV0IGluc3RlYWQgbGV0IGl0IGFzc3VtZSB0aGVcbiAgICAgICAgICAgIGRlZmF1bHQgdmFsdWUgb2YgdGltZUludGVydmFsLmxvdy5cbiAgICAgICAgKi9cbiAgICAgICAgaWYgKG1pbmltdW1fdHNFbmRwb2ludCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG1pbmltdW1fdHNFbmRwb2ludCA9IHRoaXMudGltZUludGVydmFsLmVuZHBvaW50TG93O1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIElTU1VFIDNcblxuICAgICAgICAgICAgV2l0aCBhY2NlbGVyYXRpb24gdGhlIG1vdGlvbiBtaWdodCBjaGFuZ2UgZGlyZWN0aW9uIGF0XG4gICAgICAgICAgICBzb21lIHBvaW50LCB3aGljaCBtaWdodCBhbHNvIGJlIGEgY3VlIGVuZHBvaW50LiBJbiB0aGlzXG4gICAgICAgICAgICBjYXNlLCBtb3Rpb24gdG91Y2hlcyB0aGUgY3VlIGVuZHBvaW50IGJ1dCBkb2VzIG5vdCBhY3R1YWxseVxuICAgICAgICAgICAgY3Jvc3Mgb3ZlciBpdC5cblxuICAgICAgICAgICAgRm9yIHNpbXBsaWNpdHkgd2Ugc2F5IHRoYXQgdGhpcyBzaG91bGQgbm90IGNoYW5nZSB0aGVcbiAgICAgICAgICAgIGFjdGl2ZSBzdGF0ZSBvZiB0aGF0IGN1ZS4gVGhlIGN1ZSBpcyBlaXRoZXIgbm90IGFjdGl2YXRlZFxuICAgICAgICAgICAgb3Igbm90IGluYWN0aXZhdGVkIGJ5IHRoaXMgb2NjdXJyZW5jZS4gV2UgbWlnaHQgdGhlcmVmb3JcbiAgICAgICAgICAgIHNpbXBseSBkcm9wIHN1Y2ggZW5kcG9pbnRFdmVudHMuXG5cbiAgICAgICAgICAgIFRvIGRldGVjdCB0aGlzLCBub3RlIHRoYXQgdmVsb2NpdHkgd2lsbCBiZSBleGFjdGx5IDBcbiAgICAgICAgICAgIGV2YWx1YXRlZCBhdCB0aGUgY3VlIGVuZHBvaW50LCBidXQgYWNjZWxlcmF0aW9uIHdpbGwgYmUgbm9uemVyby5cblxuICAgICAgICAgICAgSW1wb3J0YW50bHksIHRoZXJlIGlzIG9uZSBleGNlcHRpb24uIERyb3BwaW5nIHN1Y2ggZXZlbnRzXG4gICAgICAgICAgICBzaG91bGQgb25seSBoYXBwZW4gd2hlbiAwIHZlbG9jaXR5IGlzIHJlYWNoZWQgZHVyaW5nIG1vdGlvbixcbiAgICAgICAgICAgIG5vdCBhdCB0aGUgc3RhcnQgb2YgYSBtb3Rpb24uIEZvciBpbnN0YW5jZSwgaW4gdGhlIGNhc2Ugb2ZcbiAgICAgICAgICAgIHN0YXJ0aW5nIHdpdGggYWNjZWxlcmF0aW9uIGJ1dCBubyB2ZWxvY2l0eSwgZnJvbSBhIGN1ZVxuICAgICAgICAgICAgZW5kcG9pbnQsIHRoaXMgZXZlbnQgc2hvdWxkIG5vdCBiZSBkcm9wcGVkLlxuICAgICAgICAgICAgVGhpcyBpcyBhdm9pZGVkIGJ5IHJlcXVpcmluZyB0aGF0IHRoZSB0c0VuZHBvaW50IGlzIG5vdFxuICAgICAgICAgICAgZXF1YWwgdG8gdGltZUludGVydmFsLmVuZHBvaW50TG93XG5cbiAgICAgICAgKi9cblxuICAgICAgICByZXR1cm4gZW5kcG9pbnRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIC8vIElTU1VFIDFcbiAgICAgICAgICAgIGlmIChyYW5nZV90cyA8PSBpdGVtLnRzRW5kcG9pbnRbMF0pIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImlzc3VlMVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElTU1VFIDJcbiAgICAgICAgICAgIGlmIChlbmRwb2ludC5sZWZ0b2YoaXRlbS50c0VuZHBvaW50LCBtaW5pbXVtX3RzRW5kcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJpc3N1ZTJcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSVNTVUUgM1xuICAgICAgICAgICAgLy8gY2hlY2tzIGV2ZXJ5IGV2ZW50LiBhbHRlcm5hdGl2ZSBhcHByb2FjaCB3b3VsZCBiZVxuICAgICAgICAgICAgLy8gdG8gY2FsY3VsYXRlIHRoZSB0cyBvZiB0aGlzIGV2ZW50IG9uY2UsIGFuZCBjb21wYXJlXG4gICAgICAgICAgICAvLyB0aGUgcmVzdWx0IHRvIHRoZSB0cyBvZiBhbGwgZXZlbnRcbiAgICAgICAgICAgIGlmICh0aGlzLnZlY3Rvci5hY2NlbGVyYXRpb24gIT0gMC4wKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRzID0gaXRlbS50c0VuZHBvaW50WzBdO1xuICAgICAgICAgICAgICAgIGlmICh0cyA+IHRoaXMudGltZUludGVydmFsLmVuZHBvaW50TG93WzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2ID0gbW90aW9udXRpbHMuY2FsY3VsYXRlVmVjdG9yKHRoaXMudmVjdG9yLCB0cyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2LnBvc2l0aW9uID09IGl0ZW0uZW5kcG9pbnRbMF0gJiYgdi52ZWxvY2l0eSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgICAgIFJVTlxuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIC8qXG4gICAgICAgIHJ1biBzY2hlZHVsZVxuICAgICovXG4gICAgcnVuKG5vdykge1xuICAgICAgICAvLyBwcm9jZXNzIC0gZHVlIGV2ZW50c1xuICAgICAgICBsZXQgZHVlRXZlbnRzID0gdGhpcy5wb3Aobm93KTtcbiAgICAgICAgLy8gYWR2YW5jZSBzY2hlZHVsZSBhbmQgbG9hZCBldmVudHMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0aGlzLmFkdmFuY2Uobm93KSkge1xuICAgICAgICAgICAgLy8gZmV0Y2ggY3VlIGVuZHBvaW50cyBmb3IgcG9zSW50ZXJ2YWxcbiAgICAgICAgICAgIGxldCBlbmRwb2ludEl0ZW1zID0gdGhpcy5heGlzLmxvb2t1cF9lbmRwb2ludHModGhpcy5wb3NJbnRlcnZhbCk7XG4gICAgICAgICAgICAvLyBsb2FkIGV2ZW50cyBhbmQgcHVzaCBvbiBxdWV1ZVxuICAgICAgICAgICAgdGhpcy5wdXNoKHRoaXMubG9hZChlbmRwb2ludEl0ZW1zKSk7XG4gICAgICAgICAgICAvLyBwcm9jZXNzIC0gcG9zc2libHkgbmV3IGR1ZSBldmVudHNcbiAgICAgICAgICAgIGR1ZUV2ZW50cy5wdXNoKC4uLnRoaXMucG9wKG5vdykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkdWVFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fbm90aWZ5X2NhbGxiYWNrcyhub3csIGR1ZUV2ZW50cywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGltZW91dCAtIHVudGlsIG5leHQgZHVlIGV2ZW50XG4gICAgICAgIGxldCB0cyA9IHRoaXMubmV4dCgpIHx8IHRoaXMudGltZUludGVydmFsLmhpZ2g7XG4gICAgICAgIHRoaXMudGltZW91dC5zZXRUaW1lb3V0KE1hdGgubWluKHRzLCB0aGlzLnRpbWVJbnRlcnZhbC5oaWdoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTY2hlZHVsZTtcblxuIiwiLypcbiAgICBDb3B5cmlnaHQgMjAyMFxuICAgIEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuaW1wb3J0IHttYXBfaW50ZXJzZWN0LCBtYXBfZGlmZmVyZW5jZX0gZnJvbSAnLi4vdXRpbC91dGlscy5qcyc7XG5pbXBvcnQgSW50ZXJ2YWwgZnJvbSAnLi4vdXRpbC9pbnRlcnZhbC5qcyc7XG5pbXBvcnQgZXZlbnRpZnkgZnJvbSAnLi4vdXRpbC9ldmVudGlmeS5qcyc7XG5pbXBvcnQgQXhpcyBmcm9tICcuL2F4aXMuanMnO1xuXG5cbmZ1bmN0aW9uIGlzTm9vcChkZWx0YSkge1xuICAgIHJldHVybiAoZGVsdGEuaW50ZXJ2YWwgPT0gQXhpcy5EZWx0YS5OT09QICYmIGRlbHRhLmRhdGEgPT0gQXhpcy5EZWx0YS5OT09QKTtcbn1cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIEFDVElWRSBNQVBcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKlxuXG4gICAgVGhpcyB0YWJsZSBkZXNjcmliZXMgY3VlIGNoYW5nZXMgdG8vZnJvbSBhY3RpdmUgc3RhdGVcbiAgICBiYXNlZCBvblxuXG4gICAgLSB0b19yb2xlIC0gdGhlIHJvbGUgb2YgdGhlIHRpbWluZyBvYmplY3RcblxuICAgICAgaW4gdGhlIGNhc2Ugb2YgdGhlIGRvdWJsZSBzZXF1ZW5jZXIgYSB0aW1pbmcgb2JqZWN0XG4gICAgICBtYXkgYmUgKkxFRlQqIChMKSwgKlJJR0hUKiAoUikgb3IsIGluIHRoZSBjb3JuZXIgY2FzZSB0aGF0XG4gICAgICB0aGUgdHdvIHRpbWluZyBvYmplY3RzIGFyZSBhdCB0aGUgc2FtZSBwb3NpdGlvbixcbiAgICAgICpTSU5HVUxBUiogKFMpXG5cbiAgICAgIGluIHRoZSBjYXNlIG9mIHRoZSBzaW5nbGUgc2VxdWVuY2VyLCB0aGUgcm9sZSBpc1xuICAgICAgYWx3YXlzICpTSU5HVUxBUiogKFMpXG5cblxuICAgIC0gdG9fZGlyZWN0aW9uIC0gdGhlIGRpcmVjdGlvbiBvZiB0aGUgbW92ZW1lbnQgb2YgdGhlXG4gICAgICB0aW1pbmcgb2JqZWN0LCBlaXRoZXIgKlJJR0hUKiAoUikgb3IgKkxFRlQqIChMKVxuXG4gICAgICBUaGlzIG1hcCBpcyBvbmx5IHVzZWQgd2hlbiB0aW1pbmcgb2JqZWN0IGlzIGluIGFcbiAgICAgIG1vdmluZyBzdGF0ZSwgc28gKlBBVVNFRCogKFApIGlzIG5vdCBuZWVkZWQuXG5cbiAgICAtIGVuZHBvaW50X3R5cGUgLSB0aGUgdHlwZSBvZiBlbmRwb2ludCB3aGljaCBpc1xuICAgICAgcGFzc2VkIGJ5IHRoZSB0aW1pbmcgb2JqZWN0IGR1cmluZyBtb3Rpb24sIGVpdGhlclxuICAgICAgKkxFRlQqIChSKSBlbmRwb2ludCBvciAqUklHSFQqIChSKSBlbmRwb2ludCwgb3JcbiAgICAgICpTSU5HVUxBUiogKFMpIGVuZHBvaW50LlxuXG4gICAgLSBjdWVfY2hhbmdlXG4gICAgICAqRU5URVIqIDogY3VlIGNoYW5nZXMgZnJvbSBub3QgYWN0aXZlIHRvIGFjdGl2ZVxuICAgICAgKkVYSVQqOiBjdWUgY2hhbmdlcyBmcm9tIGFjdGl2ZSB0byBub3QgYWN0aXZlXG4gICAgICAqU1RBWSo6IGN1ZSBzdGF5cyBhY3RpdmVcbiAgICAgICpFTlRFUi1FWElUKjogY3VlIGNoYW5nZXMgZnJvbSBub3QgYWN0aXZlIHRvIGFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgYW5kIGltbWVkaWF0ZWx5IGJhY2sgYWdvaW5kIHRvIG5vdCBhY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgVGhpcyBvbmx5IG9jY3VycyB3aGVuIGEgKlNJTkdVTEFSKlxuICAgICAgICAgICAgICAgICAgICB0aW1pbmcgb2JqZWN0IHBhc3NlZCBhICpTSU5HVUxBUiogY3VlLlxuXG5cbiAgICBUYWJsZSBjb2x1bW5zIGFyZTpcblxuICAgIHwgdG9fcm9sZSB8IHRvX2RpcmVjdGlvbiB8IGVuZHBvaW50X3R5cGUgfCBjdWUgY2hhbmdlIHxcblxuICAgIGxlZnQsIHJpZ2h0LCBsZWZ0IC0+IHN0YXlcbiAgICBsZWZ0LCByaWdodCwgcmlnaHQgLT4gZXhpdFxuICAgIGxlZnQsIHJpZ2h0LCBzaW5ndWxhciAtPiBleGl0XG5cbiAgICBsZWZ0LCBsZWZ0LCBsZWZ0IC0+IHN0YXlcbiAgICBsZWZ0LCBsZWZ0LCByaWdodCAtPiBlbnRlclxuICAgIGxlZnQsIGxlZnQsIHNpbmd1bGFyIC0+IGVudGVyXG5cbiAgICByaWdodCwgcmlnaHQsIGxlZnQgLT4gZW50ZXJcbiAgICByaWdodCwgcmlnaHQsIHJpZ2h0IC0+IHN0YXlcbiAgICByaWdodCwgcmlnaHQsIHNpbmd1bGFyIC0+IGVudGVyXG5cbiAgICByaWdodCwgbGVmdCwgbGVmdCAtPiBleGl0XG4gICAgcmlnaHQsIGxlZnQsIHJpZ2h0IC0+IHN0YXlcbiAgICByaWdodCwgbGVmdCwgc2luZ3VsYXIgLT4gZXhpdFxuXG4gICAgLy8gY29ybmVyY2FzZSAtIHRpbWluZyBvYmplY3RzIGFyZSB0aGUgc2FtZVxuXG4gICAgc2luZ3VsYXIsIHJpZ2h0LCBsZWZ0IC0+IGVudGVyXG4gICAgc2luZ3VsYXIsIHJpZ2h0LCByaWdodCAtPiBleGl0XG4gICAgc2luZ3VsYXIsIHJpZ2h0LCBzaW5ndWxhciAtPiBlbnRlciwgZXhpdFxuXG4gICAgc2luZ3VsYXIsIGxlZnQsIGxlZnQgLT4gZXhpdFxuICAgIHNpbmd1bGFyLCBsZWZ0LCByaWdodCAtPiBlbnRlclxuICAgIHNpbmd1bGFyLCBsZWZ0LCBzaW5ndWxhciAtPiBlbnRlciwgZXhpdFxuXG4qL1xuXG5jb25zdCBBY3RpdmUgPSBPYmplY3QuZnJlZXplKHtcbiAgICBFTlRFUjogMSxcbiAgICBTVEFZOiAwLFxuICAgIEVYSVQ6IC0xLFxuICAgIEVOVEVSX0VYSVQ6IDJcbn0pO1xuXG5jb25zdCBBY3RpdmVNYXAgPSBuZXcgTWFwKFtcbiAgICBbXCJMUkxcIiwgQWN0aXZlLlNUQVldLFxuICAgIFtcIkxSUlwiLCBBY3RpdmUuRVhJVF0sXG4gICAgW1wiTFJTXCIsIEFjdGl2ZS5FWElUXSxcbiAgICBbXCJMTExcIiwgQWN0aXZlLlNUQVldLFxuICAgIFtcIkxMUlwiLCBBY3RpdmUuRU5URVJdLFxuICAgIFtcIkxMU1wiLCBBY3RpdmUuRU5URVJdLFxuICAgIFtcIlJSTFwiLCBBY3RpdmUuRU5URVJdLFxuICAgIFtcIlJSUlwiLCBBY3RpdmUuU1RBWV0sXG4gICAgW1wiUlJTXCIsIEFjdGl2ZS5FTlRFUl0sXG4gICAgW1wiUkxMXCIsIEFjdGl2ZS5FWElUXSxcbiAgICBbXCJSTFJcIiwgQWN0aXZlLlNUQVldLFxuICAgIFtcIlJMU1wiLCBBY3RpdmUuRVhJVF0sXG4gICAgW1wiU1JMXCIsIEFjdGl2ZS5FTlRFUl0sXG4gICAgW1wiU1JSXCIsIEFjdGl2ZS5FWElUXSxcbiAgICBbXCJTUlNcIiwgQWN0aXZlLkVOVEVSX0VYSVRdLFxuICAgIFtcIlNMTFwiLCBBY3RpdmUuRVhJVF0sXG4gICAgW1wiU0xSXCIsIEFjdGl2ZS5FTlRFUl0sXG4gICAgW1wiU0xTXCIsIEFjdGl2ZS5FTlRFUl9FWElUXVxuXSk7XG5cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuIEVWRU5UIE9SREVSSU5HIFNPUlRJTkdcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmZ1bmN0aW9uIGV2ZW50X2NtcF9mb3J3YXJkcyAoZXZlbnRfYSwgZXZlbnRfYikge1xuICAgIGxldCBpdHZfYSA9IChldmVudF9hLm5ldykgPyBldmVudF9hLm5ldy5pbnRlcnZhbCA6IGV2ZW50X2Eub2xkLmludGVydmFsO1xuICAgIGxldCBpdHZfYiA9IChldmVudF9iLm5ldykgPyBldmVudF9iLm5ldy5pbnRlcnZhbCA6IGV2ZW50X2Iub2xkLmludGVydmFsO1xuICAgIHJldHVybiBJbnRlcnZhbC5jbXBMb3coaXR2X2EsIGl0dl9iKTtcbn1cblxuZnVuY3Rpb24gZXZlbnRfY21wX2JhY2t3YXJkcyAoZXZlbnRfYSwgZXZlbnRfYikge1xuICAgIGxldCBpdHZfYSA9IChldmVudF9hLm5ldykgPyBldmVudF9hLm5ldy5pbnRlcnZhbCA6IGV2ZW50X2Eub2xkLmludGVydmFsO1xuICAgIGxldCBpdHZfYiA9IChldmVudF9iLm5ldykgPyBldmVudF9iLm5ldy5pbnRlcnZhbCA6IGV2ZW50X2Iub2xkLmludGVydmFsO1xuICAgIHJldHVybiAtMSAqIEludGVydmFsLmNtcEhpZ2goaXR2X2EsIGl0dl9iKTtcbn1cblxuZnVuY3Rpb24gc29ydF9ldmVudHMgKGV2ZW50cywgZGlyZWN0aW9uPTApIHtcbiAgICBpZiAoZGlyZWN0aW9uID49IDApIHtcbiAgICAgICAgZXZlbnRzLnNvcnQoZXZlbnRfY21wX2ZvcndhcmRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBldmVudHMuc29ydChldmVudF9jbXBfYmFja3dhcmRzKTtcbiAgICB9XG59XG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiBCQVNFIFNFUVVFTkNFUlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLypcbiAgICBUaGlzIGlzIGFuIGFic3RyYWN0IGJhc2UgY2xhc3MgZm9yIHNlcXVlbmNlcnNcbiAgICBJdCBpbXBsZW1lbnRzIGNvbW1vbiBsb2dpYyByZWxhdGVkIHRvIGF4aXMsIGV2ZW50cyBhbmQgYWN0aXZlQ3Vlcy5cbiovXG5cbmNsYXNzIEJhc2VTZXF1ZW5jZXIge1xuXG4gICAgc3RhdGljIEFjdGl2ZSA9IEFjdGl2ZTtcbiAgICBzdGF0aWMgQWN0aXZlTWFwID0gQWN0aXZlTWFwO1xuICAgIHN0YXRpYyBzb3J0X2V2ZW50cyA9IHNvcnRfZXZlbnRzO1xuXG4gICAgY29uc3RydWN0b3IgKGF4aXMpIHtcblxuICAgICAgICAvLyBBY3RpdmVDdWVzXG4gICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMgPSBuZXcgTWFwKCk7IC8vIChrZXkgLT4gY3VlKVxuXG4gICAgICAgIC8vIEF4aXNcbiAgICAgICAgdGhpcy5fYXhpcyA9IGF4aXM7XG4gICAgICAgIGxldCBjYiA9IHRoaXMuX29uQXhpc0NhbGxiYWNrLmJpbmQodGhpcylcbiAgICAgICAgdGhpcy5fYXhpc19jYiA9IHRoaXMuX2F4aXMuYWRkX2NhbGxiYWNrKGNiKTtcblxuICAgICAgICAvLyBDaGFuZ2UgZXZlbnRcbiAgICAgICAgZXZlbnRpZnkuZXZlbnRpZnlJbnN0YW5jZSh0aGlzKTtcbiAgICAgICAgdGhpcy5ldmVudGlmeURlZmluZShcInVwZGF0ZVwiLCB7aW5pdDp0cnVlfSk7XG4gICAgICAgIHRoaXMuZXZlbnRpZnlEZWZpbmUoXCJjaGFuZ2VcIiwge2luaXQ6dHJ1ZX0pO1xuICAgICAgICB0aGlzLmV2ZW50aWZ5RGVmaW5lKFwicmVtb3ZlXCIsIHtpbml0OmZhbHNlfSk7XG4gICAgfVxuXG5cbiAgICBnZXRfbW92ZW1lbnRfZGlyZWN0aW9uKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJub3QgaW1wbGVtZW50ZWRcIik7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEVWRU5UU1xuICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgIC8qXG4gICAgICAgIEV2ZW50aWZ5OiBpbW1lZGlhdGUgZXZlbnRzXG4gICAgKi9cbiAgICBldmVudGlmeUluaXRFdmVudEFyZ3MobmFtZSkge1xuICAgICAgICBpZiAobmFtZSA9PSBcInVwZGF0ZVwiIHx8IG5hbWUgPT0gXCJjaGFuZ2VcIikge1xuICAgICAgICAgICAgbGV0IGV2ZW50cyA9IFsuLi50aGlzLl9hY3RpdmVDdWVzLnZhbHVlcygpXS5tYXAoY3VlID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge2tleTpjdWUua2V5LCBuZXc6Y3VlLCBvbGQ6dW5kZWZpbmVkfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc29ydF9ldmVudHMoZXZlbnRzLCB0aGlzLmdldF9tb3ZlbWVudF9kaXJlY3Rpb24oKSk7XG4gICAgICAgICAgICByZXR1cm4gKG5hbWUgPT0gXCJ1cGRhdGVcIikgPyBbZXZlbnRzXSA6IGV2ZW50cztcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLypcbiAgICAgICAgRXZlbnQgTm90aWZpY2F0aW9uXG5cbiAgICAqL1xuICAgIF9ub3RpZnlFdmVudHMoZXZlbnRzKSB7XG4gICAgICAgIC8vIGV2ZW50IG5vdGlmaWNhdGlvblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaGFzX3VwZGF0ZV9zdWJzID0gdGhpcy5ldmVudGlmeVN1YnNjcmlwdGlvbnMoXCJ1cGRhdGVcIikubGVuZ3RoID4gMDtcbiAgICAgICAgY29uc3QgaGFzX3JlbW92ZV9zdWJzID0gdGhpcy5ldmVudGlmeVN1YnNjcmlwdGlvbnMoXCJyZW1vdmVcIikubGVuZ3RoID4gMDtcbiAgICAgICAgY29uc3QgaGFzX2NoYW5nZV9zdWJzID0gdGhpcy5ldmVudGlmeVN1YnNjcmlwdGlvbnMoXCJjaGFuZ2VcIikubGVuZ3RoID4gMDtcbiAgICAgICAgLy8gdXBkYXRlXG4gICAgICAgIGlmIChoYXNfdXBkYXRlX3N1YnMpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRpZnlUcmlnZ2VyKFwidXBkYXRlXCIsIGV2ZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2hhbmdlLCByZW1vdmVcbiAgICAgICAgaWYgKGhhc19yZW1vdmVfc3VicyB8fCBoYXNfY2hhbmdlX3N1YnMpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGl0ZW0gb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0ubmV3ID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzX3JlbW92ZV9zdWJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50aWZ5VHJpZ2dlcihcInJlbW92ZVwiLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNfY2hhbmdlX3N1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRpZnlUcmlnZ2VyKFwiY2hhbmdlXCIsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEFYSVMgQ0FMTEJBQ0tcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBfb25BeGlzQ2FsbGJhY2soZXZlbnRNYXAsIHJlbGV2YW5jZUludGVydmFsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAgICBtYWtlIGV4aXQsIGNoYW5nZSBhbmQgZW50ZXIgZXZlbnRzXG4gICAgICAgIC0gYmFzZWQgb24gZXZlbnRNYXBcbiAgICAqL1xuICAgIF9ldmVudHNfZnJvbV9heGlzX2V2ZW50cyhldmVudE1hcCwgaW50ZXJ2YWwpIHtcbiAgICAgICAgY29uc3QgZW50ZXJFdmVudHMgPSBbXTtcbiAgICAgICAgY29uc3QgY2hhbmdlRXZlbnRzID0gW107XG4gICAgICAgIGNvbnN0IGV4aXRFdmVudHMgPSBbXTtcbiAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLl9hY3RpdmVDdWVzLnNpemUgPT0gMDtcbiAgICAgICAgbGV0IGlzX2FjdGl2ZSwgc2hvdWxkX2JlX2FjdGl2ZSwgX2l0ZW07XG4gICAgICAgIGZvciAobGV0IGl0ZW0gb2YgZXZlbnRNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChpc05vb3AoaXRlbS5kZWx0YSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGV4aXQsIGNoYW5nZSwgZW50ZXIgZXZlbnRzXG4gICAgICAgICAgICBpc19hY3RpdmUgPSAoZmlyc3QpID8gZmFsc2UgOiB0aGlzLl9hY3RpdmVDdWVzLmhhcyhpdGVtLmtleSk7XG4gICAgICAgICAgICBzaG91bGRfYmVfYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoaXRlbS5uZXcgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0ubmV3LmludGVydmFsLm1hdGNoKGludGVydmFsKSkge1xuICAgICAgICAgICAgICAgICAgICBzaG91bGRfYmVfYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNfYWN0aXZlICYmICFzaG91bGRfYmVfYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgLy8gZXhpdFxuICAgICAgICAgICAgICAgIF9pdGVtID0ge2tleTppdGVtLmtleSwgbmV3OnVuZGVmaW5lZCwgb2xkOml0ZW0ub2xkfTtcbiAgICAgICAgICAgICAgICBleGl0RXZlbnRzLnB1c2goX2l0ZW0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghaXNfYWN0aXZlICYmIHNob3VsZF9iZV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAvLyBlbnRlclxuICAgICAgICAgICAgICAgIF9pdGVtID0ge2tleTppdGVtLmtleSwgbmV3Oml0ZW0ubmV3LCBvbGQ6dW5kZWZpbmVkfTtcbiAgICAgICAgICAgICAgICBlbnRlckV2ZW50cy5wdXNoKF9pdGVtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNfYWN0aXZlICYmIHNob3VsZF9iZV9hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAvLyBjaGFuZ2VcbiAgICAgICAgICAgICAgICBfaXRlbSA9IHtrZXk6aXRlbS5rZXksIG5ldzppdGVtLm5ldywgb2xkOml0ZW0ub2xkfTtcbiAgICAgICAgICAgICAgICBjaGFuZ2VFdmVudHMucHVzaChfaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbZXhpdEV2ZW50cywgY2hhbmdlRXZlbnRzLCBlbnRlckV2ZW50c107XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgbWFrZSBleGl0LCBjaGFuZ2UgYW5kIGVudGVyIGV2ZW50c1xuICAgICAgICAtIGJhc2VkIG9uIGF4aXMubG9va3VwXG4gICAgKi9cbiAgICBfZXZlbnRzX2Zyb21fYXhpc19sb29rdXAoZXZlbnRNYXAsIGludGVydmFsKSB7XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIEFjdGl2ZSBjdWVzXG5cbiAgICAgICAgICAgIGZpbmQgbmV3IHNldCBvZiBhY3RpdmUgY3VlcyBieSBxdWVyeWluZyB0aGUgYXhpc1xuICAgICAgICAqL1xuICAgICAgICBjb25zdCBfYWN0aXZlQ3VlcyA9IG5ldyBNYXAodGhpcy5fYXhpcy5sb29rdXAoaW50ZXJ2YWwpLm1hcChmdW5jdGlvbihjdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBbY3VlLmtleSwgY3VlXTtcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGxldCBjaGFuZ2VFdmVudHMgPSBbXTtcbiAgICAgICAgbGV0IGV4aXRFdmVudHMgPSBbXTtcbiAgICAgICAgbGV0IGZpcnN0ID0gKHRoaXMuX2FjdGl2ZUN1ZXMuc2l6ZSA9PSAwKTtcbiAgICAgICAgaWYgKCFmaXJzdCl7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgQ2hhbmdlIEV2ZW50c1xuXG4gICAgICAgICAgICAgICAgY2hhbmdlIGN1ZXMgLSBjdWVzIHdoaWNoIGFyZSBtb2RpZmllZCwgeWV0IHJlbWFpbiBhY3RpdmUgY3Vlc1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGxldCByZW1haW5DdWVzID0gbWFwX2ludGVyc2VjdCh0aGlzLl9hY3RpdmVDdWVzLCBfYWN0aXZlQ3Vlcyk7XG4gICAgICAgICAgICBpZiAocmVtYWluQ3Vlcy5zaXplID4gMCkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgIFR3byBhcHByb2FjaGVzXG5cbiAgICAgICAgICAgICAgICAgICAgMSkgbGFyZ2UgZXZlbnRNYXBcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRNYXAgbGFyZ2VyIHRoYW4gcmVtYWluQ3Vlc1xuICAgICAgICAgICAgICAgICAgICAtIGl0ZXJhdGUgcmVtYWluQ3Vlc1xuICAgICAgICAgICAgICAgICAgICAtIGtlZXAgdGhvc2UgdGhhdCBhcmUgZm91bmQgaW4gZXZlbnRNYXBcblxuICAgICAgICAgICAgICAgICAgICAyKSBsYXJnZSByZW1haW5DdWVzXG4gICAgICAgICAgICAgICAgICAgIHJlbWFpbkN1ZXMgbGFyZ2VyIHRoYW4gZXZlbnRNYXBcbiAgICAgICAgICAgICAgICAgICAgLSBpdGVyYXRlIGV2ZW50TWFwXG4gICAgICAgICAgICAgICAgICAgIC0ga2VlcCB0aG9zZSB0aGF0IGFyZSBmb3VuZCBpbiByZW1haW5DdWVzXG5cbiAgICAgICAgICAgICAgICAgICAgbWVhc3VyZW1lbnQgc2hvd3MgdGhhdCAyKSBpcyBiZXR0ZXJcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGxldCBjdWUsIF9pdGVtO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGl0ZW0gb2YgZXZlbnRNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VlID0gcmVtYWluQ3Vlcy5nZXQoaXRlbS5rZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VlICE9IHVuZGVmaW5lZCAmJiAhaXNOb29wKGl0ZW0uZGVsdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfaXRlbSA9IHtrZXk6aXRlbS5rZXksIG5ldzppdGVtLm5ldywgb2xkOml0ZW0ub2xkfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZUV2ZW50cy5wdXNoKF9pdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICBFeGl0IEV2ZW50c1xuICAgICAgICAgICAgICAgIGV4aXQgY3VlcyB3ZXJlIGluIG9sZCBhY3RpdmUgY3VlcyAtIGJ1dCBub3QgaW4gbmV3XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgbGV0IGV4aXRDdWVzID0gbWFwX2RpZmZlcmVuY2UodGhpcy5fYWN0aXZlQ3VlcywgX2FjdGl2ZUN1ZXMpO1xuICAgICAgICAgICAgZXhpdEV2ZW50cyA9IFsuLi5leGl0Q3Vlcy52YWx1ZXMoKV1cbiAgICAgICAgICAgICAgICAubWFwKGN1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7a2V5OmN1ZS5rZXksIG5ldzp1bmRlZmluZWQsIG9sZDpjdWV9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIEVudGVyIEV2ZW50c1xuICAgICAgICAgICAgZW50ZXIgY3VlcyB3ZXJlIG5vdCBpbiBvbGQgYWN0aXZlIGN1ZXMgLSBidXQgYXJlIGluIG5ld1xuICAgICAgICAqL1xuICAgICAgICBsZXQgZW50ZXJDdWVzO1xuICAgICAgICBpZiAoZmlyc3QpIHtcbiAgICAgICAgICAgIGVudGVyQ3VlcyA9IF9hY3RpdmVDdWVzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbnRlckN1ZXMgPSBtYXBfZGlmZmVyZW5jZShfYWN0aXZlQ3VlcywgdGhpcy5fYWN0aXZlQ3Vlcyk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGVudGVyRXZlbnRzID0gWy4uLmVudGVyQ3Vlcy52YWx1ZXMoKV1cbiAgICAgICAgICAgIC5tYXAoY3VlID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge2tleTpjdWUua2V5LCBuZXc6Y3VlLCBvbGQ6dW5kZWZpbmVkfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBbZXhpdEV2ZW50cywgY2hhbmdlRXZlbnRzLCBlbnRlckV2ZW50c107XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIE1BUCBBQ0NFU1NPUlNcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBoYXMoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVDdWVzLmhhcyhrZXkpO1xuICAgIH07XG5cbiAgICBnZXQoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVDdWVzLmdldChrZXkpO1xuICAgIH07XG5cbiAgICBrZXlzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWN0aXZlQ3Vlcy5rZXlzKCk7XG4gICAgfTtcblxuICAgIHZhbHVlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZUN1ZXMudmFsdWVzKCk7XG4gICAgfTtcblxuICAgIGVudHJpZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVDdWVzLmVudHJpZXMoKTtcbiAgICB9XG59XG5cbmV2ZW50aWZ5LmV2ZW50aWZ5UHJvdG90eXBlKEJhc2VTZXF1ZW5jZXIucHJvdG90eXBlKTtcblxuZXhwb3J0IGRlZmF1bHQgQmFzZVNlcXVlbmNlcjtcbiIsIi8qXG4gICAgQ29weXJpZ2h0IDIwMjBcbiAgICBBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbmltcG9ydCB7YXJyYXlfY29uY2F0LCBtYXBfZGlmZmVyZW5jZX0gZnJvbSAnLi4vdXRpbC91dGlscy5qcyc7XG5pbXBvcnQgSW50ZXJ2YWwgZnJvbSAnLi4vdXRpbC9pbnRlcnZhbC5qcyc7XG5pbXBvcnQgZXZlbnRpZnkgZnJvbSAnLi4vdXRpbC9ldmVudGlmeS5qcyc7XG5pbXBvcnQgKiBhcyBtb3Rpb251dGlscyBmcm9tICcuLi91dGlsL21vdGlvbnV0aWxzLmpzJztcbmltcG9ydCBTY2hlZHVsZSBmcm9tICcuL3NjaGVkdWxlLmpzJztcbmltcG9ydCBCYXNlU2VxdWVuY2VyIGZyb20gJy4vYmFzZXNlcXVlbmNlci5qcyc7XG5pbXBvcnQgQXhpcyBmcm9tICcuL2F4aXMuanMnO1xuXG5jb25zdCBQb3NEZWx0YSA9IG1vdGlvbnV0aWxzLk1vdGlvbkRlbHRhLlBvc0RlbHRhO1xuY29uc3QgTW92ZURlbHRhID0gbW90aW9udXRpbHMuTW90aW9uRGVsdGEuTW92ZURlbHRhO1xuY29uc3QgQWN0aXZlID0gQmFzZVNlcXVlbmNlci5BY3RpdmU7XG5jb25zdCBBY3RpdmVNYXAgPSBCYXNlU2VxdWVuY2VyLkFjdGl2ZU1hcDtcbmNvbnN0IFJlbGF0aW9uID0gSW50ZXJ2YWwuUmVsYXRpb247XG5cbmNvbnN0IEVWRU5UTUFQX1RIUkVTSE9MRCA9IDUwMDA7XG5jb25zdCBBQ1RJVkVDVUVTX1RIUkVTSE9MRCA9IDUwMDA7XG5cblxuY2xhc3MgU2luZ2xlU2VxdWVuY2VyIGV4dGVuZHMgQmFzZVNlcXVlbmNlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAoYXhpcywgdG8pIHtcblxuICAgICAgICBzdXBlcihheGlzKTtcblxuICAgICAgICAvLyBUaW1pbmcgT2JqZWN0XG4gICAgICAgIHRoaXMuX3RvID0gdG87XG4gICAgICAgIHRoaXMuX3N1YiA9IHRoaXMuX3RvLm9uKFwidGltaW5nc3JjXCIsIHRoaXMuX29uVGltaW5nQ2FsbGJhY2suYmluZCh0aGlzKSk7XG5cbiAgICAgICAgLy8gU2NoZWR1bGVcbiAgICAgICAgdGhpcy5fc2NoZWQgPSBuZXcgU2NoZWR1bGUodGhpcy5fYXhpcywgdG8pO1xuICAgICAgICBsZXQgY2IgPSB0aGlzLl9vblNjaGVkdWxlQ2FsbGJhY2suYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fc2NoZWRfY2IgPSB0aGlzLl9zY2hlZC5hZGRfY2FsbGJhY2soY2IpXG4gICAgfVxuXG5cbiAgICBnZXRfbW92ZW1lbnRfZGlyZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBub3cgPSB0aGlzLl90by5jbG9jay5ub3coKTtcbiAgICAgICAgcmV0dXJuIG1vdGlvbnV0aWxzLmNhbGN1bGF0ZURpcmVjdGlvbih0aGlzLl90by52ZWN0b3IsIG5vdyk7XG4gICAgfVxuXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEFYSVMgQ0FMTEJBQ0tcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAvKlxuICAgICAgICBIYW5kbGluZyBBeGlzIFVwZGF0ZSBDYWxsYmFja3NcbiAgICAqL1xuXG4gICAgX29uQXhpc0NhbGxiYWNrKGV2ZW50TWFwLCByZWxldmFuY2VJbnRlcnZhbCkge1xuICAgICAgICAvKlxuICAgICAgICAgICAgcHJvY2VzcyBheGlzIGV2ZW50cyB3aGljaCBhcmUgcmVsZXZhbnQgdG8gdGhlIHNldFxuICAgICAgICAgICAgb2YgYWN0aXZlQ3Vlcywgb3IgdG8gdGhlIGltbWVkaWF0ZSBmdXR1cmUgKHNjaGVkdWxlKVxuXG4gICAgICAgICAgICBlbnRlckN1ZXMgLSBpbmFjdGl2ZSAtPiBhY3RpdmVcbiAgICAgICAgICAgIGNoYW5nZUN1ZXMgLSBhY3RpdmUgLT4gYWN0aXZlLCBidXQgY2hhbmdlZFxuICAgICAgICAgICAgZXhpdEN1ZXMgLSBhY3RpdmUgLT4gaW5hY3RpdmVcblxuICAgICAgICAgICAgVHdvIGFwcHJvYWNoZXNcbiAgICAgICAgICAgIC0gMSkgRVZFTlRTOiBmaWx0ZXIgbGlzdCBvZiBldmVudHMgLSBjb21wYXJlIHRvIGN1cnJlbnQgYWN0aXZlIGN1ZXNcbiAgICAgICAgICAgIC0gMikgTE9PS1VQOiByZWdlbmVyYXRlIG5ldyBhY3RpdmVDdWVzIGJ5IGxvb2tpbmcgdXAgc2V0IG9mXG4gICAgICAgICAgICAgICAgIGFjdGl2ZSBjdWVzIGZyb20gYXhpcywgY29tcGFyZSBpdCB0byBjdXJyZW50IGFjdGl2ZSBjdWVzXG5cblxuICAgICAgICAgICAgRXZlbnRNYXAuc2l6ZSA8IGFib3V0IDFLLTEwSyAoNUspXG4gICAgICAgICAgICAtIEVWRU5UUyBiZXR0ZXIgb3IgZXF1YWxcbiAgICAgICAgICAgIEV2ZW50TWFwLnNpemUgPiBhYm91dCA1S1xuICAgICAgICAgICAgLSBMT09LVVAgYmV0dGVyXG4gICAgICAgICAgICAtIGV4Y2VwdGlvblxuICAgICAgICAgICAgICAgIC0gSWYgYWN0aXZlQ3Vlcy5zaXplID4gMUstMTBLICg1SykgLSBFVkVOVFMgQkVUVEVSXG5cbiAgICAgICAgICAgIElmIG5ldyBjdWVzIGFyZSBwcmVkb21pbmFudGx5IGFjdGl2ZSBjdWVzLCBFVkVOVFMgYXJlXG4gICAgICAgICAgICBhbHdheXMgYmV0dGVyIC0gYW5kIG1vcmUgc28gZm9yIGxhcmdlciBzZXRzIG9mIGV2ZW50cy5cbiAgICAgICAgICAgIEhvd2V2ZXIsIHRoZXJlIGlzIG5vIGluZm9ybWF0aW9uIGFib3V0IHRoaXNcbiAgICAgICAgICAgIGJlZm9yZSBtYWtpbmcgdGhlIGNob2ljZSwgYW5kIGFsc28gdGhpcyBpcyBhIHNvbWV3aGF0XG4gICAgICAgICAgICB1bmxpa2VseSBzY2VuYXJpby5cblxuICAgICAgICAgICAgU28sIHRoZSBzaW1wbGUgcG9saWN5IGFib3ZlIHdvcmtzIGZvciB0eXBpY2FsIHdvcmtsb2FkcyxcbiAgICAgICAgICAgIHdoZXJlIHRoZSBtYWpvcml0eSBvZiBhZGRlZCBjdWVzIGFyZSBpbmFjdGl2ZS5cbiAgICAgICAgKi9cblxuICAgICAgICBpZiAoIXRoaXMuX3RvLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbGV2YW5jZUludGVydmFsID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgbm93ID0gdGhpcy5fdG8uY2xvY2subm93KCk7XG4gICAgICAgIGNvbnN0IG5vd192ZWN0b3IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodGhpcy5fdG8udmVjdG9yLCBub3cpO1xuXG4gICAgICAgIC8vIGFjdGl2ZUludGVydmFsXG4gICAgICAgIGNvbnN0IGFjdGl2ZUludGVydmFsID0gbmV3IEludGVydmFsKG5vd192ZWN0b3IucG9zaXRpb24pO1xuXG4gICAgICAgIGlmICghYWN0aXZlSW50ZXJ2YWwubWF0Y2gocmVsZXZhbmNlSW50ZXJ2YWwsIEludGVydmFsLk1hdGNoLk9VVFNJREUpKSB7XG4gICAgICAgICAgICAvLyByZWxldmFuY2VJbnRlcnZhbCBpcyBOT1Qgb3V0c2lkZSBhY3RpdmVJbnRlcnZhbFxuICAgICAgICAgICAgLy8gc29tZSBldmVudHMgcmVsZXZhbnQgZm9yIGFjdGl2ZUludGVydmFsZVxuXG4gICAgICAgICAgICAvLyBjaG9vc2UgYXBwcm9hY2ggdG8gZ2V0IGV2ZW50c1xuICAgICAgICAgICAgbGV0IGdldF9ldmVudHMgPSB0aGlzLl9ldmVudHNfZnJvbV9heGlzX2V2ZW50cy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgaWYgKEVWRU5UTUFQX1RIUkVTSE9MRCA8IGV2ZW50TWFwLnNpemUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYWN0aXZlQ3Vlcy5zaXplIDwgQUNUSVZFQ1VFU19USFJFU0hPTEQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0X2V2ZW50cyA9IHRoaXMuX2V2ZW50c19mcm9tX2F4aXNfbG9va3VwLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBbZXhpdCwgY2hhbmdlLCBlbnRlcl0gPSBnZXRfZXZlbnRzKGV2ZW50TWFwLCBhY3RpdmVJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBhY3RpdmVDdWVzXG4gICAgICAgICAgICBleGl0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWN0aXZlQ3Vlcy5kZWxldGUoaXRlbS5rZXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbnRlci5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMuc2V0KGl0ZW0ua2V5LCBpdGVtLm5ldyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gbm90aWZpY2F0aW9uc1xuICAgICAgICAgICAgY29uc3QgZXZlbnRzID0gYXJyYXlfY29uY2F0KFtleGl0LCBjaGFuZ2UsIGVudGVyXSwge2NvcHk6dHJ1ZSwgb3JkZXI6dHJ1ZX0pO1xuXG4gICAgICAgICAgICAvLyBzb3J0IGV2ZW50cyBhY2NvcmRpbmcgdG8gZ2VuZXJhbCBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb24gPSBtb3Rpb251dGlscy5jYWxjdWxhdGVEaXJlY3Rpb24obm93X3ZlY3Rvcik7XG4gICAgICAgICAgICBCYXNlU2VxdWVuY2VyLnNvcnRfZXZlbnRzKGV2ZW50cywgZGlyZWN0aW9uKTtcblxuICAgICAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICB0aGlzLl9ub3RpZnlFdmVudHMoZXZlbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBjbGVhciBzY2hlZHVsZVxuXG4gICAgICAgICAgICBUaGlzIGlzIG9ubHkgbmVjZXNzYXJ5IGlmIGEgY3VlIGludGVydmFsIGlzIGNoYW5nZWQsXG4gICAgICAgICAgICBhbmQgdGhlIGNoYW5nZSBpcyByZWxldmFudCB3aXRoaW4gdGhlIHBvc0ludGVydmFsIG9mXG4gICAgICAgICAgICBvZiB0aGUgc2NoZWR1bGUuIFJlbGV2YW5jZUludGVydmFsIHRvIGZpZ3VyZSB0aGlzIG91dC5cbiAgICAgICAgKi9cbiAgICAgICAgaWYgKHRoaXMuX3NjaGVkLnBvc0ludGVydmFsKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX3NjaGVkLnBvc0ludGVydmFsLm1hdGNoKHJlbGV2YW5jZUludGVydmFsLCBJbnRlcnZhbC5NYXRjaC5PVVRTSURFKSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGV2YW5jZUludGVydmFsIGlzIE5PVCBvdXRzaWRlIHNjaGVkdWxlIHBvc0ludGVydmFsXG4gICAgICAgICAgICAgICAgLy8gcmVmcmVzaCBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHRoaXMuX3NjaGVkLnNldFZlY3Rvcihub3dfdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBUSU1JTkcgT0JKRUNUIENBTExCQUNLXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgX29uVGltaW5nQ2FsbGJhY2sgKGVBcmcpIHtcbiAgICAgICAgY29uc3QgZXZlbnRzID0gW107XG4gICAgICAgIC8qXG4gICAgICAgICAgICBJZiB1cGRhdGUgaXMgdGhlIGluaXRpYWwgdmVjdG9yIGZyb20gdGhlIHRpbWluZyBvYmplY3QsXG4gICAgICAgICAgICB3ZSBzZXQgY3VycmVudCB0aW1lIGFzIHRoZSBvZmZpY2lhbCB0aW1lIGZvciB0aGUgdXBkYXRlLlxuICAgICAgICAgICAgRWxzZSwgdGhlIG5ldyB2ZWN0b3IgaXMgXCJsaXZlXCIgYW5kIHdlIHVzZSB0aGUgdGltZXN0YW1wXG4gICAgICAgICAgICB3aGVuIGl0IHdhcyBjcmVhdGVkIGFzIHRoZSBvZmZpY2lhbCB0aW1lIGZvciB0aGUgdXBkYXRlLlxuICAgICAgICAgICAgVGhpcyBpcyByZXByZXNlbnRlZCBieSB0aGUgbmV3X3ZlY3Rvci5cbiAgICAgICAgKi9cbiAgICAgICAgbGV0IG5ld192ZWN0b3I7XG5cbiAgICAgICAgaWYgKGVBcmcubGl2ZSkge1xuICAgICAgICAgICAgbmV3X3ZlY3RvciA9IHRoaXMuX3RvLnZlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG1ha2UgYSBsaXZlIHZlY3RvciBmcm9tIHRvIHZlY3RvclxuICAgICAgICAgICAgbmV3X3ZlY3RvciA9IG1vdGlvbnV0aWxzLmNhbGN1bGF0ZVZlY3Rvcih0aGlzLl90by52ZWN0b3IsIHRoaXMuX3RvLmNsb2NrLm5vdygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBUaGUgbmF0dXJlIG9mIHRoZSB2ZWN0b3IgY2hhbmdlXG4gICAgICAgICovXG4gICAgICAgIGxldCBkZWx0YSA9IG5ldyBtb3Rpb251dGlscy5Nb3Rpb25EZWx0YSh0aGlzLl90by5vbGRfdmVjdG9yLCBuZXdfdmVjdG9yKTtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgUmVldmFsdWF0ZSBhY3RpdmUgc3RhdGUuXG4gICAgICAgICAgICBUaGlzIGlzIHJlcXVpcmVkIGFmdGVyIGFueSBkaXNjb250aW51aXR5IG9mIHRoZSBwb3NpdGlvbiAoanVtcCksXG4gICAgICAgICAgICBvciBpZiB0aGUgbW90aW9uIHN0b3BwZWQgd2l0aG91dCBqdW1waW5nIChwYXVzZSBvciBoYWx0IGF0IHJhbmdlXG4gICAgICAgICAgICByZXN0cmljdGlvbilcbiAgICAgICAgKi9cbiAgICAgICAgaWYgKGRlbHRhLnBvc0RlbHRhID09IFBvc0RlbHRhLkNIQU5HRSB8fCBkZWx0YS5tb3ZlRGVsdGEgPT0gTW92ZURlbHRhLlNUT1ApIHtcbiAgICAgICAgICAgIC8vIG1ha2UgcG9zaXRpb24gaW50ZXJ2YWxcbiAgICAgICAgICAgIGxldCBsb3cgPSBuZXdfdmVjdG9yLnBvc2l0aW9uO1xuICAgICAgICAgICAgbGV0IGhpZ2ggPSBuZXdfdmVjdG9yLnBvc2l0aW9uO1xuICAgICAgICAgICAgbGV0IGl0diA9IG5ldyBJbnRlcnZhbChsb3csIGhpZ2gsIHRydWUsIHRydWUpO1xuICAgICAgICAgICAgLy8gbmV3IGFjdGl2ZSBjdWVzXG4gICAgICAgICAgICBsZXQgYWN0aXZlQ3VlcyA9IG5ldyBNYXAodGhpcy5fYXhpcy5sb29rdXAoaXR2KS5tYXAoY3VlID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2N1ZS5rZXksIGN1ZV07XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAvLyBleGl0IGN1ZXMgLSBpbiBvbGQgYWN0aXZlQ3VlcyBidXQgbm90IGluIG5ldyBhY3RpdmVDdWVzXG4gICAgICAgICAgICBsZXQgZXhpdEN1ZXMgPSBtYXBfZGlmZmVyZW5jZSh0aGlzLl9hY3RpdmVDdWVzLCBhY3RpdmVDdWVzKTtcbiAgICAgICAgICAgIC8vIGVudGVyIGN1ZXMgLSBub3QgaW4gb2xkIGFjdGl2ZUN1ZXMgYnV0IGluIG5ldyBhY3RpdmVDdWVzXG4gICAgICAgICAgICBsZXQgZW50ZXJDdWVzID0gbWFwX2RpZmZlcmVuY2UoYWN0aXZlQ3VlcywgdGhpcy5fYWN0aXZlQ3Vlcyk7XG4gICAgICAgICAgICAvLyB1cGRhdGUgYWN0aXZlIGN1ZXNcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMgPSBhY3RpdmVDdWVzO1xuICAgICAgICAgICAgLy8gbWFrZSBldmVudHNcbiAgICAgICAgICAgIGZvciAobGV0IGN1ZSBvZiBleGl0Q3Vlcy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGV2ZW50cy5wdXNoKHtrZXk6Y3VlLmtleSwgbmV3OnVuZGVmaW5lZCwgb2xkOmN1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgY3VlIG9mIGVudGVyQ3Vlcy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGV2ZW50cy5wdXNoKHtrZXk6Y3VlLmtleSwgbmV3OmN1ZSwgb2xkOnVuZGVmaW5lZH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzb3J0IGV2ZW50cyBhY2NvcmRpbmcgdG8gZ2VuZXJhbCBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb24gPSBtb3Rpb251dGlscy5jYWxjdWxhdGVEaXJlY3Rpb24obmV3X3ZlY3Rvcik7XG4gICAgICAgICAgICBCYXNlU2VxdWVuY2VyLnNvcnRfZXZlbnRzKGV2ZW50cywgZGlyZWN0aW9uKTtcblxuICAgICAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICB0aGlzLl9ub3RpZnlFdmVudHMoZXZlbnRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBIYW5kbGUgVGltaW5nIE9iamVjdCBNb3ZpbmdcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fc2NoZWQuc2V0VmVjdG9yKG5ld192ZWN0b3IpO1xuICAgIH07XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgU0NIRURVTEUgQ0FMTEJBQ0tcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICBfb25TY2hlZHVsZUNhbGxiYWNrID0gZnVuY3Rpb24obm93LCBlbmRwb2ludEl0ZW1zLCBzY2hlZHVsZSkge1xuICAgICAgICBpZiAoIXRoaXMuX3RvLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXZlbnRzID0gW107XG4gICAgICAgIGVuZHBvaW50SXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgbGV0IGN1ZSA9IGl0ZW0uY3VlO1xuICAgICAgICAgICAgbGV0IGhhc19jdWUgPSB0aGlzLl9hY3RpdmVDdWVzLmhhcyhjdWUua2V5KTtcbiAgICAgICAgICAgIGxldCBbdmFsdWUsIHJpZ2h0LCBjbG9zZWQsIHNpbmd1bGFyXSA9IGl0ZW0uZW5kcG9pbnQ7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgQWN0aW9uIENvZGUgLSBzZWUgc2VxdWVuY2V1dGlsc1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIHRvIHJvbGVcbiAgICAgICAgICAgIGxldCB0b19yb2xlID0gXCJTXCI7XG4gICAgICAgICAgICAvLyBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgIGxldCB0b19kaXIgPSAoaXRlbS5kaXJlY3Rpb24gPiAwKSA/IFwiUlwiIDogXCJMXCI7XG4gICAgICAgICAgICAvLyBlbmRwb2ludCB0eXBlXG4gICAgICAgICAgICBsZXQgZXBfdHlwZSA9IChzaW5ndWxhcikgPyBcIlNcIjogKHJpZ2h0KSA/IFwiUlwiIDogXCJMXCI7XG4gICAgICAgICAgICAvLyBhY3Rpb24gY29kZSwgZW50ZXIsIGV4aXQsIHN0YXksIGVudGVyLWV4aXRcbiAgICAgICAgICAgIGxldCBhY3Rpb25fY29kZSA9IEFjdGl2ZU1hcC5nZXQoYCR7dG9fcm9sZX0ke3RvX2Rpcn0ke2VwX3R5cGV9YCk7XG5cbiAgICAgICAgICAgIGlmIChhY3Rpb25fY29kZSA9PSBBY3RpdmUuRU5URVJfRVhJVCkge1xuICAgICAgICAgICAgICAgIGlmIChoYXNfY3VlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV4aXRcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6dW5kZWZpbmVkLCBvbGQ6Y3VlfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMuZGVsZXRlKGN1ZS5rZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVudGVyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5wdXNoKHtrZXk6Y3VlLmtleSwgbmV3OmN1ZSwgb2xkOnVuZGVmaW5lZH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBleGl0XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5wdXNoKHtrZXk6Y3VlLmtleSwgbmV3OnVuZGVmaW5lZCwgb2xkOmN1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGJvdGggYWRkIGFuZCByZW1vdmUgZnJvbSBhY3RpdmVDdWVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb25fY29kZSA9PSBBY3RpdmUuRU5URVIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhhc19jdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZW50ZXJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6Y3VlLCBvbGQ6dW5kZWZpbmVkfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMuc2V0KGN1ZS5rZXksIGN1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb25fY29kZSA9PSBBY3RpdmUuRVhJVCkge1xuICAgICAgICAgICAgICAgIGlmIChoYXNfY3VlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV4aXRcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6dW5kZWZpbmVkLCBvbGQ6Y3VlfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMuZGVsZXRlKGN1ZS5rZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgLy8gRXZlbnRzIGFscmVhZHkgc29ydGVkXG5cbiAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgIHRoaXMuX25vdGlmeUV2ZW50cyhldmVudHMpO1xuICAgIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNpbmdsZVNlcXVlbmNlcjtcblxuIiwiLypcbiAgICBDb3B5cmlnaHQgMjAyMFxuICAgIEF1dGhvciA6IEluZ2FyIEFybnR6ZW5cblxuICAgIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBUaW1pbmdzcmMgbW9kdWxlLlxuXG4gICAgVGltaW5nc3JjIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAgICBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAgICB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICAgIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG5cbiAgICBUaW1pbmdzcmMgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAgICBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICAgIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAgICBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cblxuICAgIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICAgIGFsb25nIHdpdGggVGltaW5nc3JjLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuKi9cblxuaW1wb3J0IHthcnJheV9jb25jYXQsIG1hcF9kaWZmZXJlbmNlfSBmcm9tICcuLi91dGlsL3V0aWxzLmpzJztcbmltcG9ydCBJbnRlcnZhbCBmcm9tICcuLi91dGlsL2ludGVydmFsLmpzJztcbmltcG9ydCBldmVudGlmeSBmcm9tICcuLi91dGlsL2V2ZW50aWZ5LmpzJztcbmltcG9ydCAqIGFzIG1vdGlvbnV0aWxzIGZyb20gJy4uL3V0aWwvbW90aW9udXRpbHMuanMnO1xuaW1wb3J0IFNjaGVkdWxlIGZyb20gJy4vc2NoZWR1bGUuanMnO1xuaW1wb3J0IEJhc2VTZXF1ZW5jZXIgZnJvbSAnLi9iYXNlc2VxdWVuY2VyLmpzJztcbmltcG9ydCBBeGlzIGZyb20gJy4vYXhpcy5qcyc7XG5cbmNvbnN0IFBvc0RlbHRhID0gbW90aW9udXRpbHMuTW90aW9uRGVsdGEuUG9zRGVsdGE7XG5jb25zdCBNb3ZlRGVsdGEgPSBtb3Rpb251dGlscy5Nb3Rpb25EZWx0YS5Nb3ZlRGVsdGE7XG5jb25zdCBBY3RpdmUgPSBCYXNlU2VxdWVuY2VyLkFjdGl2ZTtcbmNvbnN0IEFjdGl2ZU1hcCA9IEJhc2VTZXF1ZW5jZXIuQWN0aXZlTWFwO1xuY29uc3QgUmVsYXRpb24gPSBJbnRlcnZhbC5SZWxhdGlvbjtcblxuY29uc3QgRVZFTlRNQVBfVEhSRVNIT0xEID0gNTAwMDtcbmNvbnN0IEFDVElWRUNVRVNfVEhSRVNIT0xEID0gNTAwMDtcblxuLypcbiAgICBjYWxjdWxhdGUgZ2VuZXJhbCBtb3ZlbWVudCBkaXJlY3Rpb24gZm9yIGRvdWJsZSBzZXF1ZW5jZXJcbiAgICBkZWZpbmUgbW92ZW1lbnQgZGlyZWN0aW9uIGFzIHRoZSBhZ2dyZWdhdGUgbW92ZW1lbnQgZGlyZWN0aW9uXG4gICAgZm9yIGJvdGggdGltaW5nIG9iamVjdHNcbiovXG5mdW5jdGlvbiBtb3ZlbWVudF9kaXJlY3Rpb24gKG5vd192ZWN0b3JfQSwgbm93X3ZlY3Rvcl9CKSB7XG4gICAgbGV0IGRpcmVjdGlvbl9BID0gbW90aW9udXRpbHMuY2FsY3VsYXRlRGlyZWN0aW9uKG5vd192ZWN0b3JfQSk7XG4gICAgbGV0IGRpcmVjdGlvbl9CID0gbW90aW9udXRpbHMuY2FsY3VsYXRlRGlyZWN0aW9uKG5vd192ZWN0b3JfQik7XG4gICAgbGV0IGRpcmVjdGlvbiA9IGRpcmVjdGlvbl9BICsgZGlyZWN0aW9uX0I7XG4gICAgcmV0dXJuIChkaXJlY3Rpb24gPiAwKSA/IDEgOiAoZGlyZWN0aW9uIDwgMCkgPyAtMSA6IDA7XG59XG5cblxuY2xhc3MgRG91YmxlU2VxdWVuY2VyIGV4dGVuZHMgQmFzZVNlcXVlbmNlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAoYXhpcywgdG9BLCB0b0IpIHtcblxuICAgICAgICBzdXBlcihheGlzKTtcblxuICAgICAgICAvLyBUaW1pbmcgb2JqZWN0c1xuICAgICAgICB0aGlzLl90b0EgPSB0b0E7XG4gICAgICAgIHRoaXMuX3RvQV9yZWFkeSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl90b0IgPSB0b0I7XG4gICAgICAgIHRoaXMuX3RvQl9yZWFkeSA9IGZhbHNlO1xuICAgICAgICBsZXQgdG9fY2IgPSB0aGlzLl9vblRpbWluZ0NhbGxiYWNrLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3N1YkEgPSB0aGlzLl90b0Eub24oXCJ0aW1pbmdzcmNcIiwgdG9fY2IpO1xuICAgICAgICB0aGlzLl9zdWJCID0gdGhpcy5fdG9CLm9uKFwidGltaW5nc3JjXCIsIHRvX2NiKTtcblxuICAgICAgICAvLyBTY2hlZHVsZXNcbiAgICAgICAgbGV0IHNjaGVkX2NiID0gdGhpcy5fb25TY2hlZHVsZUNhbGxiYWNrLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3NjaGVkQSA9IG5ldyBTY2hlZHVsZSh0aGlzLl9heGlzLCB0b0EpO1xuICAgICAgICB0aGlzLl9zY2hlZEFfY2IgPSB0aGlzLl9zY2hlZEEuYWRkX2NhbGxiYWNrKHNjaGVkX2NiKTtcbiAgICAgICAgdGhpcy5fc2NoZWRCID0gbmV3IFNjaGVkdWxlKHRoaXMuX2F4aXMsIHRvQik7XG4gICAgICAgIHRoaXMuX3NjaGVkQl9jYiA9IHRoaXMuX3NjaGVkQi5hZGRfY2FsbGJhY2soc2NoZWRfY2IpO1xuXG4gICAgfVxuXG5cbiAgICBfaXNSZWFkeSgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl90b0FfcmVhZHkgJiYgdGhpcy5fdG9CX3JlYWR5KTtcbiAgICB9XG5cbiAgICBnZXRfbW92ZW1lbnRfZGlyZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBub3cgPSB0aGlzLl90b0EuY2xvY2subm93KCk7XG4gICAgICAgIGNvbnN0IG5vd192ZWN0b3JfQSA9IG1vdGlvbnV0aWxzLmNhbGN1bGF0ZVZlY3Rvcih0aGlzLl90b0EudmVjdG9yLCBub3cpO1xuICAgICAgICBjb25zdCBub3dfdmVjdG9yX0IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodGhpcy5fdG9CLnZlY3Rvciwgbm93KTtcbiAgICAgICAgcmV0dXJuIG1vdmVtZW50X2RpcmVjdGlvbihub3dfdmVjdG9yX0EsIG5vd192ZWN0b3JfQik7XG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBBWElTIENBTExCQUNLXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgLypcbiAgICAgICAgSGFuZGxpbmcgQXhpcyBVcGRhdGUgQ2FsbGJhY2tzXG4gICAgKi9cbiAgICBfb25BeGlzQ2FsbGJhY2soZXZlbnRNYXAsIHJlbGV2YW5jZUludGVydmFsKSB7XG4gICAgICAgIGlmICghdGhpcy5faXNSZWFkeSgpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVsZXZhbmNlSW50ZXJ2YWwgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhc3N1bWluZyBib3RoIHRpbWluZyBvYmplY3RzIGhhdmUgdGhlIHNhbWUgY2xvY2tcbiAgICAgICAgY29uc3Qgbm93ID0gdGhpcy5fdG9BLmNsb2NrLm5vdygpO1xuICAgICAgICBjb25zdCBub3dfdmVjdG9yX0EgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3IodGhpcy5fdG9BLnZlY3Rvciwgbm93KTtcbiAgICAgICAgY29uc3Qgbm93X3ZlY3Rvcl9CID0gbW90aW9udXRpbHMuY2FsY3VsYXRlVmVjdG9yKHRoaXMuX3RvQi52ZWN0b3IsIG5vdyk7XG5cbiAgICAgICAgLy8gYWN0aXZlIGludGVydmFsXG4gICAgICAgIGxldCBbcG9zX0EsIHBvc19CXSA9IFtub3dfdmVjdG9yX0EucG9zaXRpb24sIG5vd192ZWN0b3JfQi5wb3NpdGlvbl07XG4gICAgICAgIGxldCBbbG93LCBoaWdoXSA9IChwb3NfQSA8PSBwb3NfQikgPyBbcG9zX0EsIHBvc19CXSA6IFtwb3NfQiwgcG9zX0FdO1xuICAgICAgICBjb25zdCBhY3RpdmVJbnRlcnZhbCA9IG5ldyBJbnRlcnZhbChsb3csIGhpZ2gsIHRydWUsIHRydWUpO1xuXG4gICAgICAgIGlmICghYWN0aXZlSW50ZXJ2YWwubWF0Y2gocmVsZXZhbmNlSW50ZXJ2YWwsIEludGVydmFsLk1hdGNoLk9VVFNJREUpKSB7XG4gICAgICAgICAgICAvLyByZWxldmFuY2VJbnRlcnZhbCBpcyBOT1Qgb3V0c2lkZSBhY3RpdmVJbnRlcnZhbFxuICAgICAgICAgICAgLy8gc29tZSBldmVudHMgcmVsZXZhbnQgZm9yIGFjdGl2ZUludGVydmFsZVxuXG4gICAgICAgICAgICAvLyBjaG9vc2UgYXBwcm9hY2ggdG8gZ2V0IGV2ZW50c1xuICAgICAgICAgICAgbGV0IGdldF9ldmVudHMgPSB0aGlzLl9ldmVudHNfZnJvbV9heGlzX2V2ZW50cy5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgaWYgKEVWRU5UTUFQX1RIUkVTSE9MRCA8IGV2ZW50TWFwLnNpemUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYWN0aXZlQ3Vlcy5zaXplIDwgQUNUSVZFQ1VFU19USFJFU0hPTEQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0X2V2ZW50cyA9IHRoaXMuX2V2ZW50c19mcm9tX2F4aXNfbG9va3VwLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBbZXhpdCwgY2hhbmdlLCBlbnRlcl0gPSBnZXRfZXZlbnRzKGV2ZW50TWFwLCBhY3RpdmVJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBhY3RpdmVDdWVzXG4gICAgICAgICAgICBleGl0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWN0aXZlQ3Vlcy5kZWxldGUoaXRlbS5rZXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbnRlci5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUN1ZXMuc2V0KGl0ZW0ua2V5LCBpdGVtLm5ldyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gbm90aWZpY2F0aW9uc1xuICAgICAgICAgICAgY29uc3QgZXZlbnRzID0gYXJyYXlfY29uY2F0KFtleGl0LCBjaGFuZ2UsIGVudGVyXSwge2NvcHk6dHJ1ZSwgb3JkZXI6dHJ1ZX0pO1xuXG4gICAgICAgICAgICAvLyBzb3J0IGV2ZW50cyBhY2NvcmRpbmcgdG8gZ2VuZXJhbCBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb24gPSBtb3ZlbWVudF9kaXJlY3Rpb24obm93X3ZlY3Rvcl9BLCBub3dfdmVjdG9yX0IpO1xuICAgICAgICAgICAgQmFzZVNlcXVlbmNlci5zb3J0X2V2ZW50cyhldmVudHMsIGRpcmVjdGlvbik7XG5cbiAgICAgICAgICAgIC8vIGV2ZW50IG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgdGhpcy5fbm90aWZ5RXZlbnRzKGV2ZW50cywgZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIGNsZWFyIHNjaGVkdWxlc1xuXG4gICAgICAgICAgICBUaGlzIGlzIG9ubHkgbmVjZXNzYXJ5IGlmIGEgY3VlIGludGVydmFsIGlzIGNoYW5nZWQsXG4gICAgICAgICAgICBhbmQgdGhlIGNoYW5nZSBpcyByZWxldmFudCB3aXRoaW4gdGhlIHBvc0ludGVydmFsIG9mXG4gICAgICAgICAgICBvbmUgb2YgdGhlIHNjaGVkdWxlcy4gUmVsZXZhbmNlSW50ZXJ2YWwgdG8gZmlndXJlIHRoaXMgb3V0LlxuICAgICAgICAqL1xuXG4gICAgICAgIGlmICh0aGlzLl9zY2hlZEEucG9zSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fc2NoZWRBLnBvc0ludGVydmFsLm1hdGNoKHJlbGV2YW5jZUludGVydmFsLCBJbnRlcnZhbC5NYXRjaC5PVVRTSURFKSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGV2YW5jZUludGVydmFsIGlzIE5PVCBvdXRzaWRlIHNjaGVkdWxlIHBvc0ludGVydmFsXG4gICAgICAgICAgICAgICAgLy8gcmVmcmVzaCBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHRoaXMuX3NjaGVkQS5zZXRWZWN0b3Iobm93X3ZlY3Rvcl9BKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9zY2hlZEIucG9zSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fc2NoZWRCLnBvc0ludGVydmFsLm1hdGNoKHJlbGV2YW5jZUludGVydmFsLCBJbnRlcnZhbC5NYXRjaC5PVVRTSURFKSkge1xuICAgICAgICAgICAgICAgIC8vIHJlbGV2YW5jZUludGVydmFsIGlzIE5PVCBvdXRzaWRlIHNjaGVkdWxlIHBvc0ludGVydmFsXG4gICAgICAgICAgICAgICAgLy8gcmVmcmVzaCBzY2hlZHVsZVxuICAgICAgICAgICAgICAgIHRoaXMuX3NjaGVkQi5zZXRWZWN0b3Iobm93X3ZlY3Rvcl9CKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBUSU1JTkcgT0JKRUNUIENBTExCQUNLXG4gICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgLypcbiAgICAgICAgSGFuZGxpbmcgQ2hhbmdlIEV2ZW50cyBmcm9tIFRpbWluZyBPYmplY3RzXG4gICAgKi9cbiAgICBfb25UaW1pbmdDYWxsYmFjayAoZUFyZywgZUluZm8pIHtcblxuICAgICAgICAvKlxuICAgICAgICAgICAgbWFrZSBzdXJlIGJvdGggdGltaW5nb2JqZWN0cyBhcmUgcmVhZHlcbiAgICAgICAgKi9cbiAgICAgICAgbGV0IGluaXQgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLl9pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIGlmIChlSW5mby5zcmMgPT0gdGhpcy5fdG9BKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdG9BX3JlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdG9CX3JlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICBpbml0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIGZpZ3VyZSBvdXQgd2hpY2ggdGltaW5nIG9iamVjdCB3YXMgZmlyaW5nXG4gICAgICAgICovXG4gICAgICAgIGNvbnN0IHRvID0gZUluZm8uc3JjO1xuICAgICAgICBjb25zdCBvdGhlcl90byA9ICh0byA9PSB0aGlzLl90b0EpID8gdGhpcy5fdG9CIDogdGhpcy5fdG9BO1xuXG4gICAgICAgIC8qXG4gICAgICAgICAgICBJZiB1cGRhdGUgaXMgdGhlIGluaXRpYWwgdmVjdG9yIGZyb20gdGhlIHRpbWluZyBvYmplY3QsXG4gICAgICAgICAgICB3ZSBzZXQgY3VycmVudCB0aW1lIGFzIHRoZSBvZmZpY2lhbCB0aW1lIGZvciB0aGUgdXBkYXRlLlxuICAgICAgICAgICAgRWxzZSwgdGhlIG5ldyB2ZWN0b3IgaXMgXCJsaXZlXCIgYW5kIHdlIHVzZSB0aGUgdGltZXN0YW1wXG4gICAgICAgICAgICB3aGVuIGl0IHdhcyBjcmVhdGVkIGFzIHRoZSBvZmZpY2lhbCB0aW1lIGZvciB0aGUgdXBkYXRlLlxuICAgICAgICAgICAgVGhpcyBpcyByZXByZXNlbnRlZCBieSB0aGUgbmV3X3ZlY3Rvci5cbiAgICAgICAgKi9cbiAgICAgICAgbGV0IG5ld192ZWN0b3I7XG4gICAgICAgIGlmIChlQXJnLmxpdmUpIHtcbiAgICAgICAgICAgIG5ld192ZWN0b3IgPSB0by52ZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdfdmVjdG9yID0gbW90aW9udXRpbHMuY2FsY3VsYXRlVmVjdG9yKHRvLnZlY3RvciwgdG8uY2xvY2subm93KCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIFRoZSBuYXR1cmUgb2YgdGhlIHZlY3RvciBjaGFuZ2VcbiAgICAgICAgKi9cbiAgICAgICAgY29uc3QgZGVsdGEgPSBuZXcgbW90aW9udXRpbHMuTW90aW9uRGVsdGEodG8ub2xkX3ZlY3RvciwgbmV3X3ZlY3Rvcik7XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIFNhbXBsZSB0aGUgc3RhdGUgb2YgdGhlIG90aGVyIHRpbWluZyBvYmplY3QgYXQgc2FtZSB0aW1lLlxuICAgICAgICAqL1xuICAgICAgICBsZXQgdHMgPSBuZXdfdmVjdG9yLnRpbWVzdGFtcDtcbiAgICAgICAgbGV0IG90aGVyX25ld192ZWN0b3IgPSBtb3Rpb251dGlscy5jYWxjdWxhdGVWZWN0b3Iob3RoZXJfdG8udmVjdG9yLCB0cyk7XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIFJlZXZhbHVhdGUgYWN0aXZlIHN0YXRlLlxuICAgICAgICAgICAgVGhpcyBpcyByZXF1aXJlZCBhZnRlciBhbnkgZGlzY29udGludWl0eSBvZiB0aGUgcG9zaXRpb24gKGp1bXApLFxuICAgICAgICAgICAgb3IgaWYgdGhlIG1vdGlvbiBzdG9wcGVkIHdpdGhvdXQganVtcGluZyAocGF1c2Ugb3IgaGFsdCBhdCByYW5nZVxuICAgICAgICAgICAgcmVzdHJpY3Rpb24pXG4gICAgICAgICovXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IFtdO1xuICAgICAgICBpZiAoZGVsdGEucG9zRGVsdGEgPT0gUG9zRGVsdGEuQ0hBTkdFIHx8IGRlbHRhLk1vdmVEZWx0YSA9PSBNb3ZlRGVsdGEuU1RPUCkge1xuXG4gICAgICAgICAgICAvLyBtYWtlIHBvc2l0aW9uIGludGVydmFsXG4gICAgICAgICAgICBsZXQgbG93ID0gTWF0aC5taW4obmV3X3ZlY3Rvci5wb3NpdGlvbiwgb3RoZXJfbmV3X3ZlY3Rvci5wb3NpdGlvbik7XG4gICAgICAgICAgICBsZXQgaGlnaCA9IE1hdGgubWF4KG5ld192ZWN0b3IucG9zaXRpb24sIG90aGVyX25ld192ZWN0b3IucG9zaXRpb24pO1xuICAgICAgICAgICAgbGV0IGl0diA9IG5ldyBJbnRlcnZhbChsb3csIGhpZ2gsIHRydWUsIHRydWUpO1xuXG4gICAgICAgICAgICAvLyBuZXcgYWN0aXZlIGN1ZXNcbiAgICAgICAgICAgIGxldCBhY3RpdmVDdWVzID0gbmV3IE1hcCh0aGlzLl9heGlzLmxvb2t1cChpdHYpLm1hcChjdWUgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBbY3VlLmtleSwgY3VlXTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIC8vIGV4aXQgY3VlcyAtIGluIG9sZCBhY3RpdmVDdWVzIGJ1dCBub3QgaW4gbmV3IGFjdGl2ZUN1ZXNcbiAgICAgICAgICAgIGxldCBleGl0Q3VlcyA9IG1hcF9kaWZmZXJlbmNlKHRoaXMuX2FjdGl2ZUN1ZXMsIGFjdGl2ZUN1ZXMpO1xuICAgICAgICAgICAgLy8gZW50ZXIgY3VlcyAtIG5vdCBpbiBvbGQgYWN0aXZlQ3VlcyBidXQgaW4gbmV3IGFjdGl2ZUN1ZXNcbiAgICAgICAgICAgIGxldCBlbnRlckN1ZXMgPSBtYXBfZGlmZmVyZW5jZShhY3RpdmVDdWVzLCB0aGlzLl9hY3RpdmVDdWVzKTtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBhY3RpdmUgY3Vlc1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlQ3VlcyA9IGFjdGl2ZUN1ZXM7XG4gICAgICAgICAgICAvLyBtYWtlIGV2ZW50c1xuICAgICAgICAgICAgZm9yIChsZXQgY3VlIG9mIGV4aXRDdWVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6dW5kZWZpbmVkLCBvbGQ6Y3VlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBjdWUgb2YgZW50ZXJDdWVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgZXZlbnRzLnB1c2goe2tleTpjdWUua2V5LCBuZXc6Y3VlLCBvbGQ6dW5kZWZpbmVkfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNvcnQgZXZlbnRzIGFjY29yZGluZyB0byBnZW5lcmFsIG1vdmVtZW50IGRpcmVjdGlvblxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbiA9IG1vdmVtZW50X2RpcmVjdGlvbihuZXdfdmVjdG9yLCBvdGhlcl9uZXdfdmVjdG9yKTtcbiAgICAgICAgICAgIEJhc2VTZXF1ZW5jZXIuc29ydF9ldmVudHMoZXZlbnRzLCBkaXJlY3Rpb24pO1xuXG4gICAgICAgICAgICAvLyBldmVudCBub3RpZmljYXRpb25cbiAgICAgICAgICAgIHRoaXMuX25vdGlmeUV2ZW50cyhldmVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIEhhbmRsZSBUaW1pbmcgT2JqZWN0IE1vdmluZ1xuICAgICAgICAgICAgLSBvbiBpbml0IGJvdGggc2hlZHVsZXMgbXVzdCBiZSB1cGRhdGVkXG4gICAgICAgICovXG4gICAgICAgIGlmICh0byA9PSB0aGlzLl90b0EpIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkQS5zZXRWZWN0b3IobmV3X3ZlY3Rvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodG8gPT0gdGhpcy5fdG9CKSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZEIuc2V0VmVjdG9yKG5ld192ZWN0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbml0KSB7XG4gICAgICAgICAgICBpZiAob3RoZXJfdG8gPT0gdGhpcy5fdG9BKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZWRBLnNldFZlY3RvcihvdGhlcl9uZXdfdmVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3RoZXJfdG8gPT0gdGhpcy5fdG9CKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2NoZWRCLnNldFZlY3RvcihvdGhlcl9uZXdfdmVjdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgU0NIRURVTEUgQ0FMTEJBQ0tcbiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbiAgICAvKlxuICAgICAgICBIYW5kbGluZyBkdWUgRXZlbnRzIGZyb20gU2NoZWR1bGVzXG4gICAgKi9cbiAgICBfb25TY2hlZHVsZUNhbGxiYWNrID0gZnVuY3Rpb24obm93LCBlbmRwb2ludEl0ZW1zLCBzY2hlZHVsZSkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzUmVhZHkoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICAgIGZpZ3VyZSBvdXQgd2hpY2ggdGltaW5nIG9iamVjdCB3YXMgZmlyaW5nXG4gICAgICAgICovXG4gICAgICAgIGNvbnN0IHRvID0gc2NoZWR1bGUudG87XG4gICAgICAgIGNvbnN0IG90aGVyX3RvID0gKHRvID09IHRoaXMuX3RvQSkgPyB0aGlzLl90b0IgOiB0aGlzLl90b0E7XG5cbiAgICAgICAgY29uc3QgZXZlbnRzID0gW107XG4gICAgICAgIGVuZHBvaW50SXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGZpZ3VyZSBvdXQgaWYgdG8gKGV2ZW50IHNvdXJjZSkgaXMgbG93ZXIgdGhhbiB0aGUgb3RoZXIgdG9cbiAgICAgICAgICAgICAgICBhdCB0aW1lIG9mIGV2ZW50XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gZW5kcG9pbnRcbiAgICAgICAgICAgIGxldCBbcG9zLCByaWdodCwgY2xvc2VkLCBzaW5ndWxhcl0gPSBpdGVtLmVuZHBvaW50O1xuICAgICAgICAgICAgLy8gcG9zaXRpb24gb2Ygb3RoZXIgdG8gYXQgdGltZSBvZiBldmVudFxuICAgICAgICAgICAgbGV0IHRzID0gaXRlbS50c0VuZHBvaW50WzBdO1xuICAgICAgICAgICAgbGV0IG90aGVyX3ZlY3RvciA9IG1vdGlvbnV0aWxzLmNhbGN1bGF0ZVZlY3RvcihvdGhlcl90by52ZWN0b3IsIHRzKTtcbiAgICAgICAgICAgIGxldCBwb3Nfb3RoZXIgPSBvdGhlcl92ZWN0b3IucG9zaXRpb247XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgQWN0aW9uIENvZGUgLSBzZWUgc2VxdWVuY2V1dGlsc1xuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIHRvIHJvbGVcbiAgICAgICAgICAgIGxldCB0b19yb2xlID0gKHBvcyA8IHBvc19vdGhlcikgPyBcIkxcIiA6IChwb3MgPT0gcG9zX290aGVyKSA/IFwiU1wiIDogXCJSXCI7XG4gICAgICAgICAgICAvLyBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgIGxldCB0b19kaXIgPSAoaXRlbS5kaXJlY3Rpb24gPiAwKSA/IFwiUlwiIDogXCJMXCI7XG4gICAgICAgICAgICAvLyBlbmRwb2ludCB0eXBlXG4gICAgICAgICAgICBsZXQgZXBfdHlwZSA9IChzaW5ndWxhcikgPyBcIlNcIjogKHJpZ2h0KSA/IFwiUlwiIDogXCJMXCI7XG4gICAgICAgICAgICAvLyBhY3Rpb24gY29kZSwgZW50ZXIsIGV4aXQsIHN0YXksIGVudGVyLWV4aXRcbiAgICAgICAgICAgIGxldCBhY3Rpb25fY29kZSA9IEFjdGl2ZU1hcC5nZXQoYCR7dG9fcm9sZX0ke3RvX2Rpcn0ke2VwX3R5cGV9YCk7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgc3RhdGUgb2YgY3VlXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgbGV0IGN1ZSA9IGl0ZW0uY3VlO1xuICAgICAgICAgICAgbGV0IGhhc19jdWUgPSB0aGlzLl9hY3RpdmVDdWVzLmhhcyhjdWUua2V5KTtcblxuICAgICAgICAgICAgLy8gZmlsdGVyIGFjdGlvbiBjb2RlXG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NvZGUgPT0gQWN0aXZlLkVOVEVSX0VYSVQpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICBib3RoIHRpbWluZyBvYmplY3RzIGV2YWx1YXRlZCB0byBzYW1lIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGVpdGhlclxuICAgICAgICAgICAgICAgICAgICAxKSB0byBpcyBtb3ZpbmcgYW5kIG90aGVyX3RvIGlzIHBhdXNlZCBhdCB0aGlzIHBvaW50LFxuICAgICAgICAgICAgICAgICAgICAgICBpbXBseWluZyB0aGF0IHRoZSBjdWUgU1RBWVMgYWN0aXZlXG4gICAgICAgICAgICAgICAgICAgIG9yLFxuICAgICAgICAgICAgICAgICAgICAyKSBib3RoIGFyZSBtb3ZpbmcuIGlmIGJvdGggYXJlIG1vdmluZyBpbiB0aGUgc2FtZVxuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gLSBFWElUXG4gICAgICAgICAgICAgICAgICAgIG9wcG9zaXRlIGRpcmVjdGlvbiAtIEVOVEVSXG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBsZXQgb3RoZXJfbW92aW5nID0gbW90aW9udXRpbHMuaXNNb3Zpbmcob3RoZXJfdmVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoIW90aGVyX21vdmluZykge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBub3QgbW92aW5nXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbl9jb2RlID0gQWN0aXZlLkVOVEVSO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJvdGggbW92aW5nXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb24gPSBtb3Rpb251dGlscy5jYWxjdWxhdGVEaXJlY3Rpb24ob3RoZXJfdmVjdG9yKTsgICAgICAgICAgICAgICAgICAgICAgICAvLyBtb3ZlbWVudCBkaXJlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uX2NvZGUgPSAoZGlyZWN0aW9uICE9IGl0ZW0uZGlyZWN0aW9uKSA/IEFjdGl2ZS5FTlRFUiA6IEFjdGl2ZS5FWElUO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhY3Rpb25fY29kZSA9PSBBY3RpdmUuU1RBWSkge1xuICAgICAgICAgICAgICAgIGFjdGlvbl9jb2RlID0gQWN0aXZlLkVOVEVSO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFjdGlvbl9jb2RlID09IEFjdGl2ZS5FTlRFUiAmJiBoYXNfY3VlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFjdGlvbl9jb2RlID09IEFjdGl2ZS5FWElUICYmICFoYXNfY3VlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBlbnRlciBvciBleGl0XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NvZGUgPT0gQWN0aXZlLkVOVEVSKSB7XG4gICAgICAgICAgICAgICAgLy8gZW50ZXJcbiAgICAgICAgICAgICAgICBldmVudHMucHVzaCh7a2V5OmN1ZS5rZXksIG5ldzpjdWUsIG9sZDp1bmRlZmluZWR9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3RpdmVDdWVzLnNldChjdWUua2V5LCBjdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rpb25fY29kZSA9PSBBY3RpdmUuRVhJVCkge1xuICAgICAgICAgICAgICAgIC8vIGV4aXRcbiAgICAgICAgICAgICAgICBldmVudHMucHVzaCh7a2V5OmN1ZS5rZXksIG5ldzp1bmRlZmluZWQsIG9sZDpjdWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3RpdmVDdWVzLmRlbGV0ZShjdWUua2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgLy8gRXZlbnRzIGFscmVhZHkgc29ydGVkXG5cbiAgICAgICAgLy8gZXZlbnQgbm90aWZpY2F0aW9uXG4gICAgICAgIHRoaXMuX25vdGlmeUV2ZW50cyhldmVudHMpO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRG91YmxlU2VxdWVuY2VyO1xuXG4iLCJcbi8qXG4gICAgQ29weXJpZ2h0IDIwMjBcbiAgICBBdXRob3IgOiBJbmdhciBBcm50emVuXG5cbiAgICBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgVGltaW5nc3JjIG1vZHVsZS5cblxuICAgIFRpbWluZ3NyYyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gICAgaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gICAgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbiwgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAgICAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuXG4gICAgVGltaW5nc3JjIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gICAgYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAgICBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gICAgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG5cbiAgICBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgTGVzc2VyIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAgICBhbG9uZyB3aXRoIFRpbWluZ3NyYy4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiovXG5cbi8vIHV0aWxzXG5leHBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWwvdXRpbHMuanMnO1xuZXhwb3J0ICogYXMgbW90aW9udXRpbHMgZnJvbSAnLi91dGlsL21vdGlvbnV0aWxzLmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBlbmRwb2ludH0gZnJvbSAnLi91dGlsL2VuZHBvaW50LmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBldmVudGlmeX0gZnJvbSAnLi91dGlsL2V2ZW50aWZ5LmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBJbnRlcnZhbH0gZnJvbSAnLi91dGlsL2ludGVydmFsLmpzJztcblxuLy8gdGltaW5nIG9iamVjdFxuZXhwb3J0IHtkZWZhdWx0IGFzIFRpbWluZ09iamVjdH0gZnJvbSAnLi90aW1pbmdvYmplY3QvdGltaW5nb2JqZWN0LmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBTa2V3Q29udmVydGVyfSBmcm9tICcuL3RpbWluZ29iamVjdC9za2V3Y29udmVydGVyLmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBEZWxheUNvbnZlcnRlcn0gZnJvbSAnLi90aW1pbmdvYmplY3QvZGVsYXljb252ZXJ0ZXIuanMnO1xuZXhwb3J0IHtkZWZhdWx0IGFzIFNjYWxlQ29udmVydGVyfSBmcm9tICcuL3RpbWluZ29iamVjdC9zY2FsZWNvbnZlcnRlci5qcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgTG9vcENvbnZlcnRlcn0gZnJvbSAnLi90aW1pbmdvYmplY3QvbG9vcGNvbnZlcnRlci5qcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgUmFuZ2VDb252ZXJ0ZXJ9IGZyb20gJy4vdGltaW5nb2JqZWN0L3JhbmdlY29udmVydGVyLmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBUaW1lc2hpZnRDb252ZXJ0ZXJ9IGZyb20gJy4vdGltaW5nb2JqZWN0L3RpbWVzaGlmdGNvbnZlcnRlci5qcyc7XG5cbi8vIHNlcXVlbmNpbmdcbmV4cG9ydCB7ZGVmYXVsdCBhcyBBeGlzfSBmcm9tICcuL3NlcXVlbmNpbmcvYXhpcy5qcyc7XG5pbXBvcnQge2RlZmF1bHQgYXMgU2luZ2xlU2VxdWVuY2VyfSBmcm9tICcuL3NlcXVlbmNpbmcvc2luZ2xlc2VxdWVuY2VyLmpzJztcbmltcG9ydCB7ZGVmYXVsdCBhcyBEb3VibGVTZXF1ZW5jZXJ9IGZyb20gJy4vc2VxdWVuY2luZy9kb3VibGVzZXF1ZW5jZXIuanMnO1xuXG5cbi8qXG4gICAgQ29tbW9uIGNvbnN0cnVjdG9yIFNpbmdlU2VxdWVuY2VyIGFuZCBEb3VibGVTZXF1ZW5jZXJcbiovXG5leHBvcnQgZnVuY3Rpb24gU2VxdWVuY2VyKGF4aXMsIHRvQSwgdG9CKSB7XG4gICAgaWYgKHRvQiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBuZXcgU2luZ2xlU2VxdWVuY2VyKGF4aXMsIHRvQSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEb3VibGVTZXF1ZW5jZXIoYXhpcywgdG9BLCB0b0IpO1xuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCB2ZXJzaW9uID0gXCJ2My4wXCI7XG4iXSwibmFtZXMiOlsiaXNOdW1iZXIiLCJjbXAiLCJjYWxjdWxhdGVWZWN0b3IiLCJjaGVja1JhbmdlIiwibW90aW9udXRpbHMuY2hlY2tSYW5nZSIsIm1vdGlvbnV0aWxzLmNhbGN1bGF0ZVZlY3RvciIsIm1vdGlvbnV0aWxzLk1vdGlvbkRlbHRhIiwibW90aW9udXRpbHMuZXF1YWxWZWN0b3JzIiwibW90aW9udXRpbHMuaXNNb3ZpbmciLCJtb3Rpb251dGlscy5jYWxjdWxhdGVEZWx0YSIsIlJlbGF0aW9uIiwidXRpbHMub2JqZWN0X2VxdWFscyIsInV0aWxzLmlzSXRlcmFibGUiLCJ1dGlscy5hcnJheV9jb25jYXQiLCJtb3Rpb251dGlscy5wb3NJbnRlcnZhbF9mcm9tX3RpbWVJbnRlcnZhbCIsImVuZHBvaW50RXZlbnRzIiwibW90aW9udXRpbHMuZW5kcG9pbnRFdmVudHMiLCJtb3Rpb251dGlscy5yYW5nZUludGVyc2VjdCIsIkFjdGl2ZSIsIkFjdGl2ZU1hcCIsIm1vdGlvbnV0aWxzLmNhbGN1bGF0ZURpcmVjdGlvbiIsIlBvc0RlbHRhIiwiTW92ZURlbHRhIiwiRVZFTlRNQVBfVEhSRVNIT0xEIiwiQUNUSVZFQ1VFU19USFJFU0hPTEQiXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ08sU0FBUyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUM5QixJQUFJLE9BQU8sRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUNEO0FBQ08sU0FBUyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtBQUM5QixJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUMzQjtBQUNBLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTtBQUM5QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDckIsR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLEdBQUc7QUFDSCxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUMsRUFBRTtBQUNGLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTtBQUM5QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDckIsR0FBRyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLEdBQUc7QUFDSCxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUMsRUFBRTtBQUNGLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3JCO0FBQ0EsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLEVBQUUsTUFBTTtBQUNSO0FBQ0EsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLEVBQUU7QUFDRixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN4QixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDLFFBQVEsTUFBTSxHQUFHLE1BQU0sRUFBRTtBQUMxQixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN6QixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDLFFBQVEsTUFBTSxHQUFHLE1BQU0sRUFBRTtBQUMxQixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxRQUFRLE1BQU0sSUFBSSxNQUFNLEVBQUU7QUFDM0IsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDNUIsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekIsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxD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QUM7QUFDdEIsR0FBRztBQUNILEVBQUUsSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxHQUFHLElBQUksQ0FBQztBQUMzQyxFQUFFLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRSxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQzVDLEVBQUUsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDbEQsRUFBRSxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsV0FBVyxHQUFHLEtBQUssQ0FBQztBQUNyRCxFQUFFLElBQUksT0FBTyxVQUFVLEtBQUssU0FBUyxFQUFFLE1BQU0sSUFBSSxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUN6RixFQUFFLElBQUksT0FBTyxXQUFXLEtBQUssU0FBUyxFQUFFLE1BQU0sSUFBSSxhQUFhLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMzRixFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDbkIsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztBQUMvQixFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0FBQ2pDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDckMsRUFBRSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNDLEVBQUUsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFD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R0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ25DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztBQUM5QztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDbEMsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDaEM7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7QUFDN0IsUUFBUSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM5QyxRQUFRLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRSxRQUFRLElBQUksSUFBSSxJQUFJLFNBQVMsRUFBRTtBQUMvQixZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDN0MsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxTQUFTLE1BQU07QUFDZixZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMs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
