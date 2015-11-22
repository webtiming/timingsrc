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
	SCALE WRAPPER

	Scaling by a factor 2 means that the timeline is streached, i.e. the unit length is doubled.
	As a consequencer, the motion of the timing object will slow down by the same factor.
*/


define(['./timingbase'], function (timingbase) {

	'use strict';

	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		SCALE WRAPPER
	*/
	var ScaleWrapper = function (timingObject, factor) {
		this._factor = factor;
		WrapperBase.call(this, timingObject);
	};
	inherit(ScaleWrapper, WrapperBase);

	// overrides
	ScaleWrapper.prototype._getRange = function () {
		var range = this.timingsrc.range;
		return [range[0]/this._factor, range[1]/this._factor];
	};

	// overrides
	ScaleWrapper.prototype._onChange = function (vector) {
		vector.position = vector.position / this._factor;
		vector.velocity = vector.velocity / this._factor;
		vector.acceleration = vector.acceleration / this._factor;
		return vector;
	};
	
	ScaleWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position * this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity * this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration * this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleWrapper;
});