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


define(function () {

	'use strict';

	/*
	  TIMEOUT

	  Wraps setTimeout() to implement improved version
	  - guarantee that timeout does not wake up too early
	  - offers precise timeout by "busy"-looping just before timeout 
	  - wraps a single timeout
	  - clock operates in seconds
	  - parameters expected in seconds - breaking conformance with setTimeout
	  - wakes up 3 seconds before on long timeouts to readjust
	*/

	var Timeout = function (clock, callback, delay, options) {	
		// clock
		this._clock = clock; // seconds
		var now = this._clock.now(); // seconds
		// timeout
		this._tid = null;
		this._callback = callback;
		this._delay_counter = 0;
		this._options = options || {};

		// options
		this._options.anchor = this._options.anchor || now; // seconds
		this._options.early = Math.abs(this._options.early) || 0; // seconds
		this._target = this._options.anchor + delay; // seconds

		// Initialise
		var self = this;
		window.addEventListener("message", this, true); // this.handleEvent
		var time_left = this._target - this._clock.now(); // seconds
		if (time_left > 10) {
			// long timeout > 10s - wakeup 3 seconds earlier to readdjust
			this._tid = setTimeout(function () {self._ontimeout();}, time_left - 3000);
		} else {
			// wake up just before
			this._tid = setTimeout(function () {self._ontimeout();}, (time_left - self._options.early)*1000);
		}
	};

	Object.defineProperty(Timeout.prototype, 'target', {
		get : function () { 
			return this._target;
		}
	});

	// Internal function
	Timeout.prototype._ontimeout = function () {
	    if (this._tid !== null) {
	    	var time_left = this._target - this._clock.now(); // seconds
			if (time_left <= 0) {
			    // callback due
			    this.cancel();
			    this._callback();
			} else if (time_left > this._options.early) {
				// wakeup before target - options early sleep more
				var self = this;
				this._tid = setTimeout(function () {self._ontimeout();}, (time_left - this._options.early)*1000);
			} else {
				// wake up just before (options early) - event loop
			    this._smalldelay();
			}
	    }
	};
	
	// Internal function - handler for small delays
	Timeout.prototype.handleEvent = function (event) {
	    if (event.source === window && event.data.indexOf("smalldelaymsg_") === 0) {
			event.stopPropagation();
			// ignore if timeout has been canceled
			var the_tid = parseInt(event.data.split("_")[1]);
			if (this._tid !== null && this._tid === the_tid) {
			    this._ontimeout();
			}
	    }
	};

	Timeout.prototype._smalldelay = function () {
	    this._delay_counter ++;
	    var self = this;
	    window.postMessage("smalldelaymsg_" + self._tid, "*");
	};

	Timeout.prototype.cancel = function () {
	    if (this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
			var self = this;
			window.removeEventListener("message", this, true);
	    }
	};
	
	// return module object
	return {
		setTimeout: function (clock, callback, delay, options) {
			return new Timeout(clock, callback, delay, options);
		}
	};
});

