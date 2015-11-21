define(['./timingbase'], function (timingbase) {

	'use strict';
	
	var WrapperBase = timingbase.WrapperBase;
	var inherit = timingbase.inherit;

	/*
		DELAY WRAPPER

		Delay Wrapper introduces a positive time delay on a source timing object.

		Generally - if the source timing object has some value at time t, 
		then the delaywrapper will provide the same value at time t + delay.

		For the delay wrapper one could be imagine two different modes - LIVE and NON-LIVE.
		- LIVE:false : time-shifted vector && delayed update events
			implies an exact replica of source timing object only time-shifted, so it is not live
		- LIVE:true : time-shifted vector && immediate update events
			implies live with respect to interactivity
			
			However, right after an update, the values of the delay wrapper are not consistent with earlier values
			of timing source. Keep in mind that an update is essentially jumping from one movement to another.
			Instead, we might say that the delay wrapper remains consistent with WHAT earlier values WOULD HAVE BEEN, 
			IF THE TIMING SOURCE HAD MADE A JUMP BETWEEN THE SAME TWO MOVEMENTS EARLIER.

			However, with LIVE mode there is an issue
			
			Normal operation is no delay of vector, apply immediately.			
			update vector must be re-evaluated
			example update (0, 1, ts) to update (-delta, 1, ts) 

			This transformation may cause range violation 
			- happens only when timing object is moving.
			- requires range-wrapper logic

			For this reason, the LIVE mode is implemented as independent wrapper type, with implementation based 
			on rangewrapper.
		


		So, DelayWrapper only supports NON-LIVE	
	
	*/

	var DelayWrapper = function (timingObject, delay) {
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delaywrapper pointless");}
		WrapperBase.call(this, timingObject);
		// fixed delay
		this._delay = delay;
	};
	inherit(DelayWrapper, WrapperBase);

	// overrides
	DelayWrapper.prototype._onChange = function (vector) {
		/* 			
			Vector's timestamp always time-shifted (back-dated) by delay

			Normal operation is to delay every incoming vector update.
			This implies returning null to abort further processing at this time,
			and instead trigger a later continuation.

			However, delay is calculated based on the timestamp of the vector (age), not when the vector is 
			processed in this method. So, for small small delays the age of the vector could already be
			greater than delay, indicating that the vector is immediately valid and do not require delayed processing.

			This is particularly true for the first vector, which may be old. 

			So we generally check the age to figure out whether to apply the vector immediately or to delay it.
		*/

		// age of incoming vector
		var age = this.clock.now() - vector.timestamp;
		
		// time-shift vector timestamp
		vector.timestamp += this._delay;

		if (age < this._delay) {
			// apply vector later - abort processing now
			var self = this;
			var delayMillis = (this._delay - age) * 1000;
			setTimeout(function () {
				self._process(vector);
			}, delayMillis);	
			return null;
		}
		// apply vector immediately - continue processing
		return vector;
	};

	DelayWrapper.prototype.update = function (vector) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

	return DelayWrapper;
});