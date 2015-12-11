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
	Local Timing Provider
*/



define(['util/motionutils'], function (motionutils) {

	// Need a polyfill for performance, now as Safari on ios doesn't have it...
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
	   

	var LocalTimingProvider = function (options) {
		options = options || {};
		// range
		this._range = options.range || [-Infinity, Infinity];
		var vector = options.vector || {
			position : 0.0,
			velocity : 0.0,
			acceleration : 0.0,
			timestamp : clock.now() // skew 0
		};	
		// support partial vector in options
		if (vector.position === null || vector.position === undefined) vector.position = 0.0;
		if (vector.velocity === null || vector.velocity === undefined) vector.velocity = 0.0;
		if (vector.acceleration === null || vector.acceleration === undefined) vector.acceleration = 0.0;
		vector = motionutils.checkRange(vector, this._range);

		// callbacks 
		this._callbacks = {'skewchange': [], 'vectorchange': [], 'readystatechange': []};

		// initialise
		this._skew = 0;
		this._vector = vector;
		this._readyState = TimingProviderState.OPEN;
	};

	LocalTimingProvider.prototype._setSkew = function (skew) {
		this._skew = skew;
		this._doCallbacks("skewchange");
	};

	LocalTimingProvider.prototype._setVector = function (vector) {
		this._vector = vector;
		this._doCallbacks("vectorchange");
	};

	// register callback
	LocalTimingProvider.prototype.on = function (what, handler, ctx) {
    	if (!handler || typeof handler !== "function") 
    		throw new Error("Illegal handler");
    	if (!this._callbacks.hasOwnProperty(what)) 
    		throw new Error("Unsupported event " + what);
    	var index = this._callbacks[what].indexOf(handler);
        if (index === -1) {
        	// register handler
        	handler["_ctx_"] = ctx || this;
        	this._callbacks[what].push(handler);
        }
        return this;
    };

	// unregister callback
    LocalTimingProvider.prototype.off = function (what, handler) {
    	if (this._callbacks[what] !== undefined) {
    		var index = this._callbacks[what].indexOf(handler);
        	if (index > -1) {
        		this._callbacks[what].splice(index, 1);
	  		}
    	}
    	return this;
    };

	// perform callback
    LocalTimingProvider.prototype._doCallbacks = function(what, e) {
	 	var err;
		// invoke callback handlers
		this._callbacks[what].forEach(function(h) {
			try {
	          h.call(h["_ctx_"], e);
	        } catch (err) {
	          console.log("Error in " + what + ": " + h + ": " + err);
	        }	    
		}, this);
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
		if (pos === p && vel === v && acc === a) return;
		var newVector = {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
		// break control flow
		var self = this;
		setTimeout(function () {
			self._setVector(newVector);
		});
		return newVector;
	};
	

	Object.defineProperty(LocalTimingProvider.prototype, 'range', {
		get : function () { 
			// copy internal range
			return [this._range[0], this._range[1]];
		}
	});

	Object.defineProperty(LocalTimingProvider.prototype, 'skew', {
		get : function () { return 0.0;}
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