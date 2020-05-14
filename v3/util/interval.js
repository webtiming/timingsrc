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

define(function () {

	'use strict';


	const isNumber = function(n) {
		let N = parseFloat(n);
	    return (n===N && !isNaN(N));
	};


	/*********************************************************

	ENDPOINT

	Utilities for interval endpoints comparisons

	**********************************************************/

	const endpoint = function () {

		// bit flag
		const CLOSED_BIT = 0
		const RIGHT_BIT = 1

		// endpoint mode
		const MODE_LEFT_OPEN = 0;     //bx000
		const MODE_LEFT_CLOSED = 1;   //bx001
		const MODE_RIGHT_OPEN = 2;    //bx010
		const MODE_RIGHT_CLOSED = 3;  //bx011
		const MODE_VALUE = 4          //bx100

		/*
			endpoint order
			p), [p, p, p], (p
		*/
		const order = [];

		order[MODE_RIGHT_OPEN] = 0;
		order[MODE_LEFT_CLOSED] = 1;
		order[MODE_VALUE] = 2;
		order[MODE_RIGHT_CLOSED] = 3;
		order[MODE_LEFT_OPEN] = 4;

		/*
			get order

			given two endpoints return
			two numbers representing their order
			also accepts regular numbers as endpoints

			for points or endpoint values that are not
			equal, these values convey order directly,
			otherwise the order numbers 0-4 are returned
			based on endpoint inclusion and direction

			parameters are either
			- point (number)
			- endpoint [value (number), right (bool), closed (bool)]
		*/

		function get_order(e1, e2) {

			// support plain numbers (not endpoints)
			if (e1.length === undefined) {
				if (!isNumber(e1)) {
					throw new Error("e1 not a number", e1);
				}
				e1 = [e1, undefined, undefined];
			}
			if (e2.length === undefined) {
				if (!isNumber(e2)) {
					throw new Error("e2 not a number", e2);
				}
				e2 = [e2, undefined, undefined];
			}

			let [e1_val, e1_right, e1_closed] = e1;
			let [e2_val, e2_right, e2_closed] = e2;
			let e1_mode, e2_mode;

			if (e1_val != e2_val) {
				// different values
				return [e1_val, e2_val];
			} else {
				// equal values
				if (e1_closed === undefined) {
					e1_mode = MODE_VALUE;
				} else {
					e1_closed = Boolean(e1_closed);
					e1_right = Boolean(e1_right);
					e1_mode = (+e1_closed << CLOSED_BIT) | (+e1_right << RIGHT_BIT);
				}
				if (e2_closed === undefined) {
					e2_mode = MODE_VALUE;
				} else {
					e2_closed = Boolean(e2_closed);
					e2_right = Boolean(e2_right);
					e2_mode = (+e2_closed << CLOSED_BIT) | (+e2_right << RIGHT_BIT);
				}
				return [order[e1_mode], order[e2_mode]];
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

		function compare(e1, e2) {
			let [order1, order2] = get_order(e1, e2);
			let diff = order1 - order2;
			if (diff == 0) return 0;
			return (diff > 0) ? 1 : -1;
		}

		/*
			human friendly endpoint representation
		*/
		function toString(e) {
			if (e.length === undefined) {
				return e.toString();
			} else {
				let [val, right, closed] = e;
				let s = val.toString()
				if (right && closed) {
					return s + "]";
				} else if (right && !closed) {
					return s + ")";
				} else if (!right && closed) {
					return "[" + s;
				} else {
					return "(" + s;
				}
			}
		}

		return {
			compare: compare,
			toString: toString,
			equals: equals,
			rightof: rightof,
			leftof: leftof
		}

	}();


	/*********************************************************
	INSIDE INTERVAL
	**********************************************************

	inside (e, interval)

	return true if given point/endpoint e is inside interval

	**********************************************************/

	function inside (e, interval) {
		let leftof = endpoint.leftof(e, interval.endpointLow);
		let rightof = endpoint.rightof(e, interval.endpointHigh);
		return !leftof && !rightof;
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

	// Interval Relations
    const Relation = Object.freeze({
		OUTSIDE_LEFT: 1,
		OVERLAP_LEFT: 2,
		COVERED: 3,
		EQUALS: 4,
		COVERS: 5,
		OVERLAP_RIGHT: 6,
		OUTSIDE_RIGHT: 7
    });



	function compare(a, b) {
		if (! a instanceof Interval) {
			// could be a number
			if (isNumber(a)) {
				a = new Interval(a);
			} else {
				throw new Error("a not interval", a);
			}
		}
		if (! b instanceof Interval) {
			// could be a number
			if (isNumber(b)) {
				b = new Interval(b);
			} else {
				throw new Error("b not interval", b);
			}
		}

		let cmp_1 = endpoint.compare(a.endpointLow, b.endpointLow);
		let cmp_2 = endpoint.compare(a.endpointHigh, b.endpointHigh);
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
	INTERVAL ERROR
	**********************************************************/

	var IntervalError = function (message) {
		this.name = "IntervalError";
		this.message = (message||"");
	};
	IntervalError.prototype = Error.prototype;


	/*********************************************************
	INTERVAL
	**********************************************************/

	class Interval {

		constructor (low, high, lowInclude, highInclude) {
			var lowIsNumber = isNumber(low);
			var highIsNumber = isNumber(high);
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
			this.endpointLow = [this.low, false, this.lowInclude];
			this.endpointHigh = [this.high, true, this.highInclude];
		}

		toString () {
			var lowBracket = (this.lowInclude) ? "[" : "(";
			var highBracket = (this.highInclude) ? "]" : ")";
			var low = (this.low === -Infinity) ? "[--" : this.low; //.toFixed(2);
			var high = (this.high === Infinity) ? "--]" : this.high; //.toFixed(2);
			if (this.singular)
				return lowBracket + low + highBracket;
			return lowBracket + low + ',' + high + highBracket;
		};

		compare (other) {
			return compare(this, other);
		}

		inside (p) {
			return inside(p, this);
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
	}


	/*********************************************************
	COMPARE BY INTERVAL ENDPOINTS
	**********************************************************

	cmp functions for sorting intervals (ascending) based on
	endpoint low or high

	use with array.sort()

	**********************************************************/

	function _make_interval_cmp(low) {
		return function cmp (a, b) {
			let e1, e2;
			if (low) {
				e1 = [a.low, false, a.lowInclude]
				e2 = [b.low, false, b.lowInclude]
			} else {
				e1 = [a.high, true, a.highInclude]
				e2 = [b.high, true, b.highInclude]
			}
			return endpoint.compare(e1, e2);
		}
	}


	/*
		Add static variables to Interval class.
	*/
	Interval.Relation = Relation;
	Interval.cmpLow = _make_interval_cmp(true);
	Interval.cmpHigh = _make_interval_cmp(false);
	Interval.endpoint = endpoint;

	/*
		Possibility for more interval methods such as union, intersection,
	*/

	return Interval;
});

