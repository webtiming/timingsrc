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


define(['util/motionutils', 'util/eventutils'], function (motionutils, eventutils) {

	// Polyfill for performance.now as Safari on ios doesn't have it...
	(function(){
	    if ("performance" in window === false) {
	        window.performance = {};
	        window.performance.offset = new Date().getTime();
	    }
	    if ("now" in window.performance === false){
	      window.performance.now = function now(){
	        return new Date().getTime() - window.performance.offset;
	      };
	    }
 	})();

	// local clock in seconds
 	var clock = { now : function () {
		return performance.now()/1000.0;}
	}; 

	// readystates
	var TimingProviderState = Object.freeze({
	    CONNECTING :"connecting",
	    OPEN : "open",
	    CLOSING : "closing",
    	CLOSED : "closed"
	});
	

	/*
		LOCAL TIMING Provider

		Used by timing object if no timing provider is specified.
	*/

	var LocalTimingProvider = function (options) {
		options = options || {};
		// initialise internal state
		this._range = options.range || [-Infinity, Infinity];
		this._vector = {
			position : 0.0,
			velocity : 0.0,
			acceleration : 0.0,
			timestamp : clock.now() // skew 0
		};
		this._skew = 0;
		this._readyState = TimingProviderState.OPEN;
		// events
		eventutils.eventify(this, LocalTimingProvider.prototype);
		this.eventifyDefineEvent("vectorchange", {init:false}); // define vector change event (not supporting init-event)
		this.eventifyDefineEvent("skewchange", {init:false}); // define skew change event (not supporting init-event) 
		this.eventifyDefineEvent("readystatechange", {init:false}) // define readystatechange event (not supporting init-event)

		// set initial vector if provided
		if (options.vector) {
			this.update(options.vector);
		}
	};

	LocalTimingProvider.prototype._setSkew = function (skew) {
		this._skew = skew;
		this.eventifyTriggerEvent("skewchange");
		//this._doCallbacks("skewchange");
	};

	LocalTimingProvider.prototype._setVector = function (vector) {
		this._vector = vector;
		this.eventifyTriggerEvent("vectorchange");
		//this._doCallbacks("vectorchange");
	};

	LocalTimingProvider.prototype.update = function (vector) {
		if (!this._clock === null) throw new Error ("timing provider not ready to accept update");
		if (vector === undefined || vector === null) {throw new Error ("drop update, illegal updatevector");}

		var pos = (vector.position === undefined || vector.position === null) ? undefined : vector.position;
		var vel = (vector.velocity === undefined || vector.velocity === null) ? undefined : vector.velocity;
		var acc = (vector.acceleration === undefined || vector.acceleration === null) ? undefined : vector.acceleration;

		if (pos === undefined && vel === undefined && acc === undefined) {
			throw new Error ("drop update, noop");
		}

		var now = vector.timestamp || clock.now();
		var nowVector = motionutils.calculateVector(this._vector, now);
		nowVector = motionutils.checkRange(nowVector, this._range);
		var p = nowVector.position;
		var v = nowVector.velocity;
		var a = nowVector.acceleration;
		pos = (pos !== undefined) ? pos : p;
		vel = (vel !== undefined) ? vel : v;
		acc = (acc !== undefined) ? acc : a;
		var newVector = {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
		this._setVector(newVector);
		return newVector;
	};
	

	Object.defineProperty(LocalTimingProvider.prototype, 'range', {
		get : function () { 
			// copy internal range
			return [this._range[0], this._range[1]];
		}
	});

	Object.defineProperty(LocalTimingProvider.prototype, 'skew', {
		get : function () { return this._skew;}
	});

	Object.defineProperty(LocalTimingProvider.prototype, 'vector', {
		get : function () { return this._vector; }
	});

	Object.defineProperty(LocalTimingProvider.prototype, 'readyState', {
		get : function () { return this._readyState; }
	});

	return {
		LocalTimingProvider: LocalTimingProvider,
		TimingProviderState : TimingProviderState
	};
});