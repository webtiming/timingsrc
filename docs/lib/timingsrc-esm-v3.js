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


function random_string(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


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

function set_difference(as, bs) {
    return new Set([...as].filter((e) => !bs.has(e)));
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

/*

NOTE : just as good to do 
    let merged = new Map(...map0, ...map1, ...)

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
function map_merge(array_of_maps, options={}) {
    let {copy=false, order=false} = options;
    // check input
    if (array_of_maps instanceof Map) {
        return array_of_maps;
    }
    if (!Array.isArray(array_of_maps)) {
        throw new Error("illegal input array_of_maps", array_of_maps);
    }
    if (array_of_maps.length == 0) {
        throw new Error("empty array_of_maps");
    }
    let is_maps = array_of_maps.map((o) => {
        return (o instanceof Map);
    });
    if (!is_maps.every((e) => e == true)) {
        throw new Error("some object in array_of_maps is not a Map", array_of_maps);
    }
    // order
    if (!order) {
        // sort array_of_maps according to size - longest first
        array_of_maps.sort((a, b) => b.size - a.size);
    }
    // copy
    let first = (copy) ? new Map() : array_of_maps.shift(); 
    // fill up first Map with entries from other Maps
    for (let m of array_of_maps) {
        for (let [key, val] of m.entries()) {
            first.set(key, val);
        }
    }
    return first;
}


function divmod$1 (n, d) {
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
    random_string: random_string,
    eqSet: eqSet,
    all: all,
    isIn: isIn,
    set_difference: set_difference,
    map_difference: map_difference,
    map_intersect: map_intersect,
    map_merge: map_merge,
    divmod: divmod$1,
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


const isNumber$1 = function(n) {
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
	if (singular || right == undefined) {
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
		if (!isNumber$1(e1)) {
			throw new Error("e1 not a number", e1);
		}
		e1 = create(e1, undefined, undefined, true);
	}
	if (e2.length === undefined) {
		if (!isNumber$1(e2)) {
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

function cmp$2(e1, e2) {
	let [order1, order2] = get_order(e1, e2);
	let diff = order1 - order2;
	if (diff == 0) return 0;
	return (diff > 0) ? 1 : -1;
}


function min(e1, e2) {
    return (cmp$2(e1, e2) <= 0) ? e1 : e2;
}


function max(e1, e2) {
    return (cmp$2(e1, e2) <= 0) ? e2 : e1;
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
	cmp: cmp$2,
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
}

/*********************************************************
INTERVAL
**********************************************************/

// Interval Relations
const Relation$1 = Object.freeze({
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
const MATCH_OUTSIDE = Relation$1.OUTSIDE_LEFT + Relation$1.OUTSIDE_RIGHT;
const MATCH_INSIDE = Relation$1.EQUALS + Relation$1.COVERED;
const MATCH_OVERLAP = MATCH_INSIDE +
	Relation$1.OVERLAP_LEFT + Relation$1.OVERLAP_RIGHT;
const MATCH_COVERS = MATCH_OVERLAP + Relation$1.COVERS;
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
			return Relation$1.OUTSIDE_RIGHT;
		} else {
			return Relation$1.OVERLAP_RIGHT;
		}
	} else if ([-1, 9, 10].includes(key)) {
		return Relation$1.COVERED;
	} else if ([1, -9, -10].includes(key)) {
		return Relation$1.COVERS;
	} else if (key == 0) {
		return Relation$1.EQUALS;
	} else {
		// key == -11
		// OUTSIDE_RIGHT, PARTIAL_RIGHT
		if (endpoint.rightof(b.endpointLow, a.endpointHigh)) {
			return Relation$1.OUTSIDE_LEFT;
		} else {
			return Relation$1.OVERLAP_LEFT;
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
}

// intersect two intervals
function intersect(a, b) {
	let rel = compare(a, b);
	if (rel == Relation$1.OUTSIDE_LEFT) {
		return [];
	} else if (rel == Relation$1.OVERLAP_LEFT) {
		return [Interval.fromEndpoints(b.endpointLow, a.endpointHigh)];
	} else if (rel == Relation$1.COVERS) {
		return [b];
	} else if (rel == Relation$1.EQUALS) {
		return [a]; // or b
	} else if (rel == Relation$1.COVERED) {
		return [a];
	} else if (rel == Relation$1.OVERLAP_RIGHT) {
		return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)];
	} else if (rel == Relation$1.OUTSIDE_RIGHT) {
		return [];
	}
}

// union of two intervals
function union(a, b) {
	let rel = compare(a, b);
	if (rel == Relation$1.OUTSIDE_LEFT) {
		// merge
		// [aLow,aHigh)[bLow, bHigh] or [aLow,aHigh](bLow, bHigh]
		if (a.high != b.low || (!a.highInclude && !b.lowInclude)) {
			// no merge
			return [a, b];
		} else {
			// merge
			return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)]; 
		}
	} else if (rel == Relation$1.OVERLAP_LEFT) {
		return [Interval.fromEndpoints(a.endpointLow, b.endpointHigh)];
	} else if (rel == Relation$1.COVERS) {
		return [a];
	} else if (rel == Relation$1.EQUALS) {
		return [a]; // or b
	} else if (rel == Relation$1.COVERED) {
		return [b];
	} else if (rel == Relation$1.OVERLAP_RIGHT) {
		return [Interval.fromEndpoints(b.endpointLow, a.endpointHigh)];
	} else if (rel == Relation$1.OUTSIDE_RIGHT) {
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
		let next = intervals.shift();
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
		let next = intervals.shift();
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
		if (!isNumber(low)) throw new IntervalError("low not a number");
		if (!isNumber(high)) throw new IntervalError("high not a number");
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
		endpoint.toString;
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
		return compare(this, other) == Relation$1.EQUALS;
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

Interval.Relation = Relation$1;
Interval.Match = Match;
Interval.cmpLow = _make_interval_cmp(true);
Interval.cmpHigh = _make_interval_cmp(false);
Interval.fromEndpoints = fromEndpoints;
Interval.intersect = intersect;
Interval.union = union;
Interval.intersectAll = intersectAll;
Interval.unionAll = unionAll;

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

function calculateVector$1(vector, ts) {
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
        freshVector = calculateVector$1(vector, ts);
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
    detect range violation
    vector assumed to be valid now
*/
function detectRangeViolation(now_vector, range) {
    return (correctRangeState(now_vector, range) != RangeState.INSIDE);
}


/*
	A snapshot vector is checked with respect to range.
	Returns vector corrected for range violations, or input vector unchanged.

    vector assumed to be valid now
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
}

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

function posInterval_from_timeInterval (timeInterval, vector) {

    /*
        no motion or singular time interval
    */
    if (!isMoving(vector) || timeInterval.singular) {
        return new Interval(vector.position);
    }

    let t0 = timeInterval.low;
    let t1 = timeInterval.high;
    timeInterval.lowInclude;
    timeInterval.highInclude;

    let vector0 = calculateVector$1(vector, t0);
    let p0 = vector0.position;
    let v0 = vector0.velocity;
    let a0 = vector0.acceleration;
    let p1 = calculateVector$1(vector, t1).position;

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

function endpointEvents (timeInterval, posInterval, vector, endpointItems) {

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


/* Static properties */

const PosDelta$2 = Object.freeze({
    NOOP: 0,                // no change in position
    CHANGE: 1               // change in position
});


const MoveDelta$2 = Object.freeze({
    NOOP: 0,                // no change in movement, not moving
    NOOP_MOVING: 1,         // no change in movement, moving
    START: 2,               // not moving -> moving
    CHANGE: 3,              // keep moving, movement changed
    STOP: 4                 // moving -> not moving
});


class MotionDelta {

    constructor (old_vector, new_vector) {
        let ts = new_vector.timestamp;
        let is_moving = isMoving(new_vector);
        let init = (old_vector == undefined || old_vector.position == undefined);

        if (init) {
            /*
                Possible to introduce
                PosDelta.INIT here instead of PosDelta.CHANGE
                Not sure if this is needed.
            */
            if (is_moving) {
                this._mc = [PosDelta$2.CHANGE, MoveDelta$2.START];
            } else {
                this._mc = [PosDelta$2.CHANGE, MoveDelta$2.NOOP];
            }
        } else {
            let was_moving = isMoving(old_vector);
            let end_vector = calculateVector$1(old_vector, ts);
            let start_vector = calculateVector$1(new_vector, ts);

            // position change
            let pos_changed = (end_vector.position != start_vector.position);
            let pct = (pos_changed) ? PosDelta$2.CHANGE : PosDelta$2.NOOP;

            // movement change
            let mct;
            if (was_moving && is_moving) {
                let vel_changed = (end_vector.velocity != start_vector.velocity);
                let acc_changed = (end_vector.acceleration != start_vector.acceleration);
                let move_changed = (vel_changed || acc_changed);
                if (move_changed) {
                    mct = MoveDelta$2.CHANGE;
                } else {
                    mct = MoveDelta$2.NOOP_MOVING;
                }
            } else if (!was_moving && is_moving) {
                mct = MoveDelta$2.START;
            } else if (was_moving && !is_moving) {
                mct = MoveDelta$2.STOP;
            } else if (!was_moving && !is_moving) {
                mct = MoveDelta$2.NOOP;
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


MotionDelta.PosDelta = PosDelta$2;
MotionDelta.MoveDelta = MoveDelta$2;

var motionutils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    equalVectors: equalVectors,
    copyVector: copyVector,
    calculateVector: calculateVector$1,
    calculateDirection: calculateDirection,
    isMoving: isMoving,
    RangeState: RangeState,
    correctRangeState: correctRangeState,
    detectRangeViolation: detectRangeViolation,
    checkRange: checkRange,
    rangeIntersect: rangeIntersect,
    calculateMinPositiveRealSolution: calculateMinPositiveRealSolution,
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

function cmp(a, b) {return a-b;}

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
        this.array.sort(cmp);
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

    constructor (options={}) {
        
        this.options = options;

        // Events
        eventify.eventifyInstance(this);
        this.eventifyDefine("batch", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    }

    /**
     *  Abstract accessor to datasource backing implementation
     *  of observable map. Typically this is an instance of Map() class.
     * 
     *  Must be implemented by subclass. 
     */

    get datasource () {
        throw new Error("not implemented");
    }

    /***************************************************************
     ORDERING
    ***************************************************************/

    sortOrder(options={}) {
        // sort options override constructor options
        let {order=this.options.order} = options;
        if (typeof order == "function") {
            return order;
        }       
    }

    /* 
        Sort values of Observable map
        ordering can be overidden by specifying option <order>
        fallback to order from constructor
        noop if no ordering is defined
    */
    sortValues(iter, options={}) {
        let order = this.sortOrder(options);
        if (typeof order == "function") {
            // sort
            // if iterable not array - convert into array ahead of sorting
            let arr = (Array.isArray(iter)) ? iter : [...iter];
            return arr.sort(order);
        } else {
            // noop
            return iter;
        }
    }

    /* 
        Sort items (in-place) by value {new:value, old:value} using
        ordering function for values
    */
    sortItems(items) {
        let order = this.sortOrder();        
        if (typeof order == "function") {
            items.sort(function(item_a, item_b) {
                let cue_a = (item_a.new) ? item_a.new : item_a.old;
                let cue_b = (item_b.new) ? item_b.new : item_b.old;
                return order(cue_a, cue_b);
            });
        }
    }

    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            let items = [...this.datasource.entries()].map(([key, val]) => {
                return {key:key, new:val, old:undefined};
            });
            // sort init items (if order defined)
            this.sortItems(items);
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
        return this.datasource.size;
    }

    has(key) {
        return this.datasource.has(key);
    };

    get(key) {
        return this.datasource.get(key);
    };

    keys() {
        return this.datasource.keys();
    };

    values() {
        return this.datasource.values();
    };

    entries() {
        return this.datasource.entries();
    }


    /***************************************************************
     MODIFY
    ***************************************************************/

    set(key, value) {
        let old = undefined;
        if (this.datasource.has(key)) {
            old = this.datasource.get(key);
        }
        this.datasource.set(key, value);
        this._notifyEvents([{key: key, new:value, old: old}]);
        return this;
    }

    delete(key) {
        let result = false;
        let old = undefined;
        if (this.datasource.has(key)) {
            old = this.datasource.get(key);
            this.datasource.delete(key);
            result = true;
        }
        this._notifyEvents([{key: key, new:undefined, old: old}]);
        return result;
    }

    clear() {
        // create change events for all cues
        const items = [...this.datasource.entries()].map(([key, val]) => {
            return {key: key, new: undefined, old: val};
        });
        // clear _map
        this.datasource.clear();
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

/**
 *  Extends ObservableMap
 * 
 *  with logic specific to collections of cues.
 */

class CueCollection extends ObservableMap {

    static cmpLow(cue_a, cue_b) {
        return Interval.cmpLow(cue_a.interval, cue_b.interval);
    }

    static cmpHigh(cue_a, cue_b) {
        return Interval.cmpHigh(cue_a.interval, cue_b.interval);
    }

    // extend sortOrder to accept order as string
    sortOrder(options={}) {
        let order = options.order || super.sortOrder(options);
        if (order == "low") {
            return CueCollection.cmpLow;
        } else if (order == "high") {
            return CueCollection.cmpHigh;
        } else {
            if (typeof order != "function") {
                return;
            }
        }
        return order;
    }

    // add cues method
    cues (options = {}) {
        let cues = this.sortValues(this.values(), options);
        // ensure array
        return (Array.isArray(cues)) ? cues : [...cues];
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

function calculateVector(vector, tsSec) {
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
		return calculateVector(this._vector, local_clock.now()).position;
	};

	/*
		QUERY
		- calculates the state of the clock right now
		- result vector includes position and velocity
	*/
	query(now) {
		return calculateVector(this._vector, now);
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
			let nowVector = calculateVector$1(this._vector, ts);
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

		// check if provider is ready
		if (this._provider.skew != undefined) {
			// initialise immediately - without a callback
			this._onSkewChange(true);
		}
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


	_onSkewChange(init=false) {
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
		// no upcalls on skew change
	};

	_onVectorChange() {
		if (this._clock) {			
			// is ready (onSkewChange has fired earlier)
			if (!this._ready && this._provider.vector != undefined) {
				// become ready
				this._ready = true;
			}
			if (this._ready) {
				if (!this._range) {
					this._range = this._provider.range;
				}
				this._vector = this._provider.vector;
				let eArg = {
					range: this.range,
					...this.vector
				};
				if (this._callback) {
					this._callback(eArg);
				}
			}
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
		this._provider.update(vector);
		// return success
		return true;
	};

	close() {
		this._callback = undefined;
	}

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

	get version() {return 5;}


	/***************************************************************

		QUERY

	***************************************************************/

	// query
	query() {
		if (this.__ready.value == false)  {
			throw new Error("query before timing object is ready");
		}
		// reevaluate state to handle range violation
		let vector = calculateVector$1(this.__vector, this.clock.now());
		// detect range violation - only if timeout is set {
		if (this.__timeout.isSet()) {
			if (vector.position < this.__range[0] || this.__range[1] < vector.position) {
				// emulate update event to trigger range restriction
				this.__process({...vector});
			}
			// re-evaluate query after state transition
			return calculateVector$1(this.__vector, this.clock.now());
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
	__handleTimeout(now, timeout_vector) {
		this.__process({...timeout_vector});
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

		/*
			- vector change (all vector elements defined)
			- range change (no vector elements defined)
			- both (all vector elements and range defined)
		*/
		let vector_change = (position != undefined);
		if (!vector_change && !range_change) {
			console.log("__process: WARNING - no vector change and no range change");
		}

		/*
			check if vector is consistent with range
			range violation may occur if 
			- vector change
			- range change
			- both

			- vector must be recalculated for present for detection
			  of range violation
		*/
		let vector;
		if (vector_change) {
			// vector change
			vector = {position, velocity, acceleration, timestamp};
		} else {
			vector = {...this.__vector};
		}
		let now = this.clock.now();
		let now_vector = calculateVector$1(vector, now);
		let violation = detectRangeViolation(now_vector, this.__range);
		if (violation) {
			vector = this.onRangeViolation(now_vector);
			live = true;
		}

		// reevaluate vector change and live
		vector_change = vector_change || !equalVectors(vector, this.__vector);

		// update vector		
		if (vector_change) {
			// save old vector
			this.__old_vector = this.__vector;
			// update vector
			this.__vector = vector;
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
	onRangeViolation(now_vector) {
		return checkRange(now_vector, this.__range);
	};

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
		let now_vector = calculateVector$1(vector, now);
		let [delta, pos] = calculateDelta(now_vector, range);
		if (delta == undefined) {
			return;
		}
		// vector when range restriction will be reached
		let timeout_vector = calculateVector$1(vector, now + delta);
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

	__get_timingsrc() {
		// returns InternalProvider, ExternalProvider or TimingObject
		return this.__timingsrc;
	}

	get timingsrc () {
		// returns TimingObject, Provider or undefined
		let timingsrc = this.__get_timingsrc();
		if (timingsrc instanceof TimingObject) {
			return timingsrc;
		} else if (timingsrc instanceof InternalProvider) {
			return undefined;
		} else if (timingsrc instanceof ExternalProvider) {
			return timingsrc._provider;
		} else {
			throw new Error("illegal timingsrc")
		}
	}
	
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
                ...this.__get_timingsrc().vector,
                range: this.__get_timingsrc().range
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
                ...this.__get_timingsrc().vector,
                range: this.__get_timingsrc().range
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
function mod$1(n, m) {
	return ((n % m) + m) % m;
}
function transform(x, range) {
	let skew = range[0];
	let length = range[1] - range[0];
	return skew + mod$1(x-skew, length);
}


/*
	LOOP CONVERTER
*/

class LoopConverter extends TimingObject {

	constructor(timingsrc, range) {
		super(timingsrc, {timeout:true});

		if (!Array.isArray(range) || range.length != 2) {
			throw new Error(`range must be array [low, high], ${range}`);
		}
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
				let vector = this.__get_timingsrc().query();
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
			let now_vector = calculateVector$1(this.vector, now);
			let diff = now_vector.position - arg.position;
			let now_vector_src = calculateVector$1(this.__get_timingsrc().vector, now);
			arg.position = now_vector_src.position - diff;
		}
		return super.update(arg);
	};

	// overrides
	onRangeViolation(now_vector) {
		now_vector.position = transform(now_vector.position, this.__range);
		return now_vector;
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
			/* 
			vector change must also apply to timestamp
			this is handlet in onRangeViolation 
			*/
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
				this.__renewTimeout(this.__get_timingsrc().vector, this.__range);
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
            let new_vector = calculateVector$1(arg, ts + this._offset);
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
                ...this.__get_timingsrc().vector,
                range: this.__get_timingsrc().range
            });
            this.eventifyTrigger("offsetchange", offset);
        }
    }

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

const DEFAULT_PERIOD = 200;

class TimingSampler {

    constructor (timingObject, options = {}) {
        this._to = timingObject;
        // timeout id
        this._tid;
        // period
        let {period, frequency} = options;
        this._period = DEFAULT_PERIOD;
        if (period != undefined) {
            this._period = period;
        } else if (frequency != undefined) {
            this._period = 1.0/frequency;
        }        
        // Events
        eventify.eventifyInstance(this);

        this.eventifyDefine("change", {init:true});
        // Handle timing object change event
        this._sub = this._to.on("change", this._onChange.bind(this));
    }

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "change" && this._to.isReady()) {
            return [this._to.pos];
        }
    }

    /**
     * Start/stop sampling
     */
    _onChange() {
        let v = this._to.query();
        let moving = (v.velocity != 0.0 || v.acceleration != 0.0);
        // start or stop sampling
        if (moving && this._tid == undefined) {
            this._tid = setInterval(function(){
                this._onSample();
            }.bind(this), this._period);
        }
        if (!moving && this._tid != undefined) {
            clearTimeout(this._tid);
            this._tid = undefined;
        }
        this._onSample(v.position);
    }

    /**
     * Sample timing object
     */
    _onSample(position) {
        position = (position != undefined) ? position : this._to.pos;
        this.eventifyTrigger("change", position);
    }
   
    /**
     * Terminate sampler
     */
    clear() {
        // stop sampling
        if (this._tid) {
            clearTimeout(this._tid);
            this._tid = undefined;
        }
        // disconnect handler
        this._to.off(this._sub);
    }
}

eventify.eventifyPrototype(TimingSampler.prototype);

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
}


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
        let [delta, pos] = calculateDelta(vector, [before, after]);
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

const Relation = Interval.Relation;

/*
    UTILITY
*/

function epoch() {
    return Date.now();
}


function asInterval(input) {
    if (input instanceof Interval || input == undefined) {
        return input;
    }
    else if (Array.isArray(input) ) {
        // support intervals as arrays
        let [low, high, lowInclude, highInclude] = input;
        return new Interval(low, high, lowInclude, highInclude);
    } else {
        throw new Error ("input not an Interval", input);
    }
}

/*
    Remove cue from array
    - noop if cue does not exist
    - returns array empty
*/
function removeCueFromArray(arr, cue) {
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
}
/*
    Replace cue in array
    - noop if cue does not exist in array
    - returns sucess
*/

function replaceCueInArray (arr, cue) {
    if (arr.length == 0) {
        return false;
    } else if (arr.length == 1) {
        if (arr[0].key == cue.key) {
            arr[0] = cue;
            return true;
        }
    } else {
        let idx = arr.findIndex(function (_cue) {
            return _cue.key == cue.key;
        });
        if (idx > -1) {
            arr[idx] = cue;
            return true;
        }
    }
    return false;
}


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


function cue_equals(cue_a, cue_b) {
    let delta = cue_delta(cue_a, cue_b);
    return delta.interval == Delta.NOOP && delta.data == Delta.NOOP;
}

/*
    CueArgBuilder

    AddCue - adds or changes a cue.
    RemoveCue - removes a cue
    Clear - remove un-submitted cues

    Cues are submitted to dataset update by ".done" promise (after task processing), which also makes the result available

    manual submit if autosubmit is false

*/

class CueArgBuilder {

    constructor (dataset, options={}) {
        
        
        // dataset
        this._ds = dataset;
        // options
        let defaults = {autosubmit:true};
        this._options = Object.assign({}, defaults, options);
        // cue arg buffer
        this._cues;
        // batch done flag
        this._done;
        // done promise
        this.updateDone;
        // initialise
        this._reset();
    }

    _reset() {
        this._cues = [];
        // create new done promise
        this._done = new eventify.EventBoolean();
        this.updateDone = eventify.makePromise(this._done).then(() => {
            return this._submit.bind(this)();
        });
    }

    _push(cue_args) {
        // append cue args
        let m = this._cues.length;
        let was_empty = m == 0;
        let n = cue_args.length;
        this._cues.length += n;
        for (let i=0; i<n; i++) {
            this._cues[m++] = cue_args[i];
        }
        if (this._options.autosubmit && was_empty && n > 0) {
            // batch done immediately 
            // will be submitted by donePromise in next microtask
            this._done.value = true;
        }
    }

    _submit() {
        let result = [];
        // carry out update if necessary
        if (this._cues.length > 0) {
            result = this._ds.update(this._cues, this._options);    
        }
        // reset cue arg builder
        this._reset();
        // update result
        return result;
    }    
    
    /*
        add or change single cue
    
        if both interval and data are undefined
        this is not interpreted as remove,
        but as a cue with no interval and a data value set
        to undefined
    */
    addCue(key, interval, data) {
        let cue_arg = {key:key};
        cue_arg.interval = interval;        
        if (arguments.length > 2) {
            cue_arg.data = data;
        }
        this._push([cue_arg]);
        return this;
    }

    /* remove single cue */
    removeCue(key) {
        this._push([{key:key}]);
        return this;
    }

    /* load array of cue args into argbuilder */
    update(cue_args) {
        this._push(cue_args);
    }

    /* clear args currently in argbuilder */
    clear() {
        this._cues = [];
        return this;
    }

    /* manually submit cue args from cue arg builder */
    submit() {
        if (this._options.autosubmit) {
            throw new Error("manual submit while options.autosubmit is true");
        }
        // mark batch as done
        // will be submitted by donePromise in next microtask
        this._done.value = true;
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

class Dataset extends CueCollection {

    constructor(options) {
        super(options);

        this._map = new Map();
        this._builder = new CueArgBuilder(this);

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

    /**
     * CueCollection (ObservableMap) needs access to map 
     */
    get datasource () {
        return this._map;
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
     MAP METHODS
    */

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }


    /***************************************************************
     CUE ARG BUILDER
    */
 
    makeBuilder(options) {
        return new CueArgBuilder(this, options);
    }

    // not really useful (v2 complience)
    get builder () {return this._builder;};

    
    /***************************************************************
     ADD CUE, REMOVE CUE

        - COMPATIBILTY WITH V2
        - SAFE TO USE repeatedly (batched using promise)
    */

    addCue(key, interval, data) {
        if (arguments.length > 2) {
            this._builder.addCue(key, interval, data);
        } else {
            this._builder.addCue(key, interval);
        }
        return this;
    }

    removeCue(key) {
        this._builder.removeCue(key);
        return this;
    }

    get updateDone() {return this._builder.updateDone};

    /***************************************************************
     ADD CUE, REMOVE CUE - INTERACTIVE USE

        - CONVENIENCE for interactive use
        - COMPATIBILTY WITH V2
        - NOT RECOMMENDED TO USE repeatedly (batched using promise)
    */

    _addCue(key, interval, data, options) {
        return this.update({key:key, interval:interval, data:data}, options);
    }

    _removeCue(key, options) {
        return this.update({key:key}, options);
    }

    /***************************************************************
        UPDATE

        - insert, replace or delete cues

        update(cues, equals, check)

        <cues> ordered list of cues to be updated
        <equals> - equality function for data objects

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

    update(cues, options = {}) {
        const batchMap = new Map();
        let current_cue;
        let has_interval, has_data;

        // options
        let {debug=false, equals} = options;

        // support single cue arg for convenience
        if (!isIterable(cues)) {
            cues = [cues];
        }

        /***********************************************************
            process all cues
        ***********************************************************/
        const epoch_ts = epoch();
        const info = {
            ts: epoch_ts,
            author: options.author
        };

        for (let cue of cues) {

            /*******************************************************
                check validity of cue argument
            *******************************************************/

            if (cue == undefined || !cue.hasOwnProperty("key") || cue.key == undefined) {

                if (cue == undefined) {
                    throw new Error("cue is undefined");
                } else if (!cue.hasOwnProperty("key")) {
                    throw new Error("cue missing key property", cue);
                } else if (cue.key == undefined) {
                    throw new Error("cue.key is undefined", cue);                    
                }
            }

            has_interval = cue.hasOwnProperty("interval");
            has_data = cue.hasOwnProperty("data");
            if (has_interval) {
                cue.interval = asInterval(cue.interval);
            }


            /*******************************************************
                adjust cue so that it correctly represents
                the new cue to replace the current cue
                - includes preservation of values from current cue
            *******************************************************/

            current_cue = this._map.get(cue.key);
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
            this._update_cue(batchMap, current_cue, cue, info, options);
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
                return {key:item.key, new:item.new, old:item.old, info: item.info};
            });

            // extra filter items to remove NOOP transitions
            let event_items = items.filter((item) => {
                let delta = cue_delta(item.new, item.old, equals);
                return (delta.interval != Delta.NOOP || delta.data != Delta.NOOP);
            });

            // event notification
            this._notifyEvents(event_items);

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
          
            // debug
            if (debug) {this.integrity();}
            return items;
        }
        // debug
        if (debug) {this.integrity();}
        return [];
    };



    /***************************************************************
        UPDATE CUE

        update operation for a single cue

        - update _map
        - generate entry for batchMap
        - update CueBucket
    ***************************************************************/

    _update_cue(batchMap, current_cue, cue, info, options) {

        let old_cue, new_cue;
        let item, _item;
        let oldCueBucket, newCueBucket;
        let low_changed, high_changed;
        let remove_needed, add_needed;

        // options
        let {chaining=true, safe=false, equals} = options;
        
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

            // cue info: add if missing
            if (cue.info == undefined) {
                cue.info = {
                    ts: info.ts,
                    change_ts: info.ts,
                    change_id: 0
                };
            }

            old_cue = undefined;
            new_cue = (safe)? Object.freeze(cue) : cue;
            this._map.set(cue.key, new_cue);


        } else if (cue.interval == undefined && cue.data == undefined) {
            // DELETE - remove cue object from _map
            old_cue = current_cue;
            new_cue = undefined;
            this._map.delete(cue.key);

            // cue info: noop

        } else {
            // REPLACE

            // cue info - update if missing
            // preserve ts from current cue, update update_ts
            if (cue.info == undefined) {
                cue.info = {
                    ts: current_cue.info.ts,
                    change_ts: info.ts,
                    change_id: current_cue.info.change_id + 1
                };
            }

            /*
                Solution used to be in-place modification
                of current cue.
                Now we instead implement replace by inserting
                a new cue object as current cue.
                Since current cue is referenced both in
                _map and in pointMap - it must be replaced both
                places.

                Adjustments to pointMap as a result of interval
                changes are handled further down

                Another design option would be to let point map
                manage only keys of cues. This however would 
                impose an extra map lookup per item in lookup - 
                so better to pay this modest price in update
            */
            old_cue = current_cue;
            new_cue = {
                key: cue.key,
                interval: cue.interval,
                data: cue.data,
                info: cue.info
            };

            if (safe) {
                new_cue = Object.freeze(new_cue);
            }

            // replace in cue map
            this._map.set(cue.key, new_cue);

            // replace in point map
            // - only necessary if old cue is in pointMap
            //  i.e. if old_cue has interval
            if (old_cue.interval) {
                let bid = getCueBucketId(old_cue.interval.length);
                let cueBucket = this._cueBuckets.get(bid);
                // replace for low
                cueBucket.replace_endpoint(old_cue.interval.low, new_cue);
                // replace for high
                if (!old_cue.singular) {
                    cueBucket.replace_endpoint(old_cue.interval.high, new_cue);
                }
            }
        }
        item = {key:cue.key, new:new_cue, old:old_cue, delta:delta, info};

        /*
            if this item has been set earlier in batchMap
            restore the correct old_cue by getting it from
            the previous batchMap item

            recalculate delta relative to old_cue
            - continue processing with the original (delta, old_cue) defined
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

        //console.log("OLD:", cue_to_string(old_cue));
        //console.log("NEW:", cue_to_string(new_cue));

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
            // no changes to interval - no change needed in pointMap 
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
            low_changed = new_cue.interval.low != old_cue.interval.low;
            high_changed = new_cue.interval.high != old_cue.interval.high;
        }

        /*
            old cue and new cue might not belong to the same cue bucket
        */
        if (remove_needed){
            let old_bid = getCueBucketId(old_cue.interval.length);
            oldCueBucket = this._cueBuckets.get(old_bid);
        }
        if (add_needed) {
            let new_bid = getCueBucketId(new_cue.interval.length);
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
        */

        // update low point - if changed
        if (low_changed) {
            if (remove_needed) {
                oldCueBucket.del_endpoint(old_cue.interval.low, old_cue);
            }
            if (add_needed) {
                newCueBucket.add_endpoint(new_cue.interval.low, new_cue);
            }
        }
        // update high point - if changed
        if (high_changed) {
            if (remove_needed && !old_cue.interval.singular) {
                oldCueBucket.del_endpoint(old_cue.interval.high, old_cue);
            }
            if (add_needed && !new_cue.interval.singular) {
                newCueBucket.add_endpoint(new_cue.interval.high, new_cue);
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
        interval = asInterval(interval);
        return this._call_buckets("lookup_endpoints", interval);
    };


    /*
        LOOKUP
    */

    lookup(interval, mask) {
        interval = asInterval(interval);
        return this._call_buckets("lookup", interval, mask);
    };


    /*
        REMOVE CUES BY INTERVAL
    */
    lookup_delete(interval, mask, options={}) {
        interval = asInterval(interval);
        const cues = this._call_buckets("lookup_delete", interval, mask);
        // remove from _map and make event items
        const items = [];
        const info = {
            ts: epoch(),
            author: options.author
        };
        let cue;
        for (let i=0; i<cues.length; i++) {
            cue = cues[i];
            this._map.delete(cue.key);
            // check for equality
            items.push({key:cue.key, new: undefined, old: cue, info});
        }
        // event notification
        this._notifyEvents(items);
        return items;
    };

    /*
        CLEAR ALL CUES
    */
    clear(options={}) {
        // clear cue Buckets
        this._call_buckets("clear");
        // clear _map
        let _map = this._map;
        this._map = new Map();
        // create change events for all cues
        const items = [];
        const info = {
            ts: epoch(),
            author: options.author
        };
        for (let cue of _map.values()) {
            items.push({key: cue.key, new: undefined, old: cue, info});
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

        // check map cues versus all cues in all buckets
        // map cues may include cues with no interval
        let no_interval_cues = [...this._map.values()].filter(cue => cue.interval == undefined);

        let count_buckets = cues.length;
        let count_no_interval = no_interval_cues.length;
        let count_map = this._map.size;
        let diff = count_map - count_buckets - count_no_interval;
        if (diff != 0) {
            console.log("count buckets", count_buckets);
            console.log("count no intervals", count_no_interval);
            console.log("count map", count_map);
            console.log("count diff", diff);
            throw new Error("inconsistent cue count");
        }

        // check that cue maps are non overlapping
        let bucket_map = new Map(cues.map(cue => [cue.key, cue]));
        let map_map = new Map([...this._map.entries()].filter(([key, cue]) => {
            return (cue.interval != undefined);
        }));

        let missing = map_difference(bucket_map, map_map);
        if (missing.size > 0) {
            console.log("buckets missing cues:");
            console.log([...missing.keys()]);
            throw new Error(`buckets missing cues: ${[...missing.keys()]}`);
        }
        
        missing = map_difference(map_map, bucket_map);
        if (missing.size > 0) {
            throw new Error(`buckets too many cues: ${[...missing.keys()]}`);
        }

        return {
            cues: cues.length,
            points: points.length
        };
    };

}


Dataset.Delta = Delta;
Dataset.cue_delta = cue_delta;
Dataset.cue_equals = cue_equals;


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
        in case of data update without touching the interval
        the new cue needs to be insert in place of the old
    */
    replace_endpoint(point, cue) {
        let init = (this._pointMap.size == 0);
        let cues = (init) ? undefined : this._pointMap.get(point);
        if (cues != undefined) {
            let ok = replaceCueInArray (cues, cue);
            if (!ok) {
                console.log("WARNING: attempt to replace non-existent cue in pointMap");
            }
        }
    }


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
                        console.log("DS INDEX ERROR");
                        console.log("cuebucket:", this._maxLength);
                        console.log("lookup endpoints in interval", broader_interval.toString());
                        console.log("POINT:", point); 
                        console.log("CUE:", cue.interval.toString());
                        this.integrity();
                        throw new Error("fatal: point cue mismatch");
                    }
                    if (interval.covers_endpoint(_endpoint)) {
                        result.push({endpoint:_endpoint, cue:cue});
                    }
                }, this);
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
        if (mask == Relation.EQUALS) {
            return this._pointMap.get(interval.low).filter(function(cue) {
                return cue.interval.match(interval, Relation.EQUALS);
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
        if (mask & Relation.COVERS) {

            let left_interval;
            if (this._maxLength == Infinity) {
                // no limitation on interval length
                // must search entire timeline to the left
                left_interval = new Interval(-Infinity, interval.low);
            } else {
                let low = interval.high - this._maxLength;
                let high = interval.low;
                // protect against float rounding effects creating
                // high < low by a very small margin
                [low, high] = [Math.min(low, high), Math.max(low, high)];
                left_interval = new Interval(low, high, true, true);
            }
            this._lookup_cues(left_interval)
                .forEach(function(cue){
                    if (cue.interval.match(interval, Relation.COVERS)) {
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

        /* 
            invariable - pointMap and pointIndex always manage the same set of points
        */
        const index_point_set = new Set([...this._pointIndex.values()]);
        const map_point_set = new Set([...this._pointMap.keys()]);

        if (!eqSet(index_point_set, map_point_set)) {
            let missing = set_difference(index_point_set, map_point_set);
            if (missing.size > 0) {
                throw new Error(`pointMap missing points: ${[...missing]}`);
            }
            
            missing = set_difference(map_point_set, index_point_set);
            if (missing.size > 0) {
                throw new Error(`pointIndex missing points: ${[...missing]}`);
            }
        }

        /*
            invariable - pointIndex shall always be sorted and not contain duplicates
        */
        let points = [...this._pointIndex.values()];
        if (points.length != index_point_set.size) {
            throw new Error("pointIndex include duplicate points");
        }
        for (let i=1; i<points.length; i++) {
            if (points[i-1] >= points[i]) {
                throw new Error("pointIndex not ordered");
            }            
        }

        /**
         *  invariable - pointMap point -> cues 
         *  cues shall only include cues which are relevant to given point
         */
        for (let point of points) {
            let cues = this._pointMap.get(point);
            for (let cue of cues) {
                // figure out if point is endpoint low or high
                if (point == cue.interval.low) {
                    continue;
                } else if (point == cue.interval.high) {
                    continue;
                } else {
                    console.log("POINT:", point); 
                    console.log("CUE:", cue.interval.toString());
                    throw new Error("pointMap: wrong cue");
                }
            }        
        }


        /**
         * invariable - all endpoints from all cues from pointMap are found as points in pointMap
         */

        for (let _cue_list of [...this._pointMap.values()]) {
            for (let cue of _cue_list) {
                for (let p of [cue.interval.low, cue.interval.high]) {
                    if (!this._pointMap.has(p)) {
                        throw new Error(`cue found with low or high point not in pointMap ${p} -> ${cue.interval.toString()} `);
                    }
                }
            }
        }


        /*
            invariable - all cues in pointMap with same key are same object
        */

        // collect all cues from pointMap
        let _cues = [];
        for (let _cue_list of this._pointMap.values()) {
            for (let cue of _cue_list) {
                _cues.push(cue);
            }
        }

        // remove and check duplicates
        let cueMap = new Map();
        for (let cue of _cues) {
            let _cue = cueMap.get(cue.key);
            if (_cue == undefined) {
                cueMap.set(cue.key, cue);
            } else {
                // duplicate
                if (cue !== _cue) {
                    throw new Error("pointMap: different cue objects for same key");
                }
            }
        }
        let cues = [...cueMap.values()];

        /**
         * invariable - all cues belong to this bucket
         */

        for (let cue of cues.values()) {
            // check that cue belongs to this bucket
            if (cue.interval.length > this._maxLength) {
                throw new Error(`cue in wrong cue bucket  ${this._maxLength}, ${cue.interval.toString()}`);
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

/*
    Subset provides read-only access to subset of a source Dataset

    - <options>
        - <interva>: if defined only include cues that match the interval
        - <key_filter> : filter by cue key
            function keep(key) returns boolena
        - <data_filter> : filter by cue data
            function keep(data) returns boolean
        - <data_convert> : change cue data
            function convert(data) returns data
            NOTE: filtering occurs BEFORE convert
            and only impacts the presentation of cues
            WARNING: it is possible to change the value
            in such a way that filtering appears incorrect

    This subset implementation is STATELESS
    It does not manage its own state, only implements a
    stateless frontend over its source dataset.

*/

class Subset extends CueCollection {

    constructor(dataset, options={}) {
        super(options);
        this._key_filter = options.key_filter;
        this._data_filter = options.data_filter;
        this._interval = options.interval;
        this._data_convert = options.data_convert;
        this._size = 0;

        // Callbacks
        this._callbacks = [];

        // Source Dataset
        this._src_ds = dataset;
        let cb = this._onDatasetCallback.bind(this);
        this._src_ds_cb = this._src_ds.add_callback(cb);
    }


    /***************************************************************
        ACCESSORS
    ***************************************************************/

    get datasource () {
        return this._src_ds;
    }

    get dataset () {
        return this._src_ds;
    }


    get interval () {
        return this._interval;
    }

    set interval (itv) {
        this._setInterval(itv);
    }


    /***************************************************************
        EVENT CALLBACKS - FOR SEQUENCERS
    ***************************************************************/

    add_callback (handler) {
        let handle = {
            handler: handler
        };
        this._callbacks.push(handle);
        return handle;
    };


    del_callback (handle) {
        let index = this._callbacks.indexof(handle);
        if (index > -1) {
            this._callbacks.splice(index, 1);
        }
    };


    _notify_callbacks (batchMap, relevanceInterval) {
        this._callbacks.forEach(function(handle) {
            handle.handler(batchMap, relevanceInterval);
        });
    };


   /***************************************************************
        FILTER & CONVER
    ***************************************************************/

    /* 
        Keep cue 
    */

    _cue_keep(cue) {
        if (cue == undefined) {
            return false;
        }
        // check if cue matches interval
        if (this._interval) {
            if (!this._interval.match(cue.interval)) {
                return false;
            }
        }
        // check key filter
        if (this._key_filter) {
            if (!this._key_filter(cue.key)) {
                return false;
            }
        }
        // check data filter
        if (this._data_filter) {
            if (!this._data_filter(cue.data)) {
                return false;
            }
        }
        return true;
    }

    /**
     *  Convert cue
     */
    _cue_convert(cue) {
        if (cue != undefined && this._data_convert) {
            // copy
            return {
                key: cue.key,
                interval: cue.interval,
                data: this._data_convert(cue.data)
            }
        }
        return cue;
    }

    /**
     * Filter (and modify) event items based on key_filter and data_filter
     */

    _items_filter_convert(items) {
        let _items = [];
        for (let item of items) {
            if (item.new == undefined && item.old == undefined) {
                continue;
            }
            /* 
            use cue filter function to check relevance of both old and new
            consider change of unrelevant cue into relevant cue.
            old cue would be non-relevant, new cue would be relevant
            Since old cue was not part of the subset before, it needs
            to be removed from the item - effectively turning the change
            operation into an add operation. 
            */
            let _old = (this._cue_keep(item.old)) ? item.old : undefined;
            let _new = (this._cue_keep(item.new)) ? item.new : undefined;
            if (_old == undefined && _new == undefined) {
                continue;
            }
            // convert
            _old = this._cue_convert(_old);
            _new = this._cue_convert(_new);
            // push
            _items.push({key:item.key, new: _new, old: _old});
        }
        return _items;
    }


    /***************************************************************
     LOOKUP
    ***************************************************************/

    _check_interval(interval) {
        if (this._interval) {
           // subset interval
           if (interval) {
               // lookup interval - find intersection
               let intersects = Interval.intersect(interval, this._interval);
               if (intersects.length == 0) {
                   console.log(`warning - lookup interval ${interval.toString()} outside the subset interval ${this._interval.toString()}`);
                   return [];
                } else {
                    interval = intersects[0];
                }
            } else {
                // no lookup interval - use subset interval   
                interval = this._interval;
            }
        }
        return interval;
    }

    /** 
     * lookup cues
    */

    lookup(interval, mask) {
        let _interval = this._check_interval(interval);
        let cues;
        if (_interval) {
            cues = this.datasource.lookup(_interval, mask);
        } else {
            cues = [...this.datasource.values()];
        }
        // filter & convert cues
        return cues.filter(this._cue_keep, this)
            .map(this._cue_convert, this);
    }

    /* 
        lookup endpoints
        used by sequencers
    */

    lookup_endpoints(interval) {
        let _interval = this._check_interval(interval);
        let items = this.datasource.lookup_endpoints(_interval);
        // filter and convert
        return items.filter((item) => {
            return this._cue_keep(item.cue);
        }, this).map((item) => {
            return {endpoint: item.endpoint, cue: this._cue_convert(item.cue)};
        }, this);
    }

    /***************************************************************
     INITIAL STATE
    ***************************************************************/

    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            // find cues
            let cues = this.lookup();
            // make event items
            let items = cues.map((cue) => {
                return {key:cue.key, new:cue, old:undefined};
            });
            // sort
            this.sortItems(items);
            return (name == "batch") ? [items] : items;
        }
    }

    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    _onDatasetCallback(eventMap, relevanceInterval) {
        let items = [...eventMap.values()];
        items = this._items_filter_convert(items);
        // update size
        for (let item of items) {
            if (item.new != undefined && item.old == undefined) {
                // add
                this._size += 1;
            } else if (item.new == undefined && item.old != undefined) {
                // remove
                this._size -= 1;
            }           
        }        
        // forward as events
        super._notifyEvents(items);
        // forward as callbacks
        let batchMap = new Map(items.map((item) => {
            return [item.key, item];
        }));
        if (this._interval) {
            relevanceInterval = Interval.intersect(this._inverval, relevanceInterval);
        }
        this._notify_callbacks(batchMap, relevanceInterval);
    }


    /***************************************************************
        SET INTERVAL
    ***************************************************************/

    _setInterval (itv) {
        if (!itv instanceof Interval) {
            throw new Error("must be interval", itv.toString());
        }
        if (!this._interval || !this._interval.equals(itv)) {
            // current cues (before interval update)
            let current_cues = this.lookup();
            // update interval
            this._interval = itv;
            // cues (after interval update)
            let new_cues = this.datasource.lookup(itv);
            // filter & convert cues
            new_cues = new_cues
                .filter(this._cue_keep, this)
                .map(this._cue_convert, this);
            // switch to map representation
            let currentCueMap = new Map([...current_cues].map((cue) => {
                return [cue.key, cue];
            }));
            let newCueMap = new Map([...new_cues].map((cue) => {
                return [cue.key, cue];
            }));
            // exit and enter cues
            let exitCueMap = map_difference(currentCueMap, newCueMap);
            let enterCueMap = map_difference(newCueMap, currentCueMap);
            // make list of event items
            let exitItems = [...exitCueMap.values()].map((cue) => {
                return {key: cue.key, new:undefined, old: cue}
            });
            let enterItems = [...enterCueMap.values()].map((cue) => {
                return {key: cue.key, new:cue, old: undefined}
            });
            // update size
            this._size -= exitItems.length;
            this._size += enterItems.length;            
            // event notification
            const items = array_concat([exitItems, enterItems], {copy:false, order:true});
            this._notifyEvents(items);
        }
    }

    /***************************************************************
     MAP ACCESSORS
    ***************************************************************/

    get size () {
        return this._size;
    }

    has(key) {
        return (this.get(key) != undefined);
    };

    get(key) {
        let cue = super.get(key);
        if (cue != undefined && this._cue_keep(cue)) {
            return this._cue_convert(cue);
        }
    };

    keys() {
        return this.values().map((cue => {
            return cue.key;
        }));
    };

    values() {
        return [...super.values()]
            .filter((cue) => {
                return this._cue_keep(cue);
            }, this)
            .map((cue) => {
                return this._cue_convert(cue);
            }, this);
    };

    entries() {
        return this.values().map((cue) => {
            return [cue.key, cue];
        });
    };


    /***************************************************************
     MAP MODIFICATION METHODS
    ***************************************************************/

    update(cues, options) {
        throw new Error("not implemented");
    }

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }

    clear (key) {
        throw new Error("not implemented");
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

const pft = posInterval_from_timeInterval;

function queueCmp(a,b) {
    return endpoint.cmp(a.tsEndpoint, b.tsEndpoint);
}
// Default lookahead in seconds
const LOOKAHEAD = 5;

class Schedule {

    constructor(dataset, to, options) {
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
        // dataset
        this.dataset = dataset;
        // task queue
        this.queue = [];
        // callbacks
        this.callbacks = [];
        // options
        options = options || {};
        options.lookahead = options.lookahead || LOOKAHEAD;
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
        this.vector;
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
                // note - this test has also been done within the load function
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
        this.queue.length;
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
            // calculate position interval
            // ensure that floats only have limited precision (10 decimals)
            // or else interval comparisons may not be safe.
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
                return false;
            }

            // ISSUE 2
            if (endpoint.leftof(item.tsEndpoint, minimum_tsEndpoint)) {
                return false;
            }

            // ISSUE 3
            // checks every event. alternative approach would be
            // to calculate the ts of this event once, and compare
            // the result to the ts of all event
            if (this.vector.acceleration != 0.0) {
                let ts = item.tsEndpoint[0];
                if (ts > this.timeInterval.endpointLow[0]) {
                    let v = calculateVector$1(this.vector, ts);
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

        /*
        function events2string(events) {
            return events.map((e) => {
                return `${e.cue.key} -> ${endpoint.toString(e.endpoint)}`;
            });
        }
        */

        // process - due events
        let dueEvents = this.pop(now);

        /*
        if (dueEvents.length > 0) {
            console.log("due", events2string(dueEvents));
        }
        */

        // advance schedule and load events if needed
        if (this.advance(now)) {
            // fetch cue endpoints for posInterval
            let endpointItems = this.dataset.lookup_endpoints(this.posInterval);

            /*
            if (endpointItmes.length > 0) {
                console.log("fetch", events2string(endpointItems));
            }
            */

            // load events and push on queue
            let loaded = this.load(endpointItems);
            this.push(loaded);

            /*
            if (loaded.length > 0) {
                console.log("load", events2string(loaded));
            }
            */

            // POP ADVANCE
            // process - possibly new due events
            let popped = this.pop(now);

            /*
            if (popped.length > 0) {
                console.log("due-immediate", events2string(popped));
            }
            */
            dueEvents.push(...popped);
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

const Active$2 = Object.freeze({
    ENTER: 1,
    STAY: 0,
    EXIT: -1,
    ENTER_EXIT: 2
});

const ActiveMap$2 = new Map([
    ["LRL", Active$2.STAY],
    ["LRR", Active$2.EXIT],
    ["LRS", Active$2.EXIT],
    ["LLL", Active$2.STAY],
    ["LLR", Active$2.ENTER],
    ["LLS", Active$2.ENTER],
    ["RRL", Active$2.ENTER],
    ["RRR", Active$2.STAY],
    ["RRS", Active$2.ENTER],
    ["RLL", Active$2.EXIT],
    ["RLR", Active$2.STAY],
    ["RLS", Active$2.EXIT],
    ["SRL", Active$2.ENTER],
    ["SRR", Active$2.EXIT],
    ["SRS", Active$2.ENTER_EXIT],
    ["SLL", Active$2.EXIT],
    ["SLR", Active$2.ENTER],
    ["SLS", Active$2.ENTER_EXIT]
]);



/*******************************************************************
 DEFAULT EVENT ITEM ORDERING
*******************************************************************/

function cue_cmp_forwards (cue_a, cue_b) {
    return Interval.cmpLow(cue_a.interval, cue_b.interval);
}

function cue_cmp_backwards (cue_a, cue_b) {
    return -1 * Interval.cmpHigh(cue_a.interval, cue_b.interval);
}

function item_cmp_forwards (item_a, item_b) {
    let cue_a = (item_a.new) ? item_a.new : item_a.old;
    let cue_b = (item_b.new) ? item_b.new : item_b.old;
    return cue_cmp_forwards(cue_a, cue_b);
}

function item_cmp_backwards (item_a, item_b) {
    let cue_a = (item_a.new) ? item_a.new : item_a.old;
    let cue_b = (item_b.new) ? item_b.new : item_b.old;
    return cue_cmp_backwards(cue_a, cue_b);
}

/*******************************************************************
 BASE SEQUENCER
*******************************************************************/

/*
    This is an abstract base class for sequencers
    It implements common logic related to Dataset, events and activeCues.
*/

class BaseSequencer extends CueCollection {


    constructor (dataset, options) {
        super(options);

        // Active cues
        this._map = new Map();

        // Dataset
        this._ds = dataset;
        let cb = this._onDatasetCallback.bind(this);
        this._ds_cb = this._ds.add_callback(cb);
    }

    /**
     * CueCollection (ObservableMap) needs access to map 
     */
    get datasource () {
        return this._map;
    }

    /**
     * Access to dataset of sequencer
     */

    get dataset () { 
        return this._ds;
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

    // override ObservableMap.sortValues to add special support for
    // direction sensitive ordering as default ordering
    sortValues(iter, options={}) {
        let order = this.sortOrder(options);
        if (typeof order == "function") {
            // use order specified by options
            return super.sortValues(iter, options)
        } else {
            // if iterable not array - convert into array ahead of sorting
            let cues = (Array.isArray(iter)) ? iter : [...iter];
            // default order is direction sensitive
            let direction = this._movementDirection();
            if (direction >= 0) {
                cues.sort(cue_cmp_forwards);
            } else {
                cues.sort(cue_cmp_backwards);
            }
            return cues
        } 
    }


    // override ObservableMap.sortItems to add special support for
    // direction sensitive ordering as default ordering
    sortItems(items, direction) {
        let order = this.sortOrder(); 
        if (typeof order == "function") {
            // use order specified by options
            return super.sortItems(items)            
        } 
        if (order == undefined) {
            // default order is direction sensitive
            if (direction == undefined) {
                direction = this._movementDirection();
            }
            if (direction >= 0) {
                items.sort(item_cmp_forwards);
            } else {
                items.sort(item_cmp_backwards);
            }
        }
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

    clear (key) {
        throw new Error("not implemented");
    }

    /***************************************************************
     DATASET
    ***************************************************************/

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
                _item = {key:item.key, new:undefined, old:item.old, info:item.info};
                exitEvents.push(_item);
            } else if (!is_active && should_be_active) {
                // enter
                _item = {key:item.key, new:item.new, old:undefined, info:item.info};
                enterEvents.push(_item);
            } else if (is_active && should_be_active) {
                // change
                _item = {key:item.key, new:item.new, old:item.old, info:item.info};
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

        /*
            Preserve .info from eventMap
        */
        for (let eventList in [exitEvents, changeEvents, enterEvents]) {
            for (let item of eventList) {
                let _item = eventMap.get(item.key);
                if (_item != undefined) {
                    item.info = _item.info;
                }
            }    
        }

        return [exitEvents, changeEvents, enterEvents];
    }

    /***************************************************************
     V2 COMPATIBILTY

     Sequencers forward dataset operation to datase
    ***************************************************************/

    get builder() {
        return this.dataset.builder;
    }

    addCue(key, interval, data) {
        return this.dataset.addCue(key, interval, data);
    }

    removeCue(key) {
        return this.dataset.removeCue(key);
    }

    _addCue(key, interval, data) {
        return this.dataset._addCue(key, interval, data);
    }

    _removeCue(key) {
        return this.dataset._removeCue(key);
    }

    update(cues, options) {
        return this.dataset.update(cues, options);
    }

    clear() {
        return this.dataset.clear();
    }

    hasCue(key) {
        return this.dataset.has(key);
    }

    getCue(key) {
        return this.dataset.get(key);
    }

    getCues() {
        return this.dataset.cues();
    }

    getActiveKeys() {
        return [...this.keys()];
    }

    getActiveCues() {
        return this.cues();
    }

    isActive(key) {
        return this.has(key);
    }

}

BaseSequencer.Active = Active$2;
BaseSequencer.ActiveMap = ActiveMap$2;

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
const Active$1 = BaseSequencer.Active;
const ActiveMap$1 = BaseSequencer.ActiveMap;

const EVENTMAP_THRESHOLD$1 = 5000;
const ACTIVECUES_THRESHOLD$1 = 5000;


class PointModeSequencer extends BaseSequencer {

    constructor (dataset, to, options) {

        super(dataset, options);

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
        const now_vector = calculateVector$1(this._to.vector, now);

        // activeInterval
        const activeInterval = new Interval(now_vector.position);

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
            change.forEach(item => {
                this._map.set(item.key, item.new);
            });
            enter.forEach(item => {
                this._map.set(item.key, item.new);
            });

            // sort event items according to general movement direction
            let direction = calculateDirection(now_vector);
            this.sortItems(exit, direction);
            this.sortItems(change, direction);
            this.sortItems(enter, direction);

            // notifications
            const items = array_concat([exit, change, enter], {copy:true, order:true});

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

            REMOVE SUPPOERT FOR LIVE
        */
        /*
        let new_vector;
        if (eArg.live) {
            new_vector = eArg;
        } else {
            // make a live vector from to vector
            new_vector = motionutils.calculateVector(eArg, this._to.clock.now());
        }
        */
        let new_vector = calculateVector$1(eArg, this._to.clock.now());


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
        if (delta.posDelta == PosDelta$1.CHANGE || delta.moveDelta == MoveDelta$1.STOP) {
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
            let exitItems = [...exitCues.values()].map(cue => {
                return {key:cue.key, new:undefined, old:cue};
            });
            let enterItems = [...enterCues.values()].map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            }); 

            // sort event items according to general movement direction
            let direction = calculateDirection(new_vector);
            this.sortItems(exitItems, direction);
            this.sortItems(enterItems, direction);

            // notifications
            const items = array_concat([exitItems, enterItems], {copy:true, order:true});

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

const PosDelta = MotionDelta.PosDelta;
const MoveDelta = MotionDelta.MoveDelta;
const Active = BaseSequencer.Active;
const ActiveMap = BaseSequencer.ActiveMap;

const EVENTMAP_THRESHOLD = 5000;
const ACTIVECUES_THRESHOLD = 5000;

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

    constructor (dataset, toA, toB, options) {

        super(dataset, options);

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

        this._toA_vector;
        this._toB_vector;
    }


    _isReady() {
        return (this._toA_ready && this._toB_ready);
    }


    /*
        Implement movement direction from two timing objects
    */

    _movementDirection() {
        const now = this._toA.clock.now();
        const now_vector_A = calculateVector$1(this._toA.vector, now);
        const now_vector_B = calculateVector$1(this._toB.vector, now);
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
        const now_vector_A = calculateVector$1(this._toA_vector, now);
        const now_vector_B = calculateVector$1(this._toB_vector, now);

        // active interval
        let [pos_A, pos_B] = [now_vector_A.position, now_vector_B.position];
        let [low, high] = (pos_A <= pos_B) ? [pos_A, pos_B] : [pos_B, pos_A];
        const activeInterval = new Interval(low, high, true, true);

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
            change.forEach(item => {
                this._map.set(item.key, item.new);
            });
            enter.forEach(item => {
                this._map.set(item.key, item.new);
            });

            // sort event items according to general movement direction
            let direction = movement_direction(now_vector_A, now_vector_B);
            this.sortItems(exit, direction);
            this.sortItems(change, direction);
            this.sortItems(enter, direction);

            // notifications
            const items = array_concat([exit, change, enter], {copy:true, order:true});
            
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

        // cache new vectors
        this._toA_vector = this._toA.vector;
        this._toB_vector = this._toB.vector;

        /*
            figure out which timing object was firing
        */
        const to = eInfo.src;
        const other_to = (to == this._toA) ? this._toB : this._toA;

        /*
            The nature of the vector change
        */
        let new_vector = calculateVector$1(to.vector, to.clock.now());
        const delta = new MotionDelta(to.old_vector, new_vector);

        /*
            Sample the state of the other timing object at same time.
        */
        let ts = new_vector.timestamp;
        let other_new_vector = calculateVector$1(other_to.vector, ts);

        /*
            Reevaluate active state.
            This is required after any discontinuity of the position (jump),
            or if the motion stopped without jumping (pause or halt at range
            restriction)
        */
        if (delta.posDelta == PosDelta.CHANGE || delta.MoveDelta == MoveDelta.STOP) {

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

            let exitItems = [...exitCues.values()].map(cue => {
                return {key:cue.key, new:undefined, old:cue};
            });
            let enterItems = [...enterCues.values()].map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            }); 
            // sort event items according to general movement direction
            let direction = movement_direction(new_vector, other_new_vector);
            this.sortItems(exitItems, direction);
            this.sortItems(enterItems, direction);

            // notifications
            const items = array_concat([exitItems, enterItems], {copy:true, order:true});

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
            let other_vector = calculateVector$1(other_to.vector, ts);
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
            let action_code = ActiveMap.get(`${to_role}${to_dir}${ep_type}`);

            /*
                state of cue
            */
            let cue = item.cue;
            let has_cue = this._map.has(cue.key);

            // filter action code
            if (action_code == Active.ENTER_EXIT) {
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
                    action_code = Active.ENTER;
                } else {
                    // both moving
                    let direction = calculateDirection(other_vector);                        // movement direction
                    action_code = (direction != item.direction) ? Active.ENTER : Active.EXIT;
                }
            }
            if (action_code == Active.STAY) {
                action_code = Active.ENTER;
            }
            if (action_code == Active.ENTER && has_cue) {
                return;
            }
            if (action_code == Active.EXIT && !has_cue) {
                return;
            }

            // enter or exit
            if (action_code == Active.ENTER) {
                // enter
                items.push({key:cue.key, new:cue, old:undefined});
                this._map.set(cue.key, cue);
            } else if (action_code == Active.EXIT) {
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

class DatasetViewer {

    constructor(ds, elem) {
        this.ds = ds;
        this.elem = elem;
        this.nonce = random_string(4);
        this.ds.on("change", this.onchange.bind(this));
        this.ds.on("remove", this.onremove.bind(this));
    }

    cue2string(cue) {
        let itv = (cue.interval) ? cue.interval.toString() : "undefined";
        let data = JSON.stringify(cue.data); 
        return `${cue.key}, ${itv}, ${data}`;
    }

    onchange(eItem) {
        let _id = `${this.nonce}-${eItem.key}`;
        let node = this.elem.querySelector(`#${_id}`);
        if (node) {
            // update existing node
            node.innerHTML = this.cue2string(eItem.new);
        } else {
            // create new node
            let node = document.createElement("div");
            node.innerHTML = this.cue2string(eItem.new);
            node.setAttribute("id", _id);
            this.elem.appendChild(node);
        }
    }

    onremove(eItem) {
        // remove node
        let _id = `${this.nonce}-${eItem.key}`;
        let node = document.getElementById(_id);
        if (node) {
            node.parentNode.removeChild(node);
        }
    }
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

/*
    TODO

    - treat progress change as a speculative
        change, (with a timeout)
        implementation - ideally as speculative converter
        easy solution - just lock
*/

class TimingProgress {

    static position2percent(position, range) {
        let [low, high] = range;

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
        this._sampler = options.sampler;
        this._progress_elem = progress_elem;
        this._lock = false;
        this._options = options;
        this._range = options.range || this._to.range;
        let [low, high] = this._range;
        if (low == -Infinity || high == Infinity) {
            throw new Error("illegal range", this._range);
        }

        // subscribe to input event from progress elem
        this._progress_elem.addEventListener("input", function() {
            // set lock
            // no updates on progress elem from timing object until lock is released
            this._lock_value = true;
        }.bind(this));

        // subscribe to change event from progress elem
        this._progress_elem.addEventListener("change", function () { 
            // clear lock
            this._lock_value = false;
            // update the timing object
            let percent = parseInt(this._progress_elem.value);               
            let position = TimingProgress.percent2position(percent, this._range);
            this._to.update({position: position});
        }.bind(this));
        
        // sampler
        if (this._sampler) {
            this._sampler.on("change", this.refresh.bind(this));
        }
    }

    refresh() {
        let position = this._to.pos;
        // update progress elem if unlocked
        if (!this._lock_value) {
            let percent = TimingProgress.position2percent(position, this._range);
            if (this._options.thumb) {
                // check if percent is legal
                if (percent < 0.0 || 100.0 < percent) {
                    // hide
                    this._options.thumb.hide();
                    return;
                }
            } else {
                percent = (percent < 0.0) ? 0.0 : percent;
                percent = (100.0 < percent) ? 100.0: percent;
            }
            this._progress_elem.value = `${percent}`;
            if (this._options.thumb) {
                this._options.thumb.show();            
            }
        }
    }
}

// create single sequencer factory function
function Sequencer() {
    // find datasets in arguments
    let ds_list = [...arguments].filter((e) => (e instanceof Dataset));
    let ds = (ds_list.length > 0) ? ds_list[0] : new Dataset();
    // find timing objects in arguments
    let to_list = [...arguments].filter((e) => (e instanceof TimingObject));
    // find options (plain objects) in arguments
    let obj_list = [...arguments].filter((e) => (Object.getPrototypeOf(e) === Object.prototype));
    let options = (obj_list.length > 0) ? obj_list[0] : {};
    if (to_list.length == 0) {
        throw new Error("no timingobject in arguments");
    } else if (to_list.length == 1) {
        return new PointModeSequencer(ds, to_list[0], options);
    } else {
        return new IntervalModeSequencer(ds, to_list[0], to_list[1], options);
    }
}
// Add clone functions for backwards compatibility
PointModeSequencer.prototype.clone = function () {
    let args = [this.dataset];
    args.push.apply(args, [...arguments]);
    return Sequencer(...args);
};

// Add clone functions for backwards compatibility
IntervalModeSequencer.prototype.clone = function () {
    let args = [this.dataset];
    args.push.apply(args, [...arguments]);
    return Sequencer(...args);
};

const version = "v3.0";

export { BinarySearch, CueCollection, Dataset, DatasetViewer, DelayConverter, Interval, LoopConverter, PositionCallback, RangeConverter, ScaleConverter, Sequencer, SkewConverter, Subset, Timeout, TimeshiftConverter, TimingObject, TimingProgress, TimingSampler, endpoint, eventify, motionutils, utils, version };
//# sourceMappingURL=timingsrc-esm-v3.js.map
