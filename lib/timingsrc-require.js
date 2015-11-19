
/*
  Written by Ingar Arntzen, Norut
*/




define('util/eventutils',[],function () {

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
				typeList = Object.keys(this._callbacks).filter(function (key) {
					return (key !== "events");
				}, this);
			}
			return typeList.
				concatMap(function (type) {
					return this._makeInitEvents(type).map(function (e) {
						return {
							type: type,
							e: e
						};
					}, this);
				}, this);		
		};

		_prototype._internalEventFormatter = function (type, e) {
			if (!this._eventFormatter) return e;
			// formatting changes for events not supported 
			if (type === "events") {
				// e is list of [{type: , e: }] pairs
				return e.map(function (eItem) {
					return {
						type: eItem.type,
						e: this._eventFormatter(eItem.type, eItem.e)
					};
				}, this);
			} else {
				return this._eventFormatter(type, e);
			}
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
			- triggers entire eventlist of special eventname "events"
			- triggers individual events on their specific event names
		*/
		_prototype._triggerEvents = function (type, eList) {
			if (type === undefined) throw new Error("Illegal event type; undefined");
			if (type === "events") throw new Error("Illegal event type; triggering of events on protocted event type 'events'" );
			if (eList.length === 0 ) throw new Error("eList empty");
			var eItemList = eList.map(function (e){
				return {
					type : type,
					e: e
				};
			}, this);
			// regular events
			eItemList.forEach(function (eItem) {
				this._internalTriggerEvent(type, eItem);
			}, this);
			// special event "events"
			this._internalTriggerEvents("events", eItemList);
        };

        /*
         	Public : Trigger Event
         	Shorthand for triggering single events
        */
        _prototype._triggerEvent = function (type, e) {
        	this._triggerEvents(type, [e]);
        	return this;
        };

    	/*
			Internal method for triggering events
			- distinguish "events" from other event names
    	*/
      	_prototype._internalTriggerEvents = function (type, eItemList, handler) {
      		// protected event type "events"
      		if (type === "events") {
      			this._internalTriggerEvent("events", {type: "events", e: eItemList}, handler);
      		} else {
      			eItemList.forEach(function (eItem) {
      				this._internalTriggerEvent(eItem.type, eItem, handler);
	      		}, this);
      		}      	
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
	    	    			self._internalTriggerEvents(type, eItemList, handler);
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


/* 
	MAIN
*/

if (typeof module !== 'undefined' && require.main === module) {

	var eventify = require('./eventify');

	var Source = function () {
		this.name = "source";
		this.value = 0;
		eventify(Source.prototype);
		this._defineEvent("change", {init:true}); // define change event (supporting init-event)
	};

	Source.prototype._makeInitEvents = function (type) {
		if (type === "change") {
			return [{value : this.value}];
		}
		return [];
	};

	Source.prototype._eventFormatter = function (type, e) {
		return e;
	};

	Source.prototype._callbackFormatter = function (type, e, eInfo) {
		if (type === "change") {
			return [{type: type, data:e}];
		}
		return [type, e, eInfo];
	};

	Source.prototype.inc = function () {
		this.value += 1;
		this._triggerEvents("change", [{value : this.value}]);
	};



	var Target = function (name) {
		this.name = "target";
	};
	Target.prototype.handler = function (e) {
		console.log(e);
	};

	var target = new Target();
	var source = new Source();

	source.on("change", target.handler, target);
	
	var h = function (type, e, eInfo) {console.log(type, e, eInfo);};
	source.on("events", h);

	setTimeout(function () {source.inc();}, 100);



}

;
/*
  Written by Ingar Arntzen, Norut
*/

define('util/motionutils',[],function () {

		'use strict';
		
	    // Local time source (seconds)
	    var secClock = function () {
			return performance.now()/1000.0;
	    };

	    // Local time source (milliseconds)
	    var msClock = function () {
	    	return performance.now();
	    };
	   
	    // Calculate a snapshot of the motion vector,
	    // given initials conditions vector: [p0,v0,a0,t0] and t (absolute - not relative to t0) 
	    // if t is undefined - t is set to now
	    var calculateVector = function(vector, tsSec) {
			if (tsSec === undefined) {
			    tsSec = secClock();
			}
			var deltaSec = tsSec - vector.timestamp;
			return {
				position : vector.position + vector.velocity*deltaSec + 0.5*vector.acceleration*deltaSec*deltaSec,
				velocity : vector.velocity + vector.acceleration*deltaSec,
				acceleration : vector.acceleration, 
				timestamp : tsSec
			};
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
	    var calculateMinPositiveRealSolution = function (p,v,a,x) {
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
	    var calculateDelta = function (vector, range ) {
			var p = vector.position;
			var v = vector.velocity;
			var a = vector.acceleration;
			// Time delta to hit posBefore
			var deltaBeforeSec = calculateMinPositiveRealSolution(p,v,a, range[0]);
			// Time delta to hit posAfter
			var deltaAfterSec = calculateMinPositiveRealSolution(p,v,a, range[1]);
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
	    var calculateSolutionsInInterval = function(vector, deltaSec, plist) {
			var solutions = [];
			var p0 = vector.position;
			var v0 = vector.velocity;
			var a0 = vector.acceleration;
			for (var i=0; i<plist.length; i++) {
			    var o = plist[i];
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
			return new [Math.min(p0,p1), Math.max(p0,p1)];
	    };


	// return module object
	return {
		msClock : msClock,
		secClock : secClock,
		calculateVector : calculateVector,
		calculateDirection : calculateDirection,
		calculateDelta : calculateDelta,
		calculateInterval : calculateInterval,
		calculateSolutionsInInterval : calculateSolutionsInInterval
	};
});



/*
  Written by Ingar Arntzen, Norut

	TimingBase defines base classes for TimingObject and TimingWrappers.
	It makes use of eventutil.js for event stuff, including immediate events.
	It makes use of motionutils.js for calculations. 
*/

define('timingobject/timingbase',['util/eventutils', 'util/motionutils'], function (eventutils, motionutils) {

	'use strict';

	//	STATE is used for managing/detecting range violations.
	var STATE = Object.freeze({
	    INIT : "init",
	    INSIDE: "inside",
	    OUTSIDE_LOW: "outsidelow",
	    OUTSIDE_HIGH: "outsidehigh"
	});

	// Utility inheritance function.
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


	// TIMING BASE
	/*
		Base class for TimingObject and WrapperBase

		essential internal state
		- range, vector
	
		external methods
		query, update

		event stuff from eventutils
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
		by subclasses
	*/


	var TimingBase = function (options) {
		this._version = 3;
		// options
		this._options = options || {};
		// range timeouts off by default
		if (!this._options.hasOwnProperty("timeout")) {
			this._options.timeout = false;
		}
		// cached vector
		this._vector = null;
		// cached range
		this._range = null;
		// timeout support
		this._timeout = null; // timeout for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		// event support
		eventutils.eventify(this, TimingBase.prototype);
		this._defineEvent("change", {init:true}); // define change event (supporting init-event)
		this._defineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)
	};


	// Accessors 

	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { 
			return this._version;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () {
			if (this._range === null) return null;
			// copy internal range
			return [this._range[0], this._range[1]];
		}
	});

	// Accessor internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {	
			if (this._vector === null) return null;
			// copy cached vector
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
		}
	});

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	TimingBase.prototype._makeInitEvents = function (type) {
		var res = this.query();
		if (type === "change") {
			return (res !== null) ? [undefined] : []; 
		} else if (type === "timeupdate") {
			return (res !== null) ? [undefined] : []; 
		}
		return [];
	};

	/*
		overrides how event callbacks are delivered 
		- i.e. how many parameters, only one parameter - e
		specific to eventutils
	*/
	TimingBase.prototype._callbackFormatter = function (type, e, eInfo) { return [e];};


	/*
		Basic query. Insensitive to range violations.
		Must be overrided by subclasses with specified range.
	*/
	TimingBase.prototype.query = function () {
		if (this.vector === null) return null;
		return motionutils.calculateVector(this.vector);
	};

	// to be overridden
	TimingBase.prototype.update = function (vector) {};

	/*
		to be overridden
		get range is useful for setting the range internally,
		when the range depends on the range of an external (upstream)
		timing object. Get range is invoked when first change
		event is received from external object, thereby guaranteeing 
		that range of external timing object is well defined.
		(see _preProcess)
		return correct range [start, end]

		Invoked every time the external object is switched,
		thus is may change.
	*/
	TimingBase.prototype._getRange = function () {return null;};

	// CHANGE EVENTS


	/*
		do not override
		Handle incoming vector, from "change" from external object
		or from an internal timeout.
		
		_onChange is invoked allowing subclasses to specify transformation
		on the incoming vector before processing.
	*/
	TimingBase.prototype._preProcess = function (vector) {
		if (this._range === null) {
			this._range = this._getRange();
		}
		var vector = this._onChange(vector);
		this._process(vector);
	};

	/*
		to be ovverridden
		specify transformation
		on the incoming vector before processing.
		useful for wrappers that do mathematical transformations,
		or as a way to enforse range restrictions.
		invoming vectors from external change events or internal
		timeout events

		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype._onChange = function (vector) {
		return vector;
	};
	
	// TIMEOUTS
	// Use range to implement timeouts on range violation

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
	 		this._timeout = {vector:vector};
	 		this._internalTimeout();
		}
	};

	/*
		to be overridden
		must be implemented by subclass if range timeouts are required
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.
	*/
	TimingBase.prototype._calculateTimeoutVector = function () {
		return null;
	};

	/*
		do not override
		internal utility function for clearing vector timeout
	*/
	TimingBase.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			clearTimeout(this._timeout.tid);
			this._timeout = null;
		}
	};

	/*
		do not override
		Internal handler for vector timeouts
		guarantee that timeouts are not delivered too soon.

	*/
	TimingBase.prototype._internalTimeout = function () {
		if (this._timeout === null) return;
		// ensure that timeout does not fire to early
		var vector = this._timeout.vector;
		var early = vector.timestamp - motionutils.secClock();
		if (early > 0.0) {
			var self = this;
			this._timeout.tid = setTimeout(function () {
				self._internalTimeout();
			}, early*1000);
			return;
		}
		vector = this._onTimeout(vector);
		this._process(vector);
	};

	/*
		to be overridden
		subclass may implement transformation on timeout vector
		before it is given to process.
		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype._onTimeout = function (vector) {
		return vector;
	};

	// PROCESS
	/*
		do not override
		Core processing step after change event or timeout
		assignes the internal vector
	*/
	TimingBase.prototype._process = function (vector) {
		if (vector !== null) {
			// update internal vector
			this._vector = vector;
			// trigger events
			this._postProcess(this.vector);
		}
		// renew timeout
		this._renewTimeout();
	};

	/*
		may be overridden
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events 
		need to be suppressed,
	*/
	TimingBase.prototype._postProcess = function (vector) {
		// trigger change events
		this._triggerEvent("change");
		// trigger timeupdate events
		this._triggerEvent("timeupdate");
		var moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
		if (moving && this._tid === null) {
			var self = this;
			this._tid = setInterval(function () {
				self._triggerEvent("timeupdate");
			}, 200);
		} else if (!moving && this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
		}
	};


	/*
		do not override
		Given a snapshot vector, the internal range is used to 
		calculate the correct STATE (INSIDE|OUTSIDE)
	*/
	TimingBase.prototype._getCorrectRangeState = function (vector) {
		var p = vector.position,
			v = vector.velocity,
			a = vector.acceleration;
		if (p > this._range[1]) return STATE.OUTSIDE_HIGH;
		if (p < this._range[0]) return STATE.OUTSIDE_LOW;
		// corner cases
		if (p === this._range[1]) {
			if (v > 0.0) return STATE.OUTSIDE_HIGH;
			if (v === 0.0 && a > 0.0) return STATE.OUTSIDE_HIGH;
		} else if (p === this._range[0]) {
		    if (v < 0.0) return STATE.OUTSIDE_LOW;
		    if (v == 0.0 && a < 0.0) return STATE.OUTSIDE_HIGH;
		}
		return STATE.INSIDE;
	};

	/*
		do not override
		Given a snapshot vector, the range is used to 
		calculate the correct STATE (INSIDE|OUTSIDE)
		and change the vector by stopping motion
		if range restrictions are violated (OUTSIDE).
		thus guraranteeing that the returned vector is 
		INSIDE
	*/
	TimingBase.prototype._checkRange = function (vector) {
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			// protect from range violation
			vector.velocity = 0.0;
			vector.acceleration = 0.0;
			if (state === STATE.OUTSIDE_HIGH) {
				vector.position = this._range[1];
			} else vector.position = this._range[0];
		}
		return vector;
	};


	// WRAPPER BASE

	/*
		WrapperBase extends TimingBase to provide a
		base class for chainable wrappers/emulators of timing objects
		WrapperBase conceptually add the notion of a timing source,
		a pointer to a timing object up the chain. Change events 
		may be received from the timing object, and update requests 
		are forwarded in the opposite direction. 
	*/


	var WrapperBase = function (timingObject, options) {
		TimingBase.call(this, options);
		// timing source
		this._timingsrc = null;	
		// set timing source
		this.timingsrc = timingObject;
	};
	inherit(WrapperBase, TimingBase);

	/*
		Accessor for timingsrc.
		Supports dynamic switching of timing source by assignment.
	*/
	Object.defineProperty(WrapperBase.prototype, 'timingsrc', {
		get : function () {return this._timingsrc;},
		set : function (timingObject) {
			if (this._timingsrc) {
				this._timingsrc.off("change", this._preProcessWrapper);
			}
			// reset internal state
			this._range = null;
			this._vector = null;
			this._clearTimeout();
			clearTimeout(this._tid);
			this._timingsrc = timingObject;
			this._timingsrc.on("change", this._preProcessWrapper, this);
		}
	});

	/*
		to be overridden
		default forwards update request to timingsrc unchanged.
	*/
	WrapperBase.prototype.update = function (p, v, a) {
		return this.timingsrc.update(p,v,a);
	};

	/*
		to be overridden
		by default the wrapper adopts the range of timingsrc 
	*/
	WrapperBase.prototype._getRange = function () {
		return this.timingsrc.range;
	};

	/*
		not to be overridden
		event handler for "change" events on the timingsrc.
		fetches initial vector from timingsrc and dispatches
		it to preProcess() 
	*/
	WrapperBase.prototype._preProcessWrapper = function () {
		var vector = this.timingsrc.vector;
		this._preProcess(vector);
	};

	return {
		TimingBase : TimingBase,
		WrapperBase : WrapperBase,
		STATE : STATE,
		inherit: inherit,
		motionutils : motionutils
	};
});



define('timingobject/rangewrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var STATE = timingbase.STATE;
	var inherit = timingbase.inherit;

	var state = function () {
		var _state = STATE.INIT;
		var is_real_state_change = function (old_state, new_state) {
			// only state changes between INSIDE and OUTSIDE* are real state changes.
			if (old_state === STATE.OUTSIDE_HIGH && new_state === STATE.OUTSIDE_LOW) return false;
			if (old_state === STATE.OUTSIDE_LOW && new_state === STATE.OUTSIDE_HIGH) return false;
			if (old_state === STATE.INIT) return false;
			return true;
		}
		var get = function () {return _state;};
		var set = function (new_state) {
			if (new_state === STATE.INSIDE || new_state === STATE.OUTSIDE_LOW || new_state === STATE.OUTSIDE_HIGH) {
				if (new_state !== _state) {
					var old_state = _state;
					_state = new_state;
					return {real: is_real_state_change(old_state, new_state), abs: true};
				}
			};
			return {real:false, abs:false};
		}
		return {get: get, set:set};
	};


	/*
		RangeWrapper allows a new (smaller) range to be specified for a MotionWrapper.
	*/

	var RangeWrapper = function (timingObject, range) {
		WrapperBase.call(this, timingObject, {timeout:true});
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeWrapper, WrapperBase);

	// overrides
	RangeWrapper.prototype.query = function () {
		if (this.vector === null) return null;
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.timingsrc.vector);
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector);
	};
	
	// overridden
	RangeWrapper.prototype._calculateTimeoutVector = function () {
		var freshVector = this.timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	RangeWrapper.prototype._onTimeout = function (vector) {		
		return this._onChange(vector);
	};

	// overrides
	RangeWrapper.prototype._onChange = function (vector) {
		var new_state = this._getCorrectRangeState(vector);
		var state_changed = this._state.set(new_state);	
		if (state_changed.real) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === STATE.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = this._checkRange(vector);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === STATE.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
				// stay outside or first event inside 
				// drop unless 
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				if (state_changed.abs) {

					vector = this._checkRange(vector);
				} else {
					// drop event

					return null;
				}
			}
		}
		return vector;
	};

	return RangeWrapper;
});
define('timingobject/positionshiftwrapper',['./timingbase', './rangewrapper'], function (timingbase, RangeWrapper) {

	'use strict';

	var motionutils = timingbase.motionutils;	
	var WrapperBase = timingbase.WrapperBase;
	var inherit = timingbase.inherit;

	/*
		POSITION SHIFT WRAPPER
	*/

	var PositionShiftWrapper = function (timingObject, offset) {
		this._offset = offset;
		WrapperBase.call(this, timingObject);
	};
	inherit(PositionShiftWrapper, WrapperBase);

	// overrides
	PositionShiftWrapper.prototype._getRange = function () {
		var range = this.timingsrc.range;
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._offset;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._offset;
		return range;
	};
	
	// overrides
	PositionShiftWrapper.prototype._onChange = function (vector) {
		vector.position += this._offset;	
		return vector;
	};

	PositionShiftWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._offset;
		}
		return this.timingsrc.update(vector);
	};

	return PositionShiftWrapper;
});
define('timingobject/delaywrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;	
	var WrapperBase = timingbase.WrapperBase;
	var inherit = timingbase.inherit;

	/*
		DELAY WRAPPER

		Delay Wrapper introduces a positive time delay on a source timing object.

		Generally - if the source timing object has some value at time t, 
		then the delaywrapper will provide the same value at time t + delay.

		For the delay wrapper one could be imagine two different modes - LIVE and NON-LIVE.
		- LIVE:false : time-shifted vector && delayed update events
			implies an exact replica of source timing object only time-shifted, so it is not live
		- LIVE:true : time-shifted vector && immediate update events
			implies live with respect to interactivity
			
			However, right after an update, the values of the delay wrapper are not consistent with earlier values
			of timing source. Keep in mind that an update is essentially jumping from one movement to another.
			Instead, we might say that the delay wrapper remains consistent with WHAT earlier values WOULD HAVE BEEN, 
			IF THE TIMING SOURCE HAD MADE A JUMP BETWEEN THE SAME TWO MOVEMENTS EARLIER.

			However, with LIVE mode there is an issue
			
			Normal operation is no delay of vector, apply immediately.			
			update vector must be re-evaluated
			example update (0, 1, ts) to update (-delta, 1, ts) 

			This transformation may cause range violation 
			- happens only when timing object is moving.
			- requires range-wrapper logic

			For this reason, the LIVE mode is implemented as independent wrapper type, with implementation based 
			on rangewrapper.
		


		So, DelayWrapper only supports NON-LIVE	
	
	*/

	var DelayWrapper = function (timingObject, delay) {
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delaywrapper pointless");}
		WrapperBase.call(this, timingObject);
		// fixed delay
		this._delay = delay;
	};
	inherit(DelayWrapper, WrapperBase);

	// overrides
	DelayWrapper.prototype._onChange = function (vector) {
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
		var age = motionutils.secClock() - vector.timestamp;
		
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

	DelayWrapper.prototype.update = function (vector) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

	return DelayWrapper;
});
define('timingobject/scalewrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		SCALE WRAPPER
	*/
	var ScaleWrapper = function (timingObject, factor) {
		this._factor = factor;
		WrapperBase.call(this, timingObject);
	};
	inherit(ScaleWrapper, WrapperBase);

	// overrides
	ScaleWrapper.prototype._getRange = function () {
		var range = this.timingsrc.range;
		return [range[0]*this._factor, range[1]*this._factor];
	};

	// overrides
	ScaleWrapper.prototype._onChange = function (vector) {
		vector.position = vector.position * this._factor;
		vector.velocity = vector.velocity * this._factor;
		vector.acceleration = vector.acceleration * this._factor;
		return vector;
	};
	
	ScaleWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position / this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity / this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration / this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleWrapper;
});
define('timingobject/loopwrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

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
		LOOP WRAPPER
	*/

	var LoopWrapper = function (timingObject, range) {
		WrapperBase.call(this, timingObject, {timeout:true});
		this._range = range;
		this._coords = new SegmentCoords(range[0], range[1]-range[0]);
	};
	inherit(LoopWrapper, WrapperBase);

	// transform value from coordiantes X of timing source
	// to looper coordinates Y
	LoopWrapper.prototype._transform = function (x) {
		return this._coords.transformFloat(x);
	};

	// transform value from looper coordinates Y into 
	// coordinates X of timing object - maintain relative diff 
	LoopWrapper.prototype._inverse = function (y) {
		var current_y = this.query().position;
		var current_x = this.timingsrc.query().position;
		var diff = y - current_y;
		var x = diff + current_x;
		// verify that x is witin range
		return x;
	};

	// overrides
	LoopWrapper.prototype.query = function () {
		if (this.vector === null) return null;
		var vector = motionutils.calculateVector(this.vector);
		// trigger state transition if range violation is detected
		if (vector.position > this._range[1]) {
			vector.position = this._range[0];
			this._main(vector)
		} else if (vector.position < this._range[0]) {
			vector.position = this._range[1];
			this._main(vector);
		} else {
			// no range violation
			return vector;
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector);
	};

	// overrides
	LoopWrapper.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = this._inverse(vector.position);
		}
		return this.timingsrc.update(vector);
	};

	// overrides
	LoopWrapper.prototype._calculateTimeoutVector = function () {
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
	LoopWrapper.prototype._onTimeout = function (vector) {
		if (vector.position >= this._range[1]) {
			vector.position = this._range[0];
		} else if (vector.position <= this._range[0]) {
			vector.position = this._range[1];
		}
		return vector;
	};

	// overrides
	LoopWrapper.prototype._onChange = function (vector) {
		vector.position = this._transform(vector.position);
		return vector;
	};

	return LoopWrapper;
});
define('timingobject/timeshiftwrapper',['./timingbase', './rangewrapper'], function (timingbase, RangeWrapper) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		TIMESHIFT WRAPPER

		Timeshift wrapper timeshift a timing object by timeoffset.
		Positive timeoffset means that the timeshift wrapper will run ahead of the source timing object.
		Negative timeoffset means that the timeshift wrapper will run behind the source timing object.
		
		Updates affect the wrapper immediately. This means that update vector must be re-calculated
		to the value it would have at time-shifted time. Timestamps are not time-shifted, since the motion is still live.
		For instance, (0, 1, ts) becomes (0+(1*timeshift), 1, ts) 

		However, this transformation may cause range violation 
			- this happens only when timing object is moving.
			- implementation requires range-wrapper logic

		To fix this, the timeshift wrapper is wrapped in a rangewrapper.
	*/

	var TimeShiftWrapper = function (timingObject, timeOffset) {
		WrapperBase.call(this, timingObject);
		this._timeOffset = timeOffset;
	};
	inherit(TimeShiftWrapper, WrapperBase);

	// overrides
	TimeShiftWrapper.prototype._onChange = function (vector) {
		// calculate timeshifted vector
		var newVector = motionutils.calculateVector(vector, vector.timestamp + this._timeOffset);
		newVector.timestamp = vector.timestamp;
		return newVector;
	};

	/*
		Hides wrapping of rangewrapper to specify new ranges.
		If range is not specified, default is to use range of timingObject
	*/
	var RangeTimeShiftWrapper = function (timingObject, timeOffset, range) {
		range = range || timingObject.range;
		return new RangeWrapper(new TimeShiftWrapper(timingObject, timeOffset), range);
	};

	return RangeTimeShiftWrapper;
});
define('timingobject/localwrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		LOCAL WRAPPER

		Update requests are cached locally, visible to the query
		operation, thus allowing them to take effect immediately
		(speculatively).

		A timeout clears the speculative internal vector after some time,
		unless a change notification is received in the mean time.

		NO SUPPORT for STREAMING updates. 
		- bind update request to update notification

	*/

	var LocalWrapper = function (timingObject) {
		WrapperBase.call(this, timingObject);
		this._speculative = false;
	};
	inherit(LocalWrapper, WrapperBase);

	// overrides
	LocalWrapper.prototype.update = function (vector) {		
		var newVector = this.timingsrc.update(vector);
		this._speculative = true;
		// process update immediately
		var self = this;
		setTimeout(function () {
			self._preProcess(newVector);
		}, 0);
		return newVector;
	};

	// overrides
	LocalWrapper.prototype._onChange = function (vector) {
		if (this._speculative) {
			this._speculative = false;
			// todo - suppress change only if it corresponds to change request sent by self
		}
		return vector;
	};

	return LocalWrapper;
});
define('timingobject/derivativewrapper',['./timingbase'], function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;
	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		DERIVATIVE WRAPPER

		position variable represents velocity of source timing object
		no range exist for velocity
	*/
	var DerivativeWrapper = function (timingObject, factor) {
		WrapperBase.call(this, timingObject);
	};
	inherit(DerivativeWrapper, WrapperBase);

	// overrides
	DerivativeWrapper.prototype._getRange = function () { return [-Infinity, Infinity];};

	// overrides
	DerivativeWrapper.prototype._onChange = function (vector) {
		var newVector = {
			position : vector.velocity,
			velocity : vector.acceleration,
			acceleration : 0,
			timestamp : vector.timestamp
		};
		return newVector;
	};
	
	DerivativeWrapper.prototype.update = function (vector) {
		throw new Error("updates illegal on derivative of timingobject");
	};

	return DerivativeWrapper;
});
define('timingobject/timingobject',[
	'./timingbase', 
	'./positionshiftwrapper', 
	'./delaywrapper', 
	'./scalewrapper', 
	'./loopwrapper', 
	'./rangewrapper', 
	'./timeshiftwrapper', 
	'./localwrapper', 
	'./derivativewrapper'], 
	function (timingbase) {

	'use strict';

	var motionutils = timingbase.motionutils;	
	var TimingBase = timingbase.TimingBase;
	var STATE = timingbase.STATE;
	var inherit = timingbase.inherit;

	var TimingObject = function (range, vector) {
		TimingBase.call(this, {timeout:true});
		// internal vector
		this._vector = {
			position : 0.0,
			velocity : 0.0,
			acceleration : 0.0,
			timestamp : motionutils.secClock()
		};
		if (vector) {
			if (vector.position === null) vector.position = undefined;
			if (vector.velocity === null) vector.velocity = undefined;
			if (vector.acceleration === null) vector.acceleration = undefined;
			if (vector.position !== undefined) this._vector.position = vector.position;
			if (vector.velocity !== undefined) this._vector.velocity = vector.velocity;
			if (vector.acceleration !== undefined) this._vector.acceleration = vector.acceleration;	
		}
		
		// range
		this._range = (range !== undefined) ? range : [-Infinity, Infinity];
		// adjust vector according to range
		this._vector = this._checkRange(this._vector);
	};
	inherit(TimingObject, TimingBase);

	// overrides
	TimingObject.prototype.query = function () {
		if (this.vector === null) return null;
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.vector);
		var state = this._getCorrectRangeState(vector);
		if (state !== STATE.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector);
	};

	TimingObject.prototype.update = function (vector) {
		if (vector === undefined || vector === null) {throw new Error ("drop update, illegal updatevector");}

		var pos = (vector.position === undefined || vector.position === null) ? undefined : vector.position;
		var vel = (vector.velocity === undefined || vector.velocity === null) ? undefined : vector.velocity;
		var acc = (vector.acceleration === undefined || vector.acceleration === null) ? undefined : vector.acceleration;

		if (pos === undefined && vel === undefined && acc === undefined) {
			throw new Error ("drop update, noop");
		}
		var now = motionutils.secClock();
		var nowVector = motionutils.calculateVector(this.vector, now);
		var p = nowVector.position;
		var v = nowVector.velocity;
		var a = nowVector.acceleration;
		pos = (pos !== undefined) ? pos : p;
		vel = (vel !== undefined) ? vel : v;
		acc = (acc !== undefined) ? acc : a;
		if (pos === p && vel === v && acc === a) return;
		var newVector = {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
		// process update
		var self = this;
		setTimeout(function () {
			self._preProcess(newVector);
		}, 0);
		return newVector;
	};

	TimingObject.prototype._onChange = function (vector) {
		return this._checkRange(vector);
	};

	// overrides
	TimingObject.prototype._calculateTimeoutVector = function () {
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
	TimingObject.prototype._onTimeout = function (vector) {		
		return this._checkRange(vector);
	};

	return TimingObject;
});
define('timingobject/main',[
	'./timingbase', 
	'./positionshiftwrapper', 
	'./delaywrapper', 
	'./scalewrapper', 
	'./loopwrapper', 
	'./rangewrapper', 
	'./timeshiftwrapper', 
	'./localwrapper', 
	'./derivativewrapper',
	'./timingobject'], 
	function (timingbase, PositionShiftWrapper, DelayWrapper, ScaleWrapper, LoopWrapper, RangeWrapper, TimeShiftWrapper, LocalWrapper, DerivativeWrapper, TimingObject) {		
		'use strict';
		return {
			motionutils : timingbase.motionutils,
			inherit : timingbase.inherit,
			WrapperBase : timingbase.WrapperBase,
			PositionShiftWrapper : PositionShiftWrapper,
			DelayWrapper : DelayWrapper,
			ScaleWrapper : ScaleWrapper,
			LoopWrapper : LoopWrapper,
			RangeWrapper : RangeWrapper,
			TimeShiftWrapper : TimeShiftWrapper,
			LocalWrapper : LocalWrapper,
			DerivativeWrapper : DerivativeWrapper,
			TimingObject : TimingObject
		};
	}
);

/*
  Written by Ingar Arntzen, Norut
*/

define ('timingsrc',['./timingobject/main'], function (timingobject) {
	return {
		motionutils : timingobject.motionutils,
		inherit : timingobject.inherit,
		WrapperBase : timingobject.WrapperBase,
		PositionShiftWrapper : timingobject.PositionShiftWrapper,
		DelayWrapper : timingobject.DelayWrapper,
		ScaleWrapper : timingobject.ScaleWrapper,
		LoopWrapper : timingobject.LoopWrapper,
		RangeWrapper : timingobject.RangeWrapper,
		TimeShiftWrapper : timingobject.TimeShiftWrapper,
		LocalWrapper : timingobject.LocalWrapper,
		DerivativeWrapper : timingobject.DerivativeWrapper,
		TimingObject : timingobject.TimingObject
	};
});

