/*
	Copyright 2020
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


import eventify from '../util/eventify.js';
import Timeout from '../util/timeout.js';
import * as motionutils from '../util/motionutils.js';
import InternalProvider from './internalprovider.js';
import ExternalProvider from './externalprovider.js';

const MAX_NONCE = 10000;

function getRandomInt() {
 	return Math.floor(Math.random() * MAX_NONCE);
};

function isTimingProvider(obj){
	let required = ["on", "skew", "vector", "range", "update"];
	for (let prop of required) {
		if (!(prop in obj)) {
			return false;
		}
	}
	return true;
}

function checkRange(live, now, vector, range) {
	if (live) {
		return motionutils.checkRange(vector, range);
	} else {
		let now_vector = motionutils.calculateVector(vector, now);
		return motionutils.checkRange(now_vector, range);
	}
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


class TimingObject {

	constructor (timingsrc, options) {

		// special support for options given as first and only argument
		// equivalent to new TimingObject(undefined, options)
		// in this case, timingsrc may be found in options
		if (timingsrc != undefined && options == undefined) {
			if (!(timingsrc instanceof TimingObject) && !isTimingProvider(timingsrc)) {
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

		// options
		options = options || {};
		this.__options = options;


		// default timeout option
		if (options.timeout == undefined) {
			options.timeout = true;
		}

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
		this.eventifyDefine("timingsrc", {init:true});
		this.eventifyDefine("change", {init:true});
		this.eventifyDefine("rangechange", {init:true});
		this.eventifyDefine("timeupdate", {init:true});

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
	eventifyInitEventArgs(name) {
		if (this.__ready.value) {
			if (name == "timingsrc") {
				let eArg = {
					...this.__vector,
					range: this.__range,
					live:false
				}
				return [eArg];
			} else if (name == "timeupdate") {
				return [undefined];
			} else if (name == "change") {
				return [this.__vector];
			} else if (name == "rangechange") {
				return [this.__range];
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
		if (this.__ready.value == false)  {
			throw new Error("query before timing object is ready");
		}
		// reevaluate state to handle range violation
		let vector = motionutils.calculateVector(this.__vector, this.clock.now());
		// detect range violation - only if timeout is set {
		if (this.__timeout.isSet()) {
			if (vector.position < this.__range[0] || this.__range[1] < vector.position) {
				// emulate update event to trigger range restriction
				this.__process({...this.onRangeViolation(vector)});
			}
			// re-evaluate query after state transition
			return motionutils.calculateVector(this.__vector, this.clock.now());
		}
		return vector;
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
		if (this.__timingsrc instanceof TimingObject) {
			return this.__timingsrc.__update(arg);
		} else {
			// provider
			return this.__timingsrc.update(arg);
		}
	};

	// external update
	update(arg) {
		// check if noop
		let ok = (arg.range != undefined);
		ok = ok || (arg.position != undefined);
		ok = ok || (arg.velocity != undefined);
		ok = ok || (arg.acceleration != undefined);
		if (!ok) {
			return Promise.resolve(arg);
		}
		arg.tunnel = getRandomInt();
		if (arg.timestamp == undefined) {
			arg.timestamp = this.clock.now();
		}
		let event = new eventify.EventVariable();
		this.__update_events.set(arg.tunnel, event);
		let promise = eventify.makePromise(event, val => (val != undefined));
		this.__update(arg);
		return promise;
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
		this.__process({...this.onRangeViolation(vector)});
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
		let range_change = false;
		if (range != undefined) {
			let [low, high] = range;
			if (low < high) {
				if (low != this.__range[0] || high != this.__range[1]) {
					this.__range = [low, high];
					range = [low, high];
					range_change = true;
				}
			}
		}

		// update vector
		let vector;
		let vector_change = false;
		let now = this.clock.now();

		// make sure vector is consistent with range
		if (position != undefined) {
			// vector change
			vector = {position, velocity, acceleration, timestamp};
			// make sure vector is consistent with range
			vector = checkRange(live, now, vector, this.__range);
		} else {
			// there is no vector change, but if range was changed,
			// the current vector must be checked for new range.
			if (range_change) {
				vector = checkRange(false, now, this.__vector, this.__range);
			}
		}

		if (vector != undefined) {
			// update vector
			if (this.__vector != undefined) {
				vector_change = !motionutils.equalVectors(vector, this.__vector);
			} else {
				vector_change = true;
			}
			if (vector_change) {
				// save old vector
				this.__old_vector = this.__vector;
				// update vector
				this.__vector = vector;
			}
		}

		let _arg;
		if (range_change && vector_change) {
			_arg = {range, ...vector, live, ...rest};
		} else if (range_change) {
			_arg = {range, live, ...rest};
		} else if (vector_change) {
			_arg = {...vector, live, ...rest};
		} else {
			_arg = {live, ...rest};
		}

		// trigger events
		this.__ready.value = true;
		this.__dispatchEvents(_arg, range_change, vector_change);
		// renew timeout
		if (this.__options.timeout) {
			this.__renewTimeout();
		}
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
		this.onUpdateDone(_arg);
		return _arg;
	};

	/*
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events
		need to be suppressed,
	*/
	__dispatchEvents(arg, range_change, vector_change) {
		let {
			range,
			position,
			velocity,
			acceleration,
			timestamp
		} = arg;
		// trigger timingsrc events
		this.eventifyTrigger("timingsrc", arg);
		// trigger public change events
		if (vector_change) {
			let vector = {position, velocity, acceleration, timestamp};
			this.eventifyTrigger("change", vector);
		}
		if (range_change) {
			this.eventifyTrigger("rangechange", range);
		}
		// trigger timeupdate events
		this.eventifyTrigger("timeupdate");
		let moving = motionutils.isMoving(this.__vector);
		if (moving && this.__tid === undefined) {
			let self = this;
			this.__tid = setInterval(function () {
				self.eventifyTrigger("timeupdate");
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
	onRangeViolation(vector) {return vector;};

	/*
		may be overridden
	*/
	onUpdateStart(arg) {return arg;};

	/*
		may be overridden
	*/
	onUpdateDone(arg) {};


	/***************************************************************

		TIMEOUTS

	***************************************************************/

	/*
		renew timeout is called during every processing step
		in order to recalculate timeouts.

		- optional vector - default is own vector
		- optional range - default is own range
	*/
	__renewTimeout(vector, range) {
		this.__timeout.clear();
		let timeout_vector = this.__calculateTimeoutVector(vector, range);
		if (timeout_vector == undefined) {
			return;
		}
		this.__timeout.setTimeout(timeout_vector.timestamp, timeout_vector);
	};


	/*
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.

		- optional vector - default is own vector
		- optional range - default is own range
	*/
	__calculateTimeoutVector(vector, range) {
		vector = vector || this.__vector;
		range = range || this.__range;
		let now = this.clock.now();
		let now_vector = motionutils.calculateVector(vector, now);
		let [delta, pos] = motionutils.calculateDelta(now_vector, range);
		if (delta == undefined || delta == Infinity) {
			return;
		}
		// vector when range restriction will be reached
		let timeout_vector = motionutils.calculateVector(vector, now + delta);
		// possibly avoid rounding errors
		timeout_vector.position = pos;
		return timeout_vector;
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
			if (this.__timingsrc instanceof TimingObject) {
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
		if (timingsrc instanceof TimingObject) {
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

eventify.eventifyPrototype(TimingObject.prototype);

export default TimingObject;



