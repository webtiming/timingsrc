
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


define('util/eventify',[],function () {

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

	var eventifyInstance = function (object) {
		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> HandlerMap
		object._immediateCallbacks = [];
		object._eBuffer = []; // buffering events before dispatch
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


define('util/motionutils',[],function () {

	'use strict';



	// Closure
	(function() {
	  /**
	   * Decimal adjustment of a number.
	   *
	   * @param {String}  type  The type of adjustment.
	   * @param {Number}  value The number.
	   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
	   * @returns {Number} The adjusted value.
	   */
	  function decimalAdjust(type, value, exp) {
	    // If the exp is undefined or zero...
	    if (typeof exp === 'undefined' || +exp === 0) {
	      return Math[type](value);
	    }
	    value = +value;
	    exp = +exp;
	    // If the value is not a number or the exp is not an integer...
	    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
	      return NaN;
	    }
	    // Shift
	    value = value.toString().split('e');
	    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
	    // Shift back
	    value = value.toString().split('e');
	    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
	  }

	  // Decimal round
	  if (!Math.round10) {
	    Math.round10 = function(value, exp) {
	      return decimalAdjust('round', value, exp);
	    };
	  }
	  // Decimal floor
	  if (!Math.floor10) {
	    Math.floor10 = function(value, exp) {
	      return decimalAdjust('floor', value, exp);
	    };
	  }
	  // Decimal ceil
	  if (!Math.ceil10) {
	    Math.ceil10 = function(value, exp) {
	      return decimalAdjust('ceil', value, exp);
	    };
	  }
	})();

	
    // Calculate a snapshot of the motion vector,
    // given initials conditions vector: [p0,v0,a0,t0] and t (absolute - not relative to t0) 
    // if t is undefined - t is set to now
    var calculateVector = function(vector, tsSec) {
		if (tsSec === undefined) {
		    throw new Error ("no ts provided for calculateVector");
		}
		var deltaSec = tsSec - vector.timestamp;	
		return {
			position : vector.position + vector.velocity*deltaSec + 0.5*vector.acceleration*deltaSec*deltaSec,
			velocity : vector.velocity + vector.acceleration*deltaSec,
			acceleration : vector.acceleration, 
			timestamp : tsSec
		};
    };


    //	RANGE STATE is used for managing/detecting range violations.
	var RangeState = Object.freeze({
	    INIT : "init",
	    INSIDE: "inside",
	    OUTSIDE_LOW: "outsidelow",
	    OUTSIDE_HIGH: "outsidehigh"
	});

	/*
		A snapshot vector is checked with respect to range,
		calclulates correct RangeState (i.e. INSIDE|OUTSIDE)
	*/
	var getCorrectRangeState = function (vector, range) {
		var p = vector.position,
			v = vector.velocity,
			a = vector.acceleration;
		if (p > range[1]) return RangeState.OUTSIDE_HIGH;
		if (p < range[0]) return RangeState.OUTSIDE_LOW;
		// corner cases
		if (p === range[1]) {
			if (v > 0.0) return RangeState.OUTSIDE_HIGH;
			if (v === 0.0 && a > 0.0) return RangeState.OUTSIDE_HIGH;
		} else if (p === range[0]) {
		    if (v < 0.0) return RangeState.OUTSIDE_LOW;
		    if (v == 0.0 && a < 0.0) return RangeState.OUTSIDE_HIGH;
		}
		return RangeState.INSIDE;
	};

	/*

		A snapshot vector is checked with respect to range.
		Returns vector corrected for range violations, or input vector unchanged.
	*/
	var checkRange = function (vector, range) {
		var state = getCorrectRangeState(vector, range);
		if (state !== RangeState.INSIDE) {
			// protect from range violation
			vector.velocity = 0.0;
			vector.acceleration = 0.0;
			if (state === RangeState.OUTSIDE_HIGH) {
				vector.position = range[1];
			} else vector.position = range[0];
		}
		return vector;
	};


    
    // Compare values
    var cmp = function (a, b) {
		if (a > b) {return 1;}
		if (a === b) {return 0;}
		if (a < b) {return -1;}
    };

	// Calculate direction of movement at time t.
	// 1 : forwards, -1 : backwards: 0, no movement
    var calculateDirection = function (vector, tsSec) {
		/*
		  Given initial vector calculate direction of motion at time t 
		  (Result is valid only if (t > vector[T]))
		  Return Forwards:1, Backwards -1 or No-direction (i.e. no-motion) 0.
		  If t is undefined - t is assumed to be now.
		*/
		var freshVector = calculateVector(vector, tsSec);
		// check velocity
		var direction = cmp(freshVector.velocity, 0.0);
		if (direction === 0) {
		    // check acceleration
	        direction = cmp(vector.acceleration, 0.0);
		}
		return direction;
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    var hasRealSolution = function (p,v,a,x) {
		if ((Math.pow(v,2) - 2*a*(p-x)) >= 0.0) return true;
		else return false;
    };
    
    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return real solutions, in ascending order.
    var calculateRealSolutions = function (p,v,a,x) {
		// Constant Position
		if (a === 0.0 && v === 0.0) {
		    if (p != x) return [];
		    else return [0.0];
		}
		// Constant non-zero Velocity
		if (a === 0.0) return [(x-p)/v];
		// Constant Acceleration
		if (hasRealSolution(p,v,a,x) === false) return [];
		// Exactly one solution
		var discriminant = v*v - 2*a*(p-x);
		if (discriminant === 0.0) {
		    return [-v/a];
		}
		var sqrt = Math.sqrt(Math.pow(v,2) - 2*a*(p-x));
		var d1 = (-v + sqrt)/a;
		var d2 = (-v - sqrt)/a;
		return [Math.min(d1,d2),Math.max(d1,d2)];
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return positive real solutions, in ascending order.
    var calculatePositiveRealSolutions = function (p,v,a,x) {
		var res = calculateRealSolutions(p,v,a,x);
		if (res.length === 0) return [];
		else if (res.length == 1) {
		    if (res[0] > 0.0) { 
				return [res[0]];
		    }
		    else return []; 
		}
		else if (res.length == 2) {
		    if (res[1] < 0.0) return [];
		    if (res[0] > 0.0) return [res[0], res[1]];
		    if (res[1] > 0.0) return [res[1]];
		    return [];
		}
		else return [];
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return the least positive real solution.
    var calculateMinPositiveRealSolution = function (vector,x) {
		var p = vector.position;
		var v = vector.velocity;
		var a = vector.acceleration;
		var res = calculatePositiveRealSolutions(p,v,a,x);
		if (res.length === 0) return null;
		else return res[0];
    };
    
    // Given motion determined from p0,v0,a0
    // (initial conditions or snapshot)
    // Supply two posisions, posBefore < p0 < posAfter.
    // Calculate which of these positions will be reached first,
    // if any, by the movement described by the vector.
    // In addition, calculate when this position will be reached.
    // Result will be expressed as time delta relative to t0, 
    // if solution exists,
    // and a flag to indicate Before (false) or After (true)
    // Note t1 == (delta + t0) is only guaranteed to be in the 
    // future as long as the function
    // is evaluated at time t0 or immediately after.
    var calculateDelta = function (vector, range) {
		// Time delta to hit posBefore
		var deltaBeforeSec = calculateMinPositiveRealSolution(vector, range[0]);
		// Time delta to hit posAfter
		var deltaAfterSec = calculateMinPositiveRealSolution(vector, range[1]);
		// Pick the appropriate solution
		if (deltaBeforeSec !== null && deltaAfterSec !== null) {
		    if (deltaBeforeSec < deltaAfterSec)
				return [deltaBeforeSec, range[0]];
		    else 
				return [deltaAfterSec, range[1]];
		}
		else if (deltaBeforeSec !== null)
		    return [deltaBeforeSec, range[0]];
		else if (deltaAfterSec !== null)
		    return [deltaAfterSec, range[1]];
		else return [null,null];
    };
  

    /*
      calculate_solutions_in_interval (vector, d, plist)
      
      Find all intersects in time between a motion and a the
      positions given in plist, within a given time-interval d. A
      single position may be intersected at 0,1 or 2 two different
      times during the interval.
      
      - vector = (p0,v0,a0) describes the initial conditions of
      (an ongoing) motion
      
      - relative time interval d is used rather than a tuple of
      absolute values (t_start, t_stop). This essentially means
      that (t_start, t_stop) === (now, now + d). As a consequence,
      the result is independent of vector[T]. So, if the goal is
      to find the intersects of an ongoing motion during the next
      d seconds, be sure to give a fresh vector from msv.query()
      (so that vector[T] actually corresponds to now).
      
      
      - plist is an array of objects with .point property
      returning a floating point. plist represents the points
      where we investigate intersects in time.
      
      The following equation describes how position varies with time
      p(t) = 0.5*a0*t*t + v0*t + p0
      
      We solve this equation with respect to t, for all position
      values given in plist.  Only real solutions within the
      considered interval 0<=t<=d are returned.  Solutions are
      returned sorted by time, thus in the order intersects will
      occur.

    */
    var sortFunc = function (a,b){return a[0]-b[0];};
    var calculateSolutionsInInterval2 = function(vector, deltaSec, plist) {
		var solutions = [];
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		for (var i=0; i<plist.length; i++) {
		    var o = plist[i];
		    if (!hasRealSolution(p0, v0, a0, o.point)) continue;
		    var intersects = calculateRealSolutions(p0,v0,a0, o.point);
		    for (var j=0; j<intersects.length; j++) {
				var t = intersects[j];
				if (0.0 <= t && t <= deltaSec) {
				    solutions.push([t,o]);
				}
		    }
		}
		// sort solutions
		solutions.sort(sortFunc);
		return solutions;
    };




    var calculateSolutionsInInterval = function(vector, deltaSec, plist) {
    	// protect from tiny errors introduced by calculations
    	// round to 10'th decimal
		deltaSec = Math.round10(deltaSec, -10);
		var solutions = [];
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		for (var i=0; i<plist.length; i++) {
		    var o = plist[i];
		    if (!hasRealSolution(p0, v0, a0, o.point)) continue;
		    var intersects = calculateRealSolutions(p0,v0,a0, o.point);
		    for (var j=0; j<intersects.length; j++) {
				var t = intersects[j];
				// protect from tiny errors introduced by calculations
    			// round to 10'th decimal
    			t = Math.round10(t, -10);
				if (0.0 <= t && t <= deltaSec) {
				    solutions.push([t,o]);
				} else {	
					console.log("dropping event : 0<t<deltaSec is not true", t, deltaSec);	
				}
		    }
		}
		// sort solutions
		solutions.sort(sortFunc);
		return solutions;
    };


    /*
      Within a definite time interval, a motion will "cover" a
      definite interval on the dimension. Calculate the min, max
      positions of this interval, essentially the smallest
      position-interval that contains the entire motion during the
      time-interval of length d seconds.
      
      relative time interval d is used rather than a tuple of absolute values
      (t_start, t_stop). This essentially means that (t_start, t_stop) ===
      (now, now + d). As a consequence, the result
      is independent of vector[T]. So, if the goal is to
      find the interval covered by an ongoing motion during the
      next d seconds, be sure to give a fresh vector from
      msv.query() (so that vector[T] actually corresponds to
      now).
      
      The calculation takes into consideration that acceleration
      might turn the direction of motion during the time interval.
    */



    var calculateInterval = function (vector, deltaSec) {
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		var p1 = p0 + v0*deltaSec + 0.5*a0*deltaSec*deltaSec;
		
		/*
		  general parabola
		  y = ax*x + bx + c
		  turning point (x,y) : x = - b/2a, y = -b*b/4a + c
		  
		  p_turning = 0.5*a0*d_turning*d_turning + v0*d_turning + p0
		  a = a0/2, b=v0, c=p0
		  turning point (d_turning, p_turning):
		  d_turning = -v0/a0
		  p_turning = p0 - v0*v0/(2*a0)
		*/
		
		if (a0 !== 0.0) {
		    var d_turning = -v0/a0;
		    if (0.0 <= d_turning && d_turning <= d) {
				// turning point was reached p_turning is an extremal value            
				var p_turning = p0 - 0.5*v0*v0/a0;
				// a0 > 0 => p_turning minimum
				// a0 < 0 => p_turning maximum
				if (a0 > 0.0) {
					return [p_turning, Math.max(p0, p1)];
				}
				else {
				    return [Math.min(p0,p1), p_turning];
				}
		    }
		}
		// no turning point or turning point was not reached
		return [Math.min(p0,p1), Math.max(p0,p1)];
    };
    

	// return module object
	return {
		calculateVector : calculateVector,
		calculateDirection : calculateDirection,
		calculateMinPositiveRealSolution : calculateMinPositiveRealSolution,
		calculateDelta : calculateDelta,
		calculateInterval : calculateInterval,
		calculateSolutionsInInterval : calculateSolutionsInInterval,
		calculateSolutionsInInterval2 : calculateSolutionsInInterval2,
		getCorrectRangeState : getCorrectRangeState,
		checkRange : checkRange,
		RangeState : RangeState
	};
});


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


define('util/timeoututils',[],function () {

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
	MASTER CLOCK


	MasterClock is the reference clock used by TimingObjects.
	
	It is implemented using performance.now,
	but is skewed and rate-adjusted relative to this local clock.

	This allows it to be used as a master clock in a distributed system,
	where synchronization is generally relative to some other clock than the local clock. 

	The master clock may need to be adjusted in time, for instance as a response to 
	varying estimation of clock skew or drift. The master clock supports an adjust primitive for this purpose.
 
	What policy is used for adjusting the master clock may depend on the circumstances
	and is out of scope for the implementation of the MasterClock.
	This policy is implemented by the timing object. This policy may or may not
	provide monotonicity.

	A change event is emitted every time the masterclock is adjusted.
	
	Vector values define 
	- position : absolute value of the clock in seconds
	- velocity : how many seconds added per second (1.0 exactly - or very close)
	- timestamp : timstamp from local system clock (performance) in seconds. Defines point in time where position and velocity are valid.

	If initial vector is not provided, default value is 
	{position: now, velocity: 1.0, timestamp: now};
	implying that master clock is equal to local clock.
*/

define('util/masterclock',['./eventify', './timeoututils'], function (eventify, timeoututils) {

	'use strict';

	// Need a polyfill for performance,now as Safari on ios doesn't have it...
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

	var calculateVector = function (vector, tsSec) {
		if (tsSec === undefined) tsSec = localClock.now();
		var deltaSec = tsSec - vector.timestamp;	
		return {
			position : vector.position + vector.velocity*deltaSec,
			velocity : vector.velocity, 
			timestamp : tsSec
		};
	};

	var MasterClock = function (options) {
		var now = localClock.now();
		options = options || {};
		this._vector  = {position: now, velocity: 1.0, timestamp: now};	
		// event support
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change"); // define change event (no init-event)
		// adjust
		this.adjust(options);
	};
	eventify.eventifyPrototype(MasterClock.prototype);


	/*
		ADJUST
		- could also accept timestamp for velocity if needed?
		- given skew is relative to local clock 
		- given rate is relative to local clock
	*/
	MasterClock.prototype.adjust = function (options) {
		options = options || {};
		var now = localClock.now();
		var nowVector = this.query(now);
		if (options.skew === undefined && options.rate === undefined) {
			return;
		}
		this._vector = {
			position : (options.skew !== undefined) ? now + options.skew : nowVector.position,
			velocity : (options.rate !== undefined) ? options.rate : nowVector.velocity,
			timestamp : nowVector.timestamp
		}
		this.eventifyTriggerEvent("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	MasterClock.prototype.now = function () {
		return calculateVector(this._vector, localClock.now()).position;
	};

	/* 
		QUERY 
		- calculates the state of the clock right now
		- result vector includes position and velocity		
	*/
	MasterClock.prototype.query = function (now) {
		return calculateVector(this._vector, now);
	};

	/*
		Timeout support
	*/
	MasterClock.prototype.setTimeout = function (callback, delay, options) {
		return timeoututils.setTimeout(this, callback, delay, options);
	};

	return MasterClock;
});
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



define('timingobject/timingobject',['../util/eventify', '../util/motionutils', '../util/masterclock'], function (eventify, motionutils, MasterClock) {

	'use strict';

	// Utility inheritance function.
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


	// Polyfill for performance.now as Safari on ios doesn't have it...
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

	
	/*
		TIMING BASE

		abstract base class for objects that may be used as timingsrc

		essential internal state
		- range, vector
	
		external methods
		query, update

		events
		on/off "change", "timeupdate"
		
		internal methods for range timeouts
		
		defines internal processing steps
		- preProcess(vector) <- from external timingobject
			- vector = onChange(vector)
			- process(vector) <- from timeout or preProcess
		- process (vector) 
			- set internal vector
			- postProcess(vector)
			- renew range timeout
		- postprocess (vector)
			- emit change event and timeupdate event
			- turn periodic timeupdate on or off
	
		individual steps in this structure may be specialized
		by subclasses (i.e. timing converters)
	*/


	var TimingBase = function (options) {

		this._options = options || {};

		// cached vector
		this._vector = {
			position : undefined,
			velocity : undefined,
			acceleration : undefined,
			timestamp : undefined
		};
		
		// cached range
		this._range = [undefined,undefined];

		// readiness
		this._ready = new eventify.EventBoolean(false, {init:true});
		
		// exported events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)

		// timeout support
		this._timeout = null; // timeoutid for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		if (!this._options.hasOwnProperty("timeout")) {
			// range timeouts off by default
			this._options.timeout = false;
		}
	};
	eventify.eventifyPrototype(TimingBase.prototype);


	/*

		EVENTS

	*/

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
	  	- overrides to add support for timeupdate events
	*/
	TimingBase.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return (this._ready.value === true) ? [undefined] : []; 
		} else if (type === "timeupdate") {
			return (this._ready.value === true) ? [undefined] : []; 
		} 
		return [];
	};


	/*

		API

	*/

	// version
	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { return this._version; }
	});

	// ready or not
	TimingBase.prototype.isReady = function () {
		return this._ready.value;
	};

	// ready promise
	Object.defineProperty(TimingBase.prototype, 'ready', {
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

	// range
	
	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () { 
			// copy range
			return [this._range[0], this._range[1]]; 
		}
	});
	

	// internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {
			// copy vector
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
		}
	});

	// internal clock
	Object.defineProperty(TimingBase.prototype, 'clock', {
		get : function () {	throw new Error ("not implemented") }	
	});

	// query
	TimingBase.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};

	// update - to be ovverridden
	TimingBase.prototype.update = function (vector) {
		throw new Error ("not implemented");
	};

	TimingBase.prototype.checkUpdateVector = function(vector) {
		if (vector == undefined) {
			throw new Error ("drop update, illegal updatevector");
		}

		// todo - check that vector properties are numbers
		var pos = vector.position;
		var vel = vector.velocity;
		var acc = vector.acceleration;

		if (pos == undefined && vel == undefined && acc == undefined) {
			throw new Error ("drop update, noop");
		}

		// default values
		var p = 0, v = 0, a = 0;
		var now = vector.timestamp || this.clock.now();
		if (this.isReady()) {
			var nowVector = motionutils.calculateVector(this._vector, now);
			nowVector = motionutils.checkRange(nowVector, this._range);
			p = nowVector.position;
			v = nowVector.velocity;
			a = nowVector.acceleration;
		} 

		pos = (pos != undefined) ? pos : p;
		vel = (vel != undefined) ? vel : v;
		acc = (acc != undefined) ? acc : a;
		return {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
	} 


	// shorthand accessors
	Object.defineProperty(TimingBase.prototype, 'pos', {
		get : function () {
			return this.query().position;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'vel', {
		get : function () {
			return this.query().velocity;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'acc', {
		get : function () {
			return this.query().acceleration;
		}
	});


	/*

		INTERNAL METHODS

	*/


	/*
		do not override
		Handle incoming vector, from "change" from external object
		or from an internal timeout.
		
		onVectorChange is invoked allowing subclasses to specify transformation
		on the incoming vector before processing.
	*/
	TimingBase.prototype._preProcess = function (vector) {
		vector = this.onVectorChange(vector);
		this._process(vector);
	};


	// may be overridden by subclsaa
	TimingBase.prototype.onRangeChange = function (range) {
		return range;
	};

	/*
		specify transformation
		on the incoming vector before processing.
		useful for Converters that do mathematical transformations,
		or as a way to enforse range restrictions.
		invoming vectors from external change events or internal
		timeout events

		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype.onVectorChange = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};

	/*
		core processing step after change event or timeout
		assignes the internal vector
	*/
	TimingBase.prototype._process = function (vector) {
		if (vector !== null) {
			var old_vector = this._vector;
			// update internal vector
			this._vector = vector;
			// trigger events
			this._ready.value = true;
			this._postProcess(this._vector);
		}
		// renew timeout
		this._renewTimeout();
	};

	/*
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events 
		need to be suppressed,
	*/
	TimingBase.prototype._postProcess = function (vector) {
		// trigger change events
		this.eventifyTriggerEvent("change");
		// trigger timeupdate events
		this.eventifyTriggerEvent("timeupdate");
		var moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
		if (moving && this._tid === null) {
			var self = this;
			this._tid = setInterval(function () {
				self.eventifyTriggerEvent("timeupdate");
			}, 200);
		} else if (!moving && this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
		}
	};


	/*

		TIMEOUTS
	
	*/

	/*
		do not override
		renew timeout is called during evenry processing step
		in order to recalculate timeouts.
		the calculation may be specialized in
		_calculateTimeoutVector
	*/
	TimingBase.prototype._renewTimeout = function () {
		if (this._options.timeout === true) {
			this._clearTimeout();
			var vector = this._calculateTimeoutVector();
			if (vector === null) {return;}
			var now = this.clock.now();
	 		var secDelay = vector.timestamp - now;
	 		var self = this;
	 		this._timeout = this.clock.setTimeout(function () {
				self._process(self.onTimeout(vector));
	      	}, secDelay, {anchor: now, early: 0.005}); 
		}
	};

	/*
		to be overridden
		must be implemented by subclass if range timeouts are required
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.
	*/
	TimingBase.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this._range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		if (deltaSec === Infinity) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	/*
		do not override
		internal utility function for clearing vector timeout
	*/
	TimingBase.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	/*
		to be overridden
		subclass may implement transformation on timeout vector
		before it is given to process.
		returning null stops further processing, except renewtimeout 
	*/
	TimingBase.prototype.onTimeout = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};




	/*
		INTERNAL PROVIDER
	
		Timing provider internal to the browser context

		Used by timing objects as timingsrc if no timingsrc is specified.
	*/

	var InternalProvider = function (options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this, options);

		// initialise internal state
		this._clock = new MasterClock({skew:0});
		// range
		this._range = this._options.range || [-Infinity, Infinity];
		// vector
		var vector = this._options.vector || {
			position : 0,
			velocity : 0,
			acceleration : 0
		};
		this.update(vector);
	};
	inherit(InternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(InternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// update
	InternalProvider.prototype.update = function (vector) {
		var newVector = this.checkUpdateVector(vector);
		this._preProcess(newVector);
		return newVector;
	};
	

	/*
		EXTERNAL PROVIDER

		External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
		and the TIMINGSRC API

		Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

		- wraps a timing provider external 
		- handles some complexity that arises due to the very simple API of providers
		- implements a clock for the provider
	*/


	// Need a polyfill for performance,now as Safari on ios doesn't have it...

	// local clock in seconds
	var local_clock = {
		now : function () {return performance.now()/1000.0;}
	}; 

	var ExternalProvider = function (provider, options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this);

		this._provider = provider;
		
		this._provider_clock; // provider clock (may fluctuate based on live skew estimates)
		/* 
			local clock
			provider clock normalised to values of performance now
			normalisation based on first skew measurement, so 
		*/
		this._clock; 


		// register event handlers
		var self = this;
		this._provider.on("vectorchange", function () {self._onVectorChange();});
		this._provider.on("skewchange", function () {self._onSkewChange();});

		// check if provider is ready
		if (this._provider.skew != undefined) {
			var self = this;
			Promise.resolve(function () {
				self._onSkewChange();
			});
		}
	};
	inherit(ExternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(ExternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// internal provider object
	Object.defineProperty(ExternalProvider.prototype, 'provider', {
		get : function () {	return this._provider; }	
	});

	ExternalProvider.prototype._onSkewChange = function () {
		if (!this._clock) {
			this._provider_clock = new MasterClock({skew: this._provider.skew});
			this._clock = new MasterClock({skew:0});
		} else {			
			this._provider_clock.adjust({skew: this._provider.skew});
			// provider clock adjusted with new skew - correct local clock similarly
			// current_skew = clock_provider - clock_local
			var current_skew = this._provider_clock.now() - this._clock.now();
			// skew delta = new_skew - current_skew
			var skew_delta = this._provider.skew - current_skew;
			this._clock.adjust({skew: skew_delta});
		}
		if (!this.isReady() && this._provider.vector != undefined) {
			// just became ready (onVectorChange has fired earlier)
			this._range = this._provider.range;
			this._preProcess(this._provider.vector);
		}		
	};

	ExternalProvider.prototype._onVectorChange = function () {
		if (this._clock) {
			// is ready (onSkewChange has fired earlier)
			if (!this._range) {
				this._range = this._provider.range;
			}
			this._preProcess(this._provider.vector);
		}
	};


	/*
		- local timestamp of vector is set for each new vector, using the skew available at that time
		- the vector then remains unchanged
		- skew changes affect local clock, thereby affecting the result of query operations

		- one could imagine reevaluating the vector as well when the skew changes, 
			but then this should be done without triggering change events

		- ideally the vector timestamp should be a function of the provider clock  

	*/



	// 	override timing base to recalculate timestamp
	ExternalProvider.prototype.onVectorChange = function (provider_vector) {
		// local_ts = provider_ts - skew
		var local_ts = provider_vector.timestamp - this._provider.skew;
		return {
			position : provider_vector.position,
			velocity : provider_vector.velocity,
			acceleration : provider_vector.acceleration,
			timestamp : local_ts
		}
	};


	// update
	ExternalProvider.prototype.update = function (vector) {
		return this._provider.update(vector);
	};



	/*

		TIMING OBJECT BASE

	*/

	var TimingObjectBase = function (timingsrc, options) {
		TimingBase.call(this, options);
		this._version = 4;
		/*
			store a wrapper function used as a callback handler from timingsrc
			(if this was a prototype function - it would be shared by multiple objects thus
			prohibiting them from subscribing to the same timingsrc)
		*/
		var self = this;
		this._internalOnChange = function () {
			var vector = self._timingsrc.vector;
			self._preProcess(vector);
		};
		this._timingsrc = undefined;
		this.timingsrc = timingsrc;
	};
	inherit(TimingObjectBase, TimingBase);


	// attach inheritance function on base constructor for convenience
	TimingObjectBase.inherit = inherit;

	// internal clock
	Object.defineProperty(TimingObjectBase.prototype, 'clock', {
		get : function () {	return this._timingsrc.clock; }	
	});

	TimingObjectBase.prototype.onRangeChange = function (range) {
		return range;
	};

	// invoked just after timingsrc switch 
	TimingObjectBase.prototype.onSwitch = function () {
	};


	/*

		timingsrc property and switching on assignment

	*/
	Object.defineProperty(TimingObjectBase.prototype, 'timingsrc', {
		get : function () {
			if (this._timingsrc instanceof InternalProvider) {
				return undefined
			} else if (this._timingsrc instanceof ExternalProvider) {
				return this._timingsrc.provider;
			} else {
				return this._timingsrc;
			}
		},
		set : function (timingsrc) {
			// new timingsrc undefined		
			if (!timingsrc) {
				var options;
				if (!this._timingsrc) {
					// first time - use options
					options = {
						vector : this._options.vector,
						range : this._options.range
					}
				} else {
					// not first time - use current state
					options = {
						vector : this._vector,
						range : this._range
					} 
				}
				timingsrc = new InternalProvider(options);
			}
			else if ((timingsrc instanceof TimingObjectBase) === false) {
				// external provider - try to wrap it
				try {
					timingsrc = new ExternalProvider(timingsrc); 
				} catch (e) {
					console.log(timingsrc);
					throw new Error ("illegal timingsrc - not instance of timing object base and not timing provider");
				}
			}
			// transformation when new timingsrc is ready
			var self = this;
			var doSwitch = function () {
				// disconnect and clean up timingsrc
				if (self._timingsrc) {
					self._timingsrc.off("change", self._internalOnChange);
				}
				self._timingsrc = timingsrc;
				if (self._timingsrc.range !== self._range) {
					self._range = self.onRangeChange(self._timingsrc.range);
				}
				self.onSwitch();
				self._timingsrc.on("change", self._internalOnChange);	
			};
			if (timingsrc.isReady()) {
				doSwitch();
			} else {
				timingsrc.ready.then(function (){
					doSwitch();
				});
			}
		}
	});

	// update
	TimingObjectBase.prototype.update = function (vector) {
		return this._timingsrc.update(vector);
	};
	

	/*
		Timing Object
	*/
	var TimingObject = function (options) {
		options = options || {};
		var timingsrc = options.timingsrc || options.provider;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(TimingObject, TimingObjectBase);

	// module
	return {
		InternalProvider : InternalProvider,
		ExternalProvider : ExternalProvider,
		TimingObjectBase : TimingObjectBase,
		TimingObject : TimingObject
	};
});



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
	SKEW CONVERTER

	Skewing the timeline by 2 means that the timeline position 0 of the timingsrc becomes position 2 of Converter.

*/

define('timingobject/skewconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;
	var inherit = TimingObjectBase.inherit;

	var SkewConverter = function (timingsrc, skew, options) {
		if (!(this instanceof SkewConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._skew = skew;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(SkewConverter, TimingObjectBase);

	// overrides
	SkewConverter.prototype.onRangeChange = function (range) {
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._skew;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._skew;
		return range;
	};
	
	// overrides
	SkewConverter.prototype.onVectorChange = function (vector) {
		vector.position += this._skew;	
		return vector;
	};

	SkewConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._skew;
		}
		return this.timingsrc.update(vector);
	};


	Object.defineProperty(SkewConverter.prototype, 'skew', {
		get : function () {
			return this._skew;
		},
		set : function (skew) {
			this._skew = skew;
			// pick up vector from timingsrc
			var src_vector = this.timingsrc.vector;
			// use this vector to emulate new event from timingsrc
			this._preProcess(src_vector);
		}
	});


	return SkewConverter;
});
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
	DELAY CONVERTER

	Delay Converter introduces a positive time delay on a source timing object.

	Generally - if the source timing object has some value at time t, 
	then the delayConverter will provide the same value at time t + delay.

	Since the delay Converter is effectively replaying past events after the fact,
	it is not LIVE and not open to interactivity (i.e. update)
	
*/


define('timingobject/delayconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var DelayConverter = function (timingObject, delay) {
		if (!(this instanceof DelayConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delayconverter pointless");}
		TimingObjectBase.call(this, timingObject);
		// fixed delay
		this._delay = delay;
	};
	inherit(DelayConverter, TimingObjectBase);

	// overrides
	DelayConverter.prototype.onVectorChange = function (vector) {
		/* 			
			Vector's timestamp always time-shifted (back-dated) by delay

			Normal operation is to delay every incoming vector update.
			This implies returning null to abort further processing at this time,
			and instead trigger a later continuation.

			However, delay is calculated based on the timestamp of the vector (age), not when the vector is 
			processed in this method. So, for small small delays the age of the vector could already be
			greater than delay, indicating that the vector is immediately valid and do not require delayed processing.

			This is particularly true for the first vector, which may be old. 

			So we generally check the age to figure out whether to apply the vector immediately or to delay it.
		*/

		// age of incoming vector
		var age = this.clock.now() - vector.timestamp;
		
		// time-shift vector timestamp
		vector.timestamp += this._delay;

		if (age < this._delay) {
			// apply vector later - abort processing now
			var self = this;
			var delayMillis = (this._delay - age) * 1000;
			setTimeout(function () {
				self._process(vector);
			}, delayMillis);	
			return null;
		}
		// apply vector immediately - continue processing
		return vector;
	};

	DelayConverter.prototype.update = function (vector) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

	return DelayConverter;
});
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
	SCALE CONVERTER

	Scaling by a factor 2 means that values of the timing object (position, velocity and acceleration) are multiplied by two.
	For example, if the timing object represents a media offset in seconds, scaling it to milliseconds implies a scaling factor of 1000.

*/


define('timingobject/scaleconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var ScaleConverter = function (timingsrc, factor) {
		if (!(this instanceof ScaleConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._factor = factor;
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(ScaleConverter, TimingObjectBase);

	// overrides
	ScaleConverter.prototype.onRangeChange = function (range) {
		return [range[0]*this._factor, range[1]*this._factor];
	};

	// overrides
	ScaleConverter.prototype.onVectorChange = function (vector) {
		vector.position = vector.position * this._factor;
		vector.velocity = vector.velocity * this._factor;
		vector.acceleration = vector.acceleration * this._factor;
		return vector;
	};
	
	ScaleConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position / this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity / this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration / this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleConverter;
});
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
	LOOP CONVERTER

	This is a modulo type transformation where the converter will be looping within
	a given range. Potentially one could create an associated timing object keeping track of the 
	loop number.
*/


define('timingobject/loopconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	/* 
		Coordinate system based on counting segments
		skew + n*length + offset === x
		skew : coordinate system is shifted by skew, so that segment 0 starts at offset.
		n : segment counter
		length : segment length
		offset : offset of value x into the segment where it lies
		x: float point value
	*/
	var SegmentCoords = function (skew, length) {
		this.skew = skew;
		this.length = length;
	};

	/* 
		Static method
		ovverride modulo to behave better for negative numbers 
	*/
	SegmentCoords.mod = function (n, m) {
		return ((n % m) + m) % m;
	};
	
	// get point representation from float
	SegmentCoords.prototype.getPoint = function (x) {
		return {
			n : Math.floor((x-this.skew)/this.length),
			offset : SegmentCoords.mod(x-this.skew,this.length)
		};
	};
	
	// get float value from point representation
	SegmentCoords.prototype.getFloat = function (p) {
		return this.skew + (p.n * this.length) + p.offset;
	};

	// transform float x into segment defined by other float y 
	// if y isnt specified - transform into segment [skew, skew + length]
	SegmentCoords.prototype.transformFloat = function (x, y) {
		y = (y === undefined) ? this.skew : y;
		var xPoint = this.getPoint(x);
		var yPoint = this.getPoint(y);
		return this.getFloat({n:yPoint.n, offset:xPoint.offset});
	};


	/*
		LOOP CONVERTER
	*/

	var LoopConverter = function (timingsrc, range) {
		if (!(this instanceof LoopConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc, {timeout:true});
		/*
			note :
			if a range point of the loop converter is the same as a range point of timingsrc,
			then there will be duplicate events
		*/
		this._range = range;
		this._coords = new SegmentCoords(range[0], range[1]-range[0]);
	};
	inherit(LoopConverter, TimingObjectBase);

	// transform value from coordiantes X of timing source
	// to looper coordinates Y
	LoopConverter.prototype._transform = function (x) {
		return this._coords.transformFloat(x);
	};

	// transform value from looper coordinates Y into 
	// coordinates X of timing object - maintain relative diff 
	LoopConverter.prototype._inverse = function (y) {
		var current_y = this.query().position;
		var current_x = this.timingsrc.query().position;
		var diff = y - current_y;
		var x = diff + current_x;
		// verify that x is witin range
		return x;
	};

	// overrides
	LoopConverter.prototype.query = function () {
		if (this.vector === null) return {position:undefined, velocity:undefined, acceleration:undefined};
		var vector = motionutils.calculateVector(this.vector, this.clock.now());
		// trigger state transition if range violation is detected
		if (vector.position > this._range[1]) {
			this._process(this._calculateInitialVector());
		} else if (vector.position < this._range[0]) {
			this._process(this._calculateInitialVector());
		} else {
			// no range violation
			return vector;
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};

	// overrides
	LoopConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = this._inverse(vector.position);
		}
		return this.timingsrc.update(vector);
	};

	// overrides
	LoopConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	LoopConverter.prototype.onRangeChange = function(range) {
		return this._range;
	};

	// overrides
	LoopConverter.prototype.onTimeout = function (vector) {
		return this._calculateInitialVector();
	};

	// overrides
	LoopConverter.prototype.onVectorChange = function (vector) {
		return this._calculateInitialVector();
	};

	LoopConverter.prototype._calculateInitialVector = function () {
		// parent snapshot 
		var parentVector = this.timingsrc.query();
		// find correct position for looper
		var position = this._transform(parentVector.position);
		// find looper vector
		return {
			position: position,
			velocity: parentVector.velocity,
			acceleration: parentVector.acceleration,
			timestamp: parentVector.timestamp
		};
	};

	return LoopConverter;
});
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

	RANGE CONVERTER

	The converter enforce a range on position.

	It only has effect if given range is a restriction on the range of the timingsrc.
	Range converter will pause on range endpoints if timingsrc leaves the range. 
	Range converters will continue mirroring timingsrc once it comes into the range.
*/

define('timingobject/rangeconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;
	var RangeState = motionutils.RangeState;


	var state = function () {
		var _state = RangeState.INIT;
		var _range = null;
		var is_special_state_change = function (old_state, new_state) {
			// only state changes between INSIDE and OUTSIDE* are special state changes.
			if (old_state === RangeState.OUTSIDE_HIGH && new_state === RangeState.OUTSIDE_LOW) return false;
			if (old_state === RangeState.OUTSIDE_LOW && new_state === RangeState.OUTSIDE_HIGH) return false;
			if (old_state === RangeState.INIT) return false;
			return true;
		}
		var get = function () {return _state;};
		var set = function (new_state, new_range) {
	
			var absolute = false; // absolute change
			var special = false;  // special change

			// check absolute change
			if (new_state !== _state || new_range !== _range) {
				absolute = true;
			}
			// check special change
			if (new_state !== _state) {
				special = is_special_state_change(_state, new_state);			
			}			
			// range change
			if (new_range !== _range) {
				_range = new_range;
			}
			// state change
			if (new_state !== _state) {
				_state = new_state;
			}
			return {special:special, absolute:absolute};

		}
		return {get: get, set:set};
	};


	/*
		Range converter allows a new (smaller) range to be specified.
	*/

	var RangeConverter = function (timingObject, range) {
		if (!(this instanceof RangeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingObject, {timeout:true});
		/*
			note :
			if a range point of the loop converter is the same as a range point of timingsrc,
			then there will be duplicate events
		*/
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeConverter, TimingObjectBase);

	// overrides
	RangeConverter.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._timingsrc.vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};
	
	// overridden
	RangeConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this._timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// override range
	Object.defineProperty(RangeConverter.prototype, 'range', {
		get : function () {
			return [this._range[0], this._range[1]];
		},
		set : function (range) {
			this._range = range;
			// use vector from timingsrc to emulate new event from timingsrc
			this._preProcess(this.timingsrc.vector);
		}
	});

	// overrides
	RangeConverter.prototype.onRangeChange = function(range) {
		return this._range;
	};

	// overrides
	RangeConverter.prototype.onTimeout = function (vector) {	
		return this.onVectorChange(vector);
	};

	// overrides
	RangeConverter.prototype.onVectorChange = function (vector) {
		// console.log("onVectorChange vector", vector);
		// console.log("onVectorChange range", this._range);
		var new_state = motionutils.getCorrectRangeState(vector, this._range);
		// console.log("onVectorChange state", new_state);
		var state_changed = this._state.set(new_state, this._range);
		if (state_changed.special) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = motionutils.checkRange(vector, this._range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
				// stay outside or first event outside 
				// forward if
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				// - range change
				// else drop
				// - outside-high to outside-high (no range change)
				// - outside-low to outside-low (no range change)
				if (state_changed.absolute) {
					vector = motionutils.checkRange(vector, this._range);
				} else {
					// drop event
					return null;
				}
			}
		}
		return vector;
	};

	return RangeConverter;
});
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
	TIMESHIFT CONVERTER

	Timeshift Converter timeshifts a timing object by timeoffset.
	Positive timeoffset means that the timeshift Converter will run ahead of the source timing object.
	Negative timeoffset means that the timeshift Converter will run behind the source timing object.
	
	Updates affect the converter immediately. This means that update vector must be re-calculated
	to the value it would have at time-shifted time. Timestamps are not time-shifted, since the motion is still live.
	For instance, (0, 1, ts) becomes (0+(1*timeshift), 1, ts) 

	However, this transformation may cause range violation 
		- this happens only when timing object is moving.
		- implementation requires range converter logic

	- range is infinite
*/


define('timingobject/timeshiftconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;


	var TimeShiftConverter = function (timingsrc, timeOffset) {
		if (!(this instanceof TimeShiftConverter)) {
			throw new Error("Contructor function called without new operation");
		}

		TimingObjectBase.call(this, timingsrc);
		this._timeOffset = timeOffset;
	};
	inherit(TimeShiftConverter, TimingObjectBase);

	// overrides
	TimeShiftConverter.prototype.onRangeChange = function (range) {
		return [-Infinity, Infinity];
	};


	// overrides
	TimeShiftConverter.prototype.onVectorChange = function (vector) {
		// calculate timeshifted vector
		var newVector = motionutils.calculateVector(vector, vector.timestamp + this._timeOffset);
		newVector.timestamp = vector.timestamp;
		return newVector;
	};

	return TimeShiftConverter;
});
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
	LOCAL CONVERTER

	Update requests are cached locally, visible to the query
	operation, thus allowing them to take effect immediately
	(speculatively).

	This allows as remote timing object to emulate the low latency of a local timing object.

	A timeout clears the speculative internal vector after some time,
	unless a change notification is received in the mean time.

	NO SUPPORT for STREAMING updates. 
	- This implementation is simple, and does not provide support
	for streaming updates.

	This would require the ability to bind update request to update notification, and to have this
	supported by the timing provider.
*/

define('timingobject/localconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var LocalConverter = function (timingsrc) {
		if (!(this instanceof LocalConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc);
		this._speculative = false;
	};
	inherit(LocalConverter, TimingObjectBase);

	// overrides
	LocalConverter.prototype.update = function (vector) {		
		var newVector = this.timingsrc.update(vector);
		this._speculative = true;
		// process update immediately
		var self = this;
		Promise.resolve().then(function () {
			self._preProcess(newVector);
		});
		return newVector;
	};

	// overrides
	LocalConverter.prototype.onVectorChange = function (vector) {
		if (this._speculative) {
			this._speculative = false;
			// todo - suppress change only if it corresponds to change request sent by self
		}
		return vector;
	};

	return LocalConverter;
});
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
	DERIVATIVE CONVERTER

	this Converter implements the derivative of it source timing object.
	
	The velocity of timingsrc becomes the position of the Converter.

	This means that the derivative Converter allows sequencing on velocity of a timing object, 
	by attatching a sequencer on the derivative Converter.
*/

define('timingobject/derivativeconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var DerivativeConverter = function (timingsrc) {
		if (!(this instanceof DerivativeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(DerivativeConverter, TimingObjectBase);

	// overrides
	DerivativeConverter.prototype.onRangeChange = function (range) { 
		return [-Infinity, Infinity];
	};

	// overrides
	DerivativeConverter.prototype.onVectorChange = function (vector) {
		var newVector = {
			position : vector.velocity,
			velocity : vector.acceleration,
			acceleration : 0,
			timestamp : vector.timestamp
		};
		return newVector;
	};
	
	DerivativeConverter.prototype.update = function (vector) {
		throw new Error("updates illegal on derivative of timingobject");
	};

	return DerivativeConverter;
});
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

define('timingobject/main',[
	'./timingobject', 
	'./skewconverter', 
	'./delayconverter', 
	'./scaleconverter', 
	'./loopconverter', 
	'./rangeconverter', 
	'./timeshiftconverter', 
	'./localconverter', 
	'./derivativeconverter'
	], 
	function (timingobject, SkewConverter, DelayConverter, ScaleConverter, LoopConverter, RangeConverter, TimeShiftConverter, LocalConverter, DerivativeConverter) {		
		'use strict';
		return {
			// testing
			TimingObjectBase : timingobject.TimingObjectBase,
			InternalProvider : timingobject.InternalProvider,
			ExternalProvider : timingobject.ExternalProvider,
			// api
			TimingObject : timingobject.TimingObject,
			SkewConverter : SkewConverter,
			DelayConverter : DelayConverter,
			ScaleConverter : ScaleConverter,
			LoopConverter : LoopConverter,
			RangeConverter : RangeConverter,
			TimeShiftConverter : TimeShiftConverter,
			LocalConverter : LocalConverter,
			DerivativeConverter : DerivativeConverter,
		};
	}
);
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

define('util/interval',[],function () {

	'use strict';

	/*
		INTERVAL
	*/

	var isNumber = function(n) {
		var N = parseFloat(n);
	    return (n===N && !isNaN(N));
	};

	var IntervalError = function (message) {
		this.name = "IntervalError";
		this.message = (message||"");
	};
	IntervalError.prototype = Error.prototype;


	var Interval = function (low, high, lowInclude, highInclude) {
		if (!(this instanceof Interval)) {
			throw new Error("Contructor function called without new operation");
		}
		var lowIsNumber = isNumber(low);
		var highIsNumber = isNumber(high);
		// new Interval(3.0) defines singular - low === high
		if (lowIsNumber && high === undefined) high = low; 
		if (!isNumber(low)) throw new IntervalError("low not a number");
		if (!isNumber(high)) throw new IntervalError("high not a number");	
		if (low > high) throw new IntervalError("low > high");
		if (low === high) {
			lowInclude = true;
			highInclude = true;
		}
		if (low === -Infinity) lowInclude = true;
		if (high === Infinity) highInclude = true;
		if (lowInclude === undefined) lowInclude = true;
		if (highInclude === undefined) highInclude = false;
		if (typeof lowInclude !== "boolean") throw new IntervalError("lowInclude not boolean");
		if (typeof highInclude !== "boolean") throw new IntervalError("highInclude not boolean");
		this.low = low;
		this.high = high;
		this.lowInclude = lowInclude;
		this.highInclude = highInclude;
		this.length = this.high - this.low;
		this.singular = (this.low === this.high);
		this.finite = (isFinite(this.low) && isFinite(this.high));
	};


	Interval.prototype.toString = function () {
		var lowBracket = (this.lowInclude) ? "[" : "<";
		var highBracket = (this.highInclude) ? "]" : ">";
		var low = (this.low === -Infinity) ? "<--" : this.low; //.toFixed(2);
		var high = (this.high === Infinity) ? "-->" : this.high; //.toFixed(2);
		if (this.singular)
			return lowBracket + low + highBracket;
		return lowBracket + low + ',' + high + highBracket;
	};

	Interval.prototype.coversPoint = function (x) {
		if (this.low < x && x < this.high) return true;
		if (this.lowInclude && x === this.low) return true;
		if (this.highInclude && x === this.high) return true;
		return false;
	};

	// overlap : it exists at least one point x covered by both interval 
	Interval.prototype.overlapsInterval = function (other) {
		if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");	
		// singularities
		if (this.singular && other.singular) 
			return (this.low === other.low);
		if (this.singular)
			return other.coversPoint(this.low);
		if (other.singular)
			return this.coversPoint(other.low); 
		// not overlap right
		if (this.high < other.low) return false;
		if (this.high === other.low) {
			return this.coversPoint(other.low) && other.coversPoint(this.high);
		}
		// not overlap left
		if (this.low > other.high) return false;
		if (this.low === other.high) {
			return (this.coversPoint(other.high) && other.coversPoint(this.low));
		}
		return true;
	};
	Interval.prototype.coversInterval = function (other) {
		if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");
		if (other.low < this.low || this.high < other.high) return false;
		if (this.low < other.low && other.high < this.high) return true;
		// corner case - one or both endpoints are the same (the other endpoint is covered)
		if (this.low === other.low && this.lowInclude === false && other.lowInclude === true)
			return false;
		if (this.high === other.high && this.highInclude === false && other.highInclude === true)
			return false;
		return true;
	};
	Interval.prototype.equals = function (other) {
		if (this.low !== other.low) return false;
		if (this.high !== other.high) return false;
		if (this.lowInclude !== other.lowInclude) return false;
		if (this.highInclude !== other.highInclude) return false;
		return true;
	};

	/* 
		Possibility for more interval methods such as union, intersection, 
	*/

	return Interval;
});


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


define ('sequencing/sortedarraybinary',['../util/interval'], function (Interval) {

    'use strict';

    // check if n is a number
    var is_number = function(n) {
    	var N = parseFloat(n);
        return (n==N && !isNaN(N));
    };


    var SortedArrayError = function (message) {
        this.name = "SortedArrayError";
        this.message = (message||"");
    };
    SortedArrayError.prototype = Error.prototype;

    /*

    SORTED ARRAY BINARY

    */

    var SortedArrayBinary = function () {
    	/*
    	  use binary search to implement sorted insert
    	  guard against duplicates
    	 */
    	this.array = [];
    };
    	
    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    SortedArrayBinary.prototype.binaryIndexOf = function (searchElement) {
        var minIndex = 0;
        var maxIndex = this.array.length - 1;
        var currentIndex;
        var currentElement;
        while (minIndex <= maxIndex) {
    		currentIndex = (minIndex + maxIndex) / 2 | 0;
    		currentElement = this.array[currentIndex];
    		if (currentElement < searchElement) {
    		    minIndex = currentIndex + 1;
    		}
    		else if (currentElement > searchElement) {
    		    maxIndex = currentIndex - 1;
    		}
    		else {
    		    return currentIndex;
    		}
        }
    	return ~maxIndex;
    	
        // NOTE : ambiguity?
        // search for minimum element returns 0 if it exists, and 0 if it does not exists
    };
    	
    SortedArrayBinary.prototype.insert = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		this.array.splice(Math.abs(index), 0, element);
        }
    };

    SortedArrayBinary.prototype.indexOf = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return -1;
        } else {
    		return index;
        }
    };

    SortedArrayBinary.prototype.hasElement = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return false;
        } else {
    		return true;
        }
    };

    SortedArrayBinary.prototype.remove = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return;
        } else {
    		this.array.splice(index, 1);
        }
    };

    SortedArrayBinary.prototype.getMinimum = function () {
        return (this.array.length > 0) ? this.array[0] : null;
    };

    SortedArrayBinary.prototype.getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : null;
    };

    /* 
       Find index of largest value less than x
       Returns -1 if noe values exist that are less than x
     */
    SortedArrayBinary.prototype.ltIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // consider element to the left
        i = (i < 0) ? Math.abs(i) - 1 : i - 1;
        return (i >= 0) ? i : -1;
    };

    /* 
       Find index of largest value less than x or equal to x 
       Returns -1 if noe values exist that are less than x or equal to x
     */
    SortedArrayBinary.prototype.leIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // equal
        if (i > 0 || (i === 0 && this.array[0] === x)) {
    		return i;
        }
        // consider element to the left
        i = Math.abs(i) - 1;
        return (i >= 0) ? i : -1;
    };

    /* 
       	Find index of smallest value greater than x
       	Returns -1 if noe values exist that are greater than x

    	note ambiguity :
    	
    	search for for an element that is less than array[0]
    	should return a negative value indicating that the element 
    	was not found. Furthermore, as it escapes the while loop
    	the returned value should indicate the index that this element 
    	would have had - had it been there - as is the idea of this bitwise 
    	or trick
    	
    	it should return a negative value x so that
    	Math.abs(x) - 1 gives the correct index which is 0
    	thus, x needs to be -1

    	instead it returns 0 - indicating that the non-existing value
    	was found!
    	
    	I think this bug is specific to breaking out on (minIndex,maxIndex) === (0,-1)



    */

    SortedArrayBinary.prototype.gtIndexOf = function (x) {
        var i = this.binaryIndexOf(x);
        
    	// ambiguity if i === 0
    	if (i === 0) {
    		if (this.array[0] === x) {
    			// found element - need to exclude it
    			// since this is gt it is element to the right
    			i = 1;
    		} else {
    			// did not find element 
    			// - the first element is the correct
    			// i === 0
    		}
    	}
    	else {		
    		i = (i < 0) ? Math.abs(i): i + 1;
    	}
        return (i < this.array.length) ? i : -1;
    };


    /* 
       Find index of smallest value greater than x or equal to x 
       Returns -1 if noe values exist that are greater than x or equal to x
     */

     SortedArrayBinary.prototype.geIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // equal
        if (i > 0 || (i === 0 && this.array[0] === x)) {
    		return i;
        }
    	/*		    
    	if (i === 0) {
        	// ambiguity - either there is no element > x or array[0] is the smallest value > x
        	if (array.length >= 0 && array[0] > x) {
        		return 0;
        	} else return -1;
        } else {
        	// consider element to the right
        	i = Math.abs(i);
    	}
    	*/
    	i = Math.abs(i);	
        return (i < this.array.length) ? i : -1;
    };

    SortedArrayBinary.prototype.lookup = function (interval) {
    	if (interval === undefined) 
    		interval = new Interval(-Infinity, Infinity, true, true);
    	if (interval instanceof Interval === false) 
            throw new SortedArrayError("lookup requires Interval argument");
        var start_index = -1, end_index = -1;
        if (interval.lowInclude) {
    		start_index = this.geIndexOf(interval.low);
        } else {
    		start_index = this.gtIndexOf(interval.low);
        }
        if (start_index === -1) {
    		return [];
        }
        if (interval.highInclude) {
    		end_index = this.leIndexOf(interval.high);
        } else {
    		end_index = this.ltIndexOf(interval.high);
        }
        if (end_index === -1) { // not reachable - I think
    		return [];
        }
        return this.array.slice(start_index, end_index + 1);
    };

    SortedArrayBinary.prototype.get = function (i) {return this.array[i];};
    SortedArrayBinary.prototype.list = function () {return this.array;};

    return SortedArrayBinary;
});




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

define ('sequencing/multimap',[],function () {

	'use strict';

	/*
		MULTI MAP

	  	MultiMap stores (key,value) tuples  
	  	- one key may be bound to multiple values  
		- protection from duplicate (key, value) bindings.
		- values are not assumed to be unique, i.e., the same value may be
	  	associated with multiple points.
	  
		MultiMap supports addition and removal of (key,value) bindings.  
		- insert (key, value) 
		- remove (key, value)
	*/

	var MultiMap = function () {
		this._map = {}; // key -> [value,]
	};

	MultiMap.prototype.insert = function (key, value) {
	    return this.insertAll([{key:key, value:value}]);
	};

	MultiMap.prototype.insertAll = function (tuples) {
	    var values, added = [];
	    tuples.forEach(function (tuple){
	    	if (!this._map.hasOwnProperty(tuple.key)) {
			    this._map[tuple.key] = [];
			}
			// protect against duplicate (key,value) bindings
			values = this._map[tuple.key];
			if (values.indexOf(tuple.value) === -1) {
			    values.push(tuple.value);
			    added.push(tuple);
			}
	    }, this);
	    return added;
	};

	MultiMap.prototype.remove = function (key, value) {
	    return this.removeAll([{key:key, value:value}]);
	};

	MultiMap.prototype.removeAll = function (tuples) {
		var index, values, removed = [];
		tuples.forEach(function (tuple) {
			if (this._map.hasOwnProperty(tuple.key)) {
			    values = this._map[tuple.key];
			    index = values.indexOf(tuple.value);
			    if (index > -1) {
					values.splice(index, 1);
					removed.push(tuple);
					// clean up if empty
					if (values.length === 0) {
					    delete this._map[tuple.key];
					}
			    }
			}
		}, this);
	    return removed;
	};

	MultiMap.prototype.hasKey = function (key) {
		return this._map.hasOwnProperty(key);
	};

	MultiMap.prototype.keys = function () {
		return Object.keys(this._map);
	};

	MultiMap.prototype.getItemsByKey = function (key) {
		var res = [];
		if (this.hasKey(key)) {
			this._map[key].forEach(function (value) {
				res.push({key: key, value: value});
			});	
		}
		return res;
	};

	MultiMap.prototype.getItemsByKeys = function (_keys) {
		if (_keys === undefined) _keys = this.keys();
		var res = [];
		_keys.forEach(function (key) {
			res = res.concat(this.getItemsByKey(key));	
		}, this);
		return res;
	};
	MultiMap.prototype.list = MultiMap.prototype.getItemsByKeys;

	return MultiMap;
});



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


define ('sequencing/axis',['../util/interval', './sortedarraybinary', './multimap', '../util/eventify'], 
	function (Interval, SortedArrayBinary, MultiMap, eventify) {

	'use strict';

	var AxisError = function (message) {
		this.name = "AxisError";
		this.message = (message || "");
	};
	AxisError.prototype = Error.prototype;


	// Operation Types
	var OpType = Object.freeze({
		INIT: "init", // used only by sequencer
		NONE : "none",
		ADD: "add",
		UPDATE: "update",
		REPEAT: "repeat", // update - interval not changed
		REMOVE: "remove"
	});

	// POINT TYPES
    var PointType = Object.freeze({
		LOW: "low",
		SINGULAR: "singular",
		HIGH: "high",
		INSIDE: "inside",
		OUTSIDE: "outside",
		toInteger: function (s) {
		    if (s === PointType.LOW) return -1;
		    if (s === PointType.HIGH) return 1;
		    if (s === PointType.INSIDE) return 2;
		    if (s === PointType.OUTSIDE) return 3;
		    if (s === PointType.SINGULAR) return 0;
		    throw new AxisError("illegal string value for point type");
		},
		fromInteger: function (i) {
			if (i === -1) return PointType.LOW;
			else if (i === 0) return PointType.SINGULAR;
			else if (i === 1) return PointType.HIGH;
			else if (i === 2) return PointType.INSIDE;
			else if (i === 3) return PointType.OUTSIDE;
			throw new AxisError("illegal integer value for point type");
		}
    });


	/*
		AXIS

		Manages a collection of Intervals.
		Each interval is identified by a key, and may be inserted or removed using the key, just like a map/dictionary.
		Interval objects represents an interval on the Axis or real floating point numbers.

		In addition to key access, the Axis provides efficient access to Intervals by search.
		- lookupByInterval (searchInterval) returns all Intervals whose endpoints are covered by given search Interval
		- lookupByPoint (x) returns all Intervals in the collection that covers given point.
	*/

	var Axis = function () {
		// Mapping key to Intervals
		this._map = {}; // key -> Interval(point,point)
		// Revers-mapping Interval points to Interval keys
		this._reverse = new MultiMap(); // point -> [key, ...]
		// Index for searching Intervals effectively by endpoints - used by lookupByInterval
		this._index = new SortedArrayBinary(); // [point, point, ...]
		// No index provided for lookupByPoint

		// Caching data for each key
		this._cache = {}; // key -> data

		// Events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true});
	};
	eventify.eventifyPrototype(Axis.prototype);

	Axis.prototype.eventifyMakeInitEvents = function (type) {
        if (type === "change") {
            return this.items().map(function(item) {
                item.type = "add";
                return item;
            });
            return  [];
        }
        return [];
    };

	// internal helper function to clean up map, index, reverse and cache during (key,interval) removal
	Axis.prototype._remove = function (key) {
		if (this._map.hasOwnProperty(key)) {
			var interval = this._map[key];
			// map
			delete this._map[key];
			// reverse
			this._reverse.remove(interval.low, key);
			this._reverse.remove(interval.high, key);
			// index remove from index if reverse is empty after remove
			if (!this._reverse.hasKey(interval.low)) {
				this._index.remove(interval.low);
			}
			if (!this._reverse.hasKey(interval.high)) {
				this._index.remove(interval.high);
			}
			// cache
			var data;
			if (this._cache.hasOwnProperty(key)) {
				data = this._cache[key];
				delete this._cache[key];
			}
			// return old
			return { type: OpType.REMOVE, key: key, interval: interval, data: data};		
		} else {
			return {type: OpType.NONE, key: key, interval: undefined, data: undefined};
		}
	};

	// internal helper function to insert (key, interval, data) into map, index, reverse and cache
	Axis.prototype._insert = function (key, interval, data) {
		var res = {key: key, interval: interval, data: data};
		if (this._map.hasOwnProperty(key)) {
			// UPDATE
			res.old_interval = this._map[key];
			res.old_data = this._cache[key];
			// clear old values
			this._remove(key);
			/*
			indicate if interval was changed or remained the same
			UPDATE means that interval was updated - affecting the sequencer
			REPEAT means that interval was not changed but repeated. 
			This is typically the case if data was modified without affecting the timing aspects
			*/
			if (interval.equals(res.old_interval)) {
				res.type = OpType.REPEAT;
			} else {
				res.type = OpType.UPDATE;
			}
		} else {
			res.type = OpType.ADD;
		}
		// map
		this._map[key] = interval;
		// index add to index if reverse is empty before insert
		if (!this._reverse.hasKey(interval.low)) {
			this._index.insert(interval.low);
		}
		if (!this._reverse.hasKey(interval.high)) {
			this._index.insert(interval.high);
		}
		// reverse index
		this._reverse.insert(interval.low, key);
		this._reverse.insert(interval.high, key);
		// cache
		this._cache[key] = data;

		return res;		
	};


	/*
		UPDATEALL
		- process a batch of operations
		- adds, updates or removes args [{key:key, interval:interval},] 
	*/
	Axis.prototype.updateAll = function (args) {
		var e, eList = [], key, interval, data;
		args.forEach(function(arg){
			key = arg.key;
			interval = arg.interval;
			data = arg.data;
			if (typeof key !== 'string') throw new AxisError("key is " + typeof key + " - must be string");
			if (interval === undefined) {
				e = this._remove(key);
			} else {
				if (interval instanceof Interval === false) throw new AxisError("parameter must be instanceof Interval");
				e = this._insert(key, interval, data);
			}
			this.eventifyTriggerEvent("change", e);
			eList.push(e);
		}, this);
		// return elist
		return eList;	
	};
	

	// shorthand for update single (key, interval) pair
	Axis.prototype.update = function (key, interval, data) {
		return this.updateAll([{key:key, interval:interval, data:data}]);
	};


    /*
		AXIS SEARCH
    */


	/*
		Find keys for intervals that cover x.
		Simply scan all intervals in collection - no index provided.
		x undefined means all keys in collection

		returns map {key -> undefined}
	*/

	Axis.prototype.lookupKeysByPoint = function (x) {
		var interval, res = {};
		if (x === undefined) {
			Object.keys(this._map).forEach(function (key) {
				res[key] = undefined;
			});
		} else {
			Object.keys(this._map).forEach(function(key){
				interval = this._map[key];
				if (interval.coversPoint(x)) {
					res[key] = undefined;
				}
			}, this);		
		}
		return res;
	};

	/*
		Find keys for all intervals that partially or fully covers search interval.
		returns map {key -> undefined}
		used only by window sequencer
	*/
	Axis.prototype.lookupKeysByInterval = function (interval) {
		// [{key: key, point: point, interval:interval},]		
		var res = {};

		// find keys of all intervals that have endpoints within interval
		this._index.lookup(interval).forEach(function (point) {
			this._reverse.getItemsByKey(point).forEach(function (item) {
				res[item.value] = undefined;
			});
		}, this);

		// add keys of all intervals that have endpoints on both sides of interval
		var leftInterval = new Interval(-Infinity, interval.low);
		var rightInterval = new Interval(interval.high, Infinity);
		this._index.lookup(leftInterval).forEach(function(point) {
			this._reverse.getItemsByKey(point).forEach(function (item) {
				var _interval = this._map[item.value];
				if (rightInterval.coversPoint(_interval.high)) {
					res[item.value] = undefined;
				}
			}, this);
		
		}, this);

		return res;
	};


	/*
		Find cues (key,interval, data) for intervals that cover x.
		Simply scan all intervals in collection - no index provided.
		x undefined means all (key, interval)
	*/
	Axis.prototype.lookupByPoint = function (x) {
		var interval, res = [];
		Object.keys(this._map).forEach(function(key){
			interval = this._map[key];
			if (x === undefined || interval.coversPoint(x)) {
				res.push({key:key, interval: interval, data: this._cache[key]});
			}
		}, this);
		return res;
	};

	/*
		Find all interval endpoints within given interval 
	*/
	Axis.prototype.lookupByInterval = function (interval) {
		// [{key: key, point: point, interval:interval},]
		var res = [], items, point;
		this._index.lookup(interval).forEach(function (point) {
			this._reverse.getItemsByKey(point).forEach(function (item) {
				point = item.key;
				interval = this._map[item.value];
				res.push({
					key: item.value,
					interval: interval,
					data: this._cache[item.value],
					point: point,
					pointType: this.getPointType(point, interval)
				});
			}, this);
		}, this);
		return res;
	};

	Axis.prototype.items = function () {return this.lookupByPoint();};
	Axis.prototype.keys = function () {return Object.keys(this._map);};

	Axis.prototype.getItem = function (key) {
		if (this._map.hasOwnProperty(key)) {
			return {
				key: key, 
				interval: this._map[key],
				data: this._cache[key]
			};
		} 
		return null;
	};

	Axis.prototype.getInterval = function (key) {
		return (this._map.hasOwnProperty(key)) ? this._map[key] : null;
	};

	Axis.prototype.getPointType = function (point, interval) {
		if (interval.singular && point === interval.low) return PointType.SINGULAR;
	    if (point === interval.low) return PointType.LOW;
	    if (point === interval.high) return PointType.HIGH;
	    if (interval.low < point && point < interval.high) return PointType.INSIDE;
	    else return PointType.OUTSIDE;
	};

	Axis.prototype.hasKey = function (key) {
		return this._map.hasOwnProperty(key);
	};

	// module definition
	return {
		Axis: Axis,
		OpType : OpType,
		PointType: PointType
	};
});


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

define('sequencing/sequencer',['../util/motionutils', '../util/eventify', '../util/interval', './axis'], 
	function (motionutils, eventify, Interval, axis)  {

	'use strict';

	// UTILITY

	var isMoving = function (vector) {
		return (vector.velocity !== 0.0 || vector.acceleration !== 0.0);
	};

    // VERBS
    var VerbType = Object.freeze({
		ENTER: "enter",
		EXIT: "exit",
		NONE: "none",
		toInteger: function (s) {
		    if (s === VerbType.ENTER) return 1;
		    if (s === VerbType.EXIT) return -1;
		    if (s === VerbType.NONE) return 0;
		    throw new SequencerError("illegal string value verb type " + s);
		},
		fromInteger : function (i) {
			if (i === -1) return VerbType.EXIT;
			else if (i === 1) return VerbType.ENTER;
			else if (i === 0) return VerbType.NONE;
			throw new SequencerError("illegal integer value for direction type " + i);
		}
    });

    // DIRECTIONS
    var DirectionType = Object.freeze({
		BACKWARDS: "backwards",
		FORWARDS: "forwards",
		NODIRECTION : "nodirection",
		toInteger : function (s) {
		    if (s === DirectionType.BACKWARDS) return -1;
		    if (s === DirectionType.FORWARDS) return 1;
		    if (s === DirectionType.NODIRECTION) return 0;
		    throw new SequencerError("illegal string value direction type " + string);
		},
		fromInteger : function (i) {
			if (i === 0) return DirectionType.NODIRECTION;
			else if (i === -1) return DirectionType.BACKWARDS;
			else if (i === 1) return DirectionType.FORWARDS;
			throw new SequencerError("illegal integer value for direction type" + i + " " + typeof(i));
		}
    });

    // OPTYPES - defined in axis
    var OpType = axis.OpType;



	/*

      SCHEDULE

      The purpose of schedule is to keep tasks planned for execution
      in the near future.
      
      <start> and <end> timestamps defines the time
      interval covered by the schedule - the <covering interval>. The
      idea is to move this interval stepwise, to eventually cover the
      entire time-line. The length of this interval is defined by the
      option <lookahead>. The default value is 5 seconds.

      The <advance> operation moves the interval so that the next
      interval <start> matches the previous interval <end>. If
      lookahead is 5 seconds, the general idea is to advance the
      covering interval every 5 seconds.  However, it is safe to
      advance it more often. It is also safe to advance it less
      often. In this case the covering interval will grow in length to
      cover otherwise lost parts of the timeline - but events will be 
      delivered too late.

      The push(ts,task) operation allows tasks to be added to the
      schedule, provided their due-times fall within the covering
      interval. The push_immediate(task) will assign <ts> === now.
      Push maintains time ordering.
      
      The pop() operation is used to get all tasks that are due for
      execution. The schedule should be popped regularly/frequently to
      keep tasks from being delayed in execution. The delay_next()
      operation returns the time (milliseconds) until the next task is
      due. This can be used with setTimeout() to arrange timely
      popping. However, note that this timeout may have to be
      re-evealuated as new tasks are pushed onto the schedule.

      Associated with the <covering interval> (time), there is also a
      "covering interval" with respect to timing object(position). Eg. In real-time
      (epoch) interval [1434891233.407, 1434891235.407] movement of timing object covers
      positions [23.0, 25.0].  All tasks are associated with a position on a
      dimension. This is set by the advance() operation.  The position
      interval is used (externally) to quickly evaluate relevance of tasks, essentially to
      avoid calculating the due-times of a task only to find that it falls
      outside the time convering interval. Position interval is only managed
      externally.

     */

    var Schedule = function (now, options) {
		this.queue = [];
		// options
		this.options = options || {};	
		this.options.lookahead = this.options.lookahead || 5.0;
		// time-interval
		var start = now;
		var end = now + this.options.lookahead;

		this.timeInterval = new Interval(start, end, true, true);
		// position-interval
		this.posInterval = null;
	};

	Schedule.prototype.getTimeInterval = function (){return this.timeInterval;};
	Schedule.prototype.getPosInterval = function (){return this.posInterval;};
	Schedule.prototype.setPosInterval = function (interval) {this.posInterval = interval;};
	Schedule.prototype.sortFunc = function(a,b) {return a.ts - b.ts;};

	// push
	// task assumed to have a key -- se usage by Sequencer
	Schedule.prototype.push = function (now, ts, task) {
		if (this.timeInterval.coversPoint(ts)) {
			var entry = {
			    ts: ts,
			    task: task,
		    	push_ts: now
			};
			if (ts >= now) {
			    this.queue.push(entry);
			    this.queue.sort(this.sortFunc); // maintain ordering
			    return true;
			} else {
				console.log("Schedule : task pushed a bit too late, ts < now ", (ts-now));
			}
	    }
	    return false;
	};

		// pop
	Schedule.prototype.pop = function (now) {
	    var res = [];
	    while (this.queue.length > 0 && this.queue[0].ts <= now) {
			var entry = this.queue.shift();
			var info = {
			    task: entry.task,
			    pop_ts: now, // fresh timestamp?
			    push_ts: entry.push_ts,
			    ts: entry.ts
			};
			res.push(info);
	    }
	    return res;
	};
		

	/* Invalidate task with given key */
	Schedule.prototype.invalidate = function (key) {
	    var i, index, entry, remove = [];
	    // Find
	    for (i=0; i<this.queue.length; i++) {
			entry = this.queue[i];
			if (entry.task.key === key) {
			    remove.push(entry);
			}
	    }
	    // Remove
	    for (i=0; i<remove.length; i++) {
			entry = remove[i];
			index = this.queue.indexOf(entry);
			if (index > -1) {
			    this.queue.splice(index, 1);
			}
		}
    };


    /*

  		ADVANCE

      The covering time interval is defined by [start,end>
      The covering interval should be advanced so that it always
      contains real-time, e.g., now.

      Advancing the covering interval assumes task queues to be empty.
      Therefore, make sure to pop all task before calling advance.

      Also, the time-sequence of covering intervals should ideally
      lay back-to-back on the time-line. To achive this the end of
      one interval becomes the start of the next. The end of the interval is 
      now + lookahead.
  
      If advance is called before the current interval is expired,
      the current interval is cut short.
  
      If advance is not called for an extended time, the next
      invocation will cause the covering interval to stretch long
      into the past.
    
      If parameter start is supplied, this is used as starting point
      for covering interval.

	*/

	Schedule.prototype.advance = function(now) {
	    if (now < this.timeInterval.low) {
			console.log("Schedule : Advancing backwards " + (now - this.timeInterval.low));
	    }
	    var start = now;
		var end = now + this.options.lookahead;
	    this.queue = []; // drop tasks (time interval cut off)
	    this.timeInterval = new Interval(start, end, false, true);
	    this.posInterval = null; // reset
	};
	
	/* 
		Current schedule is expired (at given time)
	*/	
	Schedule.prototype.isExpired = function(now) {
		return (now > this.timeInterval.high);
	};

	/* 
		delay until the next due task in schedule, or until the
		current time_interval expires 
	*/
	Schedule.prototype.getDelayNextTs = function (ts) {
	    // ts should be fresh timestamp in seconds
	    if (this.queue.length > 0) {
			return Math.max(0.0, this.queue[0].ts - ts);
	    }
	    return Math.max(0.0, this.timeInterval.high - ts);
	};
	
	Schedule.prototype.getNextTaskPoint = function () {
		return (this.queue.length > 0) ? this.queue[0].task.point : null;
	};


	/*
		Sequencer Error
	*/
	var SequencerError = function (message) {
		this.name = "SequencerError";
		this.message = (message || "");
	};
	SequencerError.prototype = Error.prototype;


	/*
		Sequencer EArgs
	*/

	var seqOpType = function (op) {
		if (op === OpType.INIT) return "init";
		if (op === OpType.NONE) return "motion";
		if (op === OpType.ADD) return "add";
		if (op === OpType.UPDATE || op === OpType.REPEAT) return "update";
		if (op === OpType.REMOVE) return "remove";
		return "";
	};
			
	var SequencerEArgs = function (sequencer, key, interval, data, directionInt, point, ts, dueTs, op, verb) {
		var directionType = DirectionType.fromInteger(directionInt);
		var pointType = sequencer._axis.getPointType(point, interval);
		this.src = sequencer;
		this.key = key;
		this.interval = interval;
		this.data = data;
		this.point = point;
		this.pointType = pointType;
		this.dueTs = dueTs;
		this.delay = ts - dueTs;
		this.directionType = directionType;
		this.type = (verb === VerbType.EXIT) ? "remove" : "change";
		this.cause = seqOpType(op);
		this.enter = (verb === VerbType.ENTER);
		this.exit = (verb === VerbType.EXIT);
	};

	SequencerEArgs.prototype.toString = function () {
		var s = "[" +  this.point.toFixed(2) + "]";
        s += " " + this.key;
        s += " " + this.interval.toString();
        s += " " + this.type;
        var verb = "none";
        if (this.enter) verb = "enter";
        else if (this.exit) verb = "exit";
        s += " (" + this.cause + "," + verb + ")";
        s += " " + this.directionType;
        s += " " + this.pointType;
        s += " delay:" + this.delay.toFixed(4);
        if (this.data) s += " " + JSON.stringify(this.data);
        return s;
	};


	/*
		SequencerCue
	*/
	var SequencerCue = function (item) {
		this.key = item.key;
		this.interval = item.interval;
		this.data = item.data;
	};

	SequencerCue.prototype.toString = function () {
		var s = this.key + " " + this.interval.toString();
		if (this.data) s += " " + JSON.stringify(this.data);
		return s;
	};


	/*
	
		SEQUENCER

	*/
	var Sequencer = function (timingObject, _axis) {
		if (!(this instanceof Sequencer)) {
			throw new Error("Contructor function called without new operation");
		}
		this._to = timingObject;
		this._axis = _axis || new axis.Axis();
		this._schedule = null;
		this._timeout = null; // timeout
		this._currentTimeoutPoint = null; // point associated with current timeout
		this._activeKeys = {}; // (key -> undefined)

		this._first = false;
		this._ready = new eventify.EventBoolean(false, {init:true});

		// set up eventing stuff
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define enter event (supporting init-event)
		this.eventifyDefineEvent("remove");

		// wrap prototype handlers and store ref on instance
		this._wrappedOnTimingChange = function () {this._onTimingChange();};
		this._wrappedOnAxisChange = function (eItemList) {
			var eArgList = eItemList.map(function (eItem) {
				return eItem.e;
			});
			this._onAxisChange(eArgList);
		};

		// initialise
		this._to.on("change", this._wrappedOnTimingChange, this);
	};
	eventify.eventifyPrototype(Sequencer.prototype);

	// making Interval constructor available on all sequencer instances
	Object.defineProperty(Sequencer.prototype, "Interval", {
		get : function () {return Interval;}
	});

	Sequencer.prototype.isReady = function () {
		return this._ready.value;
	};

	// ready promise
	Object.defineProperty(Sequencer.prototype, 'ready', {
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

	/*
	  	overrides how immediate events are constructed 
	*/
	Sequencer.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return (this._ready.value) ? this._processInitialEvents() : [];
		}
		return [];
	};

	/* 
	
		ON TIMING OBJECT CHANGE

		Whenever the timingobject position changes abruptly we need to
	        re-evaluate intervals. 

		A) Abrupt changes in position occur 
		   1) after certain timing object changes or 
		   2) when the timing object is initially loaded.

		B) Non-abrupts changes occur when velocity or acceleration is
		changed without immediately affecting the position

		In all cases - the schedule and timeout need to be re-evaluated.

        In case A. 1) the timing object change is possibly late due to network
        latency. To include effects of singulars/intervals from the small "lost"
        time interval, make sure to advance according to the timestamp of the
		timing object vector.  2) is not delayed.
     

        Furthermore in a small time-interval just before timing object updates
        the previous vector incorrectly drove the sequencer instead of the new
        updated vector.  This may have caused the sequencer to falsely
        report some events, and to not report other events.  This time
        interval is (initVector[T], now). For non-singular Intervals this will be
        corrected by the general re-evalution of Intervals. For singular Intervals
        explicit action is required to signal incorrect events. This implementation
        does not support this.

	*/

	Sequencer.prototype._onTimingChange = function (event) {
	    var now = this._to.clock.now();
	    var initVector = this._to.vector;		
		if (this._first === false) {
			// Initial update from timing object starts the sequencer
			this._schedule = new Schedule(now);
			// Register handler on axis
			this._axis.on("events", this._wrappedOnAxisChange, this);
			// ensure that sequencer execution starts with initial events from axis
			this._first = true;
			// Kick off main loop
    		this._load(now);
    		this._main(now);
			return;
		} else if (this._ready.value === false) {
			return;
		} else {
	    	// set time (a little) back for live (delayed) updates ?
	    	// since timingobjects may switch source there is no longer 
	    	// a way to distinguish a live update from one originating
	    	// from timingobject switching source  
	    	// Empty schedule
	    	this._schedule.advance(now);
	    }

	    /*
	      Re-evaluate non-singularities
	      This is strictly not necessary after vector changes that
          preserve position. However, for simplicity we
	      re-evaluate intervals whenever vector changes.
	    */
	    var nowVector = motionutils.calculateVector(initVector, now);

	    var newKeys = this._axis.lookupKeysByPoint(nowVector.position);

	    // exitKeys are in activeKeys - but not in newKeys
	    var exitKeys = Object.keys(this._activeKeys).filter(function(key) {
	    	return !newKeys.hasOwnProperty(key);
	    });
	    // enterKeys are in newKeys - but not in activeKeys
	    var enterKeys = Object.keys(newKeys).filter(function(key) {
	    	return !this._activeKeys.hasOwnProperty(key); 
	    }, this);

	    /*
			Corner Case: Exiting Singularities
			and
			Exiting closed intervals ]
			and 
			Entering open intervals <
	    */
	    var _isMoving = isMoving(initVector);
	    if (_isMoving) {
	    	var nowPos = nowVector.position;
		    var points = this._axis.lookupByInterval(new Interval(nowPos, nowPos, true, true));
		    points.forEach(function (pointInfo) {
		    	// singularities
				if (pointInfo.pointType === axis.PointType.SINGULAR) {
				    exitKeys.push(pointInfo.key);
				} else {
					// closed interval?
					var interval = pointInfo.interval;
					var closed = false;
					if (pointInfo.pointType === axis.PointType.LOW && interval.lowInclude) {
						closed = true;
					} else if (pointInfo.pointType === axis.PointType.HIGH && interval.highInclude) {
						closed = true;
					}
					// exiting or entering interval?
					var direction = DirectionType.fromInteger(motionutils.calculateDirection(initVector, now));
					var entering = true;						
					if (pointInfo.pointType === axis.PointType.LOW && direction === DirectionType.BACKWARDS)
						entering = false;
					if (pointInfo.pointType === axis.PointType.HIGH && direction === DirectionType.FORWARDS)
						entering = false;
					// exiting closed interval
					if (!entering && closed) {
						exitKeys.push(pointInfo.key);
					}
					// entering open interval
					if (entering && !closed) {
						enterKeys.push(pointInfo.key);
					}
				}
		    }, this);
	    }

	  
	    /* 
	    	Note : is it possible that a key for singularity
	    	may be in both enterKeys and exitKeys? 
	    	- only in the corner case of movement and evaluation at eaxctly the point
	    	where the singularity lies - have duplicate protection elsewhere - ignore
		*/
	   
	    var exitItems = exitKeys.map(function (key) {
	    	return this._axis.getItem(key);
	    }, this);
	    var enterItems = enterKeys.map(function (key) {
	    	return this._axis.getItem(key);
	    }, this);
	    // Trigger interval events

	    var eList = this._processIntervalEvents(now, exitItems, enterItems, []);
	    this.eventifyTriggerEvents(eList);

	    /*
	      	Rollback falsely reported events
	      	Non-singular Intervals entered/left wrongly before update was sorted out above.
	      	- So far we do not roll back events. 
	    */

        /* 
        	Re-creating events lost due to network latency in timing object changes. 
        	This is achieved by advancing and loading from <now> which is derived 
        	from update vector rather than an actual timestamp. 
        */

        // Kick off main loop
    	this._load(now);
    	this._main(now);
	};



	/*
	  UPDATE

	  Updates the axis. Updates have further effect
	  if they relate to intervals within the immediate future.  
	  This roughly corresponds to the covering
	  time-interval and covering position-interval.

		- EVENTS (i.e. singular intervals)
	  
	  Relevant events for the sequencer are those that apply to the immediate future
	  i.e. the Schedule.

	  - removed events may have to be invalidated if they were due in immediate future
	  - new events may be added to the schedule if due in immedate future

	  - INTERVALS
	  Relevant interval changes trigger exit or enter events,
	  and since their relevance is continuous they will be delayed
	  no matter how late they are, as long as the interval update is
	  relevant for the current position of the timing object.
	 */

	Sequencer.prototype.updateAll = function(argList) {
		this._axis.updateAll(argList);
	};

	// remove duplicates - keeps the ordering and keeps the last duplicate
	var removeDuplicates = function (opList) {
		if (opList.length < 2) {
			return opList;
		}
		var res = [], op, map = {}; // op.key -> opList index
		for (var i=0; i<opList.length; i++) {
			op = opList[i];
			map[op.key] = i;
		}
		for (var i=0; i<opList.length; i++) {
			op = opList[i];
			if (map[op.key] === i) {
				res.push(op);
			}
		}
		return res;
	};


	Sequencer.prototype._onAxisChange = function (origOpList) {
		var self = this;

		// sequencer becomes ready when first onTimingChange and then onAxisChange has fired.
		if (this._ready.value === false) {
			this._ready.value = true;
		}

		// filter out NOOPS (i.e. remove operations that removed nothing)
		origOpList = origOpList.filter(function (op) {
			return (op.type !== OpType.NONE);
		});
	
		// remove duplicate operations (save last one)
		origOpList = removeDuplicates(origOpList);

	    var now = this._to.clock.now();
	    var nowVector = motionutils.calculateVector(this._to.vector, now);
	    var nowPos = nowVector.position;

	    // EXIT and ENTER Intervals
	    var enterItems = []; // {key:key, interval:interval}
	    var exitItems = []; // {key:key, interval:interval}
	    var isActive, shouldBeActive;

		// filter out REPEATs to get only operations where interval changed
		var opList = origOpList.filter(function (op) {
			return (op.type !== OpType.REPEAT);
		});

		var i, e, key, interval, data, opType;	

	    opList.forEach(function (op) {
	    	interval = op.interval;
	    	key = op.key;
	    	data = op.data;
		    /*
		      	Re-evaluate active intervals. Immediate action is required only if 
			    a interval was active, but no longer is -- or the opposite.

				Singularity intervals may not be ignored here - as a singluarity 
				might have been an active interval and just now collapsed
				into a singularity
		    */
		    isActive = this.isActive(key);
		    shouldBeActive = false;
		    if (op.type === OpType.ADD || op.type === OpType.UPDATE) {
		    	if (interval.coversPoint(nowPos)) {
					shouldBeActive = true;
		    	}
		    }

		    // forward opType information about what operation triggered the event
		    if (isActive && !shouldBeActive) {
				exitItems.push({key:key, interval:interval, data: data, opType:op.type});
			} else if (!isActive && shouldBeActive) {
				enterItems.push({key:key, interval:interval, data: data, opType:op.type});
		    }
	    }, this);

		/* 
			change events
			generate change events for currently active cues, which did change, 
			but remained active - thus no enter/exit events will be emitted).
		
			these are items that are active, but not in exitItems list.
			(origOpList includes REPEAT operations (change in non-temporal sense)
		*/
		var exitKeys = exitItems.map(function (item) {return item.key;});
		var changeItems = origOpList.
			filter (function (op) {
				return (this.isActive(op.key) && exitKeys.indexOf(op.key) === -1);
			}, this).
			map (function (op) {
				return {key: op.key, interval: op.interval, data: op.data};
			}, this);


		/* 
			special case 
			- no changes to axis - no need to touch the SCHEDULE
		*/
		if (opList.length === 0) {
			if (changeItems.length > 0) {			
				// enterItems and exitItems are empty
				var eList = self._processIntervalEvents(now, [], [], changeItems);
				self.eventifyTriggerEvents(eList);
				// no need to call main - will be called by scheduled timeout
			}			
			return;
		}

		/*
			special case
			- not moving - no need to touch the SCHEDULE
		*/
		var _isMoving = isMoving(nowVector);
		if (!_isMoving) {
			var eList = self._processIntervalEvents(now, exitItems, enterItems, changeItems);
			self.eventifyTriggerEvents(eList);
			// not moving should imply that SCHEDULE be empty
			// no need to call main - will be called by scheduled timeout
			return;
		}


		/*
			filter cue operation relevant to (remainder of) current scheduler window
			purpose - detect common condition that cue operation is irrelevant for SCHEDULE
			no need to touch SCHEDULE.
			- cue endpoint included in scheduler, but needs to be excluded due to cue operation
			- cue endpoint not in scheduler, but needs to be included due to cue operation
		*/
		// TODO (optimization)

		/* 
			special case 
			- no cue operation relevant to (remainder of) current scheduler window - no need to touch SCHEDULE
		*/
		// TODO (optimization)


		// INVALIDATE events in the SCHEDULE
		/*
	      Re-evaluate the near future. The SCHEDULE may include
	      tasks that refer to these keys. These may have to
	      change as a result of cue intervals changing. 

	      Basic solution (assumes that this cue operation is relevant for SCHEDULE)
	      - invalidate all tasks in the schedule
	      - invalidate even if the timing object is not moving
			if timing object is not moving, the schedule may not have been advanced in a while
			simply advance it - to empty it - as an effective way of invalidation
		*/

		// TODO - simplify the following based on above filtering of relevant cue operatiosn

		if (!_isMoving) {
			// not moving - not sure this is necessary (unreachable?)
			this._schedule.advance(now);
		} else {
			// moving - invalidate all scheduled events relating to the same op keys. 
			opList.forEach(function (op) {
				this._schedule.invalidate(op.key);
			}, this);

			// RELOAD events into the SCHEDULE
			var point, reloadPoints = [];
			opList.forEach(function (op) {
				interval = op.interval;
	    		key = op.key;
	    		data = op.data;

	    		// Nothing to reload for remove events
		    	if (op.type === OpType.REMOVE) {
					return;
		    	}

				/* 
			       Corner Case: If the new interval is singularity, and if it
			       happens to be exactly at <nowPos>, then it needs to be
			       fired. 
			    */

			    // Reload only required if the msv is moving
				if (_isMoving) {
					/*
				      Load interval endpoints into schedule			      
				      The interval has one or two endpoints that might or might not be
				      relevant for the remainder of the current time-interval of the schedule.
				      Check relevance, i.t. that points are within the
				      position range of the schedule.
				    */
					var item = {key: key, interval: interval, data: data}; 
				    var rangeInterval = this._schedule.getPosInterval();
				    if (rangeInterval !== null) {
				    	if (rangeInterval.coversPoint(interval.low)) {
				    		item.point = interval.low;
				    	} 
				    	if (rangeInterval.coversPoint(interval.high)) {
				    		item.point = interval.high;
				    	}
				    	item.pointType = this._axis.getPointType(item.point, item.interval);
                        if (item.pointType !== axis.PointType.OUTSIDE) {
                            reloadPoints.push(item);
                        }
				    }
				}
			}, this);


		   	// reload relevant points
		    if (reloadPoints.length > 0) {
				this._load(now, reloadPoints);
		    }
		}
		
		// notify interval events and change events
		var eList = self._processIntervalEvents(now, exitItems, enterItems, changeItems);
		self.eventifyTriggerEvents(eList);
		// kick off main loop (should only be required if moving?)
		// TODO - should only be necessary if the SCHEDULE is touched - to cause a new timeout to be set.
		self._main(now);
	};


	/*
        Sequencer core loop, loops via the timeout mechanism as long
        as the timing object is moving.
	*/
	Sequencer.prototype._main = function (now, isTimeout) {
		//console.log("main start", (isTimeout === true));
		/*
		this._schedule.queue.forEach(function (item) {
			console.log(item.ts, item.task.key);
		});
		*/
		var eList;
	    now = now || this._to.clock.now();
	    // process tasks (empty due tasks from schedule)
        eList = this._processScheduleEvents(now, this._schedule.pop(now));   
        this.eventifyTriggerEvents(eList);
        // advance schedule window
        var _isMoving = isMoving(this._to.vector);
        if (_isMoving && this._schedule.isExpired(now)) {		
			now = this._schedule.getTimeInterval().high;
            this._schedule.advance(now);
            this._load(now);
            /*
            this._schedule.queue.forEach(function (item) {
				console.log(item.ts, item.task.key);
			});
			*/
            // process tasks again
            eList = this._processScheduleEvents(now, this._schedule.pop(now));
	    	this.eventifyTriggerEvents(eList);
	    }
        // adjust timeout if moving
        if (_isMoving) {
			var newTimeoutRequired = false;
			if (this._timeout === null) newTimeoutRequired = true;
			else {
				// timeout exist - modify?
				// avoid modifying timeout if new timeout is equal to existing timeout
				// i.e. if task point is the same as last time
				var nextTimeoutPoint = this._schedule.getNextTaskPoint();
				if (nextTimeoutPoint === null) {
					// timeout is set for schedule window - no tasks in schedule 
					// do not modify timeout			
				} else {
					// nextTimeoutPoint defined - tasks in the schedule
					if (nextTimeoutPoint === this._currentTimeoutPoint) {
						// do not modify timeout
					} else {
						// modify timeout
						newTimeoutRequired = true
					}
				}
			}
					
			if (newTimeoutRequired) {
				// clear timeout
				this._clearTimeout();
				// update timeout 
	        	var secAnchor = this._to.clock.now();	
				var secDelay = this._schedule.getDelayNextTs(secAnchor); // seconds
				this._currentTimeoutPoint = nextTimeoutPoint;
				var self = this;
				//console.log("main done - set timeout", this._schedule.queue.length);
				this._timeout = this._to.clock.setTimeout(function () {
					self._clearTimeout();
					self._main(undefined, true);
				}, secDelay, {anchor: secAnchor, early: 0.005});
			}
	    }
	};


	Sequencer.prototype._clearTimeout = function () {
    	this._currentTimeoutPoint = null;
    	if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
    	}
	};

	/* 
	   LOAD

       Sequencer loads a new batch of points from axis into
       the schedule

       If given_points is specified, this implies that the
       points to load are known in advance. This is the case when
       axis is being updated dynamically during execution. If
       points are not known the load function fetches points from
       the axis by means of the time cover of the schedule.

	   load only makes sense when timing object is moving
	*/

	Sequencer.prototype._load = function (now, givenPoints) {
		var initVector = this._to.vector;
	    if (!isMoving(initVector)) {
			return;
	    }


	    /* 
	       MOVING
	       Load events from time interval
	    */
	    var timeInterval = this._schedule.getTimeInterval();
	    var tStart = timeInterval.low;
	    var tEnd = timeInterval.high;
	    var tDelta = timeInterval.length;
	    // range
		var range = this._to.range;
	    var vectorStart = motionutils.calculateVector(initVector, tStart);
	    var points = givenPoints;
	    var points2;
	    var eventList2;
	    // Calculate points if not provided
	    if (!points) {
			// 1) find the interval covered by the movement of timing object during the time delta
			var posRange = motionutils.calculateInterval(vectorStart, tDelta);
			var pStart = Math.round10(Math.max(posRange[0], range[0]), -10);
			var pEnd = Math.round10(Math.min(posRange[1], range[1]), -10);
			var posInterval = new Interval(pStart, pEnd, false, true);

			this._schedule.setPosInterval(posInterval);

			// 2) find all points in this interval
			points = this._axis.lookupByInterval(posInterval);

			//console.log("load", timeInterval.toString(), posInterval.toString());

	    }

	    /*
	      Note : 1) and 2) could be replaced by simply fetching
	      all points of the axis. However, in order to avoid
	      calculating time intercepts for a lot of irrelevant points, we
	      use step 1) and 2) to reduce the point set.
	    */
	    
	    // create ordered list of all events for time interval t_delta 
	    var eventList = motionutils.calculateSolutionsInInterval(vectorStart, tDelta, points);
	    /*
	    console.log("ORIG EVENTLIST");
	    eventList.forEach(function (item) {
	    		var p0 = vectorStart.timestamp + item[0];
				var p1 = Math.round10(p0, -10);
				console.log("inside", p1, item[1]);
	    });
	    */

	    // report bug?
	    if (points.length !== eventList.length) {
	    	console.log("warning : mismatch points and events", points.length, eventList.length);
	    }


	    /* 
	       SUBTLE 1 : adjust for range restrictions within
	       time-interval tasks with larger delta will not be
	       pushed to schedule it is not necessary to truncate the
	       time interval of schedule similarly - just drop all
	       events after prospective range violations. <rDelta> is
	       time to (first) range violation
	    */	    
	    var rDelta = motionutils.calculateDelta(vectorStart, range)[0];
	  
 	    /* 
	       SUBTLE 2: avoid tasks exactly at start of time-interval
	       assume that this point should already be processed by the
	       previous covering interval.
	    */
	    
	    // filter and push events on sched
	    eventList.forEach(function (e)  {

	    	var d = e[0];
			var task = e[1];
			var push = true;

			/*
				events from within the time interval may still be too late,
				if they are before now <now>.
				this may happen when new items are added dynamically
				even though we drop them here, they already had their
				effect in calculation of enter/exit events.
			*/
			if (tStart + d < now) {
				push = false;
			}
						
			/* 
			   drop events exactly at the start of the time covering
			   interval.
			   likely obsolete since we are fetching points <low, high] 
			*/
			if (d === 0) {
				console.log("drop - exactly at start of time covering");
			    push = false; 
			}
			/* 
			   drop all events scheduled after (in time) range
			   violation should occur
			*/
			if (d > rDelta) {
				console.log("drop - events after range violations");
				push = false;  
			}
			/*
			  event scheduled exactly at range point.
			  - interval : 
			  Exiting/entering a interval should not happen at range point - drop
			*/
			if (d === rDelta) {
				console.log("drop - events exactly at range point")
			    push = false;
			}
			
			/* 
			   check if we are touching an interval without
			   entering or exiting. Note that direction will
			   not be zero at this point, because direction
			   includes acceleration, which is not zero in
			   this case.
			   drop all interval events that have zero velocity
			   at the time it is supposed to fire
			*/
			if (task.pointType === axis.PointType.LOW || task.pointType === axis.PointType.HIGH) {
			    var v = motionutils.calculateVector(initVector, tStart + d);
			    if (v.velocity === 0){
			    	console.log("drop - touch endpoint during acceleration");
					push = false;
			    }
			}
			// push
			if (push) {	   
			    this._schedule.push(now, tStart + d, task);
			} 
	    }, this); 
	};


	// Process point events originating from the schedule
	Sequencer.prototype._processScheduleEvents = function (now, eventList) {
	   	var eArg, eArgList = [];	   		
	   	var nowVector = motionutils.calculateVector(this._to.vector, now);
   		var directionInt = motionutils.calculateDirection(nowVector, now);
		var ts = this._to.clock.now();
	    eventList.forEach(function (e) {
			if (e.task.interval.singular) {
				// make two events for singular
				eArgList.push(new SequencerEArgs(this, e.task.key, e.task.interval, e.task.data, directionInt, e.task.point, ts, e.ts, OpType.NONE, VerbType.ENTER));
				eArgList.push(new SequencerEArgs(this, e.task.key, e.task.interval, e.task.data, directionInt, e.task.point, ts, e.ts, OpType.NONE, VerbType.EXIT));
			} else {
				// figure out if it is enter or exit 
				var directionType = DirectionType.fromInteger(directionInt);
				var pointType = this._axis.getPointType(e.task.point, e.task.interval);
				var pointInt = axis.PointType.toInteger(pointType);
				var verbInt = pointInt * directionInt * -1;
				var verbType = VerbType.fromInteger(verbInt);
		    	eArgList.push(new SequencerEArgs(this, e.task.key, e.task.interval, e.task.data, directionInt,  e.task.point, ts, e.ts, OpType.NONE, verbType));
			}			
	    }, this);
	    return this._makeEvents(now, eArgList, directionInt);
	};

	// Process interval events orignating from axis change, timing object change or active keys
	Sequencer.prototype._processIntervalEvents = function (now, exitItems, enterItems, changeItems) {
	    if (exitItems.length + enterItems.length + changeItems.length === 0) {
			return [];
	    }
	    var nowVector = motionutils.calculateVector(this._to.vector, now);
		var directionInt = motionutils.calculateDirection(nowVector, now);
		var ts = this._to.clock.now(); 
	    var eArgList = [];
    	var opType;
    	// trigger events
    	exitItems.forEach(function (item){
    		opType = item.opType || OpType.NONE;
			eArgList.push(new SequencerEArgs(this, item.key, item.interval, item.data, directionInt, nowVector.position, ts, now, opType, VerbType.EXIT));
		}, this); 
		enterItems.forEach(function (item){
			opType = item.opType || OpType.NONE;
			eArgList.push(new SequencerEArgs(this, item.key, item.interval, item.data, directionInt, nowVector.position, ts, now, opType, VerbType.ENTER));
		}, this);
		changeItems.forEach(function (item) {
			eArgList.push(new SequencerEArgs(this, item.key, item.interval, item.data, directionInt, nowVector.position, ts, now, OpType.UPDATE, VerbType.NONE));
		}, this);
		return this._makeEvents(now, eArgList, directionInt);
	};


	Sequencer.prototype._processInitialEvents = function () {
		// called by makeInitEvents - return event list based on activeKeys
		var item, eArg;
		var now = this._to.clock.now();
		var nowVector = motionutils.calculateVector(this._to.vector, now);
		var directionInt = motionutils.calculateDirection(nowVector, now);
		var ts = this._to.clock.now();
		return Object.keys(this._activeKeys).map(function (key) {
			item = this._axis.getItem(key);
			eArg = new SequencerEArgs(this, key, item.interval, item.data, directionInt,  nowVector.position, ts, now, OpType.INIT, VerbType.ENTER);
			return eArg;
		}, this).sort(function(a, b) {
			return a.interval.low-b.interval.low;
		});
	};

	
	/*
		make events ensures consistency of active keys as changes
		to active keys are driven by actual notifications
	*/

	Sequencer.prototype._makeEvents = function (now, eArgList, directionInt) {
		if (eArgList.length === 0) {
			return [];
		}
		// manage active keys
		var index, eventList = [];
		eArgList.forEach(function (eArg) {
			// exit interval - remove keys 
		    if (eArg.exit) {
				if (this._activeKeys.hasOwnProperty(eArg.key)) {
					delete this._activeKeys[eArg.key];
				}
		    }
		    // enter interval - add key
		    if (eArg.enter) {
		    	if (!this._activeKeys.hasOwnProperty(eArg.key)) {
		    		this._activeKeys[eArg.key] = undefined;
		    	}
		    }
		    eventList.push(eArg);
		}, this);
		// make sure events are correctly ordered
		eventList = this._reorderEventList(eventList, directionInt);
		// finalise events
		return eventList.map(function (eArg) {
			return {type: eArg.type, e: eArg};
		});	    	    
	};

	/*
		Event list is sorted by time. 
		There can be multiple events on the same time.
		Events with the same point (thus time) need to be sorted according to the following precedence
		a. exit interval > (interval does not include exit-point)
		x. enter interval [ (interval includes enter-point)
		b. enter singular
		c. exit singular			
		y. exit intervals ] (interval includes exit-point)
		d. enter intervals < (interval does not include enter-point)
	*/
	Sequencer.prototype._reorderEventList = function (eArgList, directionInt) {
		if (eArgList.length < 2) return eArgList;
		// stack events per point
		var point, dueTs, newList = [];
		var s = {"a": [], "x": [], "b": [], "c": [], "y": [], "d": []};
		eArgList.sort(function (a, b) {
			return a.interval.low - b.interval.low;
		}).forEach(function(eArg) {
			// new point - pop from stack
			if (eArg.point !== point || eArg.dueTs !== dueTs) {
				// pop last from stack
				if (directionInt >= 0) {
					newList = newList.concat(s["a"], s["x"], s["b"], s["c"], s["y"], s["d"]);
				} else {
					newList = newList.concat(s["d"], s["y"], s["c"], s["b"], s["x"], s["a"]);
				}
				s = {"a": [], "x": [], "b": [], "c": [], "y": [], "d": []};
				point = eArg.point;
				dueTs = eArg.dueTs;
			}
			// push on stack
			if (eArg.pointType === axis.PointType.SINGULAR) {
				if (eArg.type === VerbType.ENTER) {
					// enter singular
					s["b"].push(eArg);
				} else {
					// exit singular
					s["c"].push(eArg);
				}
			} else {
				/* 
					Interval
					special ordering when we enter or exit interval
					through endpoint (low or high) and this endpoint is CLOSED ] as opposed to OPEN >
				*/
				var closed = false;
				if ((eArg.pointType === axis.PointType.LOW) && eArg.interval.lowInclude) {
					closed = true;
				} else if ((eArg.pointType === axis.PointType.HIGH) && eArg.interval.highInclude) {
					closed = true;
				}
				if (eArg.type === VerbType.ENTER) {
					// enter interval
					if (closed) s["x"].push(eArg);
					else s["d"].push(eArg);
				} else {
					// exit interval
					if (closed) s["y"].push(eArg);
					else s["a"].push(eArg);
				}
			}
		}, this);

		// pop last from stack
		if (directionInt >= 0) {
			return newList.concat(s["a"], s["x"], s["b"], s["c"], s["y"], s["d"]);
		} else {
			return newList.concat(s["d"], s["y"], s["c"], s["b"], s["x"], s["a"]);
		}
	};

	

	// TODO : force SequencerCue object on input?
	Sequencer.prototype.addCue = function (key, interval, data) {
		return this.updateAll([{key:key, interval:interval, data: data}]);
	};

	Sequencer.prototype.removeCue = function (key, removedData) {
		return this.updateAll([{key:key, interval:undefined, data:removedData}]);
	};

	// true if cues exists with given key
	Sequencer.prototype.hasCue = function (key) {
		return this._axis.hasKey(key);
	};

	// Get all keys
	Sequencer.prototype.keys = function () {
		return this._axis.keys();
	};
	

	// get specific cue {key: key, interval:interva} given key
	Sequencer.prototype.getCue = function (key) {
		if (this._axis.hasKey(key)) {
			return new SequencerCue (this._axis.getItem(key));
		}  
	};

	// get all cues
	Sequencer.prototype.getCues = function () {
		return this.keys().map(function (key) {
			return this.getCue(key);
		}, this);
	};

	// return true if cue of given key is currently active
	Sequencer.prototype.isActive = function (key) {
	    return (this._activeKeys.hasOwnProperty(key));
	};

	// Get keys of active cues
	Sequencer.prototype.getActiveKeys = function () {
		return Object.keys(this._activeKeys);
	};

	Sequencer.prototype.getActiveCues = function () {
		return Object.keys(this._activeKeys).map(function (key) {
			return this.getCue(key);
		}, this);
	};

	// Implementing same API as WINDOW
	Sequencer.prototype.get = function (key) {
		if (this.isActive(key)) {
			return this.getCues(key).map(function (cue) {
				return cue.data;
			});
		} else {
			return undefined;
		}
	};

	// Implementing same API as WINDOW
	Sequencer.prototype.items = function () {
		return this.getActiveCues().map(function (cue) {
			return cue.data;
		});
	};

	// return all (key, inteval, data) tuples, where interval covers point
	Sequencer.prototype.getCuesByPoint = function (point) {
		return this._axis.lookupByPoint(point).map(function (item) {
			return this.getCue(item.key);
		}, this);
	};

	// return all cues with at least one endpoint within searchInterval
	Sequencer.prototype.getCuesByInterval = function (searchInterval) {
		// keys may be mentioned for 2 points in searchInterval - use dict to avoid duplicating intervals
		var _dict = {};
		this._axis.lookupByInterval(searchInterval).forEach(function (pointInfo) {
			_dict[pointInfo.key] = pointInfo.interval;
		});
		return Object.keys(_dict)
			.map(function(key){
				return this.getCue(key);
			}, this)
			.filter(function (cue) {
				return (searchInterval.overlapsInterval(cue.interval));
			}, this);
	};

	// return all cues covered by searchInterval
	Sequencer.prototype.getCuesCoveredByInterval = function (searchInterval) {
		return this.getCuesByInterval(searchInterval).filter(function (cue) {
			return (searchInterval.coversInterval(cue.interval)) ? true : false;
		}, this);
	};

	// shutdown
	Sequencer.prototype.close = function () {
	    this._to.off("change", this._wrappedOnTimingChange, this);
	    this._axis.off("change", this._wrappedOnAxisChange, this);
	    if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;		
	    }
	};

	// Module Definition
	return {
		Interval : Interval,
		DefaultSequencer : Sequencer,
		Axis : axis.Axis,
		SequencerError : SequencerError
	};

});




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
	WINDOW SEQUENCER

	- a collection of Intervals are defined on an axis
	- a searchInterval is defined by two endpoints.
	- we are interested in all Intervals on the axis that are partially/fully covered by searchInterval
	- we then want to move the searchInterval along the axis
	- trigger onenter/onexit events as Intervals go from being not covered to partialy/fully covered and vica versa
	- define searchInterval endpoints by two motions that may or may not be dependent
	- use pointsequencer on each motion to generate events.	
*/


define('sequencing/windowsequencer',['../util/eventify', '../util/motionutils', './axis', './sequencer'], 
	function (eventify, motionutils, axis, seq) {
	
	'use strict';

	var Interval = seq.Interval;
	var Sequencer = seq.DefaultSequencer;

	var WindowSequencer = function (timingObjectA, timingObjectB, _axis) {
		if (!(this instanceof WindowSequencer)) {
			throw new Error("Contructor function called without new operation");
		}
		this._axis = _axis || new axis.Axis();
		this._toA = timingObjectA;
		this._toB = timingObjectB;

		this._seqA = new Sequencer(this._toA, this._axis);
		this._seqB = new Sequencer(this._toB, this._axis);

		// ready
		this._ready = new eventify.EventBoolean(false, {init:true});

		// true if re_evalute has been requested but not performed yet
		this._pending_reevaluate = false;

		// active keys
		this._activeKeys = {}; // key -> undefined

		// Define Events API
		// event type "events" defined by default
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("remove");


		var self = this;

		// Store references to handler on instance
		this._onAxisChange = function (eItemList) {
			var eArgList = eItemList.map(function (eItem) {
				return eItem.e;
			});
			// console.log("on Axis Change");
			self._reevaluate(eArgList);
		};
		this._onToAChange = function () {
			// console.log("on ToA Change");
			self._request_reevaluate();
		};
		this._onToBChange = function () {
			// console.log("on ToB Change");
			self._request_reevaluate();
		};
		this._onSeqAChange = function (e) {
			// console.log("on SeqA Change");
			self._request_reevaluate();
		};
		this._onSeqBChange = function (e) {
			// console.log("on SeqB Change");
			self._request_reevaluate();
		};
		this._toA.on("change", this._onToAChange, this);
		this._toB.on("change", this._onToBChange, this);
		this._seqA.on("events", this._onSeqAChange, this);
		this._seqB.on("events", this._onSeqBChange, this);

		
		Promise.all([this._seqA.ready, this._seqB.ready]).then(function (values) {
			// both sequencers are ready
			// by implication - both timing objects are ready too
			self._axis.on("events", self._onAxisChange, self);
			self._ready.value = true;
		});
		
	};
	eventify.eventifyPrototype(WindowSequencer.prototype);


	// making Interval constructor available on all windowsequencer instances
	Object.defineProperty(WindowSequencer.prototype, "Interval", {
		get : function () {return Interval;}
	});

	/*
		READY STATE

		The interval sequencer is ready when both timing objects are ready
	*/
	WindowSequencer.prototype.isReady = function () {
		return (this._ready.value === true);
	};

	// ready promise
	Object.defineProperty(WindowSequencer.prototype, 'ready', {
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


	/*

		EVENT HANDLERS

	*/

	/*
		Timing events
		
		- Jumps may some intervals to be covered or cease to be covered.
		Some of these intervals may remain active of inactive with respect
		to the point-sequencer, implying that there will be no events from the sequencer

		- Non-jumps (i.e. speed changes) can not cause changes to the WindowSequencer
		without also causing changes to the sequencers
		
		Sequencer events
		- required during playback to trigger timed refresh
		- sequencer provides events on both jumps and non-jumps

		There is possible event redundancy for events caused by jumps and non-jumps of the timing object.
		I.e. we receive an event from both timing object as well as
		events from the sequencer that were caused by the same event from the timing object. 

		Fortunately, the overhead of this event duplication is small, 
		since it only involves an extra reevaluate(). 
		The second invokation will not have any effect.'


		Possible optimization 1)
		ignore non-jumps from timing object and depend on the sequencer for this
		- requires cashing the vector from the timing object, so that the new vector can be compared
		to the old one. This is necessary for discriminating between jumps and non-jumps.
		- not implemented

		Possible optimization 2)
		ignore sequencer events for jumps.
		- difficult because the sequencer at present does not distinguish event event causes 
		{jump|non-jump|playback}
		- not implemented
 
		Possible optimization 3)
		It is also possible to filter out updates from axis that are not relevant, in order to not invoke 
		re-evaluate when it is not needed.
		- easy, but basically just saves a lookup on the axis, and only if all updates are non relevant.
		- not implemented
	*/


	/*
	  	overrides how immediate events are constructed
	*/
	WindowSequencer.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			// make event items from active keys
		    return Object.keys(this._activeKeys).map(function (key) {
		    	var item = this._axis.getItem(key);
		    	return {
	    			key : key, 
	    			interval : item.interval,
	    			data : item.data,
	    			type : "change",
	    			cause: "init",
	    			enter : true,
	    			exit : false
	    		};
		    }, this);
		}
		return [];
	};

	/*
		figure out the current active interval
	*/
	WindowSequencer.prototype._getActiveInterval = function () {
		var vectorA = this._toA.query();
		var vectorB = this._toB.query();
		var start = Math.min(vectorA.position, vectorB.position);
		var end = Math.max(vectorA.position, vectorB.position);
		return new Interval(start, end, true, true);
	};

	WindowSequencer.prototype._getOpFromAxisOpList = function (axisOpList, key) {
		var op = {};
		if (axisOpList) {
			for (var i=0; i<axisOpList.length; i++) {
				var item = axisOpList[i];
				if (item.key === key) {
					op = item;
					break;
				}
			}
		}
		return op;
	};

	var seqOpType = function (op) {
		if (op === "init") return "init";
		if (op === "none") return "motion";
		if (op === "add") return "add";
		if (op === "update" || op === "repeat") return "update";
		if (op === "remove") return "remove";
		return "";
	};
		
	WindowSequencer.prototype._getItem = function (axisOpList, key) {
		var item;
    	if (axisOpList) {
    		item = this._getOpFromAxisOpList(axisOpList, key);
    	} else {
    		item = this._axis.getItem(key);
    		item.type = "none";
    	}
    	item.type = seqOpType(item.type);
    	return item;
	};

	/* 
		Request reevaluate 
		noop if reevaluate has already been requested, but not performed
		else - append reevaluate to the task queue
	*/

	WindowSequencer.prototype._request_reevaluate = function () {
		if (this._pending_reevaluate == false) {
			this._pending_reevaluate = true;
			var self = this;
			setTimeout(function() {
				self._pending_reevaluate = false;
				self._reevaluate()
			}, 0)
		}
	};

	/*
		RE-EVALUATE

		Figure out what kind of events need to be triggered (if any)
		in order to bring the WindowSequencer to the correct state.
	*/




	WindowSequencer.prototype._reevaluate = function (axisOpList) {
		if (this._ready.value === false) {
			return [];
		}
		var activeInterval = this._getActiveInterval();

		// find keys of all cues, where cue interval is partially or fully covered by searchInterval
		var newKeys = this._axis.lookupKeysByInterval(activeInterval);
		
	    // exitKeys are in activeKeys - but not in newKeys
	    var exitKeys = Object.keys(this._activeKeys).filter(function(key) {
	    	return !newKeys.hasOwnProperty(key);
	    });
	   
	    // enterKeys are in newKeys - but not in activeKeys
	    var enterKeys = Object.keys(newKeys).filter(function(key) {
	    	return !this._activeKeys.hasOwnProperty(key); 
	    }, this);

	    /* 
	    	changeKeys
	    	change keys are elements that remain in activeKeys,
	    	but were reported as changed by the axis 
	    */
	    var changeKeys = [];
	    if (axisOpList) {
		    axisOpList.forEach(function (op) {
		    	if (this._activeKeys.hasOwnProperty(op.key) && newKeys.hasOwnProperty(op.key)) {
		    		changeKeys.push(op.key);
		    	}
		    }, this);
		}    

		// update active keys
	    this._activeKeys = newKeys;

	    // make event items from enter/exit keys
	    var item, eList = [];
	    exitKeys.forEach(function (key) {
	    	item = this._getItem(axisOpList, key);
	    	eList.push({
	    		type: "remove", 
	    		e: {
	    			key : key, 
	    			interval : item.interval,
	    			type : "remove",
	    			data : item.data,
	    			cause : item.type,
	    			enter: false,
	    			exit : true
	    		}
	    	});
	    }, this);
	    enterKeys.forEach(function (key) {
	    	item = this._getItem(axisOpList, key);
	    	eList.push({
	    		type: "change", 
	    		e: {
	    			key:key, 
	    			interval: item.interval,
	    			type: "change",
	    			data: item.data,
	    			cause : item.type,
	    			enter : true,
	    			exit : false
	    		}
	    	});
	    }, this);
	    changeKeys.forEach(function (key) {
	    	item = this._getItem(axisOpList, key);
	    	eList.push({
	    		type: "change", 
	    		e: {
	    			key:key, 
	    			interval: item.interval,
	    			type: "change",
	    			data: item.data,
	    			cause : item.type,
	    			enter : false,
	    			exit : false
	    		}
	    	});
	    }, this);
	    this.eventifyTriggerEvents(eList);
 
	  
	};

	/*
		API

		Operations that affect the axis can safely be directed to 
		one of the sequencers, since the two sequencers forward these operations to a shared axis.
	*/

	WindowSequencer.prototype.addCue = function (key, interval, data) {
		return this._seqA.addCue(key, interval, data);
	};

	WindowSequencer.prototype.removeCue = function (key) {
		return this._seqA.removeCue(key);
	};

	// true if cues exists with given key
	WindowSequencer.prototype.hasCue = function (key) {
		return this._seqA.hasCue(key);
	};

	// Get all keys
	WindowSequencer.prototype.keys = function () {
		return this._seqA.keys();
	};
	
	// get specific cue {key: key, interval:interva} given key
	WindowSequencer.prototype.getCue = function (key) {
 		return this._seqA.getCue(key);
	};

	// get all cues
	WindowSequencer.prototype.getCues = function () {
		return this._seqA.getCues();
	};

	// return true if cue of given key is currently active
	WindowSequencer.prototype.isActive = function (key) {
		return (this._activeKeys.hasOwnProperty(key));
	};

	// Get keys of active cues
	WindowSequencer.prototype.getActiveKeys = function () {
		return Object.keys(this._activeKeys);
	};

	WindowSequencer.prototype.getActiveCues = function () {
		return Object.keys(this._activeKeys).map(function (key) {
			return this.getCue(key);
		}, this);
	};

	// Implementing same API as WINDOW
	WindowSequencer.prototype.get = function (key) {
		if (this.isActive(key)) {
			return this.getCues(key).map(function (cue) {
				return cue.data;
			});
		} else {
			return undefined;
		}
	};

	// Implementing same API as WINDOW
	WindowSequencer.prototype.items = function () {
		return this.getActiveCues().map(function (cue) {
			return cue.data;
		});
	};

	// return all (key, inteval, data) tuples, where interval covers point
	WindowSequencer.prototype.getCuesByPoint = function (point) {
		return this._seqA.getCuesByPoint(point);
	};

	// return all cues with at least one endpoint within searchInterval
	WindowSequencer.prototype.getCuesByInterval = function (searchInterval) {
		return this._seqA.getCuesByInterval(searchInterval);
	};

	// return all cues covered by searchInterval
	WindowSequencer.prototype.getCuesCoveredByInterval = function (searchInterval) {
		return this._seqA.getCuesCoveredByInterval(searchInterval);
	};

	// shutdown
	WindowSequencer.prototype.close = function () {
		this._axis.off("change", this._onAxisChange);
		this._toA.off("change", this._onToAChange);
		this._toB.off("change", this._onToBChange);
		this._seqA.off("events", this._onSeqAChange);
		this._seqB.off("events", this._onSeqBChange);
		this._seqA.close();
		this._seqB.close();
	};

	return WindowSequencer;
});
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

define ('sequencing/timingcallbacks',['../util/motionutils'], function (motionutils) {

  'use strict';

    // Utility inheritance function.
  var inherit = function (Child, Parent) {
    var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
    F.prototype = Parent.prototype;
    Child.prototype = new F(); // child gets parents prototypes via F
    Child.uber = Parent.prototype; // reference in parent to superclass
    Child.prototype.constructor = Child; // resetting constructor pointer 
  };

  var TimingCallbackBase = function (timingObject, handler) {
    this._timingsrc = timingObject;
    this._handler = handler;
    this._timeout = null;
    this._wrappedOnChange = function () {this._onChange();};
    // initialise
    this.timingsrc = timingObject;
  }; 

  TimingCallbackBase.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
  };

  // update event from timing object
  TimingCallbackBase.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timing object
  TimingCallbackBase.prototype.cancel = function () {
    // cleanup
    this._clearTimeout();
    this._timingsrc.off("change", this._wrappedOnChange, this);  
  };

  /*
    Accessor for timingsrc.
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingCallbackBase.prototype, 'timingsrc', {
    get : function () {return this._timingsrc;},
    set : function (timingObject) {
      if (this._timingsrc) {
        this._timingsrc.off("change", this._wrappedOnChange, this);
      }
      clearTimeout(this._tid);
      this._timingsrc = timingObject;
      this._timingsrc.on("change", this._wrappedOnChange, this);
    }
  });


  /*
      SET POINT CALLBACK
      callback when timing object position is equal to point
      options {repeat:true} implies that callback will occur repeatedly
      every time timing object passes point.
      Default is to fire only once, similar to setTimeout
  */

  var SetPointCallback = function (timingObject, handler, point, options) {
    if (!(this instanceof SetPointCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.repeat = (this._options.repeat !== undefined) ? this._options.repeat : false;
    this._point = point;
  };
  inherit(SetPointCallback, TimingCallbackBase);


  // update event from timing object
  SetPointCallback.prototype._onChange = function () {
    if (this._timingsrc.query().position === this._point) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetPointCallback.prototype._onTimeout = function () {
    if (!this._options.repeat) {
      this.cancel();
    };
    this._handler();
    this._renewTimeout();
  };

  SetPointCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var delay = motionutils.calculateMinPositiveRealSolution(vector, this._point);
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };

  
  /*
    
    SET INTERVAL CALLBACK

    callback callback for every point x, where (x - offset) % length === 0
    options : {offset:offset}
    Default is offset 0
  */

  var SetIntervalCallback = function (timingObject, handler, length, options) {
    if (!(this instanceof SetIntervalCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.offset = (this._options.offset !== undefined) ? this._options.offset : 0;
    this._length = length;
  };
  inherit(SetIntervalCallback, TimingCallbackBase);

  // ovverride modulo to behave better for negative numbers 
  SetIntervalCallback.prototype._mod = function (n, m) {
    return ((n % m) + m) % m;
  };

  // get point representation from float
  SetIntervalCallback.prototype._getPoint = function (x) {
    var skew = this._options.offset;
    return {
      n : Math.floor((x-skew)/this._length),
      offset : this._mod(x-skew, this._length)
    };
  };

    // get float value from point representation
  SetIntervalCallback.prototype._getFloat = function (p) {
    var skew = this._options.offset;
    return skew + (p.n * this._length) + p.offset;
  };

  // update event from timing object
  SetIntervalCallback.prototype._onChange = function () {
    var points = this._calculatePoints(this._timingsrc.query().position);
    if (points.isTarget) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetIntervalCallback.prototype._onTimeout = function () {
    this._handler();
    this._renewTimeout();
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  SetIntervalCallback.prototype._calculatePoints = function (position) {
    var beforePoint = {}, afterPoint = {};
    var target;
    var point = this._getPoint(position);
    if (point.offset === 0) {
      target = true;
      beforePoint.n = point.n - 1;
      beforePoint.offset = point.offset;
      afterPoint.n = point.n + 1;
      afterPoint.offset = point.offset;
    } else {
      target = false;
      beforePoint.n = point.n;
      beforePoint.offset = 0;
      afterPoint.n = point.n + 1;
      afterPoint.offset = 0;
    }
    return {
      isTarget : target,
      before : this._getFloat(beforePoint),
      after : this._getFloat(afterPoint)
    }
  };

  SetIntervalCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  // module definition
  return {
    setPointCallback: function (timingObject, handler, point, options) { return new SetPointCallback(timingObject, handler, point, options);},
    setIntervalCallback : function (timingObject, handler, length, options) { return new SetIntervalCallback(timingObject, handler, length, options);}
  };
}); 
/*
    Copyright 2017 Norut Northern Research Institute
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

define ('sequencing/timinginteger',['../util/motionutils', '../util/eventify'], function (motionutils, eventify) {

  /*
    Integer value that is controlled by a timing object.
    implemented as a tiny wrapper around a timing object.
    Change event emitted whenever the integer value changes.
  */
  var isNumeric = function(obj){
    return !Array.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
  };


  var TimingInteger = function (timingObject, options) {
    // timingsrc
    this._timingsrc;

    options = options || {};
  
    // option value
    if (options.value === undefined) {
      options.value = 0;
    }
    if (!isNumeric(options.value)) {
      throw new Error ("value not nummeric", options.value);
    }
    this._value = options.value;
  
    // option - min - max
    if (options.min !== undefined) {
      if (!isNumeric(options.min)) {
        throw new Error ("option.min not nummeric", options.min);
      }
    }
    if (options.max !== undefined) {
      if (!isNumeric(options.max)) {
        throw new Error ("option.min not nummeric", options.max);
      }
    }
    this._options = options;


    // events
    eventify.eventifyInstance(this);
    this.eventifyDefineEvent("change", {init:true});

    // timeout
    this._timeout = null;

    // timing object
    var self = this;
    this._wrappedOnChange = function () {self._onChange();};
    this.timingsrc = timingObject;
  }
  eventify.eventifyPrototype(TimingInteger.prototype);

  
  /*
    events
  */

  TimingInteger.prototype.eventifyMakeInitEvents = function (type) {
    if (type === "change") {
      return [this.value];
    }
    return [];
  };

  /*
    readiness
  */

  Object.defineProperty(TimingInteger.prototype, "ready", {
    get: function () {return this._timingsrc.ready;}
  });

  TimingInteger.prototype.isReady = function () {
    return this._timingsrc.isReady();
  };

  /*
    public api - integer value
    forwards to timing object position
  */

  Object.defineProperty(TimingInteger.prototype, "value", {
    get : function () {
      return this._value;
    },
    set : function (value) {
      // set will fail if to is not ready
      this._timingsrc.update({position:value});
    }
  });


  /*
    timingsrc
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingInteger.prototype, 'timingsrc', {
    get : function () {return this._timingsrc;},
    set : function (timingObject) {
      if (this._timingsrc) {
        this._timingsrc.off("change", this._wrappedOnChange, this);
      }
      clearTimeout(this._tid);
      this._timingsrc = timingObject;
      this._timingsrc.on("change", this._wrappedOnChange, this);
    }
  });

  /*
    Timeouts
  */

  TimingInteger.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
  };

  // update event from timing object
  TimingInteger.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timingsrc
  TimingInteger.prototype._onChange = function () {
    this._refresh();
    this._renewTimeout();
  };

  // update event from timing object
  TimingInteger.prototype._onTimeout = function () {
    this._refresh();
    this._renewTimeout();
  };

  TimingInteger.prototype._refresh = function () {
    var value = Math.floor(this._timingsrc.query().position);
    if (this._options.max !== undefined && value > this._options.max) {
      value = this._options.max;
    }
    if (this._options.min !== undefined && value < this._options.min) {
      value = this._options.min;
    }
    if (value !== this._value) {
      this._value = value;
      this.eventifyTriggerEvent("change", this.value);
    }
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  TimingInteger.prototype._calculatePoints = function (position) {
    var before, after;
    var isTarget = Number.isInteger(position);
    if (isTarget === true) {
      before = position - 1;
      after = position + 1;
    } else {
      before = Math.floor(position);
      after = before + 1;
    }
    return {
      isTarget : isTarget,
      before : before,
      after : after
    };
  };


  TimingInteger.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  TimingInteger.prototype.close = function () {
    this._clearTimeout();
    if (this._timingsrc) {
      this._timingsrc.off("change", this._wrappedOnChange, this);
      this._timingsrc = undefined;
    }
  };

  return TimingInteger;
}); 
define('sequencing/activecue',['../util/eventify'], function (eventify) {

	/*
		Wrapping around a sequencer to safely present a single active cue as value

		implements same interface as an event variable - except variable may not be set
	*/

	var ActiveCue = function (seq) {
		this._seq = seq;
		this._stack = [];
		this._dirty = false;
		this._value = undefined;

		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true});

		var self = this;
		this._wrappedHandler = function (eList) {self._onSeqEvents(eList);}
		this._seq.on("events", this._wrappedHandler);
	};
	eventify.eventifyPrototype(ActiveCue.prototype);

	// ovverride to specify initialevents
	ActiveCue.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	ActiveCue.prototype._touch = function () {
		if (!this._dirty) {
			var self = this;
			Promise.resolve().then(function () {
				self._refresh()
			});
		}
		this._dirty = true;
	};

	ActiveCue.prototype._refresh = function () {
		var len = this._stack.length;
		// pick last item
		var value = (len > 0) ? this._stack[len-1][1] : undefined;
		if (value !== this._value) {
			this._value = value;
			this.eventifyTriggerEvent("change", value);
		}
		this._dirty = false;
	};

	ActiveCue.prototype._onSeqEvents = function (eList) {
		eList.forEach(function (eArg) {
			var seqCue = eArg.e;
			if (eArg.type === "change") {
				this._stack.push([seqCue.key, seqCue.data]);
				this._touch();
			} else if (eArg.type === "remove") {
				var i = this._stack.findIndex(function (element, index, array) {
					return (element[0] === seqCue.key); 
				});
				if (i > -1) {
					this._stack.splice(i, 1);
					this._touch();
				}
			}
		}, this);
	};

	Object.defineProperty(ActiveCue.prototype, "value", {
		get: function () {
			return this._value;
		}
	});
	ActiveCue.prototype.get = function () { return this._value;};


	ActiveCue.prototype.close = function () {
		this._seq.off("events", this._wrappedHandler);
	};


	return ActiveCue;
});


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

define('sequencing/main',['./sequencer', './windowsequencer', './timingcallbacks', './timinginteger', './activecue'], 
	function (seq, WindowSequencer, timingcallbacks, TimingInteger, ActiveCue) {		
		'use strict';


    // Common constructor for Sequencer and WindowConstructor
    var Sequencer = function (toA, toB, _axis) {
      if (toB === undefined) {
        return new seq.DefaultSequencer(toA, _axis);
      } else {
        return new WindowSequencer(toA, toB, _axis); 
      }
    };

    // Add clone prototype to both Sequencer and WindowSequencer
    seq.DefaultSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
    WindowSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };



		return {
			Sequencer : Sequencer,
			Interval : seq.Interval,
			inherit : seq.inherit,
      setPointCallback : timingcallbacks.setPointCallback,
      setIntervalCallback : timingcallbacks.setIntervalCallback,
      TimingInteger : TimingInteger,
      ActiveCue : ActiveCue
		};
	}
);
/*
  Copyright 2015 Norut Northern Research Institute
  Author : Njaal Trygve Borch njaal.borch@norut.no

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
  MEDIASYNC

  Time-aligning a HTMLMediaElement to a Timing Object

*/

define ('mediasync/mediasync',[],function () {

  'use strict';

  /**
   * Detect if we need to kick the element
   * If it returns true, you can re-run this function on
   * a user interaction to actually perform the kick
   */
  var _need_kick;
  function needKick(elem) {
    if (_need_kick === false) {
      return false;
    }
    if (elem.canplay) {
      _need_kick = false;
      return false;
    }
    var m = elem.muted;
    elem.muted = true
    elem.play();
    _need_kick = elem.paused == true;
    elem.pause();
    elem.muted = m;
    return _need_kick;
  }

  /**
   * The mediaSync object will try to synchronize an HTML 
   * media element to a Shared Motion.  It exploits 
   * playbackRate functionality if possible, but will fallback 
   * to only currentTime manipulation (skipping) if neccesariy.
   *
   * Options: 
   *  * skew (default 0.0) 
   *     how many seconds (float) should be added to the 
   *     motion before synchronization.  Calculate by 
   *     start point of element - start point of motion
   *  * automute (default true)
   *     Mute the media element when playing too fast (or too slow) 
   *  * mode (default "auto")
   *     "skip": Force "skip" mode - i.e. don't try using playbackRate.
   *     "vpbr": Force variable playback rate.  Normally not a good idea
   *     "auto" (default): try playbackRate. If it's not supported, it will
   *     struggle for a while before reverting.  If 'remember' is not set to
   *     false, this will only happen once after each browser update.
   *  * loop (default false)
   *     Loop the media   
   *  * debug (default null)
   *     If debug is true, log to console, if a function, the function
   *     will be called with debug info
   *  * target (default 0.025 - 25ms ~ lipsync)
   *     What are we aiming for?  Default is likely OK, if we can do 
   *     better, we will.  If the target is too narrow, you'll end up
   *     with a more skippy experience.  When using variable playback
   *     rates, this parameter is ignored (target is always 0)
   *  * remember (default false)
   *     Remember the last experience on this device - stores support
   *     or lack of support for variable playback rate.  Records in
   *     localStorage under key "mediascape_vpbr", clear it to re-learn
   */
  function mediaSync(elem, motion, options) {
    var API;
    var _options = options || {};
    _options.skew = _options.skew || 0.0;
    _options.target = _options.target || 0.025;
    _options.original_target = _options.target;
    _options.loop = _options.loop || false;
    _options.target = _options.target * 2; // Start out coarse
    if (_options.remember === undefined){
      _options.remember = false;
    }
    if (_options.debug || _options.remember === false) {
      localStorage.removeItem("mediascape_vpbr")
      _options.remember = false;
    }
    if (_options.automute === undefined) {
      _options.automute = true;
    }
    var _auto_muted = false;


    var onchange = function(e) {
      _bad = 0;
      _samples = [];
      _last_skip = null;

      // If we're paused, ignore
      if (_stopped || _paused) {
        return;
      }
     
      if (_update_func != undefined) {
        _update_func(e);          
      } else {
        console.log("WARNING: onchange but no update func yet");
      }
    }

    var setMotion = function(motion) {
      _bad = 0;
      if (_motion) {
        _motion.off("change", onchange);        
      }
      _motion = motion;

      // if motion is a timing object, we add some shortcuts
      if (_motion.version == 3) {
        _motion.__defineGetter__("pos", function() {return _motion.query().position});
        _motion.__defineGetter__("vel", function() {return _motion.query().velocity});
        _motion.__defineGetter__("acc", function() {return _motion.query().acceleration});
      }

      _motion.on("change", onchange);
    };

    if (!motion) {
      console.log("WARNING: No motion has been set");
    } else {
      //setMotion(motion);      
    }


    var _stopped = false;
    var _paused = false;
    var _motion;

    function onpaused() {
      if (_motion.vel == 1) {
        try {
          elem.play();          
        } catch (err) {
          _doCallbacks("error", {event:"error", op:"play"});
          console.log("Error in 'play':", err);
        }
      }      
    }
    function onplay() {
      console.log("onplay");
      if (_motion.vel == 0) {
        elem.pause();
      }
    }
    function onerror() {
      console.log(err); // TODO: REPORT ERRORS
      stop();     
      _doCallbacks("error", {event: "error", msg: err});
    }

    var pause = function(val) {
      if (val == undefined) val = true;
      _paused = val;
      if (!_paused) {
        onchange();
      }
    }

    var stop = function() {
      _stopped = true;
      elem.removeEventListener("paused", onpaused);
      elem.removeEventListener("play", onplay);
      elem.removeEventListener("error", onerror);
    }


    var _update_func;
    var _bad = 0;
    var _amazing = 0;
    var last_update;
    var _samples = [];
    var _vpbr; // Variable playback rate
    var _last_bad = 0;
    var _perfect = 5;
    var _is_in_sync = false;

    
    var _last_skip;
    var _thrashing = 0;
    var skip = function(pos) {
      if (elem.readyState == 0) {
        return;
      }
      if (_motion.vel != 1) {
        // Just skip, don't do estimation
        elem.currentTime = pos;
        _last_skip = undefined;
        _doCallbacks("skip", {event:"skip", pos:pos, target:_motion.pos, adjust:0})
        return;
      }

      var adjust = 0;
      var now = performance.now();
      if (_last_skip) {
        if (now - _last_skip.ts < 1500) {
          _thrashing += 1;
          if (_thrashing > 3) {
            // We skipped just a short time ago, we're thrashing
            _dbg("Lost all confidence (thrashing)");
            _options.target = Math.min(1, _options.target*2);            
            _doCallbacks("target_change", {
              event: "target_change",
              target: _options.target,
              reason: "thrashing"
            });
            _thrashing = 0;
          }
        } else {
          _thrashing = 0;
        }
        var elapsed = (now - _last_skip.ts) / 1000;
        var cur_pos = elem.currentTime;
        var miss = (loop(_last_skip.pos + elapsed)) - cur_pos;
        adjust = _last_skip.adjust + miss;
        if (Math.abs(adjust) > 5) adjust = 0; // Too sluggish, likely unlucky
      }
      // Ensure that we're playing back at speed 1
      elem.playbackRate = 1.0;
      _dbg({type:"skip", pos:pos + adjust, target:loop(_motion.pos), adjust:adjust});
      _perfect = Math.min(5, _perfect + 5);
      if (_motion.vel != 1) {
        elem.currentTime = pos;
      } else {
        elem.currentTime = pos + adjust;
        _last_skip = {
          ts: now, //performance.now(),
          pos: pos,
          adjust: adjust
        }
      }
      if (_is_in_sync) {
        _is_in_sync = false;
        _doCallbacks("sync", {event:"sync", sync:false});
      }
      _doCallbacks("skip", {event:"skip", pos:pos + adjust, target:_motion.pos, adjust:adjust})
    };


    function loop(pos) {
      if (_options.loop) {
        if (_options.duration) {
          return pos % _options.duration;          
        } else {
          return pos % elem.duration;                    
        }
      }
      return pos;
    }

    // onTimeChange handler for variable playback rate
    var update_func_playbackspeed = function(e) {
      if (_stopped || _paused) {
        return;
      }
        var snapshot = query();
        if (loop(snapshot.pos) == last_update) {
          return;
        }
        last_update = loop(snapshot.pos);

        // If we're outside of the media range, don't stress the system
        var p = loop(snapshot.pos + _options.skew);
        var duration = elem.duration;
        if (duration) {
          if (p < 0 || p > duration) {
            if (!elem.paused) {
              elem.pause();
            }
            return;
          }
        }

        // Force element to play/pause correctly
        if (snapshot.vel != 0) {
          if (elem.paused) {
            elem.play();
          }
        } else if (!elem.paused) {
          elem.pause();
        }

        try {
          if (!_vpbr && _bad > 40) {
            if (_auto_muted) {
              elem.muted = false;
              _auto_muted = false;              
            }
            _doCallbacks("muted", {event:"muted", muted:false});
            throw new Error("Variable playback rate seems broken - " + _bad + " bad");
          }
          // If we're WAY OFF, jump
          var diff = p - elem.currentTime;
          if ((diff < -1) || (snapshot.vel == 0 || Math.abs(diff) > 1)) {
            _dbg({type:"jump", diff:diff});
            // Stationary, we need to just jump
            var new_pos = loop(snapshot.pos + _options.skew);
            if (performance.now() - _last_bad > 150) {
              //_bad += 10;
              _last_bad = performance.now();            
              skip(new_pos);
            }
            return;
          }

          // Need to smooth diffs, many browsers are too inconsistent!
          _samples.push(diff);
          if (_samples.length >= 3) {
            var avg = 0;
            for (var i = 0; i < _samples.length; i++) {
              avg += _samples[i];
            }
            diff = avg / _samples.length;
            _samples = _samples.splice(0, 1);;
          } else {
            return;
          }

          // Actual sync
          _dbg({type:"dbg", diff:diff, bad:_bad, vpbr:_vpbr});
          var getRate = function(limit, suggested) {
            return Math.min(_motion.vel+limit, Math.max(_motion.vel-limit, _motion.vel + suggested));
          }

          if (Math.abs(diff) > 1) {
            _samples = [];
            elem.playbackRate = getRate(1, diff*1.3); //Math.max(0, _motion.vel + (diff * 1.30));
            _dbg({type:"vpbr", level:"coarse", rate:elem.playbackRate});
            _bad += 4;
          } else if (Math.abs(diff) > 0.5) {
            _samples = [];
            elem.playbackRate = getRate(0.5, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            _dbg({type:"vpbr", level:"mid", rate:elem.playbackRate});
            _bad += 2;
          } else if (Math.abs(diff) > 0.1) {
            _samples = [];
            elem.playbackRate = getRate(0.4, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            _dbg({type:"vpbr", level:"midfine", rate:elem.playbackRate});
            _bad += 1;
          } else if (Math.abs(diff) > 0.025) {
            _samples = [];
            elem.playbackRate = getRate(0.30, diff*0.60)//Math.min(1.015, _motion.vel + (diff * 0.30));
            _dbg({type:"vpbr", level:"fine", rate:elem.playbackRate});
          } else {
            if (!_vpbr) {
              _bad = Math.max(0, _bad-20);
              _amazing++;
              if (_amazing > 5) {
                _vpbr = true; // Very unlikely to get here if we don't support it!
                if (localStorage && _options.remember) {
                  _dbg("Variable Playback Rate capability stored");
                  localStorage["mediascape_vpbr"] = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":true});
                }
              }
            }
            if (!_is_in_sync) {
              _is_in_sync = true;
              _doCallbacks("sync", {
                event: "sync",
                sync: true
              });
            }
            elem.playbackRate = getRate(0.02, diff * 0.07); //_motion.vel + (diff * 0.1);
          }
        if (_options.automute) {
          if (!elem.muted && (elem.playbackRate > 1.05 || elem.playbackRate < 0.95)) {
            _auto_muted = true;              
            elem.muted = true;
            _doCallbacks("muted", {event:"muted", muted:true});
            _dbg({type:"mute", muted:true});
          } else if (elem.muted && _auto_muted) {
            _auto_muted = false;
            elem.muted = false;
            _dbg({type:"mute", muted:false});
            _doCallbacks("muted", {event:"muted", muted:false});
          }
        }

      } catch (err) {
        // Not supported after all!
        if (_options.automute) {
          elem.muted = false;
        }
        _last_skip = null;  // Reset skip stuff
        if (localStorage && _options.remember) {
          _dbg("Variable Playback Rate NOT SUPPORTED, remembering this  ");
          localStorage["mediascape_vpbr"] = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":false});
        }
        console.log("Error setting variable playback speed - seems broken", err);
        _setUpdateFunc(update_func_skip);
      }
    };

    var last_pos;
    var last_diff;
    // timeUpdate handler for skip based sync
    var update_func_skip = function(ev) {
      if (_stopped || _paused) {
        return;
      }

      var snapshot = query();
      if (snapshot.vel > 0) {
        if (elem.paused) {
          elem.play();
        }
      } else if (!elem.paused) {
        elem.pause();
      }

      if (snapshot.vel != 1) {
        if (loop(snapshot.pos) == last_pos) {
          return;
        }
        last_pos = snapshot.pos;
        _dbg("Jump, playback speed is not :", snapshot.vel);
        // We need to just jump
        var new_pos = loop(snapshot.pos + _options.skew);
        if (elem.currentTime != new_pos) {
          skip(new_pos, "jump");
        }
        return;
      }

      var p = snapshot.pos + _options.skew;
      var diff = p - elem.currentTime;

      // If this was a Motion jump, skip immediately
      if (ev != undefined && ev.pos != undefined) {
        _dbg("MOTION JUMP");
        var new_pos = snapshot.pos + _options.skew;
        skip(new_pos);
        return;
      }

      // Smooth diffs as currentTime is often inconsistent
      _samples.push(diff);
      if (_samples.length >= 3) {
        var avg = 0;
        for (var i = 0; i < _samples.length; i++) {
          avg += _samples[i];
        }
        diff = avg / _samples.length;
        _samples.splice(0, 1);
      } else {
        return;
      }

      // We use the number of very good hits to build confidence
      if (Math.abs(diff) < 0.001) {
        _perfect = Math.max(5, _perfect); // Give us some breathing space!      
      }

      if (_perfect <= -2) {
        // We are failing to meet the target, make target bigger
        _dbg("Lost all confidence");
        _options.target = Math.min(1, _options.target*1.4);
        _perfect = 0;
        _doCallbacks("target_change", {
          event: "target_change",
          target: _options.target,
          reason: "unknown"
        });
      } else if (_perfect > 15) {
        // We are hitting the target, make target smaller if we're beyond the users preference
        _dbg("Feels better");
        if (_options.target == _options.original_target) {
          // We're improving yet 'perfect', trigger "good" sync event
          if (!_is_in_sync) {
            _is_in_sync = true;
            _doCallbacks("sync", {event:"sync", sync:true});
          }
        }
        _options.target = Math.max(Math.abs(diff) * 0.7, _options.original_target);
        _perfect -= 8;
        _doCallbacks("target_change", {
          event: "target_change",
          target: _options.target,
          reason: "improving"
        });
      }

      _dbg({type:"dbg", diff:diff, target:_options.target, perfect:_perfect});

      if (Math.abs(diff) > _options.target) {
        // Target miss - if we're still confident, don't do anything about it
        _perfect -= 1;
        if (_perfect > 0) {
          return;
        }
        // We've had too many misses, skip
        new_pos = _motion.pos + _options.skew
        //_dbg("Adjusting time to " + new_pos);
        _perfect += 8;  // Give some breathing space
        skip(new_pos);
      } else {
        // Target hit
        if (Math.abs(diff - last_diff) < _options.target / 2) {
          _perfect++;
        }
        last_diff = diff;
      }
    }

    var _initialized = false;
    var init = function() {
      if (_initialized) return;
      _initialized = true;
      if (_motion === undefined) {
        setMotion(motion);
      }
      if (localStorage && _options.remember) {
         if (localStorage["mediascape_vpbr"]) {
            var vpbr = JSON.parse(localStorage["mediascape_vpbr"]);
            if (vpbr.appVersion === navigator.appVersion) {
              _vpbr = vpbr.vpbr;
            }
         }
      }

      if (_options.mode === "vpbr") {
        _vpbr = true;
      }
      if (_options.mode === "skip" || _vpbr === false) {
        elem.playbackRate = 1.0;
        _update_func = update_func_skip;
      } else {
        if (_options.automute) {
          elem.muted = true;
          _auto_muted = true;
          _doCallbacks("muted", {event:"muted", muted:true});
        }
        _update_func = update_func_playbackspeed;
      }
      elem.removeEventListener("canplay", init);
      elem.removeEventListener("playing", init);
      _setUpdateFunc(_update_func);
      _motion.on("change", onchange);
    } 

    elem.addEventListener("canplay", init);
    elem.addEventListener("playing", init);    

    var _last_update_func;
    var _poller;
    var _setUpdateFunc = function(func) {
      if (_last_update_func) {
        clearInterval(_poller);
        elem.removeEventListener("timeupdate", _last_update_func);
        elem.removeEventListener("pause", _last_update_func);
        elem.removeEventListener("ended", _last_update_func);        
      }
      _last_update_func = func;
      elem.playbackRate = 1.0;
      elem.addEventListener("timeupdate", func);
      elem.addEventListener("pause", func);
      elem.addEventListener("ended", func);

      if (func === update_func_playbackspeed) {
        _doCallbacks("mode_change", {event:"mode_change", mode:"vpbr"});
      } else {
        _doCallbacks("mode_change", {event:"mode_change", mode:"skip"});
      }
    }

    var query = function() {
      // Handle both msvs and timing objects
      if (_motion.version == 3) {
        var q = _motion.query();
        return {
          pos: q.position,
          vel: q.velocity,
          acc: q.acceleration
        }
      }
      return _motion.query();
    }


    var setSkew = function(skew) {
      _options.skew = skew;
    }

    var getSkew = function() {
      return _options.skew;
    }

    var setOption = function(option, value) {
      _options[option] = value;
      if (option === "target") {
        _options.original_target = value;
      }
    }

    /*
     * Return 'playbackRate' or 'skip' for play method 
     */
    var getMethod = function() {
      if (_update_func === update_func_playbackspeed) {
        return "playbackRate";
      } 
      return "skip";
    }

    // As we are likely asynchronous, we don't really know if elem is already
    // ready!  If it has, it will not emit canplay.  Also, canplay seems shady
    // regardless
    var beater = setInterval(function() {
      if (elem.readyState >= 2) {
        clearInterval(beater);
        try {
          var event = new Event("canplay");
          elem.dispatchEvent(event);
        } catch (e) {
          var event = document.createEvent("Event");
          event.initEvent("canplay", true, false)
          elem.dispatchEvent(event);
        }
      };
    }, 100);


    // callbacks    
    var _callbacks = {
      skip: [],
      mode_change: [],
      target_change: [],
      muted: [],
      sync: [],
      error: []
    };

    var _doCallbacks = function(what, e) {
      if (!_callbacks.hasOwnProperty(what)) {
        throw "Unsupported event: " + what;
      }
      for (var i = 0; i < _callbacks[what].length; i++) {
        h = _callbacks[what][i];
        try {
          h.call(API, e);
        } catch (e) {
          console.log("Error in " + what + ": " + h + ": " + e);
        }
      }
    };

    // unregister callback
    var off = function(what, handler) {
      if (!_callbacks.hasOwnProperty(what)) throw "Unknown parameter " + what;
      var index = _callbacks[what].indexOf(handler);
      if (index > -1) {
        _callbacks[what].splice(index, 1);
      }
      return API;
    };

    var on = function(what, handler, agentid) {
      if (!_callbacks.hasOwnProperty(what)) {
        throw new Error("Unsupported event: " + what);
      }
      if (!handler || typeof handler !== "function") throw "Illegal handler";
      var index = _callbacks[what].indexOf(handler);
      if (index != -1) {
        throw new Error("Already registered");
      }

      // register handler
      _callbacks[what].push(handler);

      // do immediate callback?
      setTimeout(function() {
        if (what === "sync") {
          _doCallbacks(what, {
            event: what,
            sync: _is_in_sync
          }, handler);          
        }
        if (what === "muted") {
          _doCallbacks(what, {
            event: what,
            muted: _auto_muted
          }, handler);          
        }
      }, 0);
      return API;
    };


    function _dbg() {
      if (!_options.debug) {
        return;
      }
      if (typeof(_options.debug) === "function") {
        //_options.debug(arguments);
        var args = arguments;
        setTimeout(function() {
          _options.debug.apply(window, args);
        }, 0);
      } else {
        var args = [];
        for (var k in arguments) {
          args.push(arguments[k]);
        }
        console.log(JSON.stringify(args));
      }
    }




    // Export the API
    API = {
      setSkew: setSkew,
      getSkew: getSkew,
      setOption: setOption,
      getMethod: getMethod,
      setMotion: setMotion,
      stop: stop,
      pause: pause,
      on: on,
      off: off,
      init:init
    };
    return API;
  }


  var MediaSync = function (elem, timingObject, options) {
    this._sync = mediaSync(elem, timingObject, options);
  };

  MediaSync.prototype.setSkew = function (skew) {
    this._sync.setSkew(skew);
  };

  MediaSync.prototype.getSkew = function () {
    this._sync.getSkew();
  };

  MediaSync.prototype.setOption = function (option, value) {
    this._sync.setOption(option, value);
  };

  MediaSync.prototype.getMethod = function () {
    this._sync.getMethod();
  };

  /*
    Accessor for timingsrc.
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(MediaSync.prototype, 'timingsrc', {
    get : function () {return this._sync._motion;},
    set : function (timingObject) {
      this._sync.setMotion(timingObject);
    }
  });

  MediaSync.prototype.stop = function () {
    this._sync.stop();
  };

  MediaSync.prototype.pause = function (val) {
    this._sync.pause(val);
  };

  MediaSync.prototype.on = function (what, handler, agentid) {
    this._sync.on(what, handler, agentid);
  };

  MediaSync.prototype.off = function (type, handler) {
    this._sync.off(type, handler);
  };

  // export module
  return {
    mediaSync : mediaSync,
    MediaSync: MediaSync,
    mediaNeedKick : needKick
  };
});


/*
  Written by Ingar Arntzen, Norut
*/

define ('timingsrc',['./timingobject/main', './sequencing/main', './mediasync/mediasync'], 
	function (timingobject, sequencing, mediasync) {
	return {
		version : "v2",
		
		// Timing Object
		TimingObject : timingobject.TimingObject,

		// Timing Converters
		ConverterBase : timingobject.ConverterBase,
		SkewConverter : timingobject.SkewConverter,
		DelayConverter : timingobject.DelayConverter,
		ScaleConverter : timingobject.ScaleConverter,
		LoopConverter : timingobject.LoopConverter,
		RangeConverter : timingobject.RangeConverter,
		TimeShiftConverter : timingobject.TimeShiftConverter,
		LocalConverter : timingobject.LocalConverter,
		DerivativeConverter : timingobject.DerivativeConverter,
		
		// Sequencing
		Interval : sequencing.Interval,
		Sequencer : sequencing.Sequencer,
		setPointCallback : sequencing.setPointCallback,
		setIntervalCallback : sequencing.setIntervalCallback,
		TimingInteger : sequencing.TimingInteger,
		ActiveCue : sequencing.ActiveCue,

		// MediaSync
		MediaSync: mediasync.MediaSync,
    	mediaNeedKick : mediasync.needKick
	};
});

