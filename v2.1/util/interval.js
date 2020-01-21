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

	/*
		INTERVAL
	*/

	var isNumber = function(n) {
		var N = parseFloat(n);
	    return (n===N && !isNaN(N));
	};

	var IntervalError = function (message) {
		this.name = "IntervalError";
		this.message = (message||"");
	};
	IntervalError.prototype = Error.prototype;


	class Interval {

		constructor (low, high, lowInclude, highInclude) {
			if (!(this instanceof Interval)) {
				throw new Error("Contructor function called without new operation");
			}
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
		}



		toString () {
			var lowBracket = (this.lowInclude) ? "[" : "<";
			var highBracket = (this.highInclude) ? "]" : ">";
			var low = (this.low === -Infinity) ? "<--" : this.low; //.toFixed(2);
			var high = (this.high === Infinity) ? "-->" : this.high; //.toFixed(2);
			if (this.singular)
				return lowBracket + low + highBracket;
			return lowBracket + low + ',' + high + highBracket;
		};

		coversPoint (x) {
			if (this.low < x && x < this.high) return true;
			if (this.lowInclude && x === this.low) return true;
			if (this.highInclude && x === this.high) return true;
			return false;
		};

		// overlap : it exists at least one point x covered by both interval
		overlapsInterval(other) {
			if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");
			// singularities
			if (this.singular && other.singular)
				return (this.low === other.low);
			if (this.singular)
				return other.coversPoint(this.low);
			if (other.singular)
				return this.coversPoint(other.low);
			// not overlap right
			if (this.high < other.low) return false;
			if (this.high === other.low) {
				return this.coversPoint(other.low) && other.coversPoint(this.high);
			}
			// not overlap left
			if (this.low > other.high) return false;
			if (this.low === other.high) {
				return (this.coversPoint(other.high) && other.coversPoint(this.low));
			}
			return true;
		};

		// Interval fully covering other interval
		coversInterval (other) {
			if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");
			if (other.low < this.low || this.high < other.high) return false;
			if (this.low < other.low && other.high < this.high) return true;
			// corner case - one or both endpoints are the same (the other endpoint is covered)
			if (this.low === other.low && this.lowInclude === false && other.lowInclude === true)
				return false;
			if (this.high === other.high && this.highInclude === false && other.highInclude === true)
				return false;
			return true;
		};
		equals (other) {
			if (this.low !== other.low) return false;
			if (this.high !== other.high) return false;
			if (this.lowInclude !== other.lowInclude) return false;
			if (this.highInclude !== other.highInclude) return false;
			return true;
		};












		/*
			a.hasEndpointInside(b)

			returns true if interval a has at least one endpoint inside interval b

			This is easy for most intervals, but there are some subtleties
			when when interval a and b have one or two endpoints in common

			4 ways for intervals to share an endpoint

			- a.high == b.low :
				><  (a.high outside b)
				>[  (a.high outside b)
				]<  (a.high outside b)
				][  (a.high inside b)
			- a.high == b.high:
				>>  (a.high inside b)
				>]  (a.high inside b)
				]>  (a.high outside b)
				]]  (a.high inside b)
			- a.low == b.low :
				<<  (a.low inside b)
				<[  (a.low inside b)
				[<  (a.low outside b)
				[[  (a.low inside b)
			- a.low == b.high :
				<>  (a.low outside b)
				[>  (a.low outside b)
				<]  (a.low outside b)
				[]  (a.low inside b)

		*/


		hasEndpointInside (b) {
			const a = this;
			// check if a is to the right of b
			if (b.high < a.low) return false;
			// check if a is to the left of b
			if (a.high < b.low) return false;
			// check if a.low is inside b
			if (b.low < a.low && a.low < b.high) return true;
			// check if a.high is inside b
			if (b.low < a.high && a.high < b.high) return true;

			// special consideration if a and b share endpoint(s)

			// a.high shared
			if (a.high == b.low) {
				if (a.highInclude && b.lowInclude) return true;
			}
			if (a.high == b.high) {
				if (!(a.highInclude && !b.highInclude)) return true;
			}
			// a.low shared
			if (a.low == b.low) {
				if (!(a.lowInclude && !b.lowInclude)) return true;
			}
			if (a.low == b.high) {
				if (a.lowInclude && b.highInclude) return true;
			}
			return false;
		};

	}

	function _make_interval_cmp(endpoint) {
		/*
			make sort function for sorting intervals based on
			endpoint "low" or "high" in ascending

			if inteval_a and interval_b have same endpoint value
			compare lowInclude, highInclude

			low : AB
				  [[ - equal   - return 0
				  [< - A first - return 1
				  <[ - B first - return -1
				  << - equal   - return 0

			high : AB
				  ]] - equal   - return 0
				  ]> - B first - return -1
				  >] - A first - return 1
				  >> - equal   - return 0


			returns cmp function to be used with array.sort()
		*/

		function cmp (interval_a, interval_b) {
			// sort first by value
			let diff = interval_b[endpoint] - interval_a[endpoint]
			if (diff == 0) {
				// equal endpoint values - compare endpoint include
				let a_include = interval_a[endpoint+"Include"];
				let b_include = interval_b[endpoint+"Include"];

				if (a_include == b_include) {
					return 0;
				}
				if (endpoint == "low") {
					return (a_include) ? 1 : -1
				} else {
					return (a_include) ? -1 : 1
				}
			} else {
				return diff;
			}
		}
		return cmp;
	}

	const cmp_interval_low = _make_interval_cmp("low");
	const cmp_interval_high = _make_interval_cmp("high");



	/*

		Internal endpoint functionality

	*/

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
			order

			given two endpoints return
			two numbers representing their order
			also accepts regular numbers as endpoints

			for points values/endpoint values that are not
			equal, these values convey order,
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

		function equal(e1, e2) {
			let [order1, order2] = get_order(e1, e2);
			return (order1 == order2);
		}

		/*
			return 1 if ordering e1, e2 is correct
			return 0 if e1 and e2 is equal
			return -1 if ordering e1, e2 is incorrect
		*/

		function compare(e1, e2) {
			let [order1, order2] = get_order(e1, e2);
			let diff = order2 - order1;
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
			equal: equal,
			rightof: rightof,
			leftof: leftof
		}

	}();


	/*
		inside (e, interval)

		figure out if given endpoint/point e is inside interval
		returns bool
	*/

	function inside (e, interval) {
		if (! interval instanceof Interval) {
			throw new Error("not interval", interval);
		}
		let e_low = [interval.low, false, interval.lowInclude];
		let e_high = [interval.high, true, interval.highInclude];
		return !endpoint.leftof(e, e_low) && !endpoint.rightof(e, e_high);
	}

	/*
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
		1 	   1       11  OUTSIDE_LEFT, PARTIAL_LEFT
		1 	   0       10  COVERS
		1      -1       9  COVERS
		0 	   1        1  COVERED
		0      0        0  EQUAL
		0	   -1      -1  COVERS
		-1     1       -9  COVERED
		-1 	   0      -10  COVERED
		-1     -1     -11  OUTSIDE_RIGHT, PARTIAL_RIGHT
		=====  =====  ===  ============================

	*/

    const IntervalRelation = Object.freeze({
		COVERED: 1,
		PARTIAL_LEFT: 2,
		PARTIAL_RIGHT: 3,
		COVERS: 4,
		OUTSIDE_LEFT: 5,
		OUTSIDE_RIGHT: 6,
		EQUAL: 7
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
				throw new Error("b not interval", a);
			}
		}
		// interval endpoints
		let a_low = [a.low, false, a.lowInclude];
		let a_high = [a.high, true, a.highInclude];
		let b_low = [b.low, false, b.lowInclude];
		let b_high = [b.high, true, b.highInclude];

		let cmp_1 = endpoint.compare(b_low, a_low);
		let cmp_2 = endpoint.compare(b_high, a_high);
		let key = cmp_1*10 + cmp_2;

		if (key == 11) {
			// OUTSIDE_LEFT or PARTIAL_LEFT
			if (endpoint.leftof(b_high, a_low)) {
				return IntervalRelation.OUTSIDE_LEFT;
			} else {
				return IntervalRelation.PARTIAL_LEFT;
			}
		} else if ([-1, 9, 10].includes(key)) {
			return IntervalRelation.COVERS;
		} else if ([1, -9, -10].includes(key)) {
			return IntervalRelation.COVERED;
		} else if (key == 0) {
			return IntervalRelation.EQUAL;
		} else {
			// key == -11
			// OUTSIDE_RIGHT, PARTIAL_RIGHT
			if (endpoint.rightof(b_low, a_high)) {
				return IntervalRelation.OUTSIDE_RIGHT;
			} else {
				return IntervalRelation.PARTIAL_RIGHT;
			}
		}
	}

	/*
		Possibility for more interval methods such as union, intersection,
	*/

	return {
		Interval: Interval,
		endpoint: endpoint,
		inside: inside,
		compare: compare,
		IntervalRelation: IntervalRelation
	}
});

