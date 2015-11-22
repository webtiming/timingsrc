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

define(['./timingbase', './rangewrapper'], function (timingbase, RangeWrapper) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		TIMESHIFT WRAPPER

		Timeshift wrapper timeshift a timing object by timeoffset.
		Positive timeoffset means that the timeshift wrapper will run ahead of the source timing object.
		Negative timeoffset means that the timeshift wrapper will run behind the source timing object.
		
		Updates affect the wrapper immediately. This means that update vector must be re-calculated
		to the value it would have at time-shifted time. Timestamps are not time-shifted, since the motion is still live.
		For instance, (0, 1, ts) becomes (0+(1*timeshift), 1, ts) 

		However, this transformation may cause range violation 
			- this happens only when timing object is moving.
			- implementation requires range-wrapper logic

		To fix this, the timeshift wrapper is wrapped in a rangewrapper.
	*/

	var TimeShiftWrapper = function (timingObject, timeOffset) {
		WrapperBase.call(this, timingObject);
		this._timeOffset = timeOffset;
	};
	inherit(TimeShiftWrapper, WrapperBase);

	// overrides
	TimeShiftWrapper.prototype._onChange = function (vector) {
		// calculate timeshifted vector
		var newVector = motionutils.calculateVector(vector, vector.timestamp + this._timeOffset);
		newVector.timestamp = vector.timestamp;
		return newVector;
	};

	/*
		Hides wrapping of rangewrapper to specify new ranges.
		If range is not specified, default is to use range of timingObject
	*/
	var RangeTimeShiftWrapper = function (timingObject, timeOffset, range) {
		range = range || timingObject.range;
		return new RangeWrapper(new TimeShiftWrapper(timingObject, timeOffset), range);
	};

	return RangeTimeShiftWrapper;
});