define (['../util/binarysearch'], 
	function (BinarySearch) {

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
		make iterable for pointMap
	
		pointIterable is an iterable of points
		pointMapIterable will iterate the points and find
		the associated cues from pointMap

		pointMapIterable returns values {point: point, cue:cue}
		where cue is associated with point
	*/
	var makePointMapIterable = function (pointMap, pointIterable) {
		let pointIterator = pointIterable[Symbol.iterator]();
		let cueIterator = [].values();
		let pointItem;
		let next = function () {
			let cueItem = cueIterator.next();
			if (cueItem.done) {
				// fetch new cues from pointIterable
				pointItem = pointIterator.next();
				if (pointItem.done) {
					// both exhausted
					return {done: true};
				} else {
					// more cues
					cueIterator = pointMap.get(pointItem.value).values();
					cueItem = cueIterator.next();
					// newly fetched cueIterator should never be empty
					if (cueItem.done) {
						throw new Error("no cues in pointMap for point ", pointItem.value);
					}	
				}
			} 
			return {
				done:false,
				value: {
					point:pointItem.value, 
					cue: cueItem.value
				}
			}
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
		*/
		this.pointIndex = new BinarySearch();
	};

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
     	if (cues.length == 0) { return [];}
	
		let cueBatch = new CueBatch(this.pointMap, this.pointIndex);
		let eventBatch = new EventBatch();

    	let cue, old_cue;
        if (this.keyMap.size == 0) {
        	// initialization - first invocation of addCues
        	for (let i=0; i<cues.length; i++) {
        		cue = cues[i];
        		this.keyMap.set(cue.key, cue);
        		cueBatch.processCue("add", cue.interval.low, cue);
				eventBatch.processEvent({new:cue});
        	}
        } else {
        	// iterate keys in keyMap
        	for (let i=0; i<cues.length; i++) {
				// check for cues to be replaced
				cue = cues[i];
				old_cue = this.keyMap.get(cue.key);
				if (old_cue) {
					if (cue.interval) {
						// replace cue
						this.keyMap.set(cue.key, cue);
						cueBatch.processCue("remove", old_cue.interval.low, old_cue);
						cueBatch.processCue("add", cue.interval.low, cue);
						eventBatch.processEvent({new:cue, old:old_cue});
					} else {
						// delete cue
						// cues without interval signify deletion 
						this.keyMap.delete(old_cue.key);
						cueBatch.processCue("remove", old_cue.interval.low, old_cue);
						eventBatch.processEvent({old:old_cue});
					}
				} else {
					if (cue.interval) {
						// new cue
						this.keyMap.set(cue.key, cue);
						cueBatch.processCue("add", cue.interval.low, cue);
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
		return eventBatch.done();
	};


	/*
		LOOKUP

	*/



	/*
		Find all interval endpoints within given interval 
	*/
	Axis.prototype.getPointsCoveredByInterval = function (interval) {
		let pointIterable = this.pointIndex.lookup(interval);
		return makePointMapIterable(this.pointMap, pointIterable);
	};


	Axis.prototype.getCuesCoveringInterval = function (interval) {

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
	CueBatch.prototype.processCue = function (op, point, cue) {
		let cues = this.created.get(point);
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
