define (['../util/binarysearch', '../util/interval', '../util/eventify'], 
	function (BinarySearch, Interval, eventify) {

	'use strict';

	/*
		UTILITY
	*/


	/*
		concatMap - since flatMap isnt fully supported yet
	*/
	var concatMap = function (array, projectionFunctionThatReturnsArray, ctx) {
		var results = [];
		array.forEach(function (item) {
			results.push.apply(results, projectionFunctionThatReturnsArray.call(ctx, item));
		}, ctx);
		return results;
	};


	/*
		unique - since Array doesnt have that
	*/
	var unique = function (array, valueFunc) {
		const s = new Set();
		let results = [];
		let value;
		if (valueFunc == undefined) {
			for (let i=0; i<array.length; i++) {
				value = array[i];
				if (!s.has(value)){
					s.add(value);
					results.push(value);
				}
			}
		} else {
			for (let i=0; i<array.length; i++) {
				value = valueFunc(array[i]);
				if (!s.has(value)){
					s.add(value);
					results.push(array[i]);
				}
			}
		}
		return results;
	};


	/*
		Add cue to array
	*/
	var addCueToArray = function (arr, cue) {
		// cue equality defined by key property
		let idx = arr.findIndex(function (_cue) { 
			return _cue.key == cue.key;
		});
		if (idx == -1) {
			arr.push(cue);
		}
		return arr.length;
	};

	/*
		Remove cue from array
	*/
	var removeCueFromArray = function (arr, cue) {
		// cue equality defined by key property 
		let idx = arr.findIndex(function (_cue) { 
			return _cue.key == cue.key;
		});
		if (idx > -1) {
			arr.splice(idx, 1);
		}
		return arr.length == 0;
	};

	/*
		returns true if interval_A and interval_B
		- are back-to-back on the timeline, with a shared endpoint
		- overlaps exclusively on that endpoint
		  no overlap: ><, >[, ]< 
		  overlap: ][
		- else return false 
	*/
	var exclusiveEndpointOverlap = function (interval_A, interval_B) {
		// consider A,B
		if (interval_A.high == interval_B.low) {
			if (interval_A.highInclude && interval_B.lowInclude) {
				return true;
			}
		} else {
			// consider B,A
			if (interval_B.high == interval_A.low) {
				if (interval_B.highInclude && interval_A.lowInclude) {
					return true;
				}
			}
		}
		return false;
	};


	/*
		this implements Axis, a datastructure for efficient lookup of cues on a timeline
		- cues may be tied to one or two points on the timeline, this
		is expressed by an Interval.
		- cues are indexed both by key and by value
	*/

	var Axis = function () {

		/*
			efficient lookup of cues by key	
			key -> cue
		*/
		this._keyMap = new Map();

		/*
			pointMap maintains the associations between values (points on 
			the timeline) and cues that reference such points. A single point value may be 
			referenced by multiple cues, so one point value maps to a list of cues.
	
			value -> [cue, ....]
		*/ 
		this._pointMap = new Map(); 

		/*
			pointIndex maintains a sorted list of numbers for efficient lookup.
			A large volume of insert and remove operations may be problematic
			with respect to performance, so the implementation seeks to
			do a single bulk update on this structure, for each batch of cue
			operations (i.e. each invocations of addCues). In order to do this 
			all cue operations are processed to calculate a single batch 
			of deletes and a single batch of inserts which then will be applied to 
			the pointIndex in one atomic operation.

			[1.2, 3, 4, 8.1, ....]
		*/
		this._pointIndex = new BinarySearch();


		// buffer for addCue, removeCue requests
		this._updateBuffer = [];

		// Change event
		eventify.eventifyInstance(this, {init:false});
		this.eventifyDefineEvent("change", {init:false});
	};
	eventify.eventifyPrototype(Axis.prototype);



	/*
		Clear the entire contents of axis
	*/
	Axis.prototype.clear = function () {
		this._pointMap = new Map();
		this._pointIndex = new BinarySearch();
		// create change events for all cues
		let e = [];
		for (let cue of this._keyMap.values()) {
			e.push({'old': cue});
		}
		this._keyMap = new Map();
		this.eventifyTriggerEvent("change", e);
		return e;
	};


	/*
		INTERNAL UPDATE

		- does it all : add, modify, delete

		takes a list of cues
		
		cue = {
			key:key,
			interval: Interval,
			data: data
		}

		if cues do not have an interval property, this means to
		delete the cue.

		cue = {key:key}

	*/
	Axis.prototype._update = function(cues) {
		let cueBatch = new CueBatch(this._pointMap, this._pointIndex);
		let eventBatch = new EventBatch();
		let len = cues.length;
		let cue;
        if (this._keyMap.size == 0) {
        	// initialization - first invocation of update
        	for (let i=0; i<len; i++) {
        		cue = cues[i];
        		this._keyMap.set(cue.key, cue);
        		cueBatch.processCue("add", cue);
				eventBatch.processEvent({new:cue});
        	}
        } else {
        	for (let i=0; i<len; i++) {
        		cue = cues[i];
				let old_cue = this._keyMap.get(cue.key);
				if (old_cue) {
					if (cue.interval) {
						// replace cue
						this._keyMap.set(cue.key, cue);
						cueBatch.processCue("remove", old_cue);
						cueBatch.processCue("add", cue);
						eventBatch.processEvent({new:cue, old:old_cue});
					} else {
						// delete cue
						// cues without interval signify deletion 
						this._keyMap.delete(old_cue.key);
						cueBatch.processCue("remove", old_cue);
						eventBatch.processEvent({old:old_cue});
					}
				} else {
					if (cue.interval) {
						// new cue
						this._keyMap.set(cue.key, cue);
						cueBatch.processCue("add", cue);
						eventBatch.processEvent({new:cue});
					} else {
						// attempt to dele cue that does not exist
						continue;
					}
				}
			}
        }

        /*
			finalizing cueBatch causes modification to be committed
			to pointMap and pointIndex
			
			finalizing eventBatch returns a list of events
        */
        cueBatch.done();
		let e = eventBatch.done();
		this.eventifyTriggerEvent("change", e);
		return e;
	};


	/*
		update adds a batch of cues to the update buffer
		the batch will be delivered to _update in the 
		next microtask.

		This allows repeated calls to update to be
		collected in one batch.
	*/

	Axis.prototype.update = function (cues) {
		this._updateBuffer.push(cues);
		if (this._updateBuffer.length === 1) {
			/*
				updateBuffer just became non-empty
				initiate triggering of real update
			*/
			var self = this;
			Promise.resolve().then(function () {
				let batch = [].concat(...self._updateBuffer);
				self._update(batch);
				// empty updateBuffer
				self._updateBuffer = [];			
			});
		}
	};

	/*
		addCue and removeCue are convenience functions
		for requesting cue operations to the axis.

		They may be invoked multiple times in say a for-loop,
		but all cues will still be delivered in one batch to 
		the internal update operation.
		Processing happens on the next microtasks, so one cannot 
		expect to see the effect of these operations directly 
		after the function call.
	*/

	Axis.prototype.addCue = function(key, interval, data) {
		this.update({key:key, interval:interval, data:data});
	};

	Axis.prototype.removeCue = function(key) {
		this.update({key:key})
	};


	/*
		LOOKUP

	*/

	/*
		getCuePointsByInterval

		returns list of cuepoints, based on list of 
		points within given interval in pointIndex.
	
		getCuePoints will iterate the point values and find
		the associated list of cues from pointMap. 
		
		getCuePoints returns cuepoints of the following
		structure 
		{point: point, cue:cue}
		where cue is associated with the point value 
		(at least one cue endpoint will be equal to point)

		the order is defined by point values (ascending).
		each point value is reported once, yet one cue
		may be reference by 1 or 2 points. 

		interval defines the interval of interest
		
	*/

	Axis.prototype.getCuePointsByInterval = function (interval) {
		let points = this._pointIndex.lookup(interval);
		return concatMap(points, function (point) {
			// fetch list of cues for point
			return this._pointMap.get(point).
				filter(function (cue) {

					/*
						cues sharing only the endpoints of interval
						(cue.interval and interval are back-to-back)
						must be checked specifically to see if they 
						really overlap at the endpoint
						no overlap: ><, >[ or ]<
						overlap: ][     
					*/
					if (point == interval.low || point == interval.high) {
						return exclusiveEndpointOverlap(interval, cue.interval);
					}
					return true;
				}).
				map(function (cue) {
					return {point:point, cue:cue};
				});
		}, this);
	};



	/*
		getCuesByInterval

		find cues associated with points in interval

		getCuesByInterval will iterate the pointIndex and find
		the associated cue from pointMap. 

		Cues may be reported more than once
		
		Any specific order of cues is not defined.

		Note: This function returns only cues with endpoints covered by interval.
		It does not return cues that cover the interval (i.e. one endpoint at each
		side of the interval).
	*/
	Axis.prototype._getCuesByInterval = function(interval) {
		let points = this._pointIndex.lookup(interval);
		return concatMap(points, function (point) {
			// fetch list of cues for point
			return this._pointMap.get(point).
				filter(function(cue){
					/*
						cues sharing only the endpoints of interval
						(cue.interval and interval are back-to-back)
						must be checked specifically to see if they 
						really overlap at the endpoint
						no overlap: ><, >[ or ]<
						overlap: ][     
					*/
					if (point == interval.low || point == interval.high) {
						return exclusiveEndpointOverlap(interval, cue.interval);
					}
					return true;
				});
		}, this);
		


		
	};

	/*
		Similar to getCuesByInterval, but removing cues.
	*/
	Axis.prototype.removeCuesByInterval = function (interval) {
		let removeCues = this._getCuesByInterval(interval).
			map(function (cue) {
				// make remove operations
				return {key:cue.key};
			});
		return this.update(removeCues);
	};

	/*
		Find all cues overlapping interval.
		
		This task can be split in two parts
		- 1) INSIDE: find all cues that have at least one endpoint covered by interval
		- 2) OUTSIDE: find all cues that have one endpoint on each side of interval
		
		Returns Map() key -> cue

	*/
	Axis.prototype.getCuesOverlappingInterval = function (interval) {
		/* 
			1) all cues with at least one endpoint covered by interval 
		*/
		const cues_inside = this._getCuesByInterval(interval);

		/*
			2)

			define left and right intervals that cover the rest of the dimension
			into infinity.
			Endpoints must not overlap with endpoints of <interval>
			- if interval.lowInclude, then leftInterval.highInclude must be false,
			  and vice versa. 
			- the same consideration applies to interval.highInclude			
		*/
		const highIncludeOfLeftInterval = !interval.lowInclude;
		const lowIncludeOfRightInterval = !interval.highInclude;
		const leftInterval = new Interval(-Infinity, interval.low, true, highIncludeOfLeftInterval);
		const rightInterval = new Interval(interval.high, Infinity, lowIncludeOfRightInterval, true);
		
		/* 
			iterate leftInterval to find cues that have endpoints covered by rightInterval

			possible optimization - choose the interval with the least points
			instead of just choosing left.
			possible optimization - this seek operation would be more effective if
			singular cues were isolated in a different index. Similarly, one
			could split the set of cues by the length of their intervals.
		*/
		const cues_outside = this._getCuesByInterval(leftInterval)
			.filter(function (cue) {
				return rightInterval.coversPoint(cue.interval.high);
			});

		// Avoid duplicates by putting all cues into a Map
		const cueMap = new Map();
		let cue;
		for (let i=0; i<cues_inside.length; i++) {
			cue = cues_inside[i]
			cueMap.set(cue.key, cue);
		}
		for (let i=0; i<cues_outside.length; i++) {
			cue = cues_outside[i]
			cueMap.set(cue.key, cue);
		}
		return cueMap;
	};



	/*
		Similar to getCuesOverlappingInterval, but removing cues.
	*/
	Axis.prototype.removeCuesOverlappingInterval = function (interval) {
		let removeCues = this.getCuesOverlappingInterval(interval).
			map(function (cue) {
				// make remove operations
				delete cue.interval;
			});
		return this.update(removeCues);
	};


	/*
		Accessors
	*/

	Axis.prototype.has = function (key) {
		return this._keyMap.has(key);
	};

	Axis.prototype.keys = function () {
		return this._keyMap.keys();
	};

	Axis.prototype.cues = function () {
		return this._keyMap.values();
	};


	/* 

		CUE BATCH PROCESSING

		Axis update() processes a batch of cues, and needs to 
		translates cue operations into a minimum set of 
		operations on the pointIndex.

		To do this, we need to records points that are created and
		points which are modified.
		
		The total difference that the batch of cue operations
		amounts to is expressed as one list of values to be 
		deleted, and and one to be inserted. The update operation
		of the pointIndex will process both in one atomic
		operation.

		On submit both the pointMap and the pointIndex will brought
		up to speed

		created and dirty are used for bookeeping during 
		processing of a cue batch. They are needed to 
		create the correct diff operation to be applied on pointIndex.

		created : includes nodes that were not in pointMap 
		before current batch was processed

		dirty : includes nodes that were in pointMap
		before curent batch was processed, and that
		have been become empty at least at one point during cue 
		processing. 

		created and dirty are used as temporary alternatives to pointMap.
		after the cue processing, poinmap will updated based on the
		contents of these to  
	*/

	var CueBatch = function (pointMap, pointIndex) {
		this._pointMap = pointMap;
		this._pointIndex = pointIndex;
		this._created = new Map(); // value -> [cue, ...]
		this._dirty = new Map(); // value -> [cue, ...]
	};

	/*
		Process a single cue operation
		op is "add" or "remove"
		"add" means point to be added to point
		"remove" means cue to be removed from point
	*/
	CueBatch.prototype.processCue = function (op, cue) {
		let points, point, cues;
		if (cue.singular) {
			points = [cue.interval.low]
		} else {
			points = [cue.interval.low, cue.interval.high];
		}
		for (let i=0; i<points.length; i++) {
			point = points[i];
			cues = this._created.get(point);
			if (cues == undefined) {
				// point not found in created
				cues = this._pointMap.get(point);
				if (cues == undefined) {
					// point not found in pointMap
					// register in created
					cues = (op == "add") ? [cue] : [];
					this._created.set(point, cues);
				} else {
					// cues found in pointMap - update
					if (op == "add") {
						addCueToArray(cues, cue);
					} else {
						let empty = removeCueFromArray(cues, cue);
						if (empty) {
							this._dirty.set(point, cues);
						}
					}
				}	
			} else {
				// point found in created - update
				if (op == "add") {
					addCueToArray(cues, cue);
				} else {
					removeCueFromArray(cues, cue);			
				}
			}
		}
	};


	/*
		Batch processing is completed
		Commit changes to pointIndex and pointMap.

		pointMap
		- update with contents of created

		pointIndex
		- points to delete - dirty and empty
		- points to insert - created and non-empty
	*/
	CueBatch.prototype.done = function () {
		// update pointMap and pointIndex
		let to_remove = [];
		let to_insert = [];
		for (let [point, cues] of this._created.entries()) {
			if (cues.length > 0) {
				to_insert.push(point);
				this._pointMap.set(point, cues);
			} 
		}
		for (let [point, cues] of this._dirty.entries()) {
			if (cues.length == 0) {
				to_remove.push(point);
				this._pointMap.delete(point);
			}
		}
		this._pointIndex.update(to_remove, to_insert);
		// cleanup
		this._created.clear();
		this._dirty.clear();
	};


	/*
		EVENT BATCH

		Events are generated during batch processing, so that an event list
		may be created which is consistent with the effects of the
		entire batch, making batch processing into an atomic operation.

		If multiple operations in a batch apply to the same 
		cue, items will effectively be collapsed into one operation. 
		
		If a value was available before cue processing started,
		this will be reported as old value (if this cue has been modified
		in any way, even if the cue has been modified multiple times. 
		The last cue modification on a given key defines the new
		cue. If a cue is both added and removed in the same batch,
		it will not be included in items.
	*/

	var EventBatch = function () {
		this._events = new Map();
	};

	/*
		process a single event (relating to a cue operation)
	*/
	EventBatch.prototype.processEvent = function (item) {
		let key = (item.new) ? item.new.key : item.old.key;
		let oldItem = this._events.get(key);
		if (oldItem == undefined) {
			this._events.set(key, item);
		} else {
			// update new item
			if (item.new) {
				oldItem.new = item.new;
			}
		}
	};

	/*
		returns event list for entire batch
	*/
	EventBatch.prototype.done = function () {
		let res = [];
		for (let item of this._events.values()) {
			if (item.new || item.old) {
				res.push(item);
			}
		}
		this._events.clear();
		return res;
	};


	// module definition
	return Axis;
});
