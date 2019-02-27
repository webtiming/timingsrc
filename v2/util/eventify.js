
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


	// concatMap
	var concatMap = function (array, projectionFunctionThatReturnsArray, ctx) {
		var results = [];
		array.forEach(function (item) {
			results.push.apply(results, projectionFunctionThatReturnsArray.call(ctx, item));
		}, ctx);
		return results;
	};

	// standard inheritance function
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};

	// equality function for object values
	function areEqual(a, b) {
		if (a === b) return true;
		if (typeof a !== typeof b) return false;

		// disallow array comparison
		if (Array.isArray(a)) throw new Error("illegal parameter a, array not supported", a);
		if (Array.isArray(b)) throw new Error("illegal parameter b, array not supported", b);
	    
		if (typeof a === 'object' && typeof b === 'object') {
			// Create arrays of property names
		    var aProps = Object.getOwnPropertyNames(a);
		    var bProps = Object.getOwnPropertyNames(b);

		    // If number of properties is different,
		    // objects are not equivalent
		    if (aProps.length != bProps.length) {
		        return false;
		    }

		    for (var i = 0; i < aProps.length; i++) {
		        var propName = aProps[i];

		        // If values of same property are not equal,
		        // objects are not equivalent
		        if (a[propName] !== b[propName]) {
		            return false;
		        }
		    }
		    // If we made it this far, objects
		    // are considered equivalent
		    return true;
		} else {
			return false;
		}
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

	var eventifyInstance = function (object, options) {
		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> HandlerMap
		object._immediateCallbacks = [];
		object._eBuffer = []; // buffering events before dispatch

		options = options || {}
		// special event "events"
		// init flag for builtin event type "events"
		// default true
		if (options.init == undefined) {
			options.init = true;
		} 
		object._callbacks["events"] = new HandlerMap();
		object._callbacks["events"]._options = {init:options.init};

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
				return concatMap(typeList, function(_type){
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
				Promise.resolve().then(function () {
					// trigger events from eBuffer
					self._eventifyTriggerProtectedEvents(self._eBuffer);
					self._eventifyTriggerRegularEvents(self._eBuffer);
					// empty eBuffer
					self._eBuffer = [];
					// flush immediate callbacks
					self._eventifyFlushImmediateCallbacks();			
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
	    	   	var immediateCallback = function () {
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
	    	    };
 				this._immediateCallbacks.push(immediateCallback);
 				Promise.resolve().then(function () {
 					self._eventifyFlushImmediateCallbacks();
 				});
		    }
	      	return this;
		};

		_prototype._eventifyFlushImmediateCallbacks = function () {
			if (this._eBuffer.length === 0) {
				var callbacks = this._immediateCallbacks;
				this._immediateCallbacks = [];
				callbacks.forEach(function (callback) {
					callback();
				});
			} 
			// if buffer is non-empty, immediate callbacks will be flushed after
			// buffer is emptied
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

	var EventBoolean = function (initValue, options) {
		if (!(this instanceof EventBoolean)) {
			throw new Error("Contructor function called without new operation");
		}
		BaseEventObject.call(this);
		this._value = (initValue) ? true : false;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", options); 
	};
	BaseEventObject.inherit(EventBoolean, BaseEventObject);

	// ovverride to specify initialevents
	EventBoolean.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	/* ACCESSOR PROPERTIES */
	Object.defineProperty(EventBoolean.prototype, "value", {
		get: function () {
			return this._value;
		},
		set: function (newValue) {
			return this.set(newValue);
		}
	});

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

	EventBoolean.prototype.toggle = function () {
		var newValue = !this._value;
		this._value = newValue;
		this.eventifyTriggerEvent("change", newValue);
		return true;
	};






	/* 
		EVENT VARIABLE

		Single variable, its value accessible through get and set methods. 
		Defines an event 'change' whenever the value of the variable is changed. 

		Event variable may alternatively have a src eventVariable.
		If it does, setting values will simply be forwarded to the source,
		and value changes in src will be reflected.
		This may be used to switch between event variables, simply by setting the 
		src property.
	*/


	var EventVariable = function (initValue, options) {
		options = options || {};
		options.eqFunc = options.eqFunc || areEqual;
		this._options = options;
		
		BaseEventObject.call(this);
		this._value = initValue;
		this._src;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", options); 

		// onSrcChange
		var self = this;
		this._onSrcChange = function (value) {
			self.set(value);
		};
	};
	BaseEventObject.inherit(EventVariable, BaseEventObject);

	// ovverride to specify initialevents
	EventVariable.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	Object.defineProperty(EventVariable.prototype, "value", {
		get: function () {
			return this._value;
		},
		set: function (newValue) {
			// only if src is not set
			if (this._src === undefined) {
				this.set(newValue);
			} else {
				this._src.value = newValue;
			}
		}
	});

	Object.defineProperty(EventVariable.prototype, "src", {
		get : function () {
			return this._src;
		},
		set: function (newSrc) {
			if (this._src) {
				// disconnect from old src
				this._src.off("change", this._onSrcChange);
			}
			// connect to new src
			this._src = newSrc;
			this._src.on("change", this._onSrcChange);
		}
	});

	EventVariable.prototype.get = function () { return this._value;};

	EventVariable.prototype.set = function (newValue) {
		var eqFunc = this._options.eqFunc;
		if (!eqFunc(newValue,this._value)) {
			this._value = newValue;
			this.eventifyTriggerEvent("change", newValue);
			return true;
		}
		return false;
	};


	// utility function to make promise out of event variable
	var makeEventPromise = function (ev, target) {
		target = (target !== undefined) ? target : true;
		return new Promise (function (resolve, reject) {
			var callback = function (value) {
				if (value === target) {
					resolve();
					ev.off("change", callback);
				}
			};
			ev.on("change", callback);	
		});
	};


	



	// module api
	return {
		eventifyPrototype : eventifyPrototype,
		eventifyInstance : eventifyInstance,
		BaseEventObject : BaseEventObject,
		EventVariable : EventVariable,
		EventBoolean : EventBoolean,
		makeEventPromise : makeEventPromise
	};
});
