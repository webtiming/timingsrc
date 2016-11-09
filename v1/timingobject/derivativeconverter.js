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
	DERIVATIVE CONVERTER

	this Converter implements the derivative of it source timing object.
	
	The velocity of timingsrc becomes the position of the Converter.

	This means that the derivative Converter allows sequencing on velocity of a timing object, 
	by attatching a sequencer on the derivative Converter.
*/

define(['./timingbase'], function (timingbase) {

	'use strict';

	var ConverterBase = timingbase.ConverterBase;	
	var inherit = timingbase.inherit;

	var DerivativeConverter = function (timingObject, factor) {
		ConverterBase.call(this, timingObject);
	};
	inherit(DerivativeConverter, ConverterBase);

	// overrides
	DerivativeConverter.prototype._getRange = function () { return [-Infinity, Infinity];};

	// overrides
	DerivativeConverter.prototype._onChange = function (vector) {
		var newVector = {
			position : vector.velocity,
			velocity : vector.acceleration,
			acceleration : 0,
			timestamp : vector.timestamp
		};
		return newVector;
	};
	
	DerivativeConverter.prototype.update = function (vector) {
		throw new Error("updates illegal on derivative of timingobject");
	};

	return DerivativeConverter;
});