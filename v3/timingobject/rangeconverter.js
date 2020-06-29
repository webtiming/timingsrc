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

	RANGE CONVERTER

	The converter enforce a range on position.

	It only has effect if given range is a restriction on the range of the timingsrc.
	Range converter will pause on range endpoints if timingsrc leaves the range.
	Range converters will continue mirroring timingsrc once it comes into the range.
*/


import {RangeState, correctRangeState, checkRange} from '../util/motionutils.js';
import TimingObject from './timingobject.js';


function state() {
	var _state = RangeState.INIT;
	var _range = null;
	var is_special_state_change = function (old_state, new_state) {
		// only state changes between INSIDE and OUTSIDE* are special state changes.
		if (old_state === RangeState.OUTSIDE_HIGH && new_state === RangeState.OUTSIDE_LOW) return false;
		if (old_state === RangeState.OUTSIDE_LOW && new_state === RangeState.OUTSIDE_HIGH) return false;
		if (old_state === RangeState.INIT) return false;
		return true;
	}
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

	}
	return {get: get, set:set};
};


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
		/*
			range change - only a local operation

				- need to trigger local processing of new range,
				so that range is changed and events triggered
				- also need to trigger a reevaluation of
				vector from timingsrc vector, for instance, if
				range grows while timingsrc is outside, the
				position of the vector needs to change
				- cannot do both these things via emulation
				of timingsrc event - because rangeconverter
				is supposed to ignore range change from timingsrc
				- could do both locally, but this would effectively
				require reimplementation of logic in __process
				- in addition, this could be a request to update
				both range and vector at the same time, in which case
				it would be good to do them both at the same time

			- possible solution - somehow let range converter
			  discriminate range changes based on origin?

		*/
		if (arg.range != undefined) {

			// local processing of range change
			// to trigger range change event
			let _arg = {range: arg.range, ...this.timingsrc.vector, live:true};
			this.__process(_arg);
			// avoid that range change affects timingsrc
			delete arg.range;

		}
		return super.update(arg);
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
			if (this.__state.get() === RangeState.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = checkRange(vector, this.__range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this.__state.get() === RangeState.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
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

export default RangeConverter;

