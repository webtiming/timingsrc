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


define(function(require) {

	'use strict';

	const eventify = require('../util/eventify');
	const Timeout = require('../util/timeout');
	const motionutils = require('../util/motionutils');
	const InternalProvider = require('./internalprovider');
	const ExternalProvider = require('./externalprovider');


	const MAX_NONCE = 10000;

	function getRandomInt() {
	 	return Math.floor(Math.random() * MAX_NONCE);
	};

	function isTimingProvider(obj){
		let required = ["on", "skew", "vector", "range", "update"];
		for (let prop of required) {
			if (!prop in obj) {
				return false;
			}
		}
		return true;
	}


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
		- handleEvent(arg) <- from external timingobject
			- vector = onChange(vector)
			- process(vector) <- from timeout or preProcess
		- handleTimeout(arg) <- timeout on range restrictions
		- process (arg)
			- set internal vector, range
			- dispatchEvents(arg)
			- renew range timeout
		- dispatchEvent (arg)
			- emit change event and timeupdate event
			- turn periodic timeupdate on or off

		individual steps in this structure may be specialized
		by subclasses (i.e. timing converters)
	*/


	class TimingBase {

		constructor (timingsrc, options) {

			// special support for options given as first and only argument
			// equivalent to new TimingBase(undefined, options)
			// in this case, timingsrc may be found in options
			if (timingsrc != undefined && options == undefined) {
				if (!timingsrc instanceof TimingBase && !isTimingProvider(timingsrc)) {
					// timingsrc is neither timing object nor timingprovider
					// assume timingsrc is options
					options = timingsrc;
					timingsrc = undefined;
					if (options.provider) {
						timingsrc = options.provider;
					} else if (options.timingsrc) {
						timingsrc = options.timingsrc;
					}
				};
			}

			this.__options = options || {};
			this.__options.timeout = true;

			// cached vectors and range
			this.__old_vector;
			this.__vector;
			this.__range = [-Infinity, Infinity];

			// range restriction timeout
			this.__timeout = new Timeout(this, this.__handleTimeout.bind(this));

			// timeoutid for timeupdate event
			this.__tid = undefined;

			// timingsrc
			this.__timingsrc;
			this.__sub;

			// update promises
			this.__update_events = new Map();

			// readiness
			this.__ready = new eventify.EventBoolean();

			// exported events
			eventify.eventifyInstance(this);
			this.eventifyDefineEvent("timingsrc", {init:true});
			this.eventifyDefineEvent("change", {init:true});
			this.eventifyDefineEvent("rangechange", {init:true});
			this.eventifyDefineEvent("timeupdate", {init:true});

			// initialise timingsrc
			this.__set_timingsrc(timingsrc, options);
		};


		/***************************************************************

			EVENTS

		***************************************************************/

		/*
		  	overrides how immediate events are constructed
		  	specific to eventutils
		  	- overrides to add support for timeupdate events
		*/
		eventifyInitEventArg(name) {
			if (this.__ready.value) {
				if (name == "timingsrc") {
					let eArg = {
						...this.__vector,
						range: this.__range,
						live:false
					}
					return [true, eArg];
				} else if (name == "timeupdate") {
					return [true, undefined];
				} else if (name == "change") {
					return [true, this.__vector];
				} else if (name == "rangechange") {
					return [true, this.__range];
				}
			}
		};


		/***************************************************************

			ACCESSORS

		***************************************************************/

		// ready or not
		isReady() {return this.__ready.value;};

		// ready promise
        get ready() {return eventify.makePromise(this.__ready);};

        // range
        get range() {
        	// copy
        	return [this.__range[0], this.__range[1]];
        };

        // vector
        get vector() {
        	// copy
			return {
				position : this.__vector.position,
				velocity : this.__vector.velocity,
				acceleration : this.__vector.acceleration,
				timestamp : this.__vector.timestamp
			};
        };

        // old vector
        get old_vector() {return this.__old_vector;};

        // delta
        get delta() {
        	return new motionutils.MotionDelta(this.__old_vector, this.__vector);
        }

		// clock - from timingsrc or provider
		get clock() {return this.__timingsrc.clock};



		/***************************************************************

			QUERY

		***************************************************************/

		// query
		query() {
			if (this.__ready.value === false)  {
				return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
			}
			// reevaluate state to handle range violation
			let vector = motionutils.calculateVector(this.__vector, this.clock.now());
			let state = motionutils.correctRangeState(vector, this.__range);
			// detect range violation - only if timeout is set {
			if (state !== motionutils.RangeState.INSIDE && this.__timeout.isSet()) {
				// emulate event
				let eArg = {vector:vector, live:true};
				this.__handleEvent(eArg);
			}
			// re-evaluate query after state transition
			return motionutils.calculateVector(this.__vector, this.clock.now());
		};

		// shorthand query
		get pos() {return this.query().position;};
		get vel() {return this.query().velocity;};
		get acc() {return this.query().acceleration;};


		/***************************************************************

			UPDATE

		***************************************************************/

		// internal update
		__update(arg) {
			if (this.__timingsrc instanceof TimingBase) {
				return this.__timingsrc.__update(arg);
			} else {
				// provider
				return this.__timingsrc.update(arg);
			}
		};

		// external update
		update(arg) {
			arg.tunnel = getRandomInt();
			if (arg.timestamp == undefined) {
				arg.timestamp = this.clock.now();
			}
			this.__update(arg);
			let event = new eventify.EventVariable();
			this.__update_events.set(arg.tunnel, event);
			return eventify.makePromise(event, val => (val != undefined));
		}


		/***************************************************************

			CORE UPDATE PROCESSING

		***************************************************************/

		/*
			do not override
			handle incoming change event
			eArg = {vector:vector, range:range, live:true}

			subclasses may specialise behaviour by overriding
			onVectorChange

		*/
		__handleEvent(arg) {
			let {
				range,
				live = true,
				...rest
			} = arg;
			// copy range object
			if (range != undefined) {
				range = [range[0], range[1]];
			}
			// new arg object
			let _arg = {
				range,
				live,
				...rest,
			};
			_arg = this.onUpdateStart(_arg);
			if (_arg != undefined) {
				return this.__process(_arg);
			}
		};

		/*
			do not override
			handle timeout
		*/
		__handleTimeout(now, vector) {
 			vector = this.onTimeout(vector);
			this.__process({...vector});
		}

		/*
			core processing step after change event or timeout
			assignes the internal vector
		*/
		__process(arg) {
			let {
				range,
				position,
				velocity,
				acceleration,
				timestamp,
				live=true,
				...rest
			} = arg;

			// update range
			let range_changed = false;
			if (range != undefined) {
				let [low, high] = range;
				if (low < high) {
					if (low != this.__range[0] || high != this.__range[1]) {
						this.__range = [low, high];
						range = [low, high];
						range_changed = true;
					}
				}
			}

			// prepare update vector
			let vector = {position, velocity, acceleration, timestamp};
			// make sure vector is consistent with range
			if (vector != undefined) {
				vector = motionutils.checkRange(vector, this.__range);
			} else if (range_changed) {
				// there is no vector change, but range was changed,
				// so the current vector must be checked for new range.
				vector = motionutils.checkRange(this.__vector, this.__range);
			}

			// update vector
			if (vector != undefined) {
				// save old vector
				this.__old_vector = this.__vector;
				// update vector
				this.__vector = vector;
			}

			// new arg
			let _arg = {
				range,
				...vector,
				live,
				...rest
			}

			// trigger events
			this.__ready.value = true;
			this.__dispatchEvents(_arg);
			// renew timeout
			this.__renewTimeout();
			// release update promises
			if (_arg.tunnel != undefined) {
				let event = this.__update_events.get(_arg.tunnel);
				if (event) {
					this.__update_events.delete(_arg.tunnel);
					delete _arg.tunnel;
					event.value = _arg;
				}
			}
			// TODO
			// since externalprovider does not support tunnel yet
			// free all remaining promises
			for (let event of this.__update_events.values()) {
				event.value = {};
			}

			return _arg;
		};

		/*
			process a new vector applied in order to trigger events
			overriding this is only necessary if external change events
			need to be suppressed,
		*/
		__dispatchEvents(arg) {
			let {
				range,
				position,
				velocity,
				acceleration,
				timestamp
			} = arg;
			let vector = {position, velocity, acceleration, timestamp};
			// trigger timingsrc events
			this.eventifyTriggerEvent("timingsrc", arg);
			// trigger public change events
			if (vector !== undefined) {
				this.eventifyTriggerEvent("change", vector);
			}
			if (range !== undefined) {
				this.eventifyTriggerEvent("rangechange", range);
			}
			// trigger timeupdate events
			this.eventifyTriggerEvent("timeupdate");
			let moving = motionutils.isMoving(this.__vector);
			if (moving && this.__tid === undefined) {
				let self = this;
				this.__tid = setInterval(function () {
					self.eventifyTriggerEvent("timeupdate");
				}, 200);
			} else if (!moving && this.__tid !== undefined) {
				clearTimeout(this.__tid);
				this.__tid = undefined;
			}
		};


		/***************************************************************

			SUBCLASS MAY OVERRIDE

		***************************************************************/

		/*
			may be overridden
		*/
		onTimeout(vector) {return vector;};

		/*
			may be overridden
		*/
		onUpdateStart(arg) {return arg;}


		/***************************************************************

			TIMEOUTS

		***************************************************************/

		/*
			renew timeout is called during every processing step
			in order to recalculate timeouts.
			the calculation may be specialized in
			_calculateTimeoutVector
		*/
		__renewTimeout() {
			if (this.__options.timeout === true) {
				this.__timeout.clear();
				let vector = this.__calculateTimeoutVector();
				if (vector === undefined) {
					return;
				}
				this.__timeout.setTimeout(vector.timestamp, vector);
			}
		};


		/*
			to be overridden ??
			must be implemented by subclass if range timeouts are required
			calculate a vector that will be delivered to _process().
			the timestamp in the vector determines when it is delivered.
		*/
		__calculateTimeoutVector() {
			let freshVector = this.query();
			let res = motionutils.calculateDelta(freshVector, this.__range);
			let [deltaSec, position] = res;
			if (deltaSec === undefined) {
				return;
			}
			if (deltaSec === Infinity) {
				return;
			}
			let vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
			// avoid rounding errors
			vector.position = position;
			return vector;
		};


		/***************************************************************

			TIMINGSRC

		***************************************************************/

		/*

			timingsrc property and switching on assignment

		*/
		__clear_timingsrc() {
			// clear timingsrc
			if (this.__timingsrc != undefined) {
				if (this.__timingsrc instanceof TimingBase) {
					this.__timingsrc.off(this.__sub);
					this.__sub = undefined;
					this.__timingsrc = undefined;
				} else {
					// provider
					this.__timingsrc.close();
					this.__timingsrc = undefined;
				}
			}
		}

		__set_timingsrc(timingsrc, options) {
			// set timingsrc
			let callback = this.__handleEvent.bind(this);
			if (timingsrc instanceof TimingBase) {
				// timingsrc
				this.__timingsrc = timingsrc;
				this.__sub = this.__timingsrc.on("timingsrc", callback);
			} else {
				// provider
				if (timingsrc == undefined) {
					// Internal Provider
					this.__timingsrc = new InternalProvider(callback, options);
				} else {
					// External Provider
					this.__timingsrc = new ExternalProvider(timingsrc, callback, options);
				}
				// emulating initial event from provider, causing
				// this timingobject to initialise
				if (this.__timingsrc.isReady()) {
					let arg = {
						range: this.__timingsrc.range,
						...this.__timingsrc.vector,
						live: false
					}
					// generate initial event
					callback(arg);
				}
			}
		}

		get timingsrc () {return this.__timingsrc;};
		set timingsrc(timingsrc) {
			this.__clear_timingsrc();
			this.__set_timingsrc(timingsrc);
		}

	}

	eventify.eventifyPrototype(TimingBase.prototype);

	return TimingBase;

});


