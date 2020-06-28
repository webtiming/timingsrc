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
	MASTER CLOCK


	MasterClock is the reference clock used by TimingObjects.

	It is implemented using performance.now,
	but is skewed and rate-adjusted relative to this local clock.

	This allows it to be used as a master clock in a distributed system,
	where synchronization is generally relative to some other clock than the local clock.

	The master clock may need to be adjusted in time, for instance as a response to
	varying estimation of clock skew or drift. The master clock supports an adjust primitive for this purpose.

	What policy is used for adjusting the master clock may depend on the circumstances
	and is out of scope for the implementation of the MasterClock.
	This policy is implemented by the timing object. This policy may or may not
	provide monotonicity.

	A change event is emitted every time the masterclock is adjusted.

	Vector values define
	- position : absolute value of the clock in seconds
	- velocity : how many seconds added per second (1.0 exactly - or very close)
	- timestamp : timstamp from local system clock (performance) in seconds. Defines point in time where position and velocity are valid.

	If initial vector is not provided, default value is
	{position: now, velocity: 1.0, timestamp: now};
	implying that master clock is equal to local clock.
*/

import eventify from '../util/eventify.js';


// Need a polyfill for performance,now as Safari on ios doesn't have it...
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

function calculateVector(vector, tsSec) {
	if (tsSec === undefined) tsSec = local_clock.now();
	var deltaSec = tsSec - vector.timestamp;
	return {
		position : vector.position + vector.velocity*deltaSec,
		velocity : vector.velocity,
		timestamp : tsSec
	};
};

class MasterClock {

	constructor (options) {
		var now = local_clock.now();
		options = options || {};
		this._vector  = {position: now, velocity: 1.0, timestamp: now};
		// event support
		eventify.eventifyInstance(this);
		this.eventifyDefine("change", {init:false}); // define change event (no init-event)
		// adjust
		this.adjust(options);
	};

	/*
		ADJUST
		- could also accept timestamp for velocity if needed?
		- given skew is relative to local clock
		- given rate is relative to local clock
	*/
	adjust(options) {
		options = options || {};
		var now = local_clock.now();
		var nowVector = this.query(now);
		if (options.skew === undefined && options.rate === undefined) {
			return;
		}
		this._vector = {
			position : (options.skew !== undefined) ? now + options.skew : nowVector.position,
			velocity : (options.rate !== undefined) ? options.rate : nowVector.velocity,
			timestamp : nowVector.timestamp
		}
		this.eventifyTrigger("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	now() {
		return calculateVector(this._vector, local_clock.now()).position;
	};

	/*
		QUERY
		- calculates the state of the clock right now
		- result vector includes position and velocity
	*/
	query(now) {
		return calculateVector(this._vector, now);
	};

}
eventify.eventifyPrototype(MasterClock.prototype);

export default MasterClock;
