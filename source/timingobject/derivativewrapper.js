define(['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
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