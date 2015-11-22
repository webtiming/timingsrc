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

define(['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var STATE = timingbase.STATE;
	var inherit = timingbase.inherit;

	var state = function () {
		var _state = STATE.INIT;
		var is_real_state_change = function (old_state, new_state) {
			// only state changes between INSIDE and OUTSIDE* are real state changes.
			if (old_state === STATE.OUTSIDE_HIGH && new_state === STATE.OUTSIDE_LOW) return false;
			if (old_state === STATE.OUTSIDE_LOW && new_state === STATE.OUTSIDE_HIGH) return false;
			if (old_state === STATE.INIT) return false;
			return true;
		}
		var get = function () {return _state;};
		var set = function (new_state) {
			if (new_state === STATE.INSIDE || new_state === STATE.OUTSIDE_LOW || new_state === STATE.OUTSIDE_HIGH) {
				if (new_state !== _state) {
					var old_state = _state;
					_state = new_state;
					return {real: is_real_state_change(old_state, new_state), abs: true};
				}
			};
			return {real:false, abs:false};
		}
		return {get: get, set:set};
	};


	/*
		RangeWrapper allows a new (smaller) range to be specified for a MotionWrapper.
	*/

	var RangeWrapper = function (timingObject, range) {
		WrapperBase.call(this, timingObject, {timeout:true});
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeWrapper, WrapperBase);

	// overrides
	RangeWrapper.prototype.query = function () {
		if (this.vector === null) return null;
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.timingsrc.vector, this.clock.now());
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};
	
	// overridden
	RangeWrapper.prototype._calculateTimeoutVector = function () {
		var freshVector = this.timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	RangeWrapper.prototype._onTimeout = function (vector) {		
		return this._onChange(vector);
	};

	// overrides
	RangeWrapper.prototype._onChange = function (vector) {
		var new_state = this._getCorrectRangeState(vector);
		var state_changed = this._state.set(new_state);	
		if (state_changed.real) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === STATE.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = this._checkRange(vector);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === STATE.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
				// stay outside or first event inside 
				// drop unless 
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				if (state_changed.abs) {

					vector = this._checkRange(vector);
				} else {
					// drop event

					return null;
				}
			}
		}
		return vector;
	};

	return RangeWrapper;
});