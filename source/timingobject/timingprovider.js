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


define(['./eventutils'], function (eventutils) {

	// Need a polyfill for performance, now as Safari on ios doesn't have it...
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


	var TimingProvider = function () {
		this._skew = 0;
		this._vector = {
			position: 0,
			velocity: 0,
			acceleration: 0,
			timestamp: localClock.now() + this._skew;
		};
		this._range = [-Infinity, Infinity];

		// event support
		eventutils.eventify(this, TimingProvider.prototype);
		this.eventifyDefineEvent("vector", {init:true}); // define vector event (supporting init-event)
		this.eventifyDefineEvent("skew", {init:true}); // define skew event (supporting init-event)
	};

	Object.defineProperty(TimingProvider.prototype, 'range', {
		get : function () { 
			// copy internal range
			return [this._range[0], this._range[1]];
		}
	});

	Object.defineProperty(TimingProvider.prototype, 'skew', {
		get : function () {
			return this._skew;
		}
	});

	Object.defineProperty(TimingProvider.prototype, 'vector', {
		get : function () {
			return this._vector;
		}
	});

	TimingProvider.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "vector") {
			return (this._vector !== null) ? [{type: type, e: undefined}] : []; 
		} else if (type === "skew") {
			return (this._skew !== null) ? [{type:type, e: undefined}] : []; 
		}
		return [];
	};

	return TimingProvider;
});