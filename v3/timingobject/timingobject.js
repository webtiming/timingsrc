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
	const local_clock = {
		now : function () {return performance.now()/1000.0;}
	};


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


	class TimingBase {

		constructor (options) {

			this._options = options || {};

			// cached vectors
			this._old_vector;
			this._vector = {
				position : undefined,
				velocity : undefined,
				acceleration : undefined,
				timestamp : undefined
			};

			// support update promise
			this._event_variables = [];

			// cached range
			this._range = [undefined,undefined];

			// readiness
			this._ready = new eventify.EventBoolean();

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



		/*

			EVENTS

		*/

		/*
		  	overrides how immediate events are constructed
		  	specific to eventutils
		  	- overrides to add support for timeupdate events
		*/
		eventifyInitEventArg = function (name) {
			if (name === "change") {
				return [this._ready.value, undefined];
			} else if (name === "timeupdate") {
				return [this._ready.value, undefined];
			}
		};

		/*

			API

		*/

		// version
		get version () {return this._version;};

		// ready or not
		isReady() {return this._ready.value;};

		// ready promise
        get ready() {return eventify.makePromise(this._ready);};

        // range
        get range() {
        	// copy
        	return [this._range[0], this._range[1]];
        };

        // vector
        get vector() {
        	// copy
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
        };

        // old vector
        get old_vector() {return this._old_vector;};

        // delta
        get delta() {
        	return new motionutils.MotionDelta(this._old_vector, this._vector);
        }

        // clock - to be overridden
        get clock() {
        	throw new Error ("not implemented");
        }

		// query
		query() {
			if (this._ready.value === false)  {
				return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
			}
			// reevaluate state to handle range violation
			let vector = motionutils.calculateVector(this._vector, this.clock.now());
			let state = motionutils.correctRangeState(vector, this._range);
			// detect range violation - only if timeout is set
			if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
				this._preProcess(vector);
			}
			// re-evaluate query after state transition
			return motionutils.calculateVector(this._vector, this.clock.now());
		};

		// shorthand query
		get pos() {return this.query().position;};
		get vel() {return this.query().velocity;};
		get acc() {return this.query().acceleration;};

		// update - to be ovverridden
		update(vector) {
			throw new Error ("not implemented");
		};

		// update - check input vector
		checkUpdateVector(vector) {
			if (vector == undefined) {
				throw new Error ("drop update, illegal updatevector");
			}

			// todo - check that vector properties are numbers
			let pos = vector.position;
			let vel = vector.velocity;
			let acc = vector.acceleration;

			if (pos == undefined && vel == undefined && acc == undefined) {
				throw new Error ("drop update, noop");
			}

			// default values
			let p = 0, v = 0, a = 0;
			let now = vector.timestamp || this.clock.now();
			if (this.isReady()) {
				let nowVector = motionutils.calculateVector(this._vector, now);
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
		_preProcess(vector) {
			vector = this.onVectorChange(vector);
			this._process(vector);
		};


		// may be overridden by subclsaa
		onRangeChange(range) {
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
		onVectorChange(vector) {
			return motionutils.checkRange(vector, this._range);
		};

		/*
			core processing step after change event or timeout
			assignes the internal vector
		*/
		_process(vector) {
			if (vector !== null) {
				this._old_vector = this._vector;
				// update internal vector
				this._vector = vector;
				// trigger events
				this._ready.value = true;
				// unlock update promises
				this._event_variables.forEach(function(event) {
					event.set(true);
				});
				this._event_variables = [];
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
		_postProcess(vector) {
			// trigger change events
			this.eventifyTriggerEvent("change");
			// trigger timeupdate events
			this.eventifyTriggerEvent("timeupdate");
			let moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
			if (moving && this._tid === null) {
				let self = this;
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
		_renewTimeout() {
			if (this._options.timeout === true) {
				this._clearTimeout();
				let vector = this._calculateTimeoutVector();
				if (vector === null) {return;}
				let now = this.clock.now();
		 		let secDelay = vector.timestamp - now;
		 		let self = this;
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
		_calculateTimeoutVector() {
			let freshVector = this.query();
			let res = motionutils.calculateDelta(freshVector, this._range);
			let deltaSec = res[0];
			if (deltaSec === null) return null;
			if (deltaSec === Infinity) return null;
			let position = res[1];
			let vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
			vector.position = position; // avoid rounding errors
			return vector;
		};

		/*
			do not override
			internal utility function for clearing vector timeout
		*/
		_clearTimeout() {
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
		onTimeout(vector) {
			return motionutils.checkRange(vector, this._range);
		};
	}

	eventify.eventifyPrototype(TimingBase.prototype);

	/*
		INTERNAL PROVIDER

		Timing provider internal to the browser context

		Used by timing objects as timingsrc if no timingsrc is specified.
	*/

	class InternalProvider extends TimingBase {

		constructor (options) {
			options = options || {};
			options.timeout = true;
			super(options);
			// initialise internal state
			this._clock = new MasterClock({skew:0});
			// range
			this._range = this._options.range || [-Infinity, Infinity];
			// vector
			let vector = this._options.vector || {
				position : 0,
				velocity : 0,
				acceleration : 0
			};
			// initialise state
			this._vector = this.checkUpdateVector(vector);
			// trigger events
			this._ready.value = true;
			// renew timeout
			this._renewTimeout();
		};

		// internal clock
		get clock() {return this._clock;};

		// update
		update(vector) {
			let newVector = this.checkUpdateVector(vector);
			// create promise
			let event = new eventify.EventBoolean();
			this._event_variables.push(event);
			this._preProcess(newVector);
			return eventify.makePromise(event);
		};
	}


	/*
		EXTERNAL PROVIDER

		External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
		and the TIMINGSRC API

		Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

		- wraps a timing provider external
		- handles some complexity that arises due to the very simple API of providers
		- implements a clock for the provider
	*/

	class ExternalProvider extends TimingBase {

		constructor(provider, options) {
			options = options || {};
			options.timeout = true;
			super(options);

			this._provider = provider;

			this._provider_clock; // provider clock (may fluctuate based on live skew estimates)
			/*
				local clock
				provider clock normalised to values of performance now
				normalisation based on first skew measurement, so
			*/
			this._clock;


			// register event handlers
			this._provider.on("vectorchange", this._onVectorChange().bind(this));
			this._provider.on("skewchange", this._onSkewChange().bind(this));

			// check if provider is ready
			let self = this;
			if (this._provider.skew != undefined) {
				let self = this;
				Promise.resolve(function () {
					self._onSkewChange();
				});
			}
		};

		// internal clock
		get clock() {return this._clock;};

		// internal provider object
		get provider() {return this._provider;};


		_onSkewChange() {
			if (!this._clock) {
				this._provider_clock = new MasterClock({skew: this._provider.skew});
				this._clock = new MasterClock({skew:0});
			} else {
				this._provider_clock.adjust({skew: this._provider.skew});
				// provider clock adjusted with new skew - correct local clock similarly
				// current_skew = clock_provider - clock_local
				let current_skew = this._provider_clock.now() - this._clock.now();
				// skew delta = new_skew - current_skew
				let skew_delta = this._provider.skew - current_skew;
				this._clock.adjust({skew: skew_delta});
			}
			if (!this.isReady() && this._provider.vector != undefined) {
				// just became ready (onVectorChange has fired earlier)
				this._range = this._provider.range;
				this._preProcess(this._provider.vector);
			}
		};

		_onVectorChange() {
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
		onVectorChange(provider_vector) {
			// local_ts = provider_ts - skew
			let local_ts = provider_vector.timestamp - this._provider.skew;
			return {
				position : provider_vector.position,
				velocity : provider_vector.velocity,
				acceleration : provider_vector.acceleration,
				timestamp : local_ts
			}
		};

		// update
		update(vector) {
			return this._provider.update(vector);
		};

	}


	/*

		TIMING OBJECT BASE

	*/

	class TimingObjectBase extends TimingBase {

		constructor (timingsrc, options) {
			super(options);
			this._version = 4;
			this._timingsrc = undefined;
			this._sub;
			this.timingsrc = timingsrc;
			// subscription
		};


		// internal clock
		get clock() {return this._timingsrc.clock;};


		onRangeChange = function (range) {return range;};

		// invoked just after timingsrc switch
		onSwitch = function () {};


		// timingsrc onchange handler
		_internalOnChange = function (eArg, eInfo) {
			let vector = this._timingsrc.vector;
			this._preProcess(vector);
		};

		/*

			timingsrc property and switching on assignment

		*/
		get timingsrc () {
			if (this._timingsrc instanceof InternalProvider) {
				return undefined
			} else if (this._timingsrc instanceof ExternalProvider) {
				return this._timingsrc.provider;
			} else {
				return this._timingsrc;
			}
		}

		set timingsrc (timingsrc) {
			// new timingsrc undefined
			if (!timingsrc) {
				let options;
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
			if (timingsrc.isReady()) {
				this._doSwitch(timingsrc);
			} else {
				let self = this;
				timingsrc.ready.then(function (){
					self._doSwitch(timingsrc);
				});
			}
		}

		_doSwitch = function (timingsrc) {
			// disconnect and clean up timingsrc
			if (this._timingsrc) {
				this._timingsrc.off(this._sub);
				this.sub = undefined;
			}
			this._timingsrc = timingsrc;
			if (this._timingsrc.range !== this._range) {
				this._range = this.onRangeChange(this._timingsrc.range);
			}
			this.onSwitch();
			this._sub = this._timingsrc.on("change", this._internalOnChange.bind(this));
		};



		// update
		update = function (vector) {
			return this._timingsrc.update(vector);
		};
	}

	/*
		Timing Object
	*/
	class TimingObject extends TimingObjectBase {
		constructor (options) {
			options = options || {};
			let timingsrc = options.timingsrc || options.provider;
			super(timingsrc, options);
		};
	}

	// module
	return {
		InternalProvider : InternalProvider,
		ExternalProvider : ExternalProvider,
		TimingObjectBase : TimingObjectBase,
		TimingObject : TimingObject
	};
});


