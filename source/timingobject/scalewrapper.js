define(['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
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
		return [range[0]*this._factor, range[1]*this._factor];
	};

	// overrides
	ScaleWrapper.prototype._onChange = function (vector) {
		vector.position = vector.position * this._factor;
		vector.velocity = vector.velocity * this._factor;
		vector.acceleration = vector.acceleration * this._factor;
		return vector;
	};
	
	ScaleWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position / this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity / this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration / this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleWrapper;
});