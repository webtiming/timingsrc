define (['../util/binarysearch', '../util/interval', '../util/eventify', '../util/iterable'], 
	function (BinarySearch, Interval, eventify, iterable) {

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
		make iterable for cue points, from an iterator for
		point values
	
		pointIterable is an iterable of point values, typically
		from pointIndex.
		
		cuePointIterable will iterate the point values and find
		the associated cue from pointMap

		pointIterable returns cue points of the following
		structure 
		{point: point, cue:cue}
		where cue is associated with the point value

		interval defines the interval of interest
		subtle point
		if interval is [4,6>, special care must be taken for 
		endpoint values 4 and 6. Though cues are associated with
		their entpoints, they do not always include their endpoints.

		So, if endpoint 4 is associated with a cue with interval [0,4>,
		then the cue is not actually overlapping the given interval.
		If this is the case, the cuepoint is dropped. 

		Only cuepoints which are overlapping the given interval will be returned.  
	*/
	var makeCuePointIterable = function (pointMap, pointIterable, interval) {
		let pointIterator = pointIterable[Symbol.iterator]();
		let cueIterator = [].values();
		let pointItem;
		let nextCue = function () {
			let cueItem = cueIterator.next();
			// while is needed in case we have to drop some nonoverlapping cues
			while (!cueItem.done) {
				/*
					if current point happens to be one of the endpoints of 
					the given interval, check that the cue interval overlaps
				*/
				let cue = cueItem.value;
				let point = pointItem.value;
				if (point == interval.low || point == interval.high) {
					if (!cue.interval.overlapsInterval(interval)) {
						cueItem = cueIterator.next();
						continue;		
					}
				}
				return cueItem;
			}
			return {done:true};
		};
		let next = function () {
			let cueItem = nextCue();
			while (cueItem.done) {
				// fetch cues for next point in pointIterable
				pointItem = pointIterator.next();
				if (pointItem.done) {
					// both exhausted
					return {done: true};
				} else {
					// more cues
					cueIterator = pointMap.get(pointItem.value).values();
					cueItem = nextCue();
				}
			}
			// cueItem ok
			return {
				done:false,
				value: {
					point:pointItem.value, 
					cue: cueItem.value
				}
			};				
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
	};

	/*

		make iterable for cue points, from an iterator for
		point values

		pointIterable is an iterable of point values, typically
		from pointIndex.

		cueIterable will iterate the point values and find
		the associated cue from pointMap. Each cue will only
		be reported once, even if they are referenced by multiple
		points (both enpoint of a cue within set).
		
		pointIterable returns cue objects. Any specific order of cues
		is not defined.
	*/

	var makeCueIterable = function (pointMap, pointIterable, interval) {
		let cuePointIterable = makeCuePointIterable(pointMap, pointIterable, interval);
		let cuePointIterator = cuePointIterable[Symbol.iterator]();
		let keys = new Set();
		let item, cue; 
		let next = function () {
			item = cuePointIterator.next();
			// need a while loop to iterate past cue duplicates
			while (!item.done) {
				cue = item.value.cue;
				if (!keys.has(cue.key)) {
					keys.add(cue.key);
					return {done:false, value: cue};				
				}
				item = cuePointIterator.next();					
			}
			return {done:true};
			
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
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
		this.keyMap = new Map();

		/*
			pointMap maintains the associations between values (points on 
			the timeline) and cues that reference such points. A single point value may be 
			referenced by multiple cues, so one point value maps to a list of cues.
	
			value -> [cue, ....]
		*/ 
		this.pointMap = new Map(); 

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
		this.pointIndex = new BinarySearch();


		// Change event
		eventify.eventifyInstance(this, {init:false});
		this.eventifyDefineEvent("change", {init:false});
	};
	eventify.eventifyPrototype(Axis.prototype);


	/*
		UPDATE

		- does it all : add, modify, delete

		update takes a list of cues
		
		cue = {
			key:key,
			interval: Interval,
			data: data
		}

		if cues do not have an interval property, this means to
		delete the cue.

		cue = {key:key}

	*/
	Axis.prototype.update = function(cues) {
		let cueBatch = new CueBatch(this.pointMap, this.pointIndex);
		let eventBatch = new EventBatch();

        if (this.keyMap.size == 0) {
        	// initialization - first invocation of update
        	for (let cue of cues) {
        		this.keyMap.set(cue.key, cue);
        		cueBatch.processCue("add", cue);
				eventBatch.processEvent({new:cue});
        	}
        } else {
        	for (let cue of cues) {
				let old_cue = this.keyMap.get(cue.key);
				if (old_cue) {
					if (cue.interval) {
						// replace cue
						this.keyMap.set(cue.key, cue);
						cueBatch.processCue("remove", old_cue);
						cueBatch.processCue("add", cue);
						eventBatch.processEvent({new:cue, old:old_cue});
					} else {
						// delete cue
						// cues without interval signify deletion 
						this.keyMap.delete(old_cue.key);
						cueBatch.processCue("remove", old_cue);
						eventBatch.processEvent({old:old_cue});
					}
				} else {
					if (cue.interval) {
						// new cue
						this.keyMap.set(cue.key, cue);
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
	};


	/*
		LOOKUP

	*/

	/*
		Find all interval endpoints within given interval 
	*/
	Axis.prototype.getCuePointsCoveredByInterval = function (interval) {
		let pointIterable = this.pointIndex.lookup(interval);
		return makeCuePointIterable(this.pointMap, pointIterable, interval);
	};

	/*
		Find all cues covering interval.
	*/
	Axis.prototype.getCuesOverlappingInterval = function (interval) {
		let pointIterable = this.pointIndex.lookup(interval);
		let cueIterable =  makeCueIterable(this.pointMap, pointIterable, interval);

		/*
			todo - missing cues that are covering interval, with
			with both endpoints outside interval
			
			e.g. if interval is <4,6> - [4,6] will be detected 
			because it has shared endpoints and overlaps.
			However, [2,8] will not be detected.
		*/

		// add keys of all intervals that have endpoints on both sides of interval
		var leftInterval = new Interval(-Infinity, interval.low);
		var rightInterval = new Interval(interval.high, Infinity);
		/* 
			optimization - could choose the interval with the least points
			instead of just choosing left
			optimization - would be good to have all singular intervals isolated
		*/
		let leftCuePointIterable = this.getCuePointsCoveredByInterval(leftInterval);

		/*
			need two more iterables
			- filter out those that are not covering (condition)
			- chain two interables
		*/


		/*
		this._index.lookup(leftInterval).forEach(function(point) {
			this._reverse.getItemsByKey(point).forEach(function (item) {
				var _interval = this._map[item.value];
				if (rightInterval.coversPoint(_interval.high)) {
					res[item.value] = undefined;
				}
			}, this);
		
		}, this);
		*/

		return cueIterable;
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
		this.pointMap = pointMap;
		this.pointIndex = pointIndex;
		this.created = new Map(); // value -> [cue, ...]
		this.dirty = new Map(); // value -> [cue, ...]
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
			cues = this.created.get(point);
			if (cues == undefined) {
				// point not found in created
				cues = this.pointMap.get(point);
				if (cues == undefined) {
					// point not found in pointMap
					// register in created
					cues = (op == "add") ? [cue] : [];
					this.created.set(point, cues);
				} else {
					// cues found in pointMap - update
					if (op == "add") {
						addCueToArray(cues, cue);
					} else {
						let empty = removeCueFromArray(cues, cue);
						if (empty) {
							this.dirty.set(point, cues);
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
		let value, node;
		let to_remove = [];
		let to_insert = [];
		for ([value, node] of this.created.entries()) {
			if (node.length > 0) {
				to_insert.push(value);
				this.pointMap.set(value, node);
			} 
		}
		for ([value, node] of this.dirty.entries()) {
			if (node.length == 0) {
				to_remove.push(value);
				this.pointMap.delete(value);
			}
		}
		this.pointIndex.update(to_remove, to_insert);
		// cleanup
		this.created.clear();
		this.dirty.clear();
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
		this.events = new Map();
	};

	/*
		process a single event (relating to a cue operation)
	*/
	EventBatch.prototype.processEvent = function (item) {
		let key = (item.new) ? item.new.key : item.old.key;
		let oldItem = this.events.get(key);
		if (oldItem == undefined) {
			this.events.set(key, item);
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
		for (let item of this.events.values()) {
			if (item.new || item.old) {
				res.push(item);
			}
		}
		this.events.clear();
		return res;
	};


	// module definition
	return Axis;
});
