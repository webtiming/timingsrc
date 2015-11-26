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
	INTERVAL SEQUENCER

	- a collection of Intervals are defined on an axis
	- a searchInterval is defined by two endpoints.
	- we are interested in all Intervals on the axis that are partially/fully covered by searchInterval
	- we then want to move the searchInterval along the axis
	- trigger onenter/onexit events as Intervals go from being not covered to partialy/fully covered and vica versa
	- define searchInterval endpoints by two motions that may or may not be dependent
	- use pointsequencer on each motion to generate events.	
*/


define(['util/eventutils', 'util/motionutils', './sequencer'], 
	function (eventutils, motionutils, seq) {
	
	'use strict';

	/*
      unique
      return list of elements that are unique to array 1
     */
    var unique = function (array1, array2) {
		var res = [];
		for (var i=0; i<array1.length;i++) {
		    var found = false;
		    for (var j=0; j<array2.length;j++) {
				if (array1[i] === array2[j]) {
				    found = true;
				    break;
				} 
	    	}
	   		if (!found) {
				res.push(array1[i]);
	    	}	 
		}
		return res;
    };


	var Interval = seq.Interval;

	var IntervalSequencer = function (timingObjectA, timingObjectB) {
		this._axis = new seq.Axis();
		this._toA = timingObjectA;
		this._toB = timingObjectB;
		this._seqA = new seq.Sequencer(this._toA, this._axis);
		this._seqB = new seq.Sequencer(this._toB, this._axis);
		this._readyA = false;
		this._readyB = false;

		// active keys
		this._activeKeys = [];

		// Define Events API
		// event type "events" defined by default
		eventutils.eventify(this, IntervalSequencer.prototype);
		this.eventifyDefineEvent("enter", {init:true}) // define enter event (supporting init-event)
		this.eventifyDefineEvent("exit") 
		this.eventifyDefineEvent("change"); 

		// Wrapping prototype event handlers and store references on instance
		this._wrappedOnAxisChange = function (e) {this._onAxisChange(e);};
		this._wrappedOnTimingChangeA = function () {this._onTimingChangeA();};
		this._wrappedOnTimingChangeB = function () {this._onTimingChangeB();};
		this._wrappedOnSequencerChangeA = function (e) {this._onSequencerChangeA(e);};
		this._wrappedOnSequencerChangeB = function (e) {this._onSequencerChangeB(e);};

		this._toA.on("change", this._wrappedOnTimingChangeA, this);
		this._toB.on("change", this._wrappedOnTimingChangeB, this);
		this._seqA.on("events", this._wrappedOnSequencerChangeA, this);
		this._seqB.on("events", this._wrappedOnSequencerChangeB, this);
	};

	/*
		READY STATE

		The interval sequencer is ready when both timing objects are ready
	*/
	IntervalSequencer.prototype._setReadyA = function() {
		if (!this._readyA) {
			this._readyA = true;
			if (this._readyB) this._onReady();
		}
	};

	IntervalSequencer.prototype._setReadyB = function() {
		if (!this._readyB) {
			this._readyB = true;
			if (this._readyA) this._onReady();
		}
	};

	IntervalSequencer.prototype._isReady = function() {
		return (this._readyA && this._readyB);
	};

	IntervalSequencer.prototype._onReady = function () {
		this._axis.on("change", this._wrappedOnAxisChange, this);
	};

	/*

		EVENT HANDLERS

	*/

	/*
		Timing events
		
		- Jumps may some intervals to be covered or cease to be covered.
		Some of these intervals may remain active of inactive with respect
		to the point-sequencer, implying that there will be no events from the sequencer

		- Non-jumps (i.e. speed changes) can not cause changes to the intervalsequencer
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

	IntervalSequencer.prototype._onTimingChangeA = function () {
		this._setReadyA();
		this._reevaluate();
	}; 

	IntervalSequencer.prototype._onTimingChangeB = function () {
		this._setReadyB();
		this._reevaluate();
	};

	IntervalSequencer.prototype._onAxisChange = function (opList) {
		console.log(opList);
		this._reevaluate(opList);
	};

	IntervalSequencer.prototype._onSequencerChangeA = function () {
		this._reevaluate();
	}; 

	IntervalSequencer.prototype._onSequencerChangeB = function () {
		this._reevaluate();
	};

	/*
	  	overrides how immediate events are constructed
	*/
	IntervalSequencer.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "enter") {
			return this._reevaluate();
		}
		return [];
	};

	/*
		figure out the current active interval
	*/
	IntervalSequencer.prototype._getActiveInterval = function () {
		var vectorA = this._toA.query();
		var vectorB = this._toB.query();
		var start = Math.min(vectorA.position, vectorB.position);
		var end = Math.max(vectorA.position, vectorB.position);
		return new Interval(start, end, true, true);
	};

	IntervalSequencer.prototype._getDataFromAxisOpList = function (axisOpList, key) {
		var list = axisOpList.filter (function (op) {
			return (op.key === key && op.type === axis.OpType.REMOVE);
		})
		if (list.length > 0) return list[0].data;
	};

	/*
		RE-EVALUATE

		Figure out what kind of events need to be triggered (if any)
		in order to bring the IntervalSequencer to the correct state.
	*/
	IntervalSequencer.prototype._reevaluate = function (axisOpList) {
		if (!this._isReady()) {
			return [];
		}

		var activeInterval = this._getActiveInterval();

		// find keys of all cues, where cue interval is partially or fully covered by searchInterval
		var oldKeys = this._activeKeys;		
		var newKeys = this._seqA.getCuesByInterval(activeInterval).map(function (item) {
			return item.key;
		});	
	    var exitKeys = unique(oldKeys, newKeys);
	    var enterKeys = unique(newKeys, oldKeys);

	    /* 
	    	changeKeys
	    	change keys are elements that remain in activeKeys,
	    	but were reported as changed by the axis 
	    */
	    var changeKeys = [];
	    if (axisOpList) {
		    axisOpList.forEach(function (op) {
		    	if (oldKeys.indexOf(op.key) > -1 && newKeys.indexOf(op.key) > -1) {
		    		changeKeys.push(op.key);
		    	}
		    });
		}
	    
		// update active keys
	    this._activeKeys = newKeys;

	    // make event items from enter/exit keys
	    var eList = [];
	    var exitItems = exitKeys.forEach(function (key) {
	    	eList.push({
	    		type: "exit", 
	    		e: {
	    			key:key, 
	    			interval: this._axis.getIntervalByKey(key),
	    			type : "exit",
	    			data : this._getDataFromAxisOpList(key) || this.getData(key)
	    		}
	    	});
	    }, this);
	    var enterItems = enterKeys.forEach(function (key) {
	    	eList.push({
	    		type: "enter", 
	    		e: {
	    			key:key, 
	    			interval: this._axis.getIntervalByKey(key),
	    			type: "enter",
	    			data: this.getData(key)
	    		}
	    	});
	    }, this);
	    var changeItems = changeKeys.forEach(function (key) {
	    	eList.push({
	    		type: "change", 
	    		e: {
	    			key:key, 
	    			interval: this._axis.getIntervalByKey(key),
	    			type: "change",
	    			data: this.getData(key)
	    		}
	    	});
	    }, this);
	    this.eventifyTriggerEvents(eList);
 
	    // make event items from active keys
	    return this._activeKeys.map(function (key) {
	    	return {
	    		type: "enter", 
	    		e: {
	    			key:key, 
	    			interval: this._axis.getIntervalByKey(key),
	    			type : "enter"
	    		}
	    	};
	    }, this);
	};

	/*
		API

		Operations that affect the axis can safely be directed to 
		one of the sequencers, since the two sequencers forward these operations to a shared axis.
	*/

	IntervalSequencer.prototype.request = function () {
		return this._seqA.request();
	};

	IntervalSequencer.prototype.addCue = function (key, interval, data) {
		return this._seqA.addCue(key, interval, data);
	};

	IntervalSequencer.prototype.removeCue = function (key, removedData) {
		return this._seqA.removeCue(key, removedData);
	};

	// true if cues exists with given key
	IntervalSequencer.prototype.hasCue = function (key) {
		return this._seqA.hasCue(key);
	};

	// Get all keys
	IntervalSequencer.prototype.keys = function () {
		return this._seqA.keys();
	};
	
	// get specific cue {key: key, interval:interva} given key
	IntervalSequencer.prototype.getCue = function (key) {
 		return this._seqA.getCue(key);
	};

	// get all cues
	IntervalSequencer.prototype.getCues = function () {
		return this._seqA.getCues();
	};

	// return true if cue of given key is currently active
	IntervalSequencer.prototype.isActive = function (key) {
		return (this._activeKeys.indexOf(key) > -1);
	};

	// Get keys of active cues
	IntervalSequencer.prototype.getActiveKeys = function () {
		// copy keys
		var res = [];
		this._activeKeys.forEach(function (key) {
			res.push(key);
		}, this);
		return res;
	};

	IntervalSequencer.prototype.getActiveCues = function () {
		var res = [];
		this._activeKeys.forEach(function (key) {
			res.push(this.getCue(key));
		}, this);
		return res;

	};

	// return all (key, inteval, data) tuples, where interval covers point
	IntervalSequencer.prototype.getCuesByPoint = function (point) {
		return this._seqA.getCuesByPoint(point);
	};

	// return all cues with at least one endpoint within searchInterval
	IntervalSequencer.prototype.getCuesByInterval = function (searchInterval) {
		return this._seqA.getCuesByInterval(searchInterval);
	};

	// return all cues covered by searchInterval
	IntervalSequencer.prototype.getCuesCoveredByInterval = function (searchInterval) {
		return this._seqA.getCuesCoveredByInterval(searchInterval);
	};

	// shutdown
	IntervalSequencer.prototype.close = function () {
		this._axis.off("change", this._wrappedOnAxisChange);
		this._toA.off("change", this._wrappedOnTimingChangeA);
		this._toB.off("change", this._wrappedOnTimingChangeB);
		this._seqA.off("events", this._wrappedOnSequencerChangeA);
		this._seqB.off("events", this._wrappedOnSequencerChangeB);
		this._seqA.close();
		this._seqB.close();
	};


	// inheritance
	// To be overridden by subclass specializations
	IntervalSequencer.prototype.loadData = function () {};
	IntervalSequencer.prototype.getData = function (key) {};

	return IntervalSequencer;
});