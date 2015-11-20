
/*
  Written by Ingar Arntzen, Norut

	TimingBase defines base classes for TimingObject and TimingWrappers.
	It makes use of eventutil.js for event stuff, including immediate events.
	It makes use of motionutils.js for calculations. 
*/

define(['util/eventutils', 'util/motionutils'], function (eventutils, motionutils) {

	'use strict';

	//	STATE is used for managing/detecting range violations.
	var STATE = Object.freeze({
	    INIT : "init",
	    INSIDE: "inside",
	    OUTSIDE_LOW: "outsidelow",
	    OUTSIDE_HIGH: "outsidehigh"
	});

	// Utility inheritance function.
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


	// TIMING BASE
	/*
		Base class for TimingObject and WrapperBase

		essential internal state
		- range, vector
	
		external methods
		query, update

		event stuff from eventutils
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
		by subclasses
	*/


	var TimingBase = function (options) {
		this._version = 3;
		// options
		this._options = options || {};
		// range timeouts off by default
		if (!this._options.hasOwnProperty("timeout")) {
			this._options.timeout = false;
		}
		// cached vector
		this._vector = null;
		// cached range
		this._range = null;
		// timeout support
		this._timeout = null; // timeout for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		// event support
		eventutils.eventify(this, TimingBase.prototype);
		this._defineEvent("change", {init:true}); // define change event (supporting init-event)
		this._defineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)
	};


	// Accessors 

	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { 
			return this._version;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () {
			if (this._range === null) return null;
			// copy internal range
			return [this._range[0], this._range[1]];
		}
	});

	// Accessor internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {	
			if (this._vector === null) return null;
			// copy cached vector
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
		}
	});

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	TimingBase.prototype._makeInitEvents = function (type) {
		var res = this.query();
		if (type === "change") {
			return (res !== null) ? [undefined] : []; 
		} else if (type === "timeupdate") {
			return (res !== null) ? [undefined] : []; 
		}
		return [];
	};

	/*
		overrides how event callbacks are delivered 
		- i.e. how many parameters, only one parameter - e
		specific to eventutils
	*/
	TimingBase.prototype._callbackFormatter = function (type, e, eInfo) { return [e];};


	/*
		Basic query. Insensitive to range violations.
		Must be overrided by subclasses with specified range.
	*/
	TimingBase.prototype.query = function () {
		if (this.vector === null) return null;
		return motionutils.calculateVector(this.vector);
	};

	// to be overridden
	TimingBase.prototype.update = function (vector) {};

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
		thus is may change.
	*/
	TimingBase.prototype._getRange = function () {return null;};



	// CHANGE EVENTS


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
		to be ovverridden
		specify transformation
		on the incoming vector before processing.
		useful for wrappers that do mathematical transformations,
		or as a way to enforse range restrictions.
		invoming vectors from external change events or internal
		timeout events

		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype._onChange = function (vector) {
		return vector;
	};
	
	// TIMEOUTS
	// Use range to implement timeouts on range violation

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
	 		this._timeout = {vector:vector};
	 		this._internalTimeout();
		}
	};

	/*
		to be overridden
		must be implemented by subclass if range timeouts are required
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.
	*/
	TimingBase.prototype._calculateTimeoutVector = function () {
		return null;
	};

	/*
		do not override
		internal utility function for clearing vector timeout
	*/
	TimingBase.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			clearTimeout(this._timeout.tid);
			this._timeout = null;
		}
	};

	/*
		do not override
		Internal handler for vector timeouts
		guarantee that timeouts are not delivered too soon.

	*/
	TimingBase.prototype._internalTimeout = function () {
		if (this._timeout === null) return;
		// ensure that timeout does not fire to early
		var vector = this._timeout.vector;
		var early = vector.timestamp - motionutils.secClock();
		if (early > 0.0) {
			var self = this;
			this._timeout.tid = setTimeout(function () {
				self._internalTimeout();
			}, early*1000);
			return;
		}
		vector = this._onTimeout(vector);
		this._process(vector);
	};

	/*
		to be overridden
		subclass may implement transformation on timeout vector
		before it is given to process.
		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype._onTimeout = function (vector) {
		return vector;
	};

	// PROCESS
	/*
		do not override
		Core processing step after change event or timeout
		assignes the internal vector
	*/
	TimingBase.prototype._process = function (vector) {
		if (vector !== null) {
			// update internal vector
			this._vector = vector;
			// trigger events
			this._postProcess(this.vector);
		}
		// renew timeout
		this._renewTimeout();
	};

	/*
		may be overridden
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events 
		need to be suppressed,
	*/
	TimingBase.prototype._postProcess = function (vector) {
		// trigger change events
		this._triggerEvent("change");
		// trigger timeupdate events
		this._triggerEvent("timeupdate");
		var moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
		if (moving && this._tid === null) {
			var self = this;
			this._tid = setInterval(function () {
				self._triggerEvent("timeupdate");
			}, 200);
		} else if (!moving && this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
		}
	};


	/*
		do not override
		Given a snapshot vector, the internal range is used to 
		calculate the correct STATE (INSIDE|OUTSIDE)
	*/
	TimingBase.prototype._getCorrectRangeState = function (vector) {
		var p = vector.position,
			v = vector.velocity,
			a = vector.acceleration;
		if (p > this._range[1]) return STATE.OUTSIDE_HIGH;
		if (p < this._range[0]) return STATE.OUTSIDE_LOW;
		// corner cases
		if (p === this._range[1]) {
			if (v > 0.0) return STATE.OUTSIDE_HIGH;
			if (v === 0.0 && a > 0.0) return STATE.OUTSIDE_HIGH;
		} else if (p === this._range[0]) {
		    if (v < 0.0) return STATE.OUTSIDE_LOW;
		    if (v == 0.0 && a < 0.0) return STATE.OUTSIDE_HIGH;
		}
		return STATE.INSIDE;
	};

	/*
		do not override
		Given a snapshot vector, the range is used to 
		calculate the correct STATE (INSIDE|OUTSIDE)
		and change the vector by stopping motion
		if range restrictions are violated (OUTSIDE).
		thus guraranteeing that the returned vector is 
		INSIDE
	*/
	TimingBase.prototype._checkRange = function (vector) {
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			// protect from range violation
			vector.velocity = 0.0;
			vector.acceleration = 0.0;
			if (state === STATE.OUTSIDE_HIGH) {
				vector.position = this._range[1];
			} else vector.position = this._range[0];
		}
		return vector;
	};


	// WRAPPER BASE

	/*
		WrapperBase extends TimingBase to provide a
		base class for chainable wrappers/emulators of timing objects
		WrapperBase conceptually add the notion of a timing source,
		a pointer to a timing object up the chain. Change events 
		may be received from the timing object, and update requests 
		are forwarded in the opposite direction. 
	*/


	var WrapperBase = function (timingObject, options) {
		TimingBase.call(this, options);
		// timing source
		this._timingsrc = null;	
		// set timing source
		this.timingsrc = timingObject;
	};
	inherit(WrapperBase, TimingBase);

	/*
		Accessor for timingsrc.
		Supports dynamic switching of timing source by assignment.
	*/
	Object.defineProperty(WrapperBase.prototype, 'timingsrc', {
		get : function () {return this._timingsrc;},
		set : function (timingObject) {
			if (this._timingsrc) {
				this._timingsrc.off("change", this._preProcessWrapper);
			}
			// reset internal state
			this._range = null;
			this._vector = null;
			this._clearTimeout();
			clearTimeout(this._tid);
			this._timingsrc = timingObject;
			this._timingsrc.on("change", this._preProcessWrapper, this);
		}
	});

	/*
		to be overridden
		default forwards update request to timingsrc unchanged.
	*/
	WrapperBase.prototype.update = function (p, v, a) {
		return this.timingsrc.update(p,v,a);
	};

	/*
		to be overridden
		by default the wrapper adopts the range of timingsrc 
	*/
	WrapperBase.prototype._getRange = function () {
		return this.timingsrc.range;
	};

	/*
		not to be overridden
		event handler for "change" events on the timingsrc.
		fetches initial vector from timingsrc and dispatches
		it to preProcess() 
	*/
	WrapperBase.prototype._preProcessWrapper = function () {
		var vector = this.timingsrc.vector;
		this._preProcess(vector);
	};

	return {
		TimingBase : TimingBase,
		WrapperBase : WrapperBase,
		STATE : STATE,
		inherit: inherit,
		motionutils : motionutils
	};
});


