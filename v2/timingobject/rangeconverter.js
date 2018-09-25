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

define(['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;
	var RangeState = motionutils.RangeState;


	var state = function () {
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
	*/

	var RangeConverter = function (timingObject, range) {
		if (!(this instanceof RangeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingObject, {timeout:true});
		/*
			note :
			if a range point of the loop converter is the same as a range point of timingsrc,
			then there will be duplicate events
		*/
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeConverter, TimingObjectBase);

	// overrides
	RangeConverter.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._timingsrc.vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};
	
	// overridden
	RangeConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this._timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// override range
	Object.defineProperty(RangeConverter.prototype, 'range', {
		get : function () {
			return [this._range[0], this._range[1]];
		},
		set : function (range) {
			this._range = range;
			// use vector from timingsrc to emulate new event from timingsrc
			this._preProcess(this.timingsrc.vector);
		}
	});

	// overrides
	RangeConverter.prototype.onRangeChange = function(range) {
		return this._range;
	};

	// overrides
	RangeConverter.prototype.onTimeout = function (vector) {	
		return this.onVectorChange(vector);
	};

	// overrides
	RangeConverter.prototype.onVectorChange = function (vector) {
		// console.log("onVectorChange vector", vector);
		// console.log("onVectorChange range", this._range);
		var new_state = motionutils.getCorrectRangeState(vector, this._range);
		// console.log("onVectorChange state", new_state);
		var state_changed = this._state.set(new_state, this._range);
		if (state_changed.special) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = motionutils.checkRange(vector, this._range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
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
					vector = motionutils.checkRange(vector, this._range);
				} else {
					// drop event
					return null;
				}
			}
		}
		return vector;
	};

	return RangeConverter;
});