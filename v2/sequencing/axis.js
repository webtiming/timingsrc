define (['../util/binarysearch', '../util/interval', '../util/eventify'], 
	function (BinarySearch, Interval, eventify) {

	'use strict';

	/*
		UTILITY
	*/


	/* 
		concat two arrays without creating a copy
		push elements from the shortest into the longest
		return the longest
	*/
	const mergeArrays = function(arr1, arr2) {
		const [shortest, longest] = (arr1.length <= arr2.length) ? [arr1, arr2] : [arr2, arr1];
		let len = shortest.length;
		for (let i=0; i<len; i++) {
			longest.push(shortest[i]);
		}
		return longest;
	};


	/*
		Add cue to array
	*/
	var addCueToArray = function (arr, cue) {
		// cue equality defined by key property
		if (arr.length == 0) {
			arr.push(cue);
		} else {		
			let idx = arr.findIndex(function (_cue) { 
				return _cue.key == cue.key;
			});
			if (idx == -1) {
				arr.push(cue);
			}
		}
		return arr.length;
	};

	/*
		Remove cue from array
	*/
	var removeCueFromArray = function (arr, cue) {
		// cue equality defined by key property 
		if (arr.length == 0) {
			return true;
		} else {		
			let idx = arr.findIndex(function (_cue) { 
				return _cue.key == cue.key;
			});
			if (idx > -1) {
				arr.splice(idx, 1);
			}
			return arr.length == 0;
		}
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
		Semantic

		Specifies the semantic for cue operations

		INSIDE  - all cues with both endpoints INSIDE the search interval
		PARTIAL - all INSIDE cues, plus cues that PARTIALL overlap search interval, i.e. have only one endpoint INSIDE search interval
		OVERLAP - all PARTIAL cues, plus cues that fully OVERLAP search interval, but have no endpoints INSIDE search interval 

    */
    const Semantic = Object.freeze({
    	INSIDE: "inside",
    	PARTIAL: "partial",
    	OVERLAP: "overlap"
    });


    /*
		Method

		Specifies various methods on CueBuckets

		LOOKUP_CUEPOINTS - look up all (point, cue) tuples in search interval
		LOOKUP_CUES - lookup all cues in interval
		REMOVE_CUES - remove all cues in interval 

    */
    const Method = Object.freeze({
    	LOOKUP_CUES: "lookup-cues",
    	LOOKUP_CUEPOINTS: "lookup-cuepoints",
    	REMOVE_CUES: "remove-cues"
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
		this._cueMap = new Map();

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
				self._update([].concat(...self._updateBuffer));
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
		delete the cue. If not, the cue is added - or modified if 
		a cue with the same key already exists

		remove_cue = {key:key}

		batchMap key -> {new: new_cue, old: old_cue}

		BatchMap is generated during initial batch processing, 
		representing the effects of the entire cue batch, 
		thus making cue batch processing into an atomic operation.

		- If operation applies to cue that already exists, the old cue
		  will be included. 

		- If multiple operations in a batch apply to the same 
		cue, items will effectively be collapsed into one operation. 
	
		- If a cue was available before cue processing started,
		this will be reported as old value (if this cue has been modified
		in any way), even if the cue has been modified multiple times
		during the batch. The last cue modification on a given key defines the new
		cue. 

		- If a cue is both added and removed in the same batch,
		it will not be included in items.
	*/

	
	Axis.prototype._update = function(cues) {

		/*
			process cue batch to make batchMap 
			- distinguish add from modify by including old values from cueMap
			- collapse if same cue is mentioned multiple times
		*/
		let batchMap = new Map(); // key -> {new:new_cue, old:old_cue}
		let len = cues.length;
		let init = this._cueMap.size == 0;
		for (let i=0; i<len; i++) {
    		let cue = cues[i];
    		// check cue
    		if (cue == undefined || cue.key == undefined) {
    			throw new Error("illegal cue", cue);
    		}
    		// update batchMap
    		let old_cue = (init) ? undefined : this._cueMap.get(cue.key);
    		let new_cue = (cue.interval == undefined ) ? undefined : cue;
    		if (new_cue == undefined && old_cue == undefined) {
	    		// attempt at remove cue which did not exist before update
    			// noop - remove from batchMap
    			batchMap.delete(cue.key);
  			} else {
	    		batchMap.set(cue.key, {new:new_cue, old:old_cue});
  			}
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
			// update cue buckets
			if (item.old) {
				let cueBucketId = getCueBucketId(item.old.interval.length);
				this._cueBuckets.get(cueBucketId).processCue("remove", item.old);
			}
			if (item.new) {
				let cueBucketId = getCueBucketId(item.new.interval.length);
				let cueBucket = this._cueBuckets.get(cueBucketId);
				cueBucket.processCue("add", item.new);
			}
			// update cueMap
			if (item.new) {
				this._cueMap.set(item.new.key, item.new);
			} else {
				this._cueMap.delete(item.old.key);
			}
		}
		// flush all buckets so updates take effect
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.flush();
		}
	};

	/*
		internal function: execute method across all cue buckets
		and aggregate results
	*/
	Axis.prototype._execute = function (method, interval, semantic) {
		const res = [];
		for (let cueBucket of this._cueBuckets.values()) {
			let cues = cueBucket.execute(method, interval, semantic);
			if (cues.length > 0) {
				res.push(cues);
			}
		}
		return [].concat(...res);
	};

	/*
		GET CUEPOINTS BY INTERVAL

		returns (point, cue) for all points covered by given interval

		returns: 
			- list of cuepoints, from cue endpoints within interval
			- [{point: point, cue:cue}]		
	*/
	Axis.prototype.getCuePointsByInterval = function (interval) {
		return this._execute(Method.LOOKUP_CUEPOINTS, interval);
	};

	/*
		GET CUES BY INTERVAL
		
		semantic - "inside" | "partial" | "overlap"

	*/
	Axis.prototype.getCuesByInterval = function (interval, semantic=Semantic.OVERLAP) {
		return this._execute(Method.LOOKUP_CUES, interval, semantic);
	};

	/*
		Similar to getCuesByInterval, but removing cues.
	*/
	Axis.prototype.removeCuesByInterval = function (interval, semantic=Semantic.INSIDE) {
		let cues = this._execute(Method.LOOKUP_CUES, interval, semantic);
		let removeCues = cues.map(function (cue) {
			return {key:cue.key};
		});
		return this._update(removeCues);
	};

	/*
		REMOVE CUES BY INTERVAL
	*/
	Axis.prototype.removeCuesByInterval2 = function (interval, semantic=Semantic.INSIDE) {
		const cues = this._execute(Method.REMOVE_CUES, interval, semantic);
		// remove from cueMap and make events
		const eList = [];
		for (let i=0; i<cues.length; i++) {
			let cue = cues[i];
			this._cueMap.delete(cue.key);
			eList.push({'old': cue});
		}
		this.eventifyTriggerEvent("change", eList);
		return eList;
	};

	/*
		CLEAR ALL CUES
	*/
	Axis.prototype.clear = function () {
		// clear cue Buckets
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.clear();
		}
		// clear cueMap
		let cueMap = this._cueMap;
		this._cueMap = new Map();
		// create change events for all cues
		let e = [];
		for (let cue of cueMap.values()) {
			e.push({'old': cue});
		}
		this.eventifyTriggerEvent("change", e);
		return cueMap;
	};




	/*
		Accessors
	*/

	Axis.prototype.has = function (key) {
		return this._cueMap.has(key);
	};

	Axis.prototype.get = function (key) {
		return this._cueMap.get(key);
	};

	Axis.prototype.keys = function () {
		return this._cueMap.keys();
	};

	Axis.prototype.cues = function () {
		return this._cueMap.values();
	};




	/*
		CueBucket is a bucket of cues limited to specific length
	*/


	var CueBucket = function (maxLength) {
		
		// max length of cues in this bucket
		this._maxLength = maxLength;

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

		// bookeeping during batch processing
		this._created = new Set(); // point
		this._dirty = new Set(); // point
	};


	/* 

		CUE BATCH PROCESSING

		Needs to translates cue operations into a minimum set of 
		operations on the pointIndex.

		To do this, we need to record points that are created and
		points which are modified.
		
		The total difference that the batch of cue operations
		amounts to is expressed as one list of values to be 
		deleted, and and one list of values to be inserted. 
		The update operation of the pointIndex will process both 
		in one atomic operation.

		On flush both the pointMap and the pointIndex will brought
		up to speed

		created and dirty are used for bookeeping during 
		processing of a cue batch. They are needed to 
		create the correct diff operation to be applied on pointIndex.

		created : includes values that were not in pointMap 
		before current batch was processed

		dirty : includes values that were in pointMap
		before curent batch was processed, and that
		have been become empty at least at one point during cue 
		processing. 

		created and dirty are used as temporary alternatives to pointMap.
		after the cue processing, pointmap will updated based on the
		contents of these two.

		operation add or remove for given cue
		
		this method may be invoked at most two times for the same key.
		- first "remove" on the old cue
		- second "add" on the new cue 


		"add" means point to be added to point
		"remove" means cue to be removed from point

		process buffers operations for pointMap and index so that 
		all operations may be applied in one batch. This happens in flush 
	*/

	CueBucket.prototype.processCue = function (op, cue) {

		let points, point, cues;
		if (cue.singular) {
			points = [cue.interval.low]
		} else {
			points = [cue.interval.low, cue.interval.high];
		}

		let init = (this._pointMap.size == 0);

		for (let i=0; i<points.length; i++) {
			point = points[i];
			cues = (init) ? undefined : this._pointMap.get(point);
			if (cues == undefined) {	
				cues = [];
				this._pointMap.set(point, cues);
				this._created.add(point);
			}
			if (op == "add") {
				addCueToArray(cues, cue);
			} else {
				let empty = removeCueFromArray(cues, cue);
				if (empty) {
					this._dirty.add(point);
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
		if (this._created.size == 0 && this._dirty.size == 0) {
			return;
		}

		// update pointIndex
		let to_remove = [];
		let to_insert = [];
		for (let point of this._created.values()) {
			let cues = this._pointMap.get(point);
			if (cues.length > 0) {
				to_insert.push(point);
			} else {
				this._pointMap.delete(point);
			}
		}
		for (let point of this._dirty.values()) {
			let cues = this._pointMap.get(point);
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
		execute dispatches request to given method.

		CUEPOINTS - look up all (point, cue) tuples in search interval

		INSIDE - look up all cues with both endpoints INSIDE the search interval
		PARTIAL - look up all INSIDE cues, plus cues with one endpoint inside the search interval
		ALL - look up all PARTIAL cues, plus cues with one cue at each side of search interval 

	*/
	CueBucket.prototype.execute = function (method, interval, semantic) {
		if (this._pointIndex.length == 0) {
			return [];
		}
		if (method == Method.LOOKUP_CUEPOINTS) {
			return this.lookupCuePoints(interval);
		} else if (method == Method.LOOKUP_CUES && semantic == Semantic.INSIDE){
			return this.lookupInsideCues(interval);
		} else if (method == Method.LOOKUP_CUES && semantic == Semantic.PARTIAL) {
			return this.lookupPartialCues(interval);
		} else if (method == Method.LOOKUP_CUES && semantic == Semantic.OVERLAP) {
			return this.lookupOverlapCues(interval);
		} else if (method == Method.REMOVE_CUES) {
			return this.removeCues(interval, semantic);
		} else {
			throw new Error("method or semantic not supported " + method + " " + semantic);
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

		option cuepoint signals to include both the cue and its point
		{point:point, cue:cue}
		if not - a list of cues is returned

		the order is defined by point values (ascending), whether points are included or not.
		each point value is reported once, yet one cue
		may be reference by 1 or 2 points.

		returns list of cues, or list of cuepoints, based on options
	*/
	CueBucket.prototype._lookupCuesFromInterval = function(interval, options={}) {
		const cuepoint = (options.cuepoint != undefined) ? options.cuepoint : false;
		const points = this._pointIndex.lookup(interval);
		const res = [];
		const len = points.length;
		const cueSet = new Set();
		for (let i=0; i<len; i++) {
			let point = points[i];
			let cues = this._pointMap.get(point);
			for (let j=0; j<cues.length; j++) {
				let cue = cues[j];

				/*
					avoid duplicate cues 
					(not for cuepoints, where cues may be associated with two points)
				*/
				if (!cuepoint) {
					if (cueSet.has(cue.key)) {
						continue;
					} else {
						cueSet.add(cue.key);
					}
				}

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
		LOOKUP CUEPOINTS - look up all (point, cue) tuples in search interval
	*/
	CueBucket.prototype.lookupCuePoints = function (interval) {
		return this._lookupCuesFromInterval(interval, {cuepoint:true});
	};


	/*
		LOOKUP CUES
		INSIDE - look up all cues with both endpoints INSIDE the search interval
	*/
	CueBucket.prototype.lookupInsideCues = function(interval) {
		return this._lookupCuesFromInterval(interval, {cuepoint:false}).filter(function (cue) {
			return interval.coversInterval(cue.interval);
		});
	};


	/*
		LOOKUP CUES
		PARTIAL - look up all INSIDE cues, plus cues with one endpoint inside the search interval
	*/
	CueBucket.prototype.lookupPartialCues = function(interval) {
		return this._lookupCuesFromInterval(interval, {cuepoint:false});
	};


	/*
		ALL - look up all PARTIAL cues, plus cues with one cue at each side of search interval
	*/
	CueBucket.prototype.lookupOverlapCues = function (interval) {
		/* 
			1) all cues with at least one endpoint covered by interval 
		*/
		const cues_partial = this.lookupPartialCues(interval);

		/*
			2)

			define left and right intervals that cover areas on the timeline to
			the left and right of search interval. 
			These intervals are limited by the interval maxLength of cues in this bucket,
			so that:
			 - left interval [interval.high-maxLengt, interval.low]
			 - right interval [interval.high, interval.low+maxlength]

			Only need to search one of them. Preferably the one with the fewest cues.
			However, doing two searches to figure out which is shortest is quite possibly more expensive than choosing the longest,
			so no point really

			Choice - always search left.

			If interval.length > maxLength, then there can be no overlapping intervals in this bucket

			Endpoints must not overlap with endpoints of <interval>
			- if interval.lowInclude, then leftInterval.highInclude must be false,
			  and vice versa. 
			- the same consideration applies to interval.highInclude			
		*/
		if (interval.length > this._maxLength) {
			return cues_partial;
		}

		const highIncludeOfLeftInterval = !interval.lowInclude;
		const leftInterval = new Interval(interval.high - this._maxLength, interval.low, true, highIncludeOfLeftInterval);

		const lowIncludeOfRightInterval = !interval.highInclude;		
		const rightInterval = new Interval(interval.high, interval.low + this._maxLength, lowIncludeOfRightInterval, true);
		
		/* 
			iterate leftInterval to find cues that have endpoints covered by rightInterval

			possible optimization - choose the interval with the least points
			instead of just choosing left.
			possible optimization - this seek operation would be more effective if
			singular cues were isolated in a different index. Similarly, one
			could split the set of cues by the length of their intervals.
		*/
		const cues_outside = this._lookupCuesFromInterval(leftInterval)
			.filter(function (cue) {
				// fast test
				if (interval.high < cue.interval.low) {
					return true;
				}
				// more expensive test that will pick up cornercase
				// where [a,b] will actually be an outside covering interval for <a,b>
				return rightInterval.coversPoint(cue.interval.high);
			});

		return mergeArrays(cues_partial, cues_outside);
	};


	/*
		REMOVE ALL CUES BY INTERVAL
		
		semantic "inside" | "partial" | "overlap" 

		exploit locality of points - avoid using regular update mechanism for points within interval
	*/


	CueBucket.prototype.removeCues = function (interval, semantic) {
		/*
			update pointMap
			- find cues
			- delete entries for cue endpoints within interval
			- remove cues for cue endpoints outside interval
			- todo - distinguish endpoints inside and outside
		*/
		const to_remove = [];
		const cues = this.execute(Method.LOOKUP_CUES, interval, semantic);
		let points, cue;
		for (let i=0; i<cues.length; i++) {
			cue = cues[i];
			if (cue.interval.singular) {
				points = [cue.interval.low];
			} else {
				points = [cue.interval.low, cue.interval.high];
			}
			for (let point of points.values()) {
				let empty = removeCueFromArray(this._pointMap.get(point), cue);
				if (empty) {
					this._pointMap.delete(point);
					to_remove.push(point);
				}
			}
		}

		/*
			update pointIndex


			partial
			- remove slice according to interval
			- do not remove endpoints of search interval if they are still represented in pointMap 
			(this may happen when outside cues (not to be deleted) share endpoint)
		*/

		if (semantic == Semantic.PARTIAL) {		
			const [start, end] = this._pointIndex.lookupIndexes(interval);
			if (this._pointMap.get(interval.low) !== undefined) {
				start += 1;
			}
			if (this._pointMap.get(interval.high) !== undefined) {
				end -= 1;
			}
			if (end-start > 0) {
				points = this._pointIndex.splice(start, end-start);
			}
		}

		/* 
			remove dangling points outside if they have become empty in pointMap
			here we should have only those points that are actually outside
		*/
		this._pointIndex.update(to_remove, []);


		return cues;
	};


	/*
		Possible optimization. Implement a removecues method that
		exploits locality by removing an entire slice of pointIndex.
		- this can safely be done for LookupMethod.OVERLAP and PARTIAL.
		- however, for LookupMethod.INSIDE, which is likely the most useful
		  only some of the points in pointIndex shall be removed
		  solution could be to remove entire slice, construct a new slice 
		  with those points that should not be deleted, and set it back in.
	*/



	CueBucket.prototype.clear = function () { 
		this._pointMap = new Map();
		this._pointIndex = new BinarySearch();
	};		


	// module definition
	return Axis;
});
