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

define(['eventutils', 'motionutils', 'sequencer'], function (eventutils, motionutils, seq) {
	'use strict';


	/* 
		Interval Sequencer

		- a collection of Intervals are defined on an axis
		- a searchInterval is defined by two endpoints.
		- we are interested in all Intervals on the axis that are partially/fully covered by searchInterval
		- we then want to move the searchInterval along the axis
		- trigger onenter/onexit events as Intervals go from being not covered to partialy/fully covered and vica versa
		- define searchInterval endpoints by two motions that may or may not be dependent
		- use pointsequencer on each motion to generate events.

		// todo - change sequencer so that it may take an axis as input - or
		// create one if none is provided
	*/


	var IntervalSequencer = function (motionA, motionB, options) {
		this._axis = new seq.Axis();
		this._seqA = new seq.Sequencer(motionA, this._axis);
		this._seqB = new seq.Sequencer(motionB, this._axis);
		this._readyA = false;
		this._readyB = false;

		this._activeKeys = []; // active intervals

		// Define Events API
		// event type "events" defined by default
		eventutils.eventify(this, IntervalSequencer.prototype);
		this._defineEvent("enter", {init:true}) // define enter event (supporting init-event)
		this._defineEvent("exit", {init:false}) // define exit event
		this._defineEvent("change", {init:false}); // define change event

		// Initialise
		this._axis.on("change", this._onAxisChange, this);	
		this._seqA.on("events", this._onSequencerEventsA, this);
		this._seqB.on("events", this._onSequencerEventsB, this);

	};


	/*
	  	overrides how immediate events are constructed
	  	specific to eventify
		change event fires immediately if timing object is well 
		defined, i.e. query() not null
		no event args are passed (undefined) 
	*/
	IntervalSequencer.prototype._makeInitEvents = function (type) {
		if (type === "enter" || type === "events") {
			// calculate initial state based on _activeKeys
			return [];
		}
		return [];
	};

	/*
		overrides how event callbacks are delivered 
		- i.e. how many parameters, only one parameter - e
		specific to eventify
	*/
	IntervalSequencer.prototype._callbackFormatter = function (type, e, eInfo) {return [e];};



	/*
		A change has occured
		1) underlying axis
		2) active Keys of SequencerA
		3) active Keys of SequencerB

		- avoid double reporting? - do this by being stateful

	*/


	IntervalSequencer.prototype._refresh = function (now, removedCues) {
		if (!this._readyA || !this._readyB) return;

		// where are the motions now?
		var vectorA = motionutils.computeVector(this._motionA.vector, now);
		var vectorB = motionutils.computeVector(this._motionB.vector, now);

		var start = Math.min(vectorA.pos, vectorB.pos);
		var end = Math.max(vectorA.pos, vectorB.pos);

		if (start === end) { /* corner case? */ };

		var searchInterval = new Interval(start, end, true, true);


		var oldKeys = this._activeKeys;		
		var newKeys;
		if (options.partial) {
			// fully covered and partially covered
			newKeys = this._axis.getCuesByInterval(searchInterval).map(function (item) {
				return item.key;
			});
		} else {
			// fully covered
			newKeys = this._axis.getCuesCoveredByInterval(searchInterval).map(function (item) {
				return item.key;
			});
		}	
	    var exitKeys = unique(oldKeys, newKeys);
	    var enterKeys = unique(newKeys, oldKeys);

	    // notify
	    var exitItems = exitKeys.map(function (key) {
	    	// todo consult removedCues to know intervals of items removed from Axis. 
	    	return {key:key, interval: this._axis.getIntervalByKey(key)};
	    }, this);
	    var enterItems = enterKeys.map(function (key) {
	    	return {key:key, interval: this._axis.getIntervalByKey(key)};
	    }, this);


	    this._notifyEvents(now, exitItems, enterItems);
	};

	IntervalSequencer.prototype._notifyEvents = function (now, exitItems, enterItems) {
		// build list of eArgs
		var eList = [];
		exitItems.forEach(function (item){
			eList.push(item);
		}, this); 
		enterItems.forEach(function (item){
			msgList.push(item);
		}, this);
		// trigger events using eventing logic
		this._triggerEvents(eList);
	};

	IntervalSequencer.prototype._onAxisChange = function (opList) {
		var now = motionutils.secClock();
		this.refresh(now);
	};

	IntervalSequencer.prototype._onSequencerEventA = function (eList) {
		var now = eList[0].dueTs;
		this._readyA = true;
		this._refresh(now);
	}; 

	IntervalSequencer.prototype._onSequencerEventsB = function (eList) {
		var now = eList[0].dueTs;
		this._readyB = true;
		this._refresh(now);
	};

	return IntervalSequencer;
});