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
	SCALE CONVERTER

	Scaling by a factor 2 means that values of the timing object (position, velocity and acceleration) are multiplied by two.
	For example, if the timing object represents a media offset in seconds, scaling it to milliseconds implies a scaling factor of 1000.

*/


define(['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var ScaleConverter = function (timingsrc, factor) {
		if (!(this instanceof ScaleConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._factor = factor;
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(ScaleConverter, TimingObjectBase);

	// overrides
	ScaleConverter.prototype.onRangeChange = function (range) {
		return [range[0]*this._factor, range[1]*this._factor];
	};

	// overrides
	ScaleConverter.prototype.onVectorChange = function (vector) {
		vector.position = vector.position * this._factor;
		vector.velocity = vector.velocity * this._factor;
		vector.acceleration = vector.acceleration * this._factor;
		return vector;
	};
	
	ScaleConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position / this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity / this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration / this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleConverter;
});