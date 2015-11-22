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
		DERIVATIVE WRAPPER

		position variable represents velocity of source timing object
		no range exist for velocity
	*/
	var DerivativeWrapper = function (timingObject, factor) {
		WrapperBase.call(this, timingObject);
	};
	inherit(DerivativeWrapper, WrapperBase);

	// overrides
	DerivativeWrapper.prototype._getRange = function () { return [-Infinity, Infinity];};

	// overrides
	DerivativeWrapper.prototype._onChange = function (vector) {
		var newVector = {
			position : vector.velocity,
			velocity : vector.acceleration,
			acceleration : 0,
			timestamp : vector.timestamp
		};
		return newVector;
	};
	
	DerivativeWrapper.prototype.update = function (vector) {
		throw new Error("updates illegal on derivative of timingobject");
	};

	return DerivativeWrapper;
});