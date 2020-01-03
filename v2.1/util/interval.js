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


	var Interval = function (low, high, lowInclude, highInclude) {
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
	};


	Interval.prototype.toString = function () {
		var lowBracket = (this.lowInclude) ? "[" : "<";
		var highBracket = (this.highInclude) ? "]" : ">";
		var low = (this.low === -Infinity) ? "<--" : this.low; //.toFixed(2);
		var high = (this.high === Infinity) ? "-->" : this.high; //.toFixed(2);
		if (this.singular)
			return lowBracket + low + highBracket;
		return lowBracket + low + ',' + high + highBracket;
	};

	Interval.prototype.coversPoint = function (x) {
		if (this.low < x && x < this.high) return true;
		if (this.lowInclude && x === this.low) return true;
		if (this.highInclude && x === this.high) return true;
		return false;
	};

	// overlap : it exists at least one point x covered by both interval
	Interval.prototype.overlapsInterval = function (other) {
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
	Interval.prototype.coversInterval = function (other) {
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
	Interval.prototype.equals = function (other) {
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


	Interval.prototype.hasEndpointInside = function (b) {
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


	/*
		Possibility for more interval methods such as union, intersection,
	*/

	return Interval;
});

