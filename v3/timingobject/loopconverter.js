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
	LOOP CONVERTER

	This is a modulo type transformation where the converter will be looping within
	a given range. Potentially one could create an associated timing object keeping track of the
	loop number.
*/


import {calculateVector} from '../util/motionutils.js';
import TimingObject from './timingobject.js';


// ovverride modulo to behave better for negative numbers
function mod(n, m) {
	return ((n % m) + m) % m;
};

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
export default LoopConverter;

