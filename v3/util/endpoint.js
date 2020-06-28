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


export default {
	cmp,
	toString,
	equals,
	rightof,
	leftof,
	create,
	min,
	max
};
