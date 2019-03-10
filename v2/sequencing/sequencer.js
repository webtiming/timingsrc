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



