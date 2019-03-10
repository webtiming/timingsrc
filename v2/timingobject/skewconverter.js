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
	SKEW CONVERTER

	Skewing the timeline by 2 means that the timeline position 0 of the timingsrc becomes position 2 of Converter.

*/

define(['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;
	var inherit = TimingObjectBase.inherit;

	var SkewConverter = function (timingsrc, skew, options) {
		if (!(this instanceof SkewConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._skew = skew;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(SkewConverter, TimingObjectBase);

	// overrides
	SkewConverter.prototype.onRangeChange = function (range) {
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._skew;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._skew;
		return range;
	};
	
	// overrides
	SkewConverter.prototype.onVectorChange = function (vector) {
		vector.position += this._skew;	
		return vector;
	};

	SkewConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._skew;
		}
		return this.timingsrc.update(vector);
	};


	Object.defineProperty(SkewConverter.prototype, 'skew', {
		get : function () {
			return this._skew;
		},
		set : function (skew) {
			this._skew = skew;
			// pick up vector from timingsrc
			var src_vector = this.timingsrc.vector;
			// use this vector to emulate new event from timingsrc
			this._preProcess(src_vector);
		}
	});


	return SkewConverter;
});