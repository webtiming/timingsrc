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


const isNumber = function(n) {
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
};


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

const Match = Object.freeze({
	OUTSIDE: MATCH_OUTSIDE,
	INSIDE: MATCH_INSIDE,
	OVERLAP: MATCH_OVERLAP,
	COVERS: MATCH_COVERS,
	ALL: MATCH_ALL
});


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
		if (isNumber(a)) {
			a = new Interval(a);
		} else {
			throw new IntervalError("a not interval", a);
		}
	}
	if (! b instanceof Interval) {
		// could be a number
		if (isNumber(b)) {
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



/**
 *  Create interval from two endpoints
 */

function fromEndpoints(endpointLow, endpointHigh) {
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


// intersect two intervals
function intersect(a, b) {
	let rel = compare(a, b);
	if (rel == Relation.OUTSIDE_LEFT) {
		return [];
	} else if (rel == Relation.OVERLAP_LEFT) {
		return [Interval.fromEndpoints(b.endpointLow, a.endpointHigh)];
	} else if (rel == Relation.COVERS) {
		return [b];
	} else if (rel == Relation.EQUALS) {
		return [a]; // or b
	} else if (rel == Relation.COVERED) {
		return [a];
	} else if (rel == Relation.OVERLAP_RIGHT) {
		return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)];
	} else if (rel == Relation.OUTSIDE_RIGHT) {
		return [];
	}
}

// union of two intervals
function union(a, b) {
	let rel = compare(a, b);
	if (rel == Relation.OUTSIDE_LEFT) {
		// merge
		// [aLow,aHigh)[bLow, bHigh] or [aLow,aHigh](bLow, bHigh]
		if (a.high != b.low || (!a.highInclude && !b.lowInclude)) {
			// no merge
			return [a, b];
		} else {
			// merge
			return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)]; 
		}
	} else if (rel == Relation.OVERLAP_LEFT) {
		return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)];
	} else if (rel == Relation.COVERS) {
		return [a];
	} else if (rel == Relation.EQUALS) {
		return [a]; // or b
	} else if (rel == Relation.COVERED) {
		return [b];
	} else if (rel == Relation.OVERLAP_RIGHT) {
		return [Interval.fromEndpoints(b.endpointLow, a.endpointHigh)];
	} else if (rel == Relation.OUTSIDE_RIGHT) {
		// merge
		// [bLow,bHigh)[aLow, aHigh] or [bLow,bHigh](aLow, aHigh]
		if (b.high != a.low || (!b.highInclude && !a.lowInclude)) {
			// no merge
			return [b, a];
		} else {
			// merge
			return [Interval.fromEndpoints(b.endpointLow, a.endpointHigh)];
		}
	}
}

// intersection of multiple intervals
function intersectAll(intervals) {
	intervals.sort(Interval.cmpLow);
	if (intervals.length <= 1) {
		return intervals;
	}
	const result = [intervals.shift()];
	while (intervals.length > 0) {
		let prev = result.pop();
		let next = intervals.shift()
		result.push(...Interval.intersect(prev, next));
	}
	return result;
}

// union of multiple interval
function unionAll(intervals) {
	intervals.sort(Interval.cmpLow);
	if (intervals.length <= 1) {
		return intervals;
	}
	const result = [intervals.shift()];
	while (intervals.length > 0) {
		let prev = result.pop();
		let next = intervals.shift()
		result.push(...Interval.union(prev, next));
	}
	return result;
}


/*********************************************************
INTERVAL CLASS
**********************************************************/

class Interval {


	// private variables

	/*
		Constructor
	*/
	constructor (low, high, lowInclude, highInclude) {
		var lowIsNumber = isNumber(low);
		// new Interval(3.0) defines singular - low === high
		if (lowIsNumber && high === undefined) high = low;
		if (!isNumber(low)) throw new IntervalError(`low not a number, ${low}`);
		if (!isNumber(high)) throw new IntervalError(`high not a number, ${high}`);
		if (low > high) throw new IntervalError(`low > high, ${low}, ${high}`);
		if (low === high) {
			lowInclude = true;
			highInclude = true;
		}
		if (low === -Infinity) lowInclude = true;
		if (high === Infinity) highInclude = true;
		if (lowInclude === undefined) lowInclude = true;
		if (highInclude === undefined) highInclude = false;
		if (typeof lowInclude !== "boolean") {
			throw new IntervalError(`lowInclude not boolean, ${lowInclude}`);
		}
		if (typeof highInclude !== "boolean") {
			throw new IntervalError(`highInclude not boolean, ${highInclude}`);
		}
		this._low = low;
		this._high = high;
		this._lowInclude = lowInclude;
		this._highInclude = highInclude;
		this._length = this._high - this._low;
		this._singular = (this._low === this._high);
		this._finite = (isFinite(this._low) && isFinite(this._high));

		/*
			Accessors for full endpoint representationo
			[value (number), right (bool), closed (bool)]

			- use with inside(endpoint, interval)
		*/
		this._endpointLow = endpoint.create(this._low, false, this._lowInclude, this._singular);
		this._endpointHigh = endpoint.create(this._high, true, this._highInclude, this._singular);
	}

	// accessors
	get low () {return this._low;}
	get high () {return this._high;}
	get lowInclude () {return this._lowInclude;}
	get highInclude () {return this._highInclude;}
	get length () {return this._length;}
	get singular () {return this._singular;}
	get finite () {return this._finite;}
	get endpointLow () {return this._endpointLow;}
	get endpointHigh () {return this._endpointHigh;}
	
	/**
	 *  Instance methods
	 */

	toString () {
		const toString = endpoint.toString;
		if (this._singular) {
			let p = this._endpointLow[0];
			return `[${p}]`;
		} else {
			let low = endpoint.toString(this._endpointLow);
			let high = endpoint.toString(this._endpointHigh);
			return `${low},${high}`;
		}
	};


	asArray() {
		return [this._low, this._high, this._lowInclude, this._highInclude];
	}

	covers_endpoint (p) {
		let leftof = endpoint.leftof(p, this._endpointLow);
		let rightof = endpoint.rightof(p, this._endpointHigh);
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

/*
	Add static properties to Interval class.
*/

Interval.Relation = Relation;
Interval.Match = Match;
Interval.cmpLow = _make_interval_cmp(true);
Interval.cmpHigh = _make_interval_cmp(false);
Interval.fromEndpoints = fromEndpoints;
Interval.intersect = intersect;
Interval.union = union;
Interval.intersectAll = intersectAll;
Interval.unionAll = unionAll;


export default Interval;

