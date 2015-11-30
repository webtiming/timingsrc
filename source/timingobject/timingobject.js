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
	TIMING OBJECT

	range and initial vector may be specified.

	master clock is the clock used by the timing object.
	timestamps in vectors refer to this clock.

	for local timing objects master clock is equal to performance.now
	for timing objects with a timing provider, the master clock will be
	maintained as a representation of the clock used by the timing provider.
	
*/

define(['./timingbase', 'util/masterclock'], function (timingbase, MasterClock) {

	'use strict';

	var motionutils = timingbase.motionutils;	
	var TimingBase = timingbase.TimingBase;
	var STATE = timingbase.STATE;
	var inherit = timingbase.inherit;

	var TimingObject = function (range, vector) {
		TimingBase.call(this, {timeout:true});
		// internal clock
		this._clock = new MasterClock();
		// internal vector
		this._vector = {
			position : 0.0,
			velocity : 0.0,
			acceleration : 0.0,
			timestamp : this._clock.now()
		};
		// parameter
		if (vector) {
			if (vector.position === null) vector.position = undefined;
			if (vector.velocity === null) vector.velocity = undefined;
			if (vector.acceleration === null) vector.acceleration = undefined;
			if (vector.position !== undefined) this._vector.position = vector.position;
			if (vector.velocity !== undefined) this._vector.velocity = vector.velocity;
			if (vector.acceleration !== undefined) this._vector.acceleration = vector.acceleration;	
		}		
		// range
		this._range = (range !== undefined) ? range : [-Infinity, Infinity];
		// adjust vector according to range
		this._vector = this._checkRange(this._vector);
	};
	inherit(TimingObject, TimingBase);

	// Accessor internal clock
	Object.defineProperty(TimingObject.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// overrides
	TimingObject.prototype.query = function () {
		if (this.vector === null) return null;
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.vector, this.clock.now());
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};

	TimingObject.prototype.update = function (vector) {
		if (vector === undefined || vector === null) {throw new Error ("drop update, illegal updatevector");}

		var pos = (vector.position === undefined || vector.position === null) ? undefined : vector.position;
		var vel = (vector.velocity === undefined || vector.velocity === null) ? undefined : vector.velocity;
		var acc = (vector.acceleration === undefined || vector.acceleration === null) ? undefined : vector.acceleration;

		if (pos === undefined && vel === undefined && acc === undefined) {
			throw new Error ("drop update, noop");
		}
		var now = this._clock.now();
		var nowVector = motionutils.calculateVector(this.vector, now);
		var p = nowVector.position;
		var v = nowVector.velocity;
		var a = nowVector.acceleration;
		pos = (pos !== undefined) ? pos : p;
		vel = (vel !== undefined) ? vel : v;
		acc = (acc !== undefined) ? acc : a;
		if (pos === p && vel === v && acc === a) return;
		var newVector = {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
		// process update
		var self = this;
		setTimeout(function () {
			self._preProcess(newVector);
		}, 0);
		return newVector;
	};

	TimingObject.prototype._onChange = function (vector) {
		return this._checkRange(vector);
	};

	// overrides
	TimingObject.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	TimingObject.prototype._onTimeout = function (vector) {		
		return this._checkRange(vector);
	};

	return TimingObject;
});