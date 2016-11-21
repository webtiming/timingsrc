
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

	// standard inheritance function
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


	/*
		HANDLER MAP
	*/


	// handler bookkeeping for one event type
	var HandlerMap = function () {
		this._id = 0;
		this._map = {}; // ID -> {handler:, ctx:, pending:, count: }
	};

	HandlerMap.prototype._newID = function () {
		this._id += 1;
		return this._id;
	};

	HandlerMap.prototype._getID = function (handler) {
		var item;
		var res = Object.keys(this._map).filter(function (id) {
			item = this._map[id];
			return (item.handler === handler);
		}, this);
		return (res.length > 0) ? res[0] : -1;
	};

	HandlerMap.prototype.getItem = function (id) {
		return this._map[id];
	};

	HandlerMap.prototype.register = function (handler, ctx) {
		var ID = this._getID(handler);
		if (ID > -1) {
			throw new Error("handler already registered");
		}
		ID = this._newID();
		this._map[ID] = {
			ID : ID,
			handler: handler,
			ctx : ctx,
			count : 0,
			pending : false
		};
		return ID;
	};

	HandlerMap.prototype.unregister = function (handler) {
		var ID = this._getID(handler);
		if (ID !== -1) {
			delete this._map[ID];
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

	var eventifyInstance = function (object) {
		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> HandlerMap
		object._eBuffer = []; // buffering events before dispatch
		object._bufferEmptyPromise = Promise.resolve();
		// special event "events"
		object._callbacks["events"] = new HandlerMap();
		object._callbacks["events"]._options = {init:true};

		return object;
	};


	var eventifyPrototype = function (_prototype) {
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

		_prototype._eventifyMakeEItemList = function (type) {
			var makeInitEvents = this.eventifyMakeInitEvents || function (type) {return [];};
			return makeInitEvents.call(this, type)
				.map(function(e){
					return {type:type, e:e};
				});
		};

		_prototype._eventifyMakeInitEvents = function (type) {
			if (type !== "events") {
				return this._eventifyMakeEItemList(type);
			} else {
				// type === 'events'
				var typeList = Object.keys(this._callbacks).filter(function (key) {
					return (key !== "events" && this._callbacks[key]._options.init === true);
				}, this);
				return typeList.concatMap(function(_type){
					return this._eventifyMakeEItemList(_type);
				}, this);
			}	
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
				// e is really eList - eventformatter on every e in list
				e = e.map(function(eItem){
					return {type: eItem.type, e: eventFormatter(eItem.type, eItem.e)};
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

			This is the hub - all events go through here
			Control flow is broken using Promise.resolve().then(...);
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
			if (eItemList.length === 0) return this;
			/* 
				Buffer list of eItems so that iterative calls to eventifyTriggerEvents 
				will be emitted in one batch
			*/
			this._eBuffer.push.apply(this._eBuffer, eItemList);
			if (this._eBuffer.length === eItemList.length) {
				// eBuffer just became non-empty - initiate triggering of events
				var self = this;
				this._bufferEmptyPromise = Promise.resolve().then(function () {
					// trigger events from eBuffer
					self._eventifyTriggerProtectedEvents(self._eBuffer);
					self._eventifyTriggerRegularEvents(self._eBuffer);
					// empty eBuffer
					self._eBuffer = [];				
				});
			}
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
	  	_prototype._eventifyTriggerProtectedEvents = function (eItemList, handlerID) {
	  		// trigger event list on protected event type "events"      		
	  		this._eventifyTriggerEvent("events", eItemList, handlerID);
	  	};

	  	_prototype._eventifyTriggerRegularEvents = function (eItemList, handlerID) {
	  		// trigger events on individual event types
	  		eItemList.forEach(function (eItem) {
	  			this._eventifyTriggerEvent(eItem.type, eItem.e, handlerID);
	      	}, this);
	  	};

		/*
			Internal method for triggering a single event.
			- if handler specificed - trigger only on given handler (for internal use only)
			- awareness of init-events	
	    */
	    _prototype._eventifyTriggerEvent = function (type, e, handlerID) {
			var argList, e, eInfo = {};
			if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type); 
			var handlerMap = this._callbacks[type];
			var init = handlerMap._options.init;
			handlerMap.getItems().forEach(function (handlerItem) {
				if (handlerID === undefined) {
	       			// all handlers to be invoked, except those with initial pending
	        		if (handlerItem.pending) { 
	          			return false;
	        		}
	      		} else {
	        		// only given handler to be called - ensuring that it is not removed
	        		if (handlerItem.ID === handlerID) {
	        			eInfo.init = true;
	        			handlerItem.pending = false;
	        		} else {
	          			return false;
	        		}
	      		}
	      		// eInfo
	      		if (init) {
	      			eInfo.init = (handlerItem.ID === handlerID) ? true : false;
	      		}
	      		eInfo.count = handlerItem.count;
	      		eInfo.src = this;
	      		// formatters
	      		e = this._eventifyEventFormatter(type, e);
	      		argList = this._eventifyCallbackFormatter(type, e, eInfo);
	      		try {
	        		handlerItem.handler.apply(handlerItem.ctx, argList);
	        		handlerItem.count += 1;
	      			return true;
	          	} catch (err) {
		        	console.log("Error in " + type + ": " + handlerItem.handler + " " + handlerItem.ctx + ": ", err);
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
			var handlerMap = this._callbacks[type];
				// register handler
				ctx = ctx || this;
				var handlerID = handlerMap.register(handler, ctx);
		    // do initial callback - if supported by source
		    if (handlerMap._options.init) {
		    	// flag handler
		    	var handlerItem = handlerMap.getItem(handlerID);
		    	handlerItem.pending = true;
		    	var self = this;
	    	    this._bufferEmptyPromise.then(function () {
	    	    	if (self._eBuffer.length > 0) console.log("BUFFERED EVENTS");
	    	    	var eItemList = self._eventifyMakeInitEvents(type);
		    		if (eItemList.length > 0) {
		    			if (type === "events") {
		    				self._eventifyTriggerProtectedEvents(eItemList, handlerID);
		    			} else {
		    				self._eventifyTriggerRegularEvents(eItemList, handlerID);
		    			}
		    		} else {
		    			// initial callback is noop
		    			handlerItem.pending = false;
		    		}
	    	    });
		    }
	      	return this;
		};

		/*
			OFF
			Available directly on object
			Un-register a handler from a specfic event type
		*/

		_prototype.off = function (type, handler) {
			if (this._callbacks[type] !== undefined) {
				var handlerMap = this._callbacks[type];
				handlerMap.unregister(handler);
				
	  		}
	  		return this;
		};


	};

	/*
		BASE EVENT OBJECT

		Convenience base class allowing eventified classes to be derived using (prototypal) inheritance.
		This is alternative approach, hiding the use of eventifyInstance and eventifyPrototype.
		
	*/
	var BaseEventObject = function () {
		eventifyInstance(this);
	};
	eventifyPrototype(BaseEventObject.prototype);

	// make standard inheritance function available as static method on constructor.
	BaseEventObject.inherit = inherit;




	/* 
		EVENT BOOLEAN

		Single boolean variable, its value accessible through get and toggle methods. 
		Defines an event 'change' whenever the value of the variable is changed. 

		initialised to false if initValue is not specified
		
		Note : implementation uses falsiness of input parameter to constructor and set() operation,
		so eventBoolean(-1) will actually set it to true because
		(-1) ? true : false -> true !  
	*/

	var EventBoolean = function (initValue) {
		BaseEventObject.call(this);
		this._value = (initValue) ? true : false;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", {init:true}); 
	};
	BaseEventObject.inherit(EventBoolean, BaseEventObject);

	// ovverride to specify initialevents
	EventBoolean.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	EventBoolean.prototype.get = function () { return this._value;};

	EventBoolean.prototype.set = function (newValue) {
		newValue = (newValue) ? true : false;
		if (newValue !== this._value) {
			this._value = newValue;
			this.eventifyTriggerEvent("change", newValue);
			return true;
		}
		return false;
	};

	EventBoolean.prototype.toogle = function () {
		var newValue = !this._value;
		this._value = newValue;
		this.eventifyTriggerEvent("change", newValue);
		return true;
	};




	/* 
		EVENT VARIABLE

		Single variable, its value accessible through get and set methods. 
		Defines an event 'change' whenever the value of the variable is changed. 
	*/

	var EventVariable = function (initValue) {
		BaseEventObject.call(this);
		this._value = initValue;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", {init:true}); 
	};
	BaseEventObject.inherit(EventVariable, BaseEventObject);

	// ovverride to specify initialevents
	EventVariable.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	EventVariable.prototype.get = function () { return this._value;};

	EventVariable.prototype.set = function (newValue) {
		if (newValue !== this._value) {
			this._value = newValue;
			this.eventifyTriggerEvent("change", newValue);
			return true;
		}
		return false;
	};



	// module api
	return {
		eventifyPrototype : eventifyPrototype,
		eventifyInstance : eventifyInstance,
		BaseEventObject : BaseEventObject,
		EventVariable : EventVariable,
		EventBoolean : EventBoolean
	};


});
