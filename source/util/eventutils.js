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
	Eventify brings eventing capabilities to any object.

	In particular, eventify supports the initial event pattern.
	Opt-in for initial events per event type.

	An "events" event provides batch event support.

	
	if init events are used
	eventified object must implement this._makeInitEvents(type)
	- expect [{type:type, e:eArg}]


*/


define(function () {

	'use strict';

	// UNIQUE ID GENERATOR 
	var id = (function(length) {
	 	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	    return function (len) { // key length
	    	len = len || length; 
	    	var text = "";
		    for( var i=0; i < len; i++ )
	    	    text += possible.charAt(Math.floor(Math.random() * possible.length));
	    	return text;
		};
	})(10); // default key length

	// utility
	Array.prototype.concatAll = function() {
		var results = [];
		this.forEach(function(subArray) {
			results.push.apply(results, subArray);
		}, this);
		return results;
	};
	Array.prototype.concatMap = function(projectionFunctionThatReturnsArray, ctx) {
		return this.
			map(function(item) {
				return projectionFunctionThatReturnsArray.call(ctx, item);
			}).
			// apply the concatAll function to flatten the two-dimensional array
			concatAll();
	};

	/*
		Eventify
	*/
	var eventify = function (object, _prototype) {

		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> []
		// special event "events"
		object._callbacks["events"] = [];
		object._callbacks["events"]._options = {init:true};

		_prototype._defineEvent = function (type, options) {
			if (type === "events") throw new Error("Illegal event type : 'events' is protected");
			options = options || {};
			options.init = (options.init === undefined) ? false : options.init;
			this._callbacks[type] = [];
			this._callbacks[type]._options = options;
		};

		_prototype._makeInitialEvents = function (type) {
			var typeList;
			if (type !== "events") {
				typeList = [type];
			} else {
				// type === 'events'
				typeList = Object.keys(this._callbacks).filter(function (key) {
					return (key !== "events");
				}, this);
			}
			return typeList.concatMap(function (type) {
				return this._makeInitEvents(type);
			}, this);		
		};

		_prototype._internalEventFormatter = function (type, e) {
			var eventFormatter = this._eventFormatter || function (type, e) {return e;};
			if (type === "events") {
				// e is really eList - run eventformatter on every item
				e = e.map(function(item){
					return eventFormatter(item.type, item.e);
				});
			}			
			return eventFormatter(type,e);
		};

		/*
			Format parameters in callback. 
			Return list of arguments given to 
		*/
		_prototype._internalCallbackFormatter = function (type, e, eInfo) {
			if (!this._callbackFormatter) return [type, e, eInfo];
			return this._callbackFormatter(type, e, eInfo);
		};


		/* 
			Public : Trigger Events
			- [{type: "type", e: e}]
		*/
		_prototype._triggerEvents = function (eItemList) {
			// check list for illegal events
			eItemList.forEach(function (eItem) {
				if (eItem.type === undefined) throw new Error("Illegal event type; undefined");
				if (eItem.type === "events") throw new Error("Illegal event type; triggering of events on protocted event type 'events'" );
			}, this);
			if (eItemList.length === 0) return;
			this._internalTriggerEvents(eItemList);
			return this;
        };

        /*
         	Public : Trigger Event
         	Shorthand for triggering single events
        */
        _prototype._triggerEvent = function (type, e) {
        	this._triggerEvents([{type:type, e:e}]);
        	return this;
        };

    	/*
			Internal method for triggering events
			- distinguish "events" from other event names
    	*/
      	_prototype._internalTriggerEvents = function (eItemList, handler) {
      		// trigger event list on protected event type "events"      		
      		this._internalTriggerEvent("events", {type:"events", e:eItemList}, handler);
      		// trigger events on individual event types
      		eItemList.forEach(function (eItem) {
      			this._internalTriggerEvent(eItem.type, eItem, handler);
	      	}, this);
      	};

    	/*
			Internal method for triggering events.
			- if handler specificed - trigger only on given handler (for internal use only)
			- awareness of initial events	
        */
        _prototype._internalTriggerEvent = function (type, eItem, handler) {
			var argList, e, eInfo = {};
			if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type); 
			var init = this._callbacks[type]._options.init;
    		this._callbacks[type].forEach(function (h) {
    			if (handler === undefined) {
           			// all handlers to be invoked, except those with initial pending
            		if (h["_init_pending_" + type + this._ID]) { 
              			return false;
            		}
          		} else {
            		// only given handler to be called - ensuring that it is not removed
            		if (h === handler) {
            			eInfo.init = true;
            			handler["_init_pending_" + type + this._ID] = false;
            		} else {
              			return false;
            		}
          		}
          		// eInfo
          		if (init) {
          			eInfo.init = (h === handler) ? true : false;
          		}
          		eInfo.count = h["_count_" + type + this._ID];
          		eInfo.src = this;
          		// formatters
          		e = this._internalEventFormatter(eItem.type, eItem.e);
          		argList = this._internalCallbackFormatter(type, e, eInfo);
          		try {
            		h.apply(h["_ctx_" + type + this._ID], argList);
            		h["_count_" + type + this._ID] += 1;
          			return true;
	          	} catch (err) {
    	        	console.log("Error in " + type + ": " + h + ": ", err);
          		}
    		}, this);
    		return false;
    	};

		_prototype.on = function (type, handler, ctx) {
			if (!handler || typeof handler !== "function") throw new Error("Illegal handler");
		    if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type);
		    //options.init = (options.init === undefined) ? false : options.init;
		    var index = this._callbacks[type].indexOf(handler);
	   	   	if (index === -1) {
	  			// register handler
	  			this._callbacks[type].push(handler);
		        handler["_ctx_" + type + this._ID] = ctx || this;
		        handler["_count_" + type + this._ID] = 0;
	    	    // do initial callback - if supported by source
	    	    if (this._callbacks[type]._options.init) {
	    	    	// flag handler
		        	handler["_init_pending_" + type + this._ID] = true;
	    	    	var self = this;
		    	    setTimeout(function () {
		    	    	var eItemList = self._makeInitialEvents(type);
	    	    		if (eItemList.length > 0) {
	    	    			self._internalTriggerEvents(eItemList, handler);
	    	    		} else {
	    	    			// initial callback is noop
		              		handler["_init_pending_" + type + self._ID] = false;
	    	    		}
		    	    }, 0);
	    	    }
	      	}
	      	return this;
		};

		_prototype.off = function (type, handler) {
			if (this._callbacks[type] !== undefined) {
	        	var index = this._callbacks[type].indexOf(handler);
    	    	if (index > -1) this._callbacks[type].splice(index, 1);
      		}
      		return this;
		};

		// Eventify returns eventified object
		return object;
	};

	// module api
	return {
		eventify:eventify
	};
});

