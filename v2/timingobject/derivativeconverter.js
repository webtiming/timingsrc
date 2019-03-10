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

define(['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var DerivativeConverter = function (timingsrc) {
		if (!(this instanceof DerivativeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(DerivativeConverter, TimingObjectBase);

	// overrides
	DerivativeConverter.prototype.onRangeChange = function (range) { 
		return [-Infinity, Infinity];
	};

	// overrides
	DerivativeConverter.prototype.onVectorChange = function (vector) {
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