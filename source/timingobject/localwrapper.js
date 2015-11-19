define(['timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		LOCAL WRAPPER

		Update requests are cached locally, visible to the query
		operation, thus allowing them to take effect immediately
		(speculatively).

		A timeout clears the speculative internal vector after some time,
		unless a change notification is received in the mean time.

		NO SUPPORT for STREAMING updates. 
		- bind update request to update notification

	*/

	var LocalWrapper = function (timingObject) {
		WrapperBase.call(this, timingObject);
		this._speculative = false;
	};
	inherit(LocalWrapper, WrapperBase);

	// overrides
	LocalWrapper.prototype.update = function (vector) {		
		var newVector = this.timingsrc.update(vector);
		this._speculative = true;
		// process update immediately
		var self = this;
		setTimeout(function () {
			self._preProcess(newVector);
		}, 0);
		return newVector;
	};

	// overrides
	LocalWrapper.prototype._onChange = function (vector) {
		if (this._speculative) {
			this._speculative = false;
			// todo - suppress change only if it corresponds to change request sent by self
		}
		return vector;
	};

	return LocalWrapper;
});