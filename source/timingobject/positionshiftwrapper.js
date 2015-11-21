define(['./timingbase', './rangewrapper'], function (timingbase, RangeWrapper) {

	'use strict';

	var WrapperBase = timingbase.WrapperBase;
	var inherit = timingbase.inherit;

	/*
		POSITION SHIFT WRAPPER
	*/

	var PositionShiftWrapper = function (timingObject, offset) {
		this._offset = offset;
		WrapperBase.call(this, timingObject);
	};
	inherit(PositionShiftWrapper, WrapperBase);

	// overrides
	PositionShiftWrapper.prototype._getRange = function () {
		var range = this.timingsrc.range;
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._offset;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._offset;
		return range;
	};
	
	// overrides
	PositionShiftWrapper.prototype._onChange = function (vector) {
		vector.position += this._offset;	
		return vector;
	};

	PositionShiftWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._offset;
		}
		return this.timingsrc.update(vector);
	};

	return PositionShiftWrapper;
});