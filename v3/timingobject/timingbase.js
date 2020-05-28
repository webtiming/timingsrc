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
			//this._timeout = null; // timeoutid for range violation etc.
			this.timeout = new Timeout(this, this._onTimeout.bind(this));


			this._tid = undefined; // timeoutid for timeupdate
			if (!this._options.hasOwnProperty("timeout")) {
				// range timeouts off by default
				this._options.timeout = false;
			}
		};


		/***************************************************************

			EVENTS

		***************************************************************/


		/*
		  	overrides how immediate events are constructed
		  	specific to eventutils
		  	- overrides to add support for timeupdate events
		*/
		eventifyInitEventArg = function (name) {
			if (this._ready.value) {
				if (name === "change") {
					return [true, {vector:this._vector, live:false}];
				} else if (name === "timeupdate") {
					return [true, undefined];
				}
			}
		};


		/***************************************************************

			ACCESSORS

		***************************************************************/

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
			// detect range violation - only if timeout is set
			//if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			if (state !== motionutils.RangeState.INSIDE && this.timeout.isSet()) {

				let eArg = {vector:vector, live:true};
				this._preProcess(eArg);
			}
			// re-evaluate query after state transition
			return motionutils.calculateVector(this._vector, this.clock.now());
		};

		// shorthand query
		get pos() {return this.query().position;};
		get vel() {return this.query().velocity;};
		get acc() {return this.query().acceleration;};


		/***************************************************************

			UPDATE

		***************************************************************/

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
				console.log("update noop");
				return vector;
				//throw new Error ("drop update, noop");
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

		/***************************************************************

			CORE UPDATE PROCESSING

		***************************************************************/

		/*
			do not override
			Handle incoming vector, from "change" from external object
			or from an internal timeout.

			onVectorChange is invoked allowing subclasses to specify transformation
			on the incoming vector before processing.
		*/
		_preProcess(eArg) {
			if (eArg.vector) {
				eArg.vector = this.onVectorChange(eArg.vector);
			}
			this._process(eArg);
		};


		/*
			core processing step after change event or timeout
			assignes the internal vector
		*/
		_process(eArg) {
			if (eArg.vector !== undefined) {
				this._old_vector = this._vector;
				// update internal vector
				this._vector = eArg.vector;
				// trigger events
				this._ready.value = true;
				// unlock update promises
				this._event_variables.forEach(function(event) {
					event.value = true;
				});
				this._event_variables = [];
				this._postProcess(eArg);
			}
			// renew timeout
			this._renewTimeout();
		};

		/*
			process a new vector applied in order to trigger events
			overriding this is only necessary if external change events
			need to be suppressed,
		*/
		_postProcess(eArg) {
			// trigger change events
			this.eventifyTriggerEvent("change", eArg);
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
			to be overridden
			subclass may implement transformation on timeout vector
			before it is given to process.
			returning null stops further processing, except renewtimeout
		*/
		onTimeout(vector) {
			return motionutils.checkRange(vector, this._range);
		};



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
		_renewTimeout() {
			if (this._options.timeout === true) {
				this.timeout.clear();
				let vector = this._calculateTimeoutVector();
				if (vector === undefined) {
					return;
				}
				this.timeout.setTimeout(vector.timestamp, vector);
			}
		};

		/*
			do not override
			internal handle timeout
		*/

		_onTimeout(now, vector) {
 			vector = this.onTimeout(vector);
			let eArg = {
 				live: true,
 				vector: vector
 			}
			this._process(eArg);
		}


		/*
			to be overridden
			must be implemented by subclass if range timeouts are required
			calculate a vector that will be delivered to _process().
			the timestamp in the vector determines when it is delivered.
		*/
		_calculateTimeoutVector() {
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


