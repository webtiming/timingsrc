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
		UTILITY
	*/

	// unique ID generator 
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



	// handler bookkeeping for one event type
	var HandlerMap = function () {
		this._id = 0;
		this._map = {}; // ID -> {handler:, ctx:, pending:, count: }
	};
	
	HandlerMap.prototype._newID = function () {
		this._id += 1;
		return this._id;
	};

	HandlerMap.prototype.getID = function (handler, ctx) {
		var item;
		var res = Object.keys(this._map).filter(function (id) {
			item = this._map[id];
			return (item.handler === handler && item.ctx === ctx);
		}, this);
		return (res.length > 0) ? res[0] : -1;
	};

	HandlerMap.prototype.getItem = function (id) {
		return this._map[id];
	};

	HandlerMap.prototype.register = function (handler, ctx) {
		var ID = this._newID();
		this._map[ID] = {
			ID : ID,
			handler: handler,
			ctx : ctx,
			count : 0,
			pending : false
		};
		return ID;
	};

	HandlerMap.prototype.unregister = function (handler, ctx) {
		var id = this.getID(handler, ctx);
		if (id !== -1) {
			delete this._map[id];
		}
	};

	HandlerMap.prototype.getItems = function () {
		return Object.keys(this._map).map(function (id) {
			return this.getItem(id);
		}, this);
	};





	/*
	
		EVENTIFY

		Eventify brings eventing capabilities to any object.

		In particular, eventify supports the initial-event pattern.
		Opt-in for initial events per event type.

		A protected event type "events" provides a callback with a batch of events in a list,
		instead as individual callbacks.

		if initial-events are used
		eventified object must implement this._makeInitEvents(type)
		- expect [{type:type, e:eArg}]

	*/

	var eventify = function (object, _prototype) {

		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> HandlerMap
		// special event "events"
		object._callbacks["events"] = new HandlerMap();
		object._callbacks["events"]._options = {init:true};




		/*
			DEFINE EVENT TYPE
			type is event type (string)
			{init:true} specifies init-event semantics for this event type
		*/
		_prototype.eventifyDefineEvent = function (type, options) {
			if (type === "events") throw new Error("Illegal event type : 'events' is protected");
			options = options || {};
			options.init = (options.init === undefined) ? false : options.init;
			this._callbacks[type] = new HandlerMap();
			this._callbacks[type]._options = options;
		};

		/*
			MAKE INIT EVENTS

			Produce init events for a specific callback handler - right after on("type", callback)
			Return list consistent with input .eventifyTriggerEvents
			[{type: "type", e: e}]
			If [] list is returned there will be no init events.

			Protected event type 'events' is handled automatically

			Implement
			.eventifyMakeInitEvents(type)

		*/
		_prototype._eventifyMakeInitEvents = function (type) {
			var makeInitEvents = this.eventifyMakeInitEvents || function (type) {return [];};
			var typeList;
			if (type !== "events") {
				typeList = [type];
			} else {
				// type === 'events'
				typeList = Object.keys(this._callbacks).filter(function (key) {
					return (key !== "events" && this._callbacks[type]._options.init);
				}, this);
			}
			return typeList.concatMap(function (type) {
				return makeInitEvents.call(this, type);
			}, this);		
		};

		/*
			EVENT FORMATTER

			Format the structure of EventArgs. 
			Parameter e is the object that was supplied to triggerEvent
			Parameter type is the event type that was supplied to triggerEvent
			Default is to use 'e' given in triggerEvent unchanged.

			Note, for protected event type 'events', eventFormatter is also applied recursively
			within the list of events
			ex: { type: "events", e: [{type:"change",e:e1},])  

			Implement
			.eventifyEventFormatter(type, e) to override default
		*/
		_prototype._eventifyEventFormatter = function (type, e) {
			var eventFormatter = this.eventifyEventFormatter || function (type, e) {return e;};
			if (type === "events") {
				// e is really eList - run eventformatter on every item in list
				e = e.map(function(item){
					return eventFormatter.call(this, item.type, item.e);
				});
			}			
			return eventFormatter(type,e);
		};

		/*
			CALLBACK FORMATTER

			Format which parameters are included in event callback.
			Returns a list of parameters. 
			Default is to exclude type and eInfo and just deliver the event supplied to triggerEvent

			Implement
			.eventifyCallbackForamtter(type, e, eInfo) to override default
		*/
		_prototype._eventifyCallbackFormatter = function (type, e, eInfo) {
			var callbackFormatter = this.eventifyCallbackFormatter || function (type, e, eInfo) { return [e];};
			return callbackFormatter.call(this, type, e, eInfo);
		};

		/* 
			TRIGGER EVENTS

			Parameter is a list of objects where 'type' specifies the event type and 'e' specifies the event object.
			'e' may be undefined
			- [{type: "type", e: e}]
		*/
		_prototype.eventifyTriggerEvents = function (eItemList) {
			// check list for illegal events
			eItemList.forEach(function (eItem) {
				if (eItem.type === undefined) throw new Error("Illegal event type; undefined");
				if (eItem.type === "events") throw new Error("Illegal event type; triggering of events on protocted event type 'events'" );
			}, this);
			if (eItemList.length === 0) return;
			this._eventifyTriggerEvents(eItemList);
			return this;
        };

        /*
         	TRIGGER EVENT
         	Shorthand for triggering a single event
        */
        _prototype.eventifyTriggerEvent = function (type, e) {
        	return this.eventifyTriggerEvents([{type:type, e:e}]);
        };

    	/*
			Internal method for triggering events
			- distinguish "events" from other event names
    	*/
      	_prototype._eventifyTriggerEvents = function (eItemList, handler) {
      		// trigger event list on protected event type "events"      		
      		this._eventifyTriggerEvent("events", {type:"events", e:eItemList}, handler);
      		// trigger events on individual event types
      		eItemList.forEach(function (eItem) {
      			this._eventifyTriggerEvent(eItem.type, eItem, handler);
	      	}, this);
      	};

    	/*
			Internal method for triggering a single event.
			- if handler specificed - trigger only on given handler (for internal use only)
			- awareness of init-events	
        */
        _prototype._eventifyTriggerEvent = function (type, eItem, handlerID) {
			var argList, e, eInfo = {};
			if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type); 
			var init = this._callbacks[type]._options.init;
    		this._callbacks[type].getItems().forEach(function (item) {
    			if (handlerID === undefined) {
           			// all handlers to be invoked, except those with initial pending
            		if (item.pending) { 
              			return false;
            		}
          		} else {
            		// only given handler to be called - ensuring that it is not removed
            		if (item.ID === handlerID) {
            			eInfo.init = true;
            			item.pending = false;
            		} else {
              			return false;
            		}
          		}
          		// eInfo
          		if (init) {
          			eInfo.init = (item.ID === handlerID) ? true : false;
          		}
          		eInfo.count = item.count;
          		eInfo.src = this;
          		// formatters
          		e = this._eventifyEventFormatter(eItem.type, eItem.e);
          		argList = this._eventifyCallbackFormatter(type, e, eInfo);
          		try {
            		item.handler.apply(item.ctx, argList);
            		item.count += 1;
          			return true;
	          	} catch (err) {
    	        	console.log("Error in " + type + ": " + item.handler + " " + item.ctx + ": ", err);
          		}
    		}, this);
    		return false;
    	};

    	/*
			ON

			register callback on event type. Available directly on object
			optionally supply context object (this) used on callback invokation.
    	*/
		_prototype.on = function (type, handler, ctx) {
			if (!handler || typeof handler !== "function") throw new Error("Illegal handler");
		    if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type);
			ctx = ctx || this;
			var handlerMap = this._callbacks[type];
		    var handlerID = handlerMap.getID(handler, ctx);
	   	   	if (handlerID === -1) {
	  			// register handler
	  			handlerID = handlerMap.register(handler, ctx);
	    	    // do initial callback - if supported by source
	    	    if (handlerMap._options.init) {
	    	    	// flag handler
	    	    	var item = handlerMap.getItem(handlerID);
	    	    	item.pending = true;
	    	    	var self = this;
		    	    setTimeout(function () {
		    	    	var eItemList = self._eventifyMakeInitEvents(type);
	    	    		if (eItemList.length > 0) {
	    	    			self._eventifyTriggerEvents(eItemList, handlerID);
	    	    		} else {
	    	    			// initial callback is noop
	    	    			item.pending = false;
	    	    		}
		    	    }, 0);
	    	    }
	      	} else {console.log("warning : handler already registered");}
	      	return this;
		};

		/*
			OFF
			Available directly on object
			Un-register a handler from a specfic event type

			
		*/

		_prototype.off = function (type, handler, ctx) {
			if (this._callbacks[type] !== undefined) {
				var handlerMap = this._callbacks[type];
				ctx = ctx || this;
				var handlerID = handlerMap.getID(handler, ctx);
				if (handlerID > -1) {
					handlerMap.unregister(handler, ctx);
				}
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

