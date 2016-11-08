define(['util/eventutils', 'util/motionutils'], 
		function (eventutils, motionutils) {


	/*
		SLIDING WINDOW
		- length : size of window covering the timing object
		- advances in a step-wise manner along the timeline, when needed - triggered by the timingobject
		- option.tail : minimal buffer behind the timing object - default 5 (sec at velocity 1)
		- option.head : minimal buffer ahead of the timing object - default 5 (sec at velocity 1)
	
		- tail and head are relative to the direction of the timing object
		- head and tail are included in length
		- length == head + middle + tail
		- the window will be advanced whenever head or tail restriction are violated
		
		- time between advances = middle/velocity : (length - head - tail)/velocity
		
	*/

	var SlidingWindow = function (timingObject, length) {
		this._to = timingObject;
		this._length = length;
		this._low;
		this._high;
		this._timeout = null; // timeout

		// event support
		eventutils.eventify(this, SlidingWindow.prototype);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this._to.on("change", this._onChange, this);

	};

	SlidingWindow.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [{type: type, e: undefined}]; 
		} else {
			return [];
		};
	};
	
	Object.defineProperty(SlidingWindow.prototype, 'window', {
		get : function () {
			var quarter = this._length/4.0;
			return {low:this._low - quarter, high:this._high + quarter};
		}
	});

	// adjust window if necessary
	SlidingWindow.prototype._adjustWindow = function (vector) {
		var direction = motionutils.calculateDirection(vector, vector.timestamp);
		var adjust = false;		
		if (this._low === undefined || this._high === undefined) {
			adjust = true;
		} else if (vector.position < this._low || this._high < vector.position) {
			adjust = true;
		} else if (vector.position === this._low && direction === -1) {
			adjust = true;
		} else if (vector.position === this._high && direction === 1) {
			adjust = true;
		}
		if (adjust) {	
			// simple solution - just center
			var quarter = this._length/4.0;
			this._low = vector.position - quarter;
			this._high = vector.position + quarter;
			return true;
		} else return false;
	};

	SlidingWindow.prototype._calculateTimeoutVector = function () {
		var freshVector = this._to.query();
		var res = motionutils.calculateDelta(freshVector, [this._low, this._high]);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	SlidingWindow.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	SlidingWindow.prototype._adjustTimeout = function () {
		this._clearTimeout();
		var vector = this._calculateTimeoutVector();
		if (vector === null) {return;}	 		
		var now = this._to.clock.now();
 		var secDelay = vector.timestamp - now;
 		var self = this;
 		this._timeout = this._to.clock.setTimeout(function () {
			self._onTimeout(vector);
      	}, secDelay, {anchor: now, early: 0.005}); 	
	};

	SlidingWindow.prototype._onTimeout = function (vector) {
		this._process(vector);
	};

	SlidingWindow.prototype._onChange = function () {
		this._process(this._to.query());
	};

	SlidingWindow.prototype._process = function (vector) {
		// adjust window if necessary
		var changed = this._adjustWindow(vector);
		// adjust timeout
		var vector = this._adjustTimeout();
		// notify window change
		if (changed) {
			this.eventifyTriggerEvent("change");	
		}
	};

	return SlidingWindow;
});