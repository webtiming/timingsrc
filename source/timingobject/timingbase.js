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
	TimingBase defines base classes for TimingObject and ConverterBase used to implement timing converters.
	It makes use of eventutils for event stuff, including immediate events.
	It makes use of motionutils for timing calculations. 
*/

define(['util/eventutils', 'util/motionutils'], function (eventutils, motionutils) {

	'use strict';

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
		Base class for TimingObject and ConverterBase

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
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)


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

	// Shorthand accessors
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
	  	overrides how immediate events are constructed
	  	specific to eventutils
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	TimingBase.prototype.eventifyMakeInitEvents = function (type) {
		var res = this.query();
		if (type === "change") {
			return (res !== null) ? [{type: type, e: undefined}] : []; 
		} else if (type === "timeupdate") {
			return (res !== null) ? [{type:type, e: undefined}] : []; 
		}
		return [];
	};

	/*
		Basic query. Insensitive to range violations.
		Must be overrided by subclasses with specified range.
	*/
	TimingBase.prototype.query = function () {
		if (this.vector === null) return null;
		return motionutils.calculateVector(this.vector, this.clock.now());
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
		useful for Converters that do mathematical transformations,
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
			var now = this.clock.now();
	 		var secDelay = vector.timestamp - now;
	 		var self = this;
	 		this._timeout = this.clock.setTimeout(function () {
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
		return null;
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


	// CONVERTER BASE

	/*
		ConverterBase extends TimingBase to provide a
		base class for chainable Converters/emulators of timing objects
		ConverterBase conceptually add the notion of a timing source,
		a pointer to a timing object up the chain. Change events 
		may be received from the timing object, and update requests 
		are forwarded in the opposite direction. 
	*/


	var ConverterBase = function (timingObject, options) {
		TimingBase.call(this, options);
		// timing source
		this._timingsrc = null;	

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

		// set timing source
		this.timingsrc = timingObject;
	};
	inherit(ConverterBase, TimingBase);


	// Accessor internal clock
	Object.defineProperty(ConverterBase.prototype, 'clock', {
		get : function () {	return this.timingsrc.clock; }	
	});

	/*
		Accessor for timingsrc.
		Supports dynamic switching of timing source by assignment.
	*/
	Object.defineProperty(ConverterBase.prototype, 'timingsrc', {
		get : function () {return this._timingsrc;},
		set : function (timingObject) {
			if (this._timingsrc) {
				this._timingsrc.off("change", this._internalOnChange, this);
			}
			// reset internal state
			this._range = null;
			this._vector = null;
			this._clearTimeout();
			clearTimeout(this._tid);
			this._timingsrc = timingObject;
			this._timingsrc.on("change", this._internalOnChange, this);
		}
	});

	/*
		to be overridden
		default forwards update request to timingsrc unchanged.
	*/
	ConverterBase.prototype.update = function (vector) {
		return this.timingsrc.update(vector);
	};

	/*
		to be overridden
		by default the Converter adopts the range of timingsrc 
	*/
	ConverterBase.prototype._getRange = function () {
		return this.timingsrc.range;
	};

	// module
	return {
		TimingBase : TimingBase,
		ConverterBase : ConverterBase,
		inherit: inherit,
		motionutils : motionutils
	};
});


