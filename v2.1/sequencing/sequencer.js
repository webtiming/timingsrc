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
	var makeEArg = function (now, point, cue, directionInt, cause, verb, dueTs) {
		return {
			key: cue.key,
			interval: cue.interval,
			data: cue.data,
			point: point,
			pointType: getPointType(point, cue.interval),
			dueTs: dueTs || now,
			delay: now - dueTs,
			directionType : DirectionType.fromInteger(directionInt),
			type: (verb === VerbType.EXIT) ? "remove" : "change",
			cause: cause,
			enter: (verb === VerbType.ENTER),
			exit: (verb === VerbType.EXIT)
		};
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
		this._activeCuesList = [];

		// event stuff
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define enter event (supporting init-event)
		this.eventifyDefineEvent("remove");

		// wrap prototype handlers and store ref on instance
		this._wrappedOnTimingChange = function (eArg) {
			this._onTimingChange();
			// ready after processing the first onTimingChange
			if (this._ready.value == false) {
				this._ready.value = true;
			}
		};
		this._wrappedOnAxisChange = function (eArg) {
			if (this._ready.value == true) {
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
					eArgList.push(makeEArg(nowVector.timestamp, nowVector.position, cue, directionInt, Cause.INIT, VerbType.ENTER));	
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

	Sequencer.prototype._onTimingChange = function (eArg) {
		const nowVector = this._to.query();
		this._reevaluate(nowVector, Cause.TIMINGCHANGE);
	};

	Sequencer.prototype._onAxisChange = function (eventMap) {
		const nowVector = this._to.query();
		this._reevaluate(nowVector, Cause.CUECHANGE, eventMap);
	};

	/*
		Reevaluate active cues on a given point in time
		modifiedCues are given from onAxisChange

		could have used modifiedCues from axis change to change activeCues 
		instead, simply reevaluate active cues with axis. This is likely 
		more effective for large batches.

		Possible optimization:
		Consider the size of eventMap. If the eventMap is quite small,
		it may be quicker adjust activeCues by iterating eventMap and
		considering if each cue interval is covering the timing object position.

		For larger event batch, calls to getCuesByInterval will
		be quicker.

	*/
	Sequencer.prototype._reevaluate = function (nowVector, cause, eventMap) {	   
	    const now = nowVector.timestamp;
	    const pos = nowVector.position;

		/*
			find new active cues
		*/
		const activeCues = new Map(this._axis.getCuesByInterval(new Interval(pos)).map(function(cue) {
			return [cue.key, cue];
		}));
		/*
			find exit cues
			were in old active cues - but not in new
		*/
		let exitCues = map_difference(this._activeCues, activeCues);
		/* 
			find enter cues
			were not in old active cues - but are in new
		*/
		let enterCues = map_difference(activeCues, this._activeCues);
		/* 
			find change cues
			those cues that were modified and also remain within the set of active cues
		*/
		let changeCues = new Map();
		if (cause == Cause.CUECHANGE) {		
			const modifiedCues = new Map([...eventMap].filter(function ([key, eItem]) {
				return eItem.new && eItem.old;
			}).map(function([key, eItem]) {
				return [key, eItem.new];
			}));
			changeCues = map_intersect(modifiedCues, activeCues);
		}

		// update active cues
		this._activeCues = activeCues;

		// make events
		const eList = this._makeChangeEvents(now, nowVector.position, cause, exitCues, enterCues, changeCues);
		this.eventifyTriggerEvents(eList);
		
		/*
			Crazy Corner Case

			If reevaluate is executed with the timing object at position P and there is a cue C which has P as closed endpoint.
			For instance:

			C.interval : [P] | <low,P] | [P, high> 

			Since timing object position P is covered by cue C, an enter event will be generated by the code above.

			However, if the timing object additionally has velocity in the direction away from cue C, a playback exit event will
			immediately be needed. However, this will not be picked up by load/schedule, as this will only consider cue endpoints
			within the next segment on the timeline, which does not include point P, i.e. <P, P+delta] or [P-delta, P>, depending 
			on direction.

			Entering open intervals should be covered by schedule/load on next timeline segment.

			To solve this we will generate the needed playback events here. Active cues will be adjusted as part of that process.

			This issue is not likely to be easily reproducible, because for instance setting the timing object to 
			{position:0, velocity:1} with yield a nowVector sampled a little bit later, which gives a position which is 0+delta, which
			means that cues that are tied to endpoint 0 will be detected by code above. So one really needs to be precise to a large 
			number of decimal places for a cueendpoint to match the position exactly.

	    */
	    const directionInt = motionutils.calculateDirection(nowVector, now);

	    if (isMoving(nowVector)) {
		    const cuepoints = this._axis.getCuePointsByInterval(new Interval(pos));
		    const direction = DirectionType.fromInteger(directionInt);
		    exitCues = new Map();
			for (let cp of cuepoints.values()) {
				if (cp.cue.interval.singular) {
					exitCues.set(cp.cue.key, cp.cue);
				} else {
					// closed interval ?
					const interval = cp.cue.interval;
					const pointType = getPointType(pos, interval);
					let closed = false;
					if (pointType === PointType.LOW && interval.lowInclude) {
						closed = true;
					} else if (pointType === PointType.HIGH && interval.highInclude) {
						closed = true;
					}
					// exiting or entering interval?
					var entering = true;						
					if (pointType === PointType.LOW && direction === DirectionType.BACKWARDS) {
						entering = false;
					} else if (pointType === PointType.HIGH && direction === DirectionType.FORWARDS) {
						entering = false;
					}
					// exiting closed interval
					if (!entering && closed) {
						exitCues.set(cp.cue.key, cp.cue);
					}
				}
			}
			// make events
			const _now = this._to.clock.now();
			const eList = [];
			for (let cue of exitCues.values()) {
				let eArg = makeEArg(_now, pos, cue, directionInt, Cause.PLAYBACK, VerbType.EXIT, now);
				eList.push({type: eArg.type, e:eArg});
				this._activeCues.delete(cue.key);
			}
			this.eventifyTriggerEvents(eList);
	    }

	    // update list version of activeCues
		this._activeCuesList = [...this._activeCues.values()];

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
		let eArgList = [];
		for (let cue of exitCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.EXIT));	
		}
		for (let cue of enterCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.ENTER));	
		}

		for (let cue of changeCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.UPDATE))	
		}
		// make sure events are correctly ordered
		eArgList = this._reorderEventList(eArgList, directionInt);
		return eArgList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
	};


	/*
		Make events during playback, from schedule task list
	*/
	Sequencer.prototype._makePlaybackEvents = function (now, scheduleEntries) {
   		const directionInt = motionutils.calculateDirection(this._to.vector, now);
   		let eArgList = [];
   		let entry, task;
   		let dirty = false;
   		for (let i=0; i<scheduleEntries.length; i++) {
   			entry = scheduleEntries[i];
   			task = entry.task;
   			if (task.cue.interval.singular) {
				// make two events for singular
				eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.ENTER, entry.ts));
				eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.EXIT, entry.ts));
				// no need to update active Cues
			} else {
				// figure out if it is enter or exit 
				const directionType = DirectionType.fromInteger(directionInt);
				const pointType = getPointType(task.point, task.cue.interval);
				const pointInt = PointType.toInteger(pointType);
				const verbInt = pointInt * directionInt * -1;
				const verbType = VerbType.fromInteger(verbInt);
		    	eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, verbType, entry.ts));
		    	// update activeCues
		    	if (verbType == VerbType.ENTER) {
		    		this._activeCues.set(task.cue.key, task.cue);
		    		dirty = true;
		    	} else if (verbType == VerbType.EXIT) {
		    		this._activeCues.delete(task.cue.key);
		    		dirty = true;
		    	}
			}
   		}
   		if (dirty) {
   			// regenerate list from ActiveCues
			this._activeCuesList = [...this._activeCues.values()];
   		}
		// make sure events are correctly ordered
		eArgList = this._reorderEventList(eArgList, directionInt);		
   		return eArgList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
	};


	/*
        Sequencer core loop, loops via the timeout mechanism as long
        as the timing object is moving.
	*/
	Sequencer.prototype._main = function (now, isTimeout) {
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
	    var vectorStart = motionutils.calculateVector(this._to.vector, tStart);
	    var points = givenPoints;
	
	    // Calculate points if not provided
	    if (!points) {

			// 1) find the interval covered by the movement of timing object during the time delta
			var posRange = motionutils.calculateInterval(vectorStart, tDelta);
			var pStart = Math.round10(Math.max(posRange[0], range[0]), -10);
			var pEnd = Math.round10(Math.min(posRange[1], range[1]), -10);

			/*
				posInterval always <,]
			*/
			const posInterval = new Interval(pStart, pEnd, false, true);
			this._schedule.setPosInterval(posInterval);

			// 2) find all points in this interval
			points = this._axis.getCuePointsByInterval(posInterval);
	    }
	    
	    // create ordered list of all events for time interval t_delta 
	    var eventList = motionutils.calculateSolutionsInInterval(vectorStart, tDelta, points);
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
			const pointType = getPointType(task.point, task.cue.interval);
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
			   likely obsolete since we are fetching points [low, high] 
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
			if (pointType === PointType.LOW || pointType === PointType.HIGH) {
			    var v = motionutils.calculateVector(this._to.vector, tStart + d);
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

	
	/*
		Active Cues API
	*/

	// return true if cue of given key is currently active
	Sequencer.prototype.isActive = function (key) {
	    return (this._activeCues.has(key));
	};

	// Get keys of active cues
	Sequencer.prototype.getActiveKeys = function () {
		return [...this._activeCues.keys()];
	};

	Sequencer.prototype.getActiveCues = function () {
		return this._activeCuesList;
	};

	/*
		Export Axis API

		Alternative - expose Axis object itself with .getAxis()
	*/

	Sequencer.prototype.update = function (cues) {
		return this._axis.update(cues);
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

	// get specific cue {key: key, interval:interva} given key
	Sequencer.prototype.getCue = function (key) {
		return this._axis.get(key);
	};

	// get all keys
	Sequencer.prototype.keys = function () {
		return this._axis.keys();
	};
	
	// get all cues
	Sequencer.prototype.getCues = function () {
		return this._axis.cues();	
	};

	Sequencer.prototype.getCuesByInterval = function (interval, semantic) {
		return this._axis.getCuesByInterval(interval, semantic);
	};

	Sequencer.prototype.removeCuesByInterval = function (interval, semantic) {
		return this._axis.removeCuesByInterval(interval, semantic);
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

    /*
		utility - print event
    */
	Sequencer.prototype.eventToString = function (e) {
		var s = "[" +  e.point.toFixed(2) + "]";
        s += " " + e.key;
        s += " " + e.interval.toString();
        s += " " + e.type;
        var verb = "none";
        if (e.enter) verb = "enter";
        else if (e.exit) verb = "exit";
        s += " (" + e.cause + "," + verb + ")";
        s += " " + e.directionType;
        s += " " + e.pointType;
        s += " delay:" + e.delay.toFixed(4);
        if (e.data) s += " " + JSON.stringify(e.data);
        return s;
	};;

	return Sequencer;
});



