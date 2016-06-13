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

	var SlidingWindow = function (timingObject, length, options) {
		this._to = timingObject;
		this._length = length;
		this._window;
		options = options || {};
		if (options.tail !== "number" || options.tail < 5) options.tail = 5;
		if (options.head !== "number" || options.head < 5) options.head = 5;
		this._options = options;
		this._to.on("change", this._toHandler, this);
	};


	SlidingWindow.prototype._needAdvance = function (pos) {
		if (!this._window) return true;
		// use direction
	};

	SlidingWindow.prototype._toHandler = function () {
		console.log("change");

		// adjust window if necessary
		var vector = this._to.query();

		// logic should be similar to rangeconverter

	};

	return SlidingWindow;
});