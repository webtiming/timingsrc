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


define(['../util/eventify', '../util/motionutils', './axis', './sequencer'], 
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



	var seqOpType = function (op) {
		if (op === "init") return "init";
		if (op === "none") return "motion";
		if (op === "add") return "add";
		if (op === "update" || op === "repeat") return "update";
		if (op === "remove") return "remove";
		return "";
	};
		
	


	/*
		find operation related to given key within axisOpList
	*/
	WindowSequencer.prototype._getOpFromAxisOpList = function (axisOpList, key) {
		var op;
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


	/*
		may ask for keys that do not exist in axisOpList
		- added or removed from axis after the axisOpList was created
		- if so, the corresponding update event should be on its way,
		and should be handled by the next invokation with axisOpList
		Signal this event by returning undefined
	*/
	WindowSequencer.prototype._getItem = function (axisOpList, key) {
		var item = undefined;
    	if (axisOpList) {
    		item = this._getOpFromAxisOpList(axisOpList, key);

    		if (item == undefined) {
	    		// corner case - axisOpList specified, but key not in it
    			// axis operation after axisOpList was defined
    			item = this._axis.getItem(key);
    			// if item is defined in axis, it was recently added
    			// if item is not defined in axis, it was recently removed
    			if (item == undefined) {
    				// corner case - item just remove - no acess to item state
    				// invent fake info for remove event
    				item = {
    					key: key,
    					interval: undefined,
    					data: undefined,
    					type: "remove"
    				}
    			} else {
    				item.type = "add";
    			}
    		}
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

	/*
		ISSUE

		- the state of the window sequencer is data driven as it is
		triggered by modifications from the axis
		- however, it is also driven by motion

		- the execution model is organized around the idea that
		we reevaluate the state on every event, i.e. when state may
		have changed

		- reevaluating the state searches directly on the 
		live axis, thus the true state is the state of the axis
		- however, update events from the axis are delayed, so
		in some circumstances, upon receipt of axis updates, 
		the axis may have been modified after the events were 
		generated, thus causing the view of the axis to be out 
		of sync with the updates

		- one solution here is to treat the event from the axis as
		hints, not the truth

		- another option is to be sensitive to this race-condition
		- this is likely hard - and error prone
		
		update-add, but not in axis
			added earlier, but removed afterwords, corresponding 
			update event will arrive later. report as still existing
		update-remove, in axis
			removed earlier, but added afterwards, corresponding 
			update event will arrive later. report as remove

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