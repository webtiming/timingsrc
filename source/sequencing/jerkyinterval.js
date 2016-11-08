define(['util/eventutils', 'util/motionutils'], 
		function (eventutils, motionutils) {


	/*
		JERKY INTERVAL

		This describes an interval that can be controlled using one or two timing objects.
		
		- advances in a step-wise manner (i.e. DISCRETE or JERKY) along the timeline, when needed 
			- triggered by change events from timingobjects, or
			- timingobjects violate left or right restrictions

		- left  : buffer to the left of the leftmost timing object - defaults to 5 units (i.e. 5 seconds at velocity 1 unit/second)
		- right : buffer to the rigth of the rightmost timing object - defaults to 5 units (i.e. 5 seconds at velocity 1 unit/second)

		- total length of interval fixed when reevaluated - as the union of three intervals 
			- [left, toA.position] U [toA.position, toB.position] U [toB.position, right]

		- the second timing object toB is optional. If missing the interval is fixed as
		 	- [left, toA.position] U [toA.position, right]
	*/


	var JerkyInterval = function (toA, toB, options) {
		// timingobjects
		this._toA = toA;
		this._toB = toB;
		this._toList = [this._toA];
		if (this._toB) this._toList.push(this._toB);

		// timeouts needed to detect left|right violations
		this._timeout = null;

		// options
		options = options || {};
		this._left = options.left || 5;
		this._right = options.right || 5;

		// internal state
		this._low;
		this._high;
		this._ready = false;

		// event support
		eventutils.eventify(this, JerkyInterval.prototype);
		this.eventifyDefineEvent("ready", {init:true}) // define ready event
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

	JerkyInterval.prototype._initialise = function () {
		this._ready = true;
		this.eventifyTriggerEvent("ready");
	};

	JerkyInterval.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [{type: type, e: undefined}]; 
		} else if (type === "ready") {
			return (this._ready) ? [{type:type, e: undefined}] : []; 
		} 
		return [];
	};

	Object.defineProperty(JerkyInterval.prototype, 'ready', {
		get : function () {
			return this._ready;
		}
	});

	Object.defineProperty(JerkyInterval.prototype, 'low', {
		get : function () {
			return this._low;
		}
	});

	Object.defineProperty(JerkyInterval.prototype, 'high', {
		get : function () {
			return this._high;
		}
	});

	Object.defineProperty(JerkyInterval.prototype, 'readyPromise', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready) {
					resolve();
				} else {
					var onReady = function () {
						self.off("ready", onReady);
						resolve()
					};
					self.on("ready", onReady);
				}
			});
		}
	});

	Object.defineProperty(JerkyInterval.prototype, 'range', {
		get : function () {
			return [this._low, this._high];
		}
	});

	JerkyInterval.prototype._onChange = function () {
		this._refresh();
	};

	JerkyInterval.prototype._onTimeout = function () {
		this._refresh();
	}


	JerkyInterval.prototype._refresh = function () {
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

	JerkyInterval.prototype._update = function (vectorList) {
		var low = vectorList.reduce(function (prevLow, vector) {
			return Math.min(prevLow, vector.position);
		}, Infinity) - this._left;
		var high = vectorList.reduce(function (prevHigh, vector) {
			return Math.max(prevHigh, vector.position);
		}, -Infinity) + this._right;
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
			this.eventifyTriggerEvent("change");
		}
	};

	JerkyInterval.prototype._checkRange = function (vectorList) {
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

	JerkyInterval.prototype._calculateTimeout = function () {
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

	JerkyInterval.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	JerkyInterval.prototype._resetTimeout = function () {
		this._clearTimeout();
		var delay = this._calculateTimeout();
		if (delay !== null) {
	 		var self = this;
	 		this._timeout = this._toA.clock.setTimeout(function () {
				self._onTimeout();
	      	}, delay, {early: 0.005}); 
      	}	
	};

	return JerkyInterval;
});