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


	MasterClock is the reference clock 
	shared between TimingObjects and TimeoutModules
	
	It is implemented using performance.now,
	but is skewed and rate-adjusted relative to this local clock.

	This allows it to be used as a master clock in a distributed system,
	where synchronization is ultimately relative to some other clock that is differnt from the local clock. 

	The master clock may need to be adjusted in time, for instance as a response to 
	varying estimation of clock skew or drift. 

	The master clock supports an adjust primitive for this purpose.
	However, it only supports gradual adjustments, so all change must be
	implemented by specifying changes to the velocity. 

	What policy is used for adjusting the master clock may depend on the circumstances
	and is out of scope for the implementation of the MasterClock.

	Monotonicity is guaranteed by only accepting velocities that are positive.

	A change event is emitted every time the masterclock is adjusted.
	
	Vector values define 
	- position : absolute value of the clock in seconds
	- velocity : how many seconds added per second (1.0 exactly - or very close)
	- timestamp : timstamp from local system clock (performance) in seconds. Defines point in time where position and velocity are valid.

	If initial vector is not provided, default value is 
	{position: now, velocity: 1.0, timestamp: now};
*/

define(['./eventutils', './timeoututils'], function (eventutils, timeoututils) {

	'use strict';

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
	var localClock = {
		now : function () {return performance.now()/1000.0;}
	}; 

	var calculateVector = function (vector, tsSec) {
		var deltaSec = tsSec - vector.timestamp;	
		return {
			position : vector.position + vector.velocity*deltaSec,
			velocity : vector.velocity, 
			timestamp : tsSec
		};
	};

	var MasterClock = function (vector) {
		var now = localClock.now();
		vector = vector || {position: now, velocity: 1.0, acceleration: 0.0, timestamp: now};	
		this._vector = vector;
		// event support
		eventutils.eventify(this, MasterClock.prototype);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
	};

	/*
		ADJUST
		- could also accept timestamp for velocity if needed?
	*/
	MasterClock.prototype.adjust = function (velocity) {
		if (velocity <= 0.0) throw new Error("negative velocity not supported");		
		var nowVector = this.query();		
		this._vector.position = nowVector.position;
		this._vector.velocity = velocity;
		this._vector.timestamp = nowVector.timestamp;
		this.eventigyTriggerEvent("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	MasterClock.prototype.now = function () {
		return calculateVector(this._vector, localClock.now()).position;
	};

	/* 
		QUERY 
		- calculates the state of the clock right now
		- result vector includes position and velocity		
	*/
	MasterClock.prototype.query = function () {
		return calculateVector(this._vector, localClock.now());
	};

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	MasterClock.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [{type:type, e:undefined}];
		}
		return [];
	};

	/*
		Timeout support
	*/
	MasterClock.prototype.setTimeout = function (callback, delay, options) {
		return timeoututils.setTimeout(this, callback, delay, options);
	};

	return MasterClock;
});