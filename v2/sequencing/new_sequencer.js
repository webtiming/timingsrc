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

define(['../util/motionutils', '../util/eventify', '../util/interval', './axis'], 
	function (motionutils, eventify, Interval, Axis)  {

	'use strict';

	// UTILITY

	/*
		get the difference of two Maps
		key in a but not in b
	*/
	const map_difference = function (a, b) {
		if (a.size == 0) {
			return new Map();
		} else if (b.size == 0) {
			return a;
		} else {		
			return new Map([...a].filter(function ([key, value]) {
				return !b.has(key)
			}));
		}
	};


	/*
		get the intersection of two Maps
		key in a and b
	*/
	const map_intersect = function (a, b) {
		[a, b] = (a.size <= b.size) ? [a,b] : [b,a];
		if (a.size == 0) {
			// No intersect
			return new Map();
		}
		return new Map([...a].filter(function ([key, value]) {
			return b.has(key)
		}));
	};

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
			throw new SequencerError("illegal integer value for direction type " + i + " " + typeof(i));
		}
    });


    // Event cause
    const Cause = Object.freeze({
    	INIT: "init",
    	TIMINGCHANGE: "timing-change",
    	CUECHANGE: "cue-change",
    	PLAYBACK: "playback"
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
		get point type of point with respect to interval
    */
	var getPointType = function (point, interval) {
		if (interval.singular && point === interval.low) return PointType.SINGULAR;
	    if (point === interval.low) return PointType.LOW;
	    if (point === interval.high) return PointType.HIGH;
	    if (interval.low < point && point < interval.high) return PointType.INSIDE;
	    else return PointType.OUTSIDE;
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
		Sequencer EArg
	*/
	var SequencerEArg = function (now, point, cue, directionInt, cause, verb, dueTs) {
		this.cue = cue;
		this.point = point;
		this.pointType = getPointType(point, cue.interval);
		this.dueTs = dueTs || now;
		this.directionType = DirectionType.fromInteger(directionInt);
		this.type = (verb === VerbType.EXIT) ? "remove" : "change";
		this.cause = cause;
		this.enter = (verb === VerbType.ENTER);
		this.exit = (verb === VerbType.EXIT);
	};

	SequencerEArg.prototype.toString = function () {
		var s = "[" +  this.point.toFixed(2) + "]";
        s += " " + this.cue.key;
        s += " " + this.cue.interval.toString();
        s += " " + this.type;
        var verb = "none";
        if (this.enter) verb = "enter";
        else if (this.exit) verb = "exit";
        s += " (" + this.cause + "," + verb + ")";
        s += " " + this.directionType;
        s += " " + this.pointType;
        if (this.cue.data) s += " " + JSON.stringify(this.cue.data);
        return s;
	};



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
	
		SEQUENCER

	*/
	var Sequencer = function (timingObject, _axis) {
		if (!(this instanceof Sequencer)) {
			throw new Error("Contructor function called without new operation");
		}

		// core resources
		this._to = timingObject;
		this._axis = _axis || new Axis();

		// timeout stuff
		this._schedule = null;
		this._timeout = null; // timeout
		this._currentTimeoutPoint = null; // point associated with current timeout

		// ready
		this._ready = new eventify.EventBoolean(false, {init:true});

		// active cues
		this._activeCues = new Map(); // (key -> cue)

		// event stuff
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define enter event (supporting init-event)
		this.eventifyDefineEvent("remove");

		// wrap prototype handlers and store ref on instance
		this._wrappedOnTimingChange = function (eArg) {
			console.log("ontimingchange");
			this._onTimingChange();
			// ready after processing the first onTimingChange
			if (this._ready.value == false) {
				this._ready.value = true;
			}
		};
		this._wrappedOnAxisChange = function (eArg) {
			if (this._ready.value == true) {			
				console.log("onaxischange ");
				this._onAxisChange(eArg);
			}
		};

		// connect to timing object and axis
		this._to.on("change", this._wrappedOnTimingChange, this);
		this._axis.on("change", this._wrappedOnAxisChange, this);
	};
	eventify.eventifyPrototype(Sequencer.prototype);



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
			if (this._ready.value == false) {
				return [];
			} else {
				// prepare initial events based on active cues
				const nowVector = this._to.query();
				const directionInt = motionutils.calculateDirection(this._to.vector, nowVector.timestamp);
				const eArgList = [];
				for (let cue of this._activeCues.values()) {
					eArgList.push(new SequencerEArg(nowVector.timestamp, nowVector.position, cue, directionInt, Cause.INIT, VerbType.ENTER));	
				}
				return eArgList;
			}
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

	Sequencer.prototype._onTimingChange = function () {
		this._reevaluate(Cause.TIMINGCHANGE);
	};

	Sequencer.prototype._onAxisChange = function (eventMap) {
		this._reevaluate(Cause.CUECHANGE, eventMap);
	};

	/*
		Reevaluate active cues on a given point in time
		modifiedCues are given from onAxisChange

		could have used modifiedCues from axis change to change activeCues 
		instead, simply reevaluate active cues with axis. This is likely 
		more effective for large batches.

		Possible optimization


	*/
	Sequencer.prototype._reevaluate = function (cause, eventMap) {
	    const nowVector = this._to.query();
	    const now = nowVector.timestamp;
		/*
			find new active cues
		*/
		const currentPosition = new Interval(nowVector.position);
		const activeCues = this._axis.getCuesOverlappingInterval(currentPosition);
		/*
			find exit cues
			were in old active cues - but not in new
		*/
		const exitCues = map_difference(this._activeCues, activeCues);
		/* 
			find enter cues
			were not in old active cues - but are in new
		*/
		const enterCues = map_difference(activeCues, this._activeCues);
		/* 
			find change cues
			those cues that were modified and also remain within the set of active cues
		*/
		let changeCues = new Map();
		if (eventMap) {		
			const modifiedCues = new Map([...eventMap].filter(function ([key, eItem]) {
				return eItem.new && eItem.old;
			}));
			changeCues = map_intersect(modifiedCues, activeCues);
		}

		// update active cues
		this._activeCues = activeCues;  
	
		// make events
	
		let eList = this._makeChangeEvents(now, nowVector.position, cause, exitCues, enterCues, changeCues);

		/*
			TODO - if moving, add leave events from singular cues
		*/

		// make sure events are correctly ordered
		const directionInt = motionutils.calculateDirection(nowVector, now);
		// eList = this._reorderEventList(eList, directionInt);


		this.eventifyTriggerEvents(eList);


	    // clear schedule
		if (this._schedule == undefined) {
			this._schedule = new Schedule(now);
		} else {
			this._schedule.advance(now);
		}

		// kick off main loop
		if (isMoving(nowVector)) {
			this._load(now);
    		this._main(now);
		} else {
			// stop main loop
			this._clearTimeout();
		}
	};


	/*
		Make events triggered by changes, either timing object changes or cue changes
	*/
	Sequencer.prototype._makeChangeEvents = function (now, point, cause, exitCues, enterCues, changeCues) {
		const directionInt = motionutils.calculateDirection(this._to.vector, now);
		const eArgList = [];
		for (let cue of exitCues.values()) {
			eArgList.push(new SequencerEArg(now, point, cue, directionInt, cause, VerbType.EXIT));	
		}
		for (let cue of enterCues.values()) {
			eArgList.push(new SequencerEArg(now, point, cue, directionInt, cause, VerbType.ENTER));	
		}

		for (let cue of changeCues.values()) {
			eArgList.push(new SequencerEArg(now, point, cue, directionInt, cause, VerbType.UPDATE))	
		}
		return eArgList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
	};


	/*
		Make events during playback, from schedule task list
	*/
	Sequencer.prototype._makePlaybackEvents = function (now, scheduleEntries) {
   		const directionInt = motionutils.calculateDirection(this._to.vector, now);
   		const eArgList = [];
   		let entry, task;
   		for (let i=0; i<scheduleEntries.length; i++) {
   			entry = scheduleEntries[i];
   			task = entry.task;
   			if (task.cue.interval.singular) {
				// make two events for singular
				eArgList.push(new SequencerEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.ENTER, entry.ts));
				eArgList.push(new SequencerEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.EXIT, entry.ts));
				// no need to update active Cues
			} else {
				// figure out if it is enter or exit 
				const directionType = DirectionType.fromInteger(directionInt);
				const pointType = getPointType(task.point, task.cue.interval);
				const pointInt = PointType.toInteger(pointType);
				const verbInt = pointInt * directionInt * -1;
				const verbType = VerbType.fromInteger(verbInt);
		    	eArgList.push(new SequencerEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, verbType, entry.ts));
		    	// update activeCues
		    	if (verbType == VerbType.ENTER) {
		    		this._activeCues.set(task.cue.key, task.cue);
		    	} else if (verbType == VerbType.EXIT) {
		    		this._activeCues.delete(task.cue.key);
		    	}
			}
   		}
   		return eList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
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

	/*
	Sequencer.prototype.updateAll = function(argList) {
		this._axis.updateAll(argList);
	};
	*/

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





	/*
        Sequencer core loop, loops via the timeout mechanism as long
        as the timing object is moving.
	*/
	Sequencer.prototype._main = function (now, isTimeout) {
		console.log("main start", (isTimeout === true));
		now = now || this._to.query().timestamp;

    	// empty remaining due tasks, if any
    	let tasks = this._schedule.pop(now);
    	if (tasks.length > 0) {
    		let eList = this._makePlaybackEvents(now, tasks);   
	        this.eventifyTriggerEvents(eList);
    	}

        // advance schedule window if end is reached
        var _isMoving = isMoving(this._to.vector);
        if (_isMoving && this._schedule.isExpired(now)) {		
        	// advance schedule to end of current window
			now = this._schedule.getTimeInterval().high;
            this._schedule.advance(now);
            this._load(now);
            // process tasks again in case some are due immediately
            let tasks = this._schedule.pop(now);
			if (tasks.length > 0) {
				let eList = this._makePlaybackEvents(now, tasks);
		        this.eventifyTriggerEvents(eList);
			}
	    }
        // adjust timeout if needed
        if (_isMoving) {
        	let newTimeoutRequired = (this._timeout === null);
			if (!newTimeoutRequired) {
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

	    console.log("load");
		const initVector = this._to.vector;
	   
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
			points = this._axis.getCuePointsByInterval(posInterval);

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
			task.pointType = getPointType(task.point, task.cue.interval);
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
			if (task.pointType === PointType.LOW || task.pointType === PointType.HIGH) {
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
			if (eArg.pointType === PointType.SINGULAR) {
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
				if ((eArg.pointType === PointType.LOW) && eArg.interval.lowInclude) {
					closed = true;
				} else if ((eArg.pointType === PointType.HIGH) && eArg.interval.highInclude) {
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

	

	Sequencer.prototype.addCue = function (key, interval, data) {
		return this._axis.addCue(key, interval, data)
	};

	Sequencer.prototype.removeCue = function (key) {
		return this._axis.removeCue(key);
	};

	// true if cues exists with given key
	Sequencer.prototype.hasCue = function (key) {
		return this._axis.has(key);
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
		DefaultSequencer : Sequencer,
		SequencerError : SequencerError
	};

});



