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



define(['util/eventify', 'util/motionutils', 'util/masterclock'], function (eventify, motionutils, MasterClock) {

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


	var TimingBase = function (timingsrc, options) {
		
		this._version = 4;
		this._options = options || {};
	
		// cached vector
		this._vector = {
			position : undefined,
			velocity : undefined,
			acceleration : undefined,
			timestamp : undefined
		};
		
		// cached range
		this._range = null;
		
		// timeout support
		this._timeout = null; // timeoutid for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		// range timeouts off by default
		if (!this._options.hasOwnProperty("timeout")) {
			this._options.timeout = false;
		}

		// readiness
		this._ready = new eventify.EventBoolean(false, {init:true});
		// exported events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)



		this.eventifyDefineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)



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

		READY
	
	*/

	// ready or not
	TimingBase.prototype.isReady = function () {
		return this._ready.value;
	}

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



	/*

		API

	*/

	// version
	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { return this._version; }
	});

	// range
	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () { return [this._range[0], this._range[1]]; }
	});

	// internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {	
			// copy cached vector
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
		get : function () {	return this._timingsrc.clock; }	
	});

	// query
	TimingBase.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._vector, this._timingsrc.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		if (state !== motionutils.RangeState.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this._timingsrc.clock.now());
	};


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
		To be overridden
		get range is useful for setting the range internally,
		when the range depends on the range of an external (upstream)
		timing object. Get range is invoked when first change
		event is received from external object, thereby guaranteeing 
		that range of external timing object is well defined.
		(see _preProcess)
		return correct range [start, end]

		Invoked every time the external object is switched,
		thus it may change.
	*/
	TimingBase.prototype._getRange = function () {
		return this._timingsrc.range;
	};


	/*
		do not override
		Handle incoming vector, from "change" from external object
		or from an internal timeout.
		
		_onChange is invoked allowing subclasses to specify transformation
		on the incoming vector before processing.
	*/
	TimingBase.prototype._preProcess = function (vector) {
		if (this._range === null) {
			this._range = this._getRange();
		}
		var vector = this._onChange(vector);
		this._process(vector);
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
	TimingBase.prototype._onChange = function (vector) {
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
			if (old_vector === null) {
				this._ready.value = true;
			}
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
	 		this._timeout = this._timingsrc.clock.setTimeout(function () {
				self._process(self._onTimeout(vector));
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
		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype._onTimeout = function (vector) {		
		return motionutils.checkRange(vector, this._range);
	};



/*
		INTERNAL PROVIDER
	
		Timing provider internal to the browser context

		Used by timing objects by default if timingsrc is not specified.
	*/

	var InternalProvider = function (options) {
		TimingBase.call(this);
		options = options || {};
		// initialise internal state
		this._clock = new MasterClock({skew:0});
		// todo - check option.range
			
		// events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:false}); // define vector change event (not supporting init-event)

		// set initial vector if provided
		if (options.vector) {
			this.update(options.vector);
		}
	};
	inherit(InternalProvider, TimingBase);


	InternalProvider.prototype.update = function (vector) {
		if (vector == undefined) {throw new Error ("drop update, illegal updatevector");}

		// todo - check that vector is numbers
		var pos = vector.position;
		var vel = vector.velocity;
		var acc = vector.acceleration;

		if (pos == undefined && vel == undefined && acc == undefined) {
			throw new Error ("drop update, noop");
		}

		var now = vector.timestamp || clock.now();
		var nowVector = motionutils.calculateVector(this._vector, now);
		nowVector = motionutils.checkRange(nowVector, this._range);
		var p = nowVector.position;
		var v = nowVector.velocity;
		var a = nowVector.acceleration;
		pos = (pos != undefined) ? pos : p;
		vel = (vel != undefined) ? vel : v;
		acc = (acc != undefined) ? acc : a;
		var newVector = {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
		// break control flow
		this._preProcess(newVector)
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

	var ExternalProvider = function (provider) {
		TimingBase.call(this);

		this._provider = provider;
		this._clock;


		// register event handlers
		var self = this;
		this._provider.on("vectorchange", function () {self._onVectorChange();});
		this._provider.on("skewchange", function () {self._onSkewChange();});


		// check if provider is ready immediately
		if (this._provider.skew != undefined) {
			var self = this;
			Promise.resolve(function () {
				self._onSkewChange();
			});
		}
	};
	inherit(ExternalProvider, TimingBase);


	ExternalProvider.prototype._onSkewChange = function () {
		if (!this._clock) {
			this._clock = new MasterClock({skew: this._provider.skew});
		} else {
			this._clock.adjust({skew: this._provider.skew});
		}
		if (this._provider.vector != undefined) {
			// just became ready
			this._ready.value = true;
			this.preProcess(this._provider.vector);
			this.eventifyTriggerEvent("change");
		}		
	};

	ExternalProvider.prototype._onVectorChange = function () {
		if (this._ready.value === false && this._clock) {
			// just became ready
			this._ready.value = true;
		}
		if (this._ready.value === true) {
			this.eventifyTriggerEvent("change");
		}
	};

	// update
	ExternalProvider.prototype.update = function (vector) {
		return this._provider.update(vector);
	};





	/*

		TIMING OBJECT

	*/

	var TimingObject = function (timingsrc) {
		TimingBase.call(this);

		/*
			store a wrapper function on the instance used as a callback handler from timingsrc
			(if this was a prototype function - it would be shared by multiple objects thus
			prohibiting them from subscribing to the same timingsrc)
		*/
		var self = this;
		this._internalOnChange = function () {
			var vector = self.timingsrc.vector;
			self._preProcess(vector);
		};

		// timingsrc
		this.timingsrc = timingsrc;
	};
	inherit(TimingObject, TimingBase);



	// update
	TimingObject.prototype.update = function (vector) {
		return this._timingsrc.update(vector);
	};


	/*

		TIMINGSRC

	*/
	Object.defineProperty(TimingObject.prototype, 'timingsrc', {
		get : function () {return this._timingsrc;},
		set : function (timingsrc) {
			// transformation when new timingsrc is ready
			var self = this;
			// check type of new timingsrc
			if (!timingsrc) {
				if (this._timingsrc) {
					var vector = this._timingsrc.vector;
					timingsrc = new InternalProvider({vector: vector});
				} else {
					timingsrc = new InternalProvider();
				}
			} else if (!timingsrc instanceof TimingObject) {
				// external provider - try to wrap it
				timingsrc = new ExternalProvider(timingsrc); 
			}
			// doing the switch
			timingsrc.ready.then(function (){
				// disconnect and clean up timingsrc
				if (self._timingsrc) {
					self._timingsrc.off("change", self._internalOnChange);
					self._clearTimeout();
					clearTimeout(self._tid);
				}
				this._timingsrc = timingsrc;
				this._timingsrc.on("change", this._internalOnChange);		
			})		
		}
	});

	
	// module
	return {
		TimingObject : TimingObject
	};
});


