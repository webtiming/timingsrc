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

	var WrapperBase = timingbase.WrapperBase;
	var inherit = timingbase.inherit;

	/*
		SKEW WRAPPER
	*/

	var SkewWrapper = function (timingObject, skew) {
		this._skew = skew;
		WrapperBase.call(this, timingObject);
	};
	inherit(SkewWrapper, WrapperBase);

	// overrides
	SkewWrapper.prototype._getRange = function () {
		var range = this.timingsrc.range;
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._skew;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._skew;
		return range;
	};
	
	// overrides
	SkewWrapper.prototype._onChange = function (vector) {
		vector.position += this._skew;	
		return vector;
	};

	SkewWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._skew;
		}
		return this.timingsrc.update(vector);
	};

	return SkewWrapper;
});