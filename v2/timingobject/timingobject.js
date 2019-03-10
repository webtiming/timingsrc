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



define(['../util/eventify', '../util/motionutils', '../util/masterclock'], function (eventify, motionutils, MasterClock) {

	'use strict';

	// Utility inheritance function.
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


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

	
	/*
		TIMING BASE

		abstract base class for objects that may be used as timingsrc

		essential internal state
		- range, vector
	
		external methods
		query, update

		events
		on/off "change", "timeupdate"
		
		internal methods for range timeouts
		
		defines internal processing steps
		- preProcess(vector) <- from external timingobject
			- vector = onChange(vector)
			- process(vector) <- from timeout or preProcess
		- process (vector) 
			- set internal vector
			- postProcess(vector)
			- renew range timeout
		- postprocess (vector)
			- emit change event and timeupdate event
			- turn periodic timeupdate on or off
	
		individual steps in this structure may be specialized
		by subclasses (i.e. timing converters)
	*/


	var TimingBase = function (options) {

		this._options = options || {};

		// cached vector
		this._vector = {
			position : undefined,
			velocity : undefined,
			acceleration : undefined,
			timestamp : undefined
		};
		
		// cached range
		this._range = [undefined,undefined];

		// readiness
		this._ready = new eventify.EventBoolean(false, {init:true});
		
		// exported events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)

		// timeout support
		this._timeout = null; // timeoutid for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		if (!this._options.hasOwnProperty("timeout")) {
			// range timeouts off by default
			this._options.timeout = false;
		}
	};
	eventify.eventifyPrototype(TimingBase.prototype);


	/*

		EVENTS

	*/

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
	  	- overrides to add support for timeupdate events
	*/
	TimingBase.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return (this._ready.value === true) ? [undefined] : []; 
		} else if (type === "timeupdate") {
			return (this._ready.value === true) ? [undefined] : []; 
		} 
		return [];
	};


	/*

		API

	*/

	// version
	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { return this._version; }
	});

	// ready or not
	TimingBase.prototype.isReady = function () {
		return this._ready.value;
	};

	// ready promise
	Object.defineProperty(TimingBase.prototype, 'ready', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready.value === true) {
					resolve();
				} else {
					var onReady = function () {
						if (self._ready.value === true) {
							self._ready.off("change", onReady);
							resolve();
						}
					};
					self._ready.on("change", onReady);
				}
			});
		}
	});

	// range
	
	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () { 
			// copy range
			return [this._range[0], this._range[1]]; 
		}
	});
	

	// internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {
			// copy vector
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
		}
	});

	// internal clock
	Object.defineProperty(TimingBase.prototype, 'clock', {
		get : function () {	throw new Error ("not implemented") }	
	});

	// query
	TimingBase.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};

	// update - to be ovverridden
	TimingBase.prototype.update = function (vector) {
		throw new Error ("not implemented");
	};

	TimingBase.prototype.checkUpdateVector = function(vector) {
		if (vector == undefined) {
			throw new Error ("drop update, illegal updatevector");
		}

		// todo - check that vector properties are numbers
		var pos = vector.position;
		var vel = vector.velocity;
		var acc = vector.acceleration;

		if (pos == undefined && vel == undefined && acc == undefined) {
			throw new Error ("drop update, noop");
		}

		// default values
		var p = 0, v = 0, a = 0;
		var now = vector.timestamp || this.clock.now();
		if (this.isReady()) {
			var nowVector = motionutils.calculateVector(this._vector, now);
			nowVector = motionutils.checkRange(nowVector, this._range);
			p = nowVector.position;
			v = nowVector.velocity;
			a = nowVector.acceleration;
		} 

		pos = (pos != undefined) ? pos : p;
		vel = (vel != undefined) ? vel : v;
		acc = (acc != undefined) ? acc : a;
		return {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
	} 


	// shorthand accessors
	Object.defineProperty(TimingBase.prototype, 'pos', {
		get : function () {
			return this.query().position;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'vel', {
		get : function () {
			return this.query().velocity;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'acc', {
		get : function () {
			return this.query().acceleration;
		}
	});


	/*

		INTERNAL METHODS

	*/


	/*
		do not override
		Handle incoming vector, from "change" from external object
		or from an internal timeout.
		
		onVectorChange is invoked allowing subclasses to specify transformation
		on the incoming vector before processing.
	*/
	TimingBase.prototype._preProcess = function (vector) {
		vector = this.onVectorChange(vector);
		this._process(vector);
	};


	// may be overridden by subclsaa
	TimingBase.prototype.onRangeChange = function (range) {
		return range;
	};

	/*
		specify transformation
		on the incoming vector before processing.
		useful for Converters that do mathematical transformations,
		or as a way to enforse range restrictions.
		invoming vectors from external change events or internal
		timeout events

		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype.onVectorChange = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};

	/*
		core processing step after change event or timeout
		assignes the internal vector
	*/
	TimingBase.prototype._process = function (vector) {
		if (vector !== null) {
			var old_vector = this._vector;
			// update internal vector
			this._vector = vector;
			// trigger events
			this._ready.value = true;
			this._postProcess(this._vector);
		}
		// renew timeout
		this._renewTimeout();
	};

	/*
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events 
		need to be suppressed,
	*/
	TimingBase.prototype._postProcess = function (vector) {
		// trigger change events
		this.eventifyTriggerEvent("change");
		// trigger timeupdate events
		this.eventifyTriggerEvent("timeupdate");
		var moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
		if (moving && this._tid === null) {
			var self = this;
			this._tid = setInterval(function () {
				self.eventifyTriggerEvent("timeupdate");
			}, 200);
		} else if (!moving && this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
		}
	};


	/*

		TIMEOUTS
	
	*/

	/*
		do not override
		renew timeout is called during evenry processing step
		in order to recalculate timeouts.
		the calculation may be specialized in
		_calculateTimeoutVector
	*/
	TimingBase.prototype._renewTimeout = function () {
		if (this._options.timeout === true) {
			this._clearTimeout();
			var vector = this._calculateTimeoutVector();
			if (vector === null) {return;}
			var now = this.clock.now();
	 		var secDelay = vector.timestamp - now;
	 		var self = this;
	 		this._timeout = this.clock.setTimeout(function () {
				self._process(self.onTimeout(vector));
	      	}, secDelay, {anchor: now, early: 0.005}); 
		}
	};

	/*
		to be overridden
		must be implemented by subclass if range timeouts are required
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.
	*/
	TimingBase.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this._range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		if (deltaSec === Infinity) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	/*
		do not override
		internal utility function for clearing vector timeout
	*/
	TimingBase.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	/*
		to be overridden
		subclass may implement transformation on timeout vector
		before it is given to process.
		returning null stops further processing, except renewtimeout 
	*/
	TimingBase.prototype.onTimeout = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};




	/*
		INTERNAL PROVIDER
	
		Timing provider internal to the browser context

		Used by timing objects as timingsrc if no timingsrc is specified.
	*/

	var InternalProvider = function (options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this, options);

		// initialise internal state
		this._clock = new MasterClock({skew:0});
		// range
		this._range = this._options.range || [-Infinity, Infinity];
		// vector
		var vector = this._options.vector || {
			position : 0,
			velocity : 0,
			acceleration : 0
		};
		this.update(vector);
	};
	inherit(InternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(InternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// update
	InternalProvider.prototype.update = function (vector) {
		var newVector = this.checkUpdateVector(vector);
		this._preProcess(newVector);
		return newVector;
	};
	

	/*
		EXTERNAL PROVIDER

		External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
		and the TIMINGSRC API

		Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

		- wraps a timing provider external 
		- handles some complexity that arises due to the very simple API of providers
		- implements a clock for the provider
	*/


	// Need a polyfill for performance,now as Safari on ios doesn't have it...

	// local clock in seconds
	var local_clock = {
		now : function () {return performance.now()/1000.0;}
	}; 

	var ExternalProvider = function (provider, options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this);

		this._provider = provider;
		
		this._provider_clock; // provider clock (may fluctuate based on live skew estimates)
		/* 
			local clock
			provider clock normalised to values of performance now
			normalisation based on first skew measurement, so 
		*/
		this._clock; 


		// register event handlers
		var self = this;
		this._provider.on("vectorchange", function () {self._onVectorChange();});
		this._provider.on("skewchange", function () {self._onSkewChange();});

		// check if provider is ready
		if (this._provider.skew != undefined) {
			var self = this;
			Promise.resolve(function () {
				self._onSkewChange();
			});
		}
	};
	inherit(ExternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(ExternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// internal provider object
	Object.defineProperty(ExternalProvider.prototype, 'provider', {
		get : function () {	return this._provider; }	
	});

	ExternalProvider.prototype._onSkewChange = function () {
		if (!this._clock) {
			this._provider_clock = new MasterClock({skew: this._provider.skew});
			this._clock = new MasterClock({skew:0});
		} else {			
			this._provider_clock.adjust({skew: this._provider.skew});
			// provider clock adjusted with new skew - correct local clock similarly
			// current_skew = clock_provider - clock_local
			var current_skew = this._provider_clock.now() - this._clock.now();
			// skew delta = new_skew - current_skew
			var skew_delta = this._provider.skew - current_skew;
			this._clock.adjust({skew: skew_delta});
		}
		if (!this.isReady() && this._provider.vector != undefined) {
			// just became ready (onVectorChange has fired earlier)
			this._range = this._provider.range;
			this._preProcess(this._provider.vector);
		}		
	};

	ExternalProvider.prototype._onVectorChange = function () {
		if (this._clock) {
			// is ready (onSkewChange has fired earlier)
			if (!this._range) {
				this._range = this._provider.range;
			}
			this._preProcess(this._provider.vector);
		}
	};


	/*
		- local timestamp of vector is set for each new vector, using the skew available at that time
		- the vector then remains unchanged
		- skew changes affect local clock, thereby affecting the result of query operations

		- one could imagine reevaluating the vector as well when the skew changes, 
			but then this should be done without triggering change events

		- ideally the vector timestamp should be a function of the provider clock  

	*/



	// 	override timing base to recalculate timestamp
	ExternalProvider.prototype.onVectorChange = function (provider_vector) {
		// local_ts = provider_ts - skew
		var local_ts = provider_vector.timestamp - this._provider.skew;
		return {
			position : provider_vector.position,
			velocity : provider_vector.velocity,
			acceleration : provider_vector.acceleration,
			timestamp : local_ts
		}
	};


	// update
	ExternalProvider.prototype.update = function (vector) {
		return this._provider.update(vector);
	};



	/*

		TIMING OBJECT BASE

	*/

	var TimingObjectBase = function (timingsrc, options) {
		TimingBase.call(this, options);
		this._version = 4;
		/*
			store a wrapper function used as a callback handler from timingsrc
			(if this was a prototype function - it would be shared by multiple objects thus
			prohibiting them from subscribing to the same timingsrc)
		*/
		var self = this;
		this._internalOnChange = function () {
			var vector = self._timingsrc.vector;
			self._preProcess(vector);
		};
		this._timingsrc = undefined;
		this.timingsrc = timingsrc;
	};
	inherit(TimingObjectBase, TimingBase);


	// attach inheritance function on base constructor for convenience
	TimingObjectBase.inherit = inherit;

	// internal clock
	Object.defineProperty(TimingObjectBase.prototype, 'clock', {
		get : function () {	return this._timingsrc.clock; }	
	});

	TimingObjectBase.prototype.onRangeChange = function (range) {
		return range;
	};

	// invoked just after timingsrc switch 
	TimingObjectBase.prototype.onSwitch = function () {
	};


	/*

		timingsrc property and switching on assignment

	*/
	Object.defineProperty(TimingObjectBase.prototype, 'timingsrc', {
		get : function () {
			if (this._timingsrc instanceof InternalProvider) {
				return undefined
			} else if (this._timingsrc instanceof ExternalProvider) {
				return this._timingsrc.provider;
			} else {
				return this._timingsrc;
			}
		},
		set : function (timingsrc) {
			// new timingsrc undefined		
			if (!timingsrc) {
				var options;
				if (!this._timingsrc) {
					// first time - use options
					options = {
						vector : this._options.vector,
						range : this._options.range
					}
				} else {
					// not first time - use current state
					options = {
						vector : this._vector,
						range : this._range
					} 
				}
				timingsrc = new InternalProvider(options);
			}
			else if ((timingsrc instanceof TimingObjectBase) === false) {
				// external provider - try to wrap it
				try {
					timingsrc = new ExternalProvider(timingsrc); 
				} catch (e) {
					console.log(timingsrc);
					throw new Error ("illegal timingsrc - not instance of timing object base and not timing provider");
				}
			}
			// transformation when new timingsrc is ready
			var self = this;
			var doSwitch = function () {
				// disconnect and clean up timingsrc
				if (self._timingsrc) {
					self._timingsrc.off("change", self._internalOnChange);
				}
				self._timingsrc = timingsrc;
				if (self._timingsrc.range !== self._range) {
					self._range = self.onRangeChange(self._timingsrc.range);
				}
				self.onSwitch();
				self._timingsrc.on("change", self._internalOnChange);	
			};
			if (timingsrc.isReady()) {
				doSwitch();
			} else {
				timingsrc.ready.then(function (){
					doSwitch();
				});
			}
		}
	});

	// update
	TimingObjectBase.prototype.update = function (vector) {
		return this._timingsrc.update(vector);
	};
	

	/*
		Timing Object
	*/
	var TimingObject = function (options) {
		options = options || {};
		var timingsrc = options.timingsrc || options.provider;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(TimingObject, TimingObjectBase);

	// module
	return {
		InternalProvider : InternalProvider,
		ExternalProvider : ExternalProvider,
		TimingObjectBase : TimingObjectBase,
		TimingObject : TimingObject
	};
});


