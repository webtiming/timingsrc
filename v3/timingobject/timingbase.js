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

		constructor (options) {

			this._options = options || {};

			// cached vectors
			this._old_vector;
			this._vector;

			/*
			 = {
				position : undefined,
				velocity : undefined,
				acceleration : undefined,
				timestamp : undefined
			};
			*/

			// cached range
			this._range = [undefined,undefined];

			// readiness
			this._ready = new eventify.EventBoolean();

			// exported events
			eventify.eventifyInstance(this);
			this.eventifyDefineEvent("timingsrc", {init:true});
			this.eventifyDefineEvent("change", {init:true});
			this.eventifyDefineEvent("rangechange", {init:true});
			this.eventifyDefineEvent("timeupdate", {init:true});
			// range restriction timeout
			// off by default
			if (this._options.timeout == undefined) {
				this._options.timeout = false
			}
			this._timeout = new Timeout(this, this.__handleTimeout.bind(this));

			// timeoutid for timeupdate event
			this._tid = undefined;
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
			if (this._ready.value) {
				if (name == "timingsrc") {
					let eArg = {
						...this._vector,
						range: this._range,
						live:false
					}
					return [true, eArg];
				} else if (name == "timeupdate") {
					return [true, undefined];
				} else if (name == "change") {
					return [true, this._vector];
				} else if (name == "rangechange") {
					return [true, this._range];
				}
			}
		};


		/***************************************************************

			ACCESSORS

		***************************************************************/



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

		/***************************************************************

			QUERY

		***************************************************************/

		// query
		query() {
			if (this._ready.value === false)  {
				return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
			}
			// reevaluate state to handle range violation
			let vector = motionutils.calculateVector(this._vector, this.clock.now());
			let state = motionutils.correctRangeState(vector, this._range);
			// detect range violation - only if timeout is set {
			if (state !== motionutils.RangeState.INSIDE && this._timeout.isSet()) {
				// emulate event
				let eArg = {vector:vector, live:true};
				this.__handleEvent(eArg);
			}
			// re-evaluate query after state transition
			return motionutils.calculateVector(this._vector, this.clock.now());
		};

		// shorthand query
		get pos() {return this.query().position;};
		get vel() {return this.query().velocity;};
		get acc() {return this.query().acceleration;};


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
					if (low != this._range[0] || high != this._range[1]) {
						this._range = [low, high];
						range = [low, high];
						range_changed = true;
					}
				}
			}

			// prepare update vector
			let vector = {position, velocity, acceleration, timestamp};
			// make sure vector is consistent with range
			if (vector != undefined) {
				vector = motionutils.checkRange(vector, this._range);
			} else if (range_changed) {
				// there is no vector change, but range was changed,
				// so the current vector must be checked for new range.
				vector = motionutils.checkRange(this._vector, this._range);
			}

			// update vector
			if (vector != undefined) {
				// save old vector
				this._old_vector = this._vector;
				// update vector
				this._vector = vector;
			}

			// new arg
			let _arg = {
				range,
				...vector,
				live,
				...rest
			}

			// trigger events
			this._ready.value = true;
			this.__dispatchEvents(_arg);
			// renew timeout
			this.__renewTimeout();
			// return success
			this.onUpdateDone(_arg);
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
			let moving = motionutils.isMoving(this._vector);
			if (moving && this._tid === undefined) {
				let self = this;
				this._tid = setInterval(function () {
					self.eventifyTriggerEvent("timeupdate");
				}, 200);
			} else if (!moving && this._tid !== undefined) {
				clearTimeout(this._tid);
				this._tid = undefined;
			}
		};


		/***************************************************************

			SUBCLASS MAY OVERRIDE

		***************************************************************/




		// may be overridden by subclsaa
		// onRangeChange(range) {return range;};

		/*
			specify transformation
			on the incoming vector before processing.
			useful for Converters that do mathematical transformations,
			or as a way to enforse range restrictions.
			invoming vectors from external change events or internal
			timeout events

			returning null stops further processing, exept renewtimeout
		*/
		// onVectorChange(vector) {return vector;};

		/*
			to be overridden
			subclass may implement transformation on timeout vector
			before it is given to process.
			returning null stops further processing, except renewtimeout
		*/
		onTimeout(vector) {return vector;};

		/*
			may be overridden
		*/
		onUpdateStart(arg) {return arg;}

		/*
			may be overridden
		*/
		onUpdateDone(sucess) {};



		/***************************************************************

			TIMEOUTS

		***************************************************************/

		/*
			do not override
			renew timeout is called during evenry processing step
			in order to recalculate timeouts.
			the calculation may be specialized in
			_calculateTimeoutVector
		*/
		__renewTimeout() {
			if (this._options.timeout === true) {
				this._timeout.clear();
				let vector = this.__calculateTimeoutVector();
				if (vector === undefined) {
					return;
				}
				this._timeout.setTimeout(vector.timestamp, vector);
			}
		};


		/*
			to be overridden
			must be implemented by subclass if range timeouts are required
			calculate a vector that will be delivered to _process().
			the timestamp in the vector determines when it is delivered.
		*/
		__calculateTimeoutVector() {
			let freshVector = this.query();
			let res = motionutils.calculateDelta(freshVector, this._range);
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

	}

	eventify.eventifyPrototype(TimingBase.prototype);

	return TimingBase;

});


