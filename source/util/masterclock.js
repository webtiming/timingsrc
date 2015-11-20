/*
	Written by Ingar Arntzen, Norut


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

define(['./eventutils', './motionutils'], function (eventutils, motionutils) {

	'use strict';

	var MasterClock = function (vector) {
		var now = motionutils.secClock();
		vector = vector || {position: now, velocity: 1.0, acceleration: 0.0, timestamp: now};	
		this._vector = vector;
		// event support
		eventutils.eventify(this, MasterClock.prototype);
		this._defineEvent("change", {init:true}); // define change event (supporting init-event)
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
		this._triggerEvent("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	MasterClock.prototype.now = function () {
		return motionutils.calculateVector(this._vector).position;
	};

	/* 
		QUERY 
		- calculates the state of the clock right now
		- result vector includes position and velocity		
	*/
	MasterClock.prototype.query = function () {
		var now = motionutils.secClock();
		var vector = motionutils.calculateVector(this._vector, now);
		return {
			position : vector.position,
			velocity : vector.velocity,
			timestamp : vector.timestamp
		};
	};


	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	MasterClock.prototype._makeInitEvents = function (type) {
		if (type === "change") {
			return [undefined];
		}
		return [];
	};

	/*
		overrides how event callbacks are delivered 
		- i.e. how many parameters, only one parameter - e
		specific to eventutils
	*/
	MasterClock.prototype._callbackFormatter = function (type, e, eInfo) { return [e];};


	return MasterClock;
});