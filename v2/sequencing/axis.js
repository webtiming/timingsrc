define (['../util/binarysearch', '../util/interval', '../util/eventify'], 
	function (BinarySearch, Interval, eventify) {

	'use strict';

	/*
		UTILITY
	*/

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
		EVENT MAP

		EventMap is generated during batch processing, 
		representing the effects of the entire cue batch, 
		thus making cue batch processing into an atomic operation.

		eItem : {new: new_cue, old: old_cue}

		- If operation applies to cue that already exists, the old cue
		  will be included. 

		- If multiple operations in a batch apply to the same 
		cue, items will effectively be collapsed into one operation. 
	
		- If a value was available before cue processing started,
		this will be reported as old value (if this cue has been modified
		in any way, even if the cue has been modified multiple times. 
		The last cue modification on a given key defines the new
		cue. 

		- If a cue is both added and removed in the same batch,
		it will not be included in items.
	*/

	var EventMap = function () {
		this._events = new Map();
	};

	/*
		process a single event (relating to a cue operation)
	*/
	EventMap.prototype.add = function (item) {
		let key = (item.new) ? item.new.key : item.old.key;
		let currentItem = this._events.get(key);
		if (currentItem == undefined) {
			// first occurrence of given key
			// add, replace, or delete
			this._events.set(key, item);
		} else {			
			// non-first occurrence of given key
			// overwrite new - preserve old
			currentItem.new = item.new;
			/*
				currentItem may have both
				new and old undefined.
				This can only happen if an element
				was first added end then removed in
				the same batch.
				This is a noop and may safely be removed.
			*/
			if (currentItem.new == undefined && currentItem.old == undefined) {
				this._events.delete(key);
			}
		}
	};

	/*
		returns event list for entire batch
		only those that are changes
	*/
	EventMap.prototype.done = function () {
		return this._events;
	};



    /*
		Setup for cue buckets.
    */
    const CueBucketIds = [0,10,100,1000,10000,100000, Infinity];
    var getCueBucketId = function (length) {
    	for (let i=0; i<CueBucketIds.length; i++) {
    		if (length <= CueBucketIds[i]) {
    			return CueBucketIds[i];
    		}
    	}
    };


    /*
		Lookupmethods
    */
    const LookupMethod = Object.freeze({
    	CUES: "cues",
    	CUEPOINTS: "cuepoints"
    });

	
	/*
		this implements Axis, a datastructure for efficient lookup of cues on a timeline
		- cues may be tied to one or two points on the timeline, this
		is expressed by an Interval.
		- cues are indexed both by key and by cuepoint values
		- cues are maintained in buckets, based on their interval length, for efficient lookup
	*/

	var Axis = function () {

		/*
			efficient lookup of cues by key	
			key -> cue
		*/
		this._keyMap = new Map();

		/*
			Initialise set of CueBuckets
			Each CueBucket is responsible for cues of a certain length
		*/
		this._cueBuckets = new Map();  // CueBucketId -> CueBucket
		for (let i=0; i<CueBucketIds.length; i++) {
			let cueBucketId = CueBucketIds[i];
			this._cueBuckets.set(cueBucketId, new CueBucket(cueBucketId));
		}

		// buffer for addCue, removeCue requests
		this._updateBuffer = [];

		// Change event
		eventify.eventifyInstance(this, {init:false});
		this.eventifyDefineEvent("change", {init:false});
	};
	eventify.eventifyPrototype(Axis.prototype);



	/*
		CLEAR
	*/
	Axis.prototype.clear = function () {
		// clear cue Buckets
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.clear();
		}
		// clear keyMap
		let keyMap = this._keyMap;
		this._keyMap = new Map();
		// create change events for all cues
		let e = [];
		for (let cue of keyMap.values()) {
			e.push({'old': cue});
		}
		this.eventifyTriggerEvent("change", e);
		return keyMap;
	};



	/*
		UPDATE

		update adds a batch of cues to the update buffer
		the batch will be delivered to _update in later microtask.

		This allows repeated calls to update to be
		collected into one batch.
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
		ADD CUE / REMOVE CUE

		addCue and removeCue are convenience functions
		for requesting cue operations to the axis.

		They may be invoked multiple times in say a for-loop,
		but all cues will still be delivered in one batch to 
		the internal update operation.

		Actual cue processing happens on the later microtasks, 
		so one cannot expect to see the effect of these operations 
		directly after the function call.
	*/

	Axis.prototype.addCue = function(key, interval, data) {
		this.update([{key:key, interval:interval, data:data}]);
	};

	Axis.prototype.removeCue = function(key) {
		this.update([{key:key}]);
	};


	/*
		INTERNAL UPDATE

		- add, modify or delete cues

		takes a list of cues
		
		cue = {
			key:key,
			interval: Interval,
			data: data
		}

		if cues do not have an interval property, this means to
		delete the cue. if not the cue is added - or modified if 
		a cue with the same key already exists

		remove_cue = {key:key}

	*/
	const cue_ok = function (cue) {
		if (cue == undefined) return false;
		if (cue.key == undefined) return false;
		return true;
	};


	Axis.prototype._update = function(cues) {

		/*
			process cue batch to make batchMap 
			- distinguish add from modify by including old values from keymap
			- collapse if same cue is mentioned multiple times
		*/
		let batchMap = new Map(); // key -> {new:new_cue, old:old_cue}
		for (let i=0; i<len; i++) {
    		let cue = cues[i];
    		let key = cue.key;
    		let remove = (cue.interval == undefined);
    		// check cue
    		if (!cue_ok(cue)) {continue;}
    		// check if cue has already been seen in this batch
    		let currentItem = batchMap.has(key);
    		if (currentItem == undefined) {
    			// cue has not been seen before - fetch from keymap
    			currentItem = {new:cue, old:this._keyMap.get(key)};
    		}
    		// update currentItem.new - preserve currentItem.old
    		if (cue.interval != undefined) {
    			// add or modify
    			currentItem.new = cue;
    		} else {
    			currentItem.new = undefined;
    			/*
    				delete operations on cues that did not exist before
    				the batch started causes all previous operations to be dropped
    				clean up by removing item in batchMap
				*/
				if (currentItem.new == undefined && currentItem.old == undefined) {
					batchMap.delete(key);
					continue;
				}
    		}
    		// update eventMap
    		batchMap.set(key, currentItem);
		}


        /*
			cue processing based on batchMap
        */
        this._processCues(batchMap);
		this.eventifyTriggerEvent("change", batchMap);
		return batchMap;
	};


	/*
		internal function: process batchMap,
		dispatch cue operations to appropriate cue bucket
	*/
	Axis.prototype._processCues = function (batchMap) {
		for (let item of batchMap.values()) {
			// update keyMap
			if (item.new) {
				this._keyMap.set(item.new.key, item.new);
			} else {
				this._keyMap.delete(item.new.key);
			}
			// update cue buckets
			if (item.old) {
				let cueBucketId = getCueBucketId(item.old.interval.length);
				this._cueBuckets[cueBucketId].updateCue("remove", item.old);
			}
			if (item.new) {
				let cueBucketId = getCueBucketId(eItem.new.interval.length);
				this._cueBuckets[cueBucketId].updateCue("add", item.new);
			}
		}
		// flush all buckets so updates take effect
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.flush();
		}
	};

	/*
		internal function: cue lookup across all buckets
	*/
	Axis.prototype._lookupCues = function (lookupMethod, interval) {
		const res = [];
		for (let cueBucket of this._cueBuckets.values()) {
			let cues = cueBucket.lookup(lookupMethod, interval);
			if (cues.length > 0) {
				res.push(...cues);
			}
		}
		return res;
	};

	/*
		getCuePointsByInterval

		returns (point, cue) for all points covered by given interval

		returns: 
			- list of cuepoints, from cue endpoints within interval
			- [{point: point, cue:cue}]		
	*/
	Axis.prototype.getCuePointsByInterval = function (interval) {
		return this._lookupCues(Lookupmethods.CUEPOINTS, interval);
	};

	/*
		getCuesByInterval
		
		returns all cues that cover at least one point that is also covered by given interval  

		returns:
			- Map : key -> cue

	*/
	Axis.prototype.getCuesByInterval = function (interval) {
		let cues = this._lookupCues(Lookupmethods.CUES, interval);
		// Avoid duplicates by putting all cues into a Map
		return new Map(cues.map(function (cue){
			return [cue.key, cue];
		}))
	};

	/*
		Similar to getCuesByInterval, but removing cues.
	*/
	Axis.prototype.removeCuesByInterval = function (interval) {
		let cues = this._lookupCues(Lookupmethods.CUES, interval);
		let removeCues = cues.map(function (cue) {
			return {key:cue.key};
		});
		return this.update(removeCues);
	};


	/*
		Accessors
	*/

	Axis.prototype.has = function (key) {
		return this._keyMap.has(key);
	};

	Axis.prototype.get = function (key) {
		return this._keyMap.get(key);
	};

	Axis.prototype.keys = function () {
		return this._keyMap.keys();
	};

	Axis.prototype.cues = function () {
		return this._keyMap.values();
	};




	/*
		CueBucket is a bucket of cues limited to specific length
	*/


	var CueBucket = function (maxLength) {
		this.maxLength = maxLength;

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


		this._created = new Map(); // value -> [cue, ...]
		this._dirty = new Map(); // value -> [cue, ...]

	};

	/*
		operation add or remove for given cue
		
		preprocessing in _update guarantees that this method will only be
		invoked once per cue.key

		"add" means point to be added to point
		"remove" means cue to be removed from point

		process buffers operations  pointMap and index so that 
		all operations may be applied in one batch. This happens in flush 

	*/

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


	CueBucket.prototype.processCue = function (op, cue) {

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
	CueBucket.prototype.flush = function () {
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
		lookup dispatches to given lookupMethod.
	*/
	CueBucket.prototype.lookup = function (lookupMethod, interval) {
		if (lookupMethod == Lookupmethods.CUEPOINTS) {
			return this._getCuesFromInterval(interval, {'cuepoints': true});
		} else if (lookupMethod == Lookupmethods.CUES){
			return this._getCuesByInterval(interval);
		} else {
			throw new Error("lookupmethod not supported", lookupMethod);
		}
	};


	/*
		_getCuesFromInterval

		internal utility function to find cues from endpoints in interval

		getCuesByInterval will find points in interval in pointIndex and 
		find the associated cues from pointMap. 

		Cues may be reported more than once
		Any specific order of cues is not defined.

		(at least one cue endpoint will be equal to point)

		Note: This function returns only cues with endpoints covered by the interval.
		It does not return cues that cover the interval (i.e. one endpoint at each
		side of the interval).

		options cuepoint signals to include both the cue and its point
		{point:point, cue:cue}

		the order is defined by point values (ascending), whether points are included or not.
		each point value is reported once, yet one cue
		may be reference by 1 or 2 points.

		returns list of cues, or list of cuepoints, based on options
	*/
	CueBucket.prototype._getCuesFromInterval = function(interval, options={}) {
		let cuepoint = (options.cuepoint != undefined) ? options.cuepoint : false; 
		let points = this._pointIndex.lookup(interval);
		let res = [];
		let len = points.length;
		for (let i=0; i<len; i++) {
			let point = points[i];
			let cues = this._pointMap.get(point);
			for (let j=0; j<cues.length; j++) {
				let cue = cues[j];
				/*
					cues sharing only the endpoints of interval
					(cue.interval and interval are back-to-back)
					must be checked specifically to see if they 
					really overlap at the endpoint
					no overlap: ><, >[ or ]<
					overlap: ][     
				*/
				let overlap = true;
				if (point == interval.low || point == interval.high) {
					overlap = exclusiveEndpointOverlap(interval, cue.interval);
				}
				if (overlap) {
					let item = (cuepoint) ? {point:point, cue:cue} : cue;
					res.push(item);
				}
			}
		}
		return res;
	};







	/*
		Find all cues overlapping interval.
		
		This task can be split in two parts
		- 1) INSIDE: find all cues that have at least one endpoint covered by interval
		- 2) OUTSIDE: find all cues that have one endpoint on each side of interval
		
		Returns list of cues
	*/


	CueBucket.prototype._getCuesByInterval = function (interval) {
		/* 
			1) all cues with at least one endpoint covered by interval 
		*/
		const cues_inside = this._getCuesFromInterval(interval);

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
		const cues_outside = this._getCuesFromInterval(leftInterval)
			.filter(function (cue) {
				return rightInterval.coversPoint(cue.interval.high);
			});

		return cues_inside.push(...cues_outside);	
	};


	CueBucket.prototype.clear = function () { 
		this._pointMap = new Map();
		this._pointIndex = new BinarySearch();
	};		


	// module definition
	return Axis;
});
