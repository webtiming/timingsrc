define(['util/eventify', 'util/motionutils'], 
		function (eventify, motionutils) {


	/*
		MOVING INTERVAL

		This describes an interval whose positioning on the dimension may be controlled using one or two timing objects.
		
		This is intended for use to fetch (prefetch) data so that data within an interval is always available

		- advances in a step-wise, discrete manner along the timeline 
			- triggered by change events from timingobjects, or
			- timingobjects violating left or right restrictions

		[ LOW ----- L ------ A ---------------- B ------ R ------ HIGH]
		
		[LOW, HIGH] : the interval		 
		A : position of timing object A
		B : position of timing object B
		L : left-restriction : LOW < L < A
		R : right-restriction : B < R < HIGH

		Invariable : timing objects A and B are within [L,R] 
		Whenever this invariable is violated, the interval is recalculated.

		DELTA : time-interval in seconds, defaults to 5 seconds. 

		The interval is recalculated so that :

			- A and B will remain within [L,R] for at least DELTA seconds.
			- A and B will remain within [LOW, HIGH] for at least 2*DELTA seconds.
		
		Interval is therefore changed at most once per DELTA seconds (given that at least one timing object is moving)
		
		DELTA is also interpreted as a space-interval in units, i.e. 5 units.

		The interval [LOW,HIGH] will be whatever is bigger of 5 seconds or 5 units.

	*/


	var MovingInterval = function (toA, toB, options) {
		// timingobjects
		this._toA = toA;
		this._toB = toB;
		this._toList = [this._toA];
		if (this._toB) this._toList.push(this._toB);

		// timeouts needed to detect violations
		this._timeout = null;

		// options
		options = options || {};
		options.delta = options.delta || 5;
		this._options = options;

		// internal state
		this._low;
		this._high;
		this._ready = new eventify.EventBoolean(false);


		// event support
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)

		// ready when all timingobjects are ready
		var self = this;
		var promises = this._toList.map(function(to) {
			return to.readyPromise;
		});
		Promise.all(promises).then(function (values) {
			self._initialise();
		});

		// subscribe to events from all timing objects
		this._toList.forEach(function (to) {
			to.on("change", this._onChange, this);
		}, this);
	};
	eventify.eventifyPrototype(MovingInterval.prototype);


	MovingInterval.prototype._initialise = function () {
		this._refresh();
		this._ready.value = true;
	};

	MovingInterval.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return (this._ready.value === true) ? [undefined] : []; 
		} 
		return [];
	};

	Object.defineProperty(MovingInterval.prototype, 'ready', {
		get : function () {
			return this._ready.value;
		}
	});

	Object.defineProperty(MovingInterval.prototype, 'readyPromise', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready.value === true) {
					resolve();
				} else {
					var onReady = function () {
						if (self._ready.value === true) {
							self._ready.off("change", onReady);
							resolve();
						}
					};
					self._ready.on("change", onReady);
				}
			});
		}
	});

	MovingInterval.prototype.get = function () {
		return {low:this._low, high:this._high};
	};

	MovingInterval.prototype._onChange = function () {
		this._refresh();
	};

	MovingInterval.prototype._onTimeout = function () {
		this._refresh();
	};


	MovingInterval.prototype._refresh = function () {
		var self = this;
		var snapshots = this._toList.map(function (to) {
			return to.query();
		});
		var ok = this._checkRange(snapshots);
		if (!ok) {
			// not ok - update low and high based on snapshot
			this._update(snapshots);
		}
		this._resetTimeout();
	};

	MovingInterval.prototype._update = function (vectorList) {
		var low = vectorList.reduce(function (prevLow, vector) {
			return Math.min(prevLow, vector.position);
		}, Infinity) - this._options.delta;
		var high = vectorList.reduce(function (prevHigh, vector) {
			return Math.max(prevHigh, vector.position);
		}, -Infinity) + this._options.delta;
		var dirty = false;
		if (low !== this._low){
			this._low = low;
			dirty = true;
		}
		if (high !== this._high) {
			this._high = high;
			dirty = true;
		}
		if (dirty) {
			this.eventifyTriggerEvent("change", {low:this._low, high:this._high});
		}
	};

	MovingInterval.prototype._checkRange = function (vectorList) {
		return vectorList.map(function (vector) {
			var direction = motionutils.calculateDirection(vector, vector.timestamp);
			var ok = true;		
			if (this._low === undefined || this._high === undefined) {
				ok = false;
			} else if (vector.position < this._low || this._high < vector.position) {
				ok = false;
			} else if (vector.position === this._low && direction === -1) {
				ok = false;
			} else if (vector.position === this._high && direction === 1) {
				ok = false;
			}
			return ok;
		}, this)
		.reduce(function (prevResult, bool) {
			return prevResult && bool;
		}, true);
	};

	MovingInterval.prototype._calculateTimeout = function () {
		var self = this;
		return this._toList.map(function (to) {
			return motionutils.calculateDelta(to.query(), [self._low, self._high])[0];
		})
		.reduce(function (prevDelay, delay) {
			// delta positive value or null
			if (prevDelay !== null && delay !== null) return Math.min(prevDelay, delay);
			else if (delay !== null) return delay;
			else if (prevDelay !== null) return prevDelay;
			else return null;
		}, null);
	};

	MovingInterval.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	MovingInterval.prototype._resetTimeout = function () {
		this._clearTimeout();
		var delay = this._calculateTimeout();
		if (delay !== null) {
	 		var self = this;
	 		this._timeout = this._toA.clock.setTimeout(function () {
				self._onTimeout();
	      	}, delay, {early: 0.005}); 
      	}	
	};

	return MovingInterval;
});