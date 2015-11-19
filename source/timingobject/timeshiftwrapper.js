define(['timingbase', 'rangewrapper'], function (timingbase, RangeWrapper) {

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