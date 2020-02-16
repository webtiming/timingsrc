define (['../util/binarysearch', '../util/interval', '../util/eventify'],
	function (BinarySearch, Interval, eventify) {

	'use strict';

	/*
		UTILITY
	*/

	function isIterable(obj) {
	 	// checks for null and undefined
		if (obj == null) {
		    return false;
		}
		return typeof obj[Symbol.iterator] === 'function';
	}

	/*
		concat two arrays without creating a copy
		push elements from the shortest into the longest
		return the longest
		- does not preserve ordering
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
		object equals
	*/
	function object_equals(a, b) {
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        // If number of properties is different,
        // objects are not equivalent
        if (aProps.length != bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        // If we made it this far, objects
        // are considered equivalent
        return true;
    }


	/*
		Add cue to array
		- does not add if cue already exists
		- returns array length
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
		- noop if cue does not exist
		- returns array length
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
		Setup for cue buckets.
    */
    const CueBucketIds = [0, 10, 100, 1000, 10000, 100000, Infinity];
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
    	REMOVE_CUES: "remove-cues",
    	INTEGRITY: "integrity"
    });


    /*
		Delta

		Uset to represent statechanges in batchMap,
		for intervals and data.
    */

    const Delta = Object.freeze({
    	NOOP: 0,
    	INSERT: 1,
    	REPLACE: 2,
    	DELETE: 3
    });


    /*
		Characterize the transition from cue_a to cue_b
		in terms of delta values for interval and data

		For instance, interval has
		- INSERT: value not in a but in b
		- DELETE: value in a but not in b
		- REPLACE: value in a and in be and not equal
		- NOOP: either remains undefined or remains equal

		optional equals function for data comparison
		otherwise simple object equality (==) is used
    */
	function cue_delta(cue_a, cue_b, equals) {
		let interval_delta, data_delta, eq;
		// interval delta
		let a_interval_defined = cue_a != undefined && cue_a.interval != undefined;
		let b_interval_defined = cue_b != undefined && cue_b.interval != undefined;
		if (!a_interval_defined && !b_interval_defined) {
			interval_delta = Delta.NOOP;
		} else if (!a_interval_defined) {
			interval_delta = Delta.INSERT;
		} else if (!b_interval_defined) {
			interval_delta = Delta.DELETE;
		} else {
			// check interval equality
			eq = cue_a.interval.equals(cue_b.interval);
			interval_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
		}
		// data delta
		let a_data_defined = cue_a != undefined && cue_a.data != undefined;
		let b_data_defined = cue_b != undefined && cue_b.data != undefined;
		if (!a_data_defined && !b_data_defined) {
			data_delta = Delta.NOOP;
		} else if (!a_data_defined) {
			data_delta = Delta.INSERT;
		} else if (!b_data_defined) {
			data_delta = Delta.DELETE;
		} else {
			// check data equality
			if (equals) {
				eq = equals(cue_a.data, cue_b.data);
			} else {
				eq = (cue_a.data == cue_b.data);
			}
			data_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
		}
		return {interval: interval_delta, data: data_delta};
	}

	/*
		determine equality for two cues
		<equals> is optional equality function for cue.data
		if not specified simple value equality (==) is used
	*/
	function cue_equals(cue_a, cue_b, equals) {
		let delta = cue_delta(cue_a, cue_b, equals);
		return delta.interval == Delta.NOOP && delta.data == Delta.NOOP;
	}

	/*
		given the current state of a cue,
		and a cue argument,
		generate the resulting cue

		- implements preservation of values from old_cue
	*/
	function cue_process(old_cue, cue, check) {
		if (check) {
			if (!(cue) || !cue.hasOwnProperty("key") || cue.key == undefined) {
				throw new Error("illegal cue", cue);
			}
		}
		let has_interval = cue.hasOwnProperty("interval");
	    let has_data = cue.hasOwnProperty("data");
	    if (check && has_interval) {
	    	if (!cue.interval instanceof Interval) {
	    		throw new Error("interval must be Interval");
	    	}
	    }
		if (old_cue == undefined) {
			// make sure properties are defined
			if (!has_interval) {
				cue.interval = undefined;
			}
			if (!has_data) {
				cue.data = undefined;
			}
		} else if (old_cue != undefined) {
	    	if (!has_interval && !has_data) {
	    		// make sure properties are defined
	    		cue.interval = undefined;
	    		cue.data = undefined;
	    	} else if (!has_data) {
				// REPLACE_INTERVAL, preserve data
				cue.data = old_cue.data;
			} else if (!has_interval) {
				// REPLACE_DATA, preserve interval
				cue.interval = old_cue.interval;
			} else {
				// REPLACE CUE
			}
	    }
	    return cue;
	}



	/*
		this implements Axis, a datastructure for efficient lookup of cues on a timeline
		- cues may be tied to one or two points on the timeline, this
		  is expressed by an Interval.
		- cues are indexed both by key and by intervals
		- cues are maintained in buckets, based on their interval length,
		  for efficient lookup
	*/

	class Axis {


		constructor() {
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

			// Change event
			eventify.eventifyInstance(this, {init:false});
			this.eventifyDefineEvent("change", {init:false});
		};


		/*
			SIZE
			Number of cues managed by axis
		*/
		get size () {
			return this._cueMap.size;
		}


		/*
			_update_collaps (cues, equals, check)

			<cueMap> - map with cues representing state before update
			<equals> - equality function for data objects
			<cues> ordered list of cues to be updated
			<check> - check cue integrity if true

			cue = {
				key:key,
				interval: Interval,
				data: data
			}

			cue completeness

			required (see check cue)
			- cue.key property is defined and value is != undefined
			- if cue.interval != undefined, it must be instance of Interval


			EXAMPLES

			// INSERT (no pre-existing cue)

			cue = {key:1, interval: new Interval(3,4), data: {}}
			// insert cue with only interval
			cue = {key:1, interval: new Interval(3,4)}
			// insert cue with only data
			cue = {key:1, data: {}}


			// REPLACE (pre-existing cue)
			preexisting_cue = {key:1, interval: new Interval(3,4), data: {}}

			cue = {key:1, interval: new Interval(3,5), data: {foo:"bar"}}
			// replace interval, keep data
			cue = {key:1, interval: new Interval(3,5)}
			// replace interval, delete data
			cue = {key:1, interval: new Interval(3,5), data: undefined
			// replace data, keep interval
			cue = {key:1, data: {foo:"bar"}}
			// replace data, delete interval
			cue = {key:1, interval: undefined, data: {foo:"bar"}}

			// DELETE (pre-existing)
			cue = {key:1}
			// delete interval, keep data
			cue = {key:1, interval: undefined}
			// delete data, keep interval
			cue = {key:1, data: undefined}


			Returns batchMap - describes the effects of an update.

				batchMap is a Map() object
				key -> {
					new: new_cue,
					old: old_cue,
					delta: {
						interval: Delta,
						data: Delta
					}
				}

			with independent delta values for interval and data:
	    	Delta.NOOP: 0
	    	Delta.INSERT: 1
	    	Delta.REPLACE: 2
	    	Delta.DELETE: 3


			- if there are multiple cue operations for the same key,
			  within the same batch of cues,
			  these will be processed in order.
			  However, returned delta values will be calcultated relative to
			  the state before the batch.
			  This way, external mirroring observers may will be able to duplicate the transitions.
			  Also, internal index management depends on the correct
			  representation of state changes.

			- NOOP operations, such as delete non-existent cue will also
			  be present in batch map.

			- If a cue was available before cue processing started,
			this will be reported as old value

		*/
		_update_cues_collapse(cues, equals, check) {
			const batchMap = new Map();
			const _cueMap = new Map();
			let cue, old_cue, entry;
			let init = this._cueMap.size == 0;
			let len = cues.length;
			for (let i=0; i<len; i++) {
	    		cue = cues[i];
	    		old_cue = _cueMap.get(cue.key);
	    		// load old cue
	    		if (old_cue == undefined) {
	    			// load old cue from cueMap
	    			old_cue = (init) ? undefined : this._cueMap.get(cue.key);
	    		}
	    		// process cue
	    		cue = cue_process(old_cue, cue, check);
			    _cueMap.set(cue.key, cue);
		    }

		    // make batchMap
		    for (cue of _cueMap.values()) {
				old_cue = this._cueMap.get(cue.key);
				// update cue in cueMap
				entry = this._update_cue(old_cue, cue, equals);
				batchMap.set(entry.key, entry);
			}
		    return batchMap;
		}

		/*
			make batchmap more quickly assuming a different semantic
			- if there are multiple cue operations for the same key,
			  only the last one is used
		*/
		_update_cues(cues, equals, check) {
			const batchMap = new Map();
			const len = cues.length;
			let cue, old_cue, entry;
			let init = this._cueMap.size == 0;
			for (let i=0; i<len; i++) {
	    		cue = cues[i];
				old_cue = (init) ? undefined : this._cueMap.get(cue.key);
				// process cue
				cue = cue_process(old_cue, cue, check);
				// update cueMap
				entry = this._update_cue(old_cue, cue, equals);
				if (entry != undefined) {
					batchMap.set(entry.key, entry);
				}
			}
			return batchMap;
		}


		/*
		update cue in cueMap
		- if old_cue is defined, it is already stored in cueMap
		- do in-place update of old_cue for replace type operations
		- return entry for batchmap (undefined means NOOP)
		*/
		_update_cue(old_cue, cue, equals) {
			let copy_cue;
			// check for equality
			let delta = cue_delta(old_cue, cue, equals);
			// ignore (NOOP, NOOP)
			if (delta.interval == Delta.NOOP && delta.data == Delta.NOOP) {
				return;
			}
			// update cueMap
			if (old_cue == undefined) {
				// add cue object to cueMap
				copy_cue = {
					key: cue.key,
					interval: cue.interval,
					data: cue.data
				}
				this._cueMap.set(cue.key, copy_cue);
				return {key: cue.key, new:cue, old:undefined, delta: delta};
			} else if (cue.interval == undefined && cue.data == undefined) {
				// remove cue object from cueMap
				this._cueMap.delete(cue.key);
				return {key: cue.key, new:undefined, old:old_cue, delta: delta};
			} else {
				// modify existing cue (old_cue) in place
				// copy old cue before modification
				copy_cue = {
					key: old_cue.key,
					interval: old_cue.interval,
					data: old_cue.data
				}
				// update cue in place
				old_cue.interval = cue.interval;
				old_cue.data = cue.data;
				return {key: cue.key, new:old_cue, old:copy_cue, delta: delta};
			}
		}

		/*
			UPDATE
			- insert, replace or delete cues
		*/
		update(cues, options) {
			let batchMap;
			// options
			options = options || {};
			let equals = options.equals;
			let collapse = options.collapse;
			// check is false by default
			if (options.check == undefined) {
				options.check = false;
			}
			let check = options.check;
			if (!Array.isArray(cues)) {
				cues = [cues];
			}
			// make batchMap
			if (collapse) {
				batchMap = this._update_cues_collapse(cues, equals, check);
			} else {
				batchMap = this._update_cues(cues, equals, check);
			}
			// update cueMap
			if (batchMap.size > 0) {
				// dispatch cue operations to appropriate cueBucket
				for (let item of batchMap.values()) {
					if (item.delta.interval == Delta.NOOP && item.delta.data == Delta.NOOP) {
						continue;
					}

					// update cueMap
					/*
					if (item.new) {
						this._cueMap.set(item.new.key, item.new);
					} else {
						this._cueMap.delete(item.old.key);
					}
					*/
					// update cue buckets
					if (item.old && item.old.interval) {
						let cueBucketId = getCueBucketId(item.old.interval.length);
						this._cueBuckets.get(cueBucketId).processCue("remove", item.old);
					}
					if (item.new && item.new.interval) {
						let cueBucketId = getCueBucketId(item.new.interval.length);
						let cueBucket = this._cueBuckets.get(cueBucketId);
						cueBucket.processCue("add", item.new);
					}
				}
				// flush all buckets so updates take effect
				for (let cueBucket of this._cueBuckets.values()) {
					cueBucket.flush();
				}
			}
	        // event notification
			this.eventifyTriggerEvent("change", batchMap);
			return batchMap;
		};




		/*
			INTERNAL FUNCTION
			execute method across all cue buckets
			and aggregate results
		*/
		_execute(method, interval, semantic) {
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
		getCuePointsByInterval(interval) {
			return this._execute(Method.LOOKUP_CUEPOINTS, interval);
		};

		/*
			GET CUES BY INTERVAL

			semantic - "inside" | "partial" | "overlap"

		*/
		getCuesByInterval(interval, semantic=Semantic.OVERLAP) {
			return this._execute(Method.LOOKUP_CUES, interval, semantic);
		};


		/*
			REMOVE CUES BY INTERVAL
		*/
		removeCuesByInterval(interval, semantic=Semantic.INSIDE) {
			const cues = this._execute(Method.REMOVE_CUES, interval, semantic);
			// remove from cueMap and make events
			const eventMap = new Map();
			for (let i=0; i<cues.length; i++) {
				let cue = cues[i];
				this._cueMap.delete(cue.key);
				eventMap.set(cue.key, {'old': cue});
			}
			this.eventifyTriggerEvent("change", eventMap);
			return eventMap;
		};

		/*
			CLEAR ALL CUES
		*/
		clear() {
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

		has(key) {
			return this._cueMap.has(key);
		};

		get(key) {
			return this._cueMap.get(key);
		};

		keys() {
			return [...this._cueMap.keys()];
		};

		cues() {
			return [...this._cueMap.values()];
		};


		/*
			utility
		*/
		_integrity() {
			const res = this._execute(Method.INTEGRITY);

			// sum up cues and points
			let cues = [];
			let points = [];
			for (let bucketInfo of res.values()) {
				cues.push(bucketInfo.cues);
				points.push(bucketInfo.points);
			}
			cues = [].concat(...cues);
			points = [].concat(...points);
			// remove point duplicates if any
			points = [...new Set(points)];

			if (cues.length != this._cueMap.size) {
				throw new Error("inconsistent cue count cueMap and aggregate cueBuckets " + cues-this._cueMap.size);
			}

			// check that cues are the same
			for (let cue of cues.values()) {
				if (!this._cueMap.has(cue.key)) {
					throw new Error("inconsistent cues cueMap and aggregate cueBuckets");
				}
			}

			return {
				cues: cues.length,
				points: points.length
			};
		};

	}


	eventify.eventifyPrototype(Axis.prototype);




	/*
		CueBucket is a bucket of cues limited to specific length
	*/


	class CueBucket {


		constructor(maxLength) {

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

			Needs to translate cue operations into a minimum set of
			operations on the pointIndex.

			To do this, we need to record points that are created and
			points that are modified.

			The total difference that the batch of cue operations
			amounts to is expressed as one list of values to be
			deleted, and and one list of values to be inserted.
			The update operation of the pointIndex will process both
			in one atomic operation.

			On flush both the pointMap and the pointIndex will be brought
			up to speed

			created and dirty are used for bookeeping during
			processing of a cue batch. They are needed to
			create the correct diff operation to be applied on pointIndex.

			created : includes values that were not in pointMap
			before current batch was processed

			dirty : includes values that were in pointMap
			before current batch was processed, and that
			have been become empty at least at one point during cue
			processing.

			created and dirty are used as temporary alternatives to pointMap.
			after the cue processing, pointmap will updated based on the
			contents of these two.

			operation add or remove for given cue

			this method may be invoked at most two times for the same key.
			- first "remove" on the old cue
			- second "add" on the new cue

			"add" means cue to be added to point
			"remove" means cue to be removed from point

			process buffers operations for pointMap and index so that
			all operations may be applied in one batch. This happens in flush
		*/

		processCue(op, cue) {

			/*
				TODO -
				- process batchMap item instead of op,cue
				- be sensitive to REPLACE DATA
				  - pointMap - update existing cue
				  - avoid updateing pointIndex
			*/

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
		flush() {
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
		_lookupCuesFromInterval(interval, options={}) {
			const cuepoint = (options.cuepoint != undefined) ? options.cuepoint : false;
			/*
				search for points in pointIndex using interval
				if search interval is <a,b> endpoints a and b will not be included
				this means that at cue [a,b] will not be picked up - as its enpoints are outside the search interval
				however, this also means that a cue <a,b> will not be picked up - which is not correct - as these endpoints are inside the search interval
				solution is to broaden the search and filter away
			*/
			const broadInterval = new Interval(interval.low, interval.high, true, true);
			const points = this._pointIndex.lookup(broadInterval);
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
					filter out cues that have both endpoints outside the original search interval
					in other words: keep only cue.intervals which have at
					least one endpoint inside the search interval
					*/
					if (cue.interval.hasEndpointInside(interval)) {
						let item = (cuepoint) ? {point:point, cue:cue} : cue;
						res.push(item);
					}
				}
			}
			return res;
		};

		/*
			Find cues that are overlapping search interval, with one endpoint
			at each side.

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
		_lookupOutsideCuesFromInterval(interval){
			if (interval.length > this._maxLength) {
				return [];
			}

			const highIncludeOfLeftInterval = !interval.lowInclude;
			const leftInterval = new Interval(interval.high - this._maxLength, interval.low, true, highIncludeOfLeftInterval);

			const lowIncludeOfRightInterval = !interval.highInclude;
			const rightInterval = new Interval(interval.high, interval.low + this._maxLength, lowIncludeOfRightInterval, true);

			//	iterate leftInterval to find cues that have endpoints covered by rightInterval
			return this._lookupCuesFromInterval(leftInterval)
				.filter(function (cue) {
					// fast test
					if (interval.high < cue.interval.low) {
						return true;
					}
					// more expensive test that will pick up cornercase
					// where [a,b] will actually be an outside covering interval for <a,b>
					return rightInterval.coversPoint(cue.interval.high);
				});
		};


		/*
			execute dispatches request to given method.

			CUEPOINTS - look up all (point, cue) tuples in search interval

			INSIDE - look up all cues with both endpoints INSIDE the search interval
			PARTIAL - look up all INSIDE cues, plus cues with one endpoint inside the search interval
			ALL - look up all PARTIAL cues, plus cues with one cue at each side of search interval

		*/
		execute(method, interval, semantic) {
			if (this._pointIndex.length == 0) {
				return [];
			}
			if (method == Method.LOOKUP_CUEPOINTS) {
				return this.lookupCuePoints(interval);
			} else if (method == Method.LOOKUP_CUES) {
				return this.lookupCues(interval, semantic);
			} else if (method == Method.REMOVE_CUES) {
				return this.removeCues(interval, semantic);
			} else if (method == Method.INTEGRITY) {
				return this._integrity();
			} else {
				throw new Error("method or semantic not supported " + method + " " + semantic);
			}
		};


		/*
			LOOKUP CUEPOINTS - look up all (point, cue) tuples in search interval
		*/
		lookupCuePoints(interval) {
			return this._lookupCuesFromInterval(interval, {cuepoint:true});
		};


		/*
			LOOKUP CUES
		*/
		lookupCues(interval, semantic=Semantic.OVERLAP) {
			const partial_cues = this._lookupCuesFromInterval(interval, {cuepoint:false});
			if (semantic == Semantic.PARTIAL) {
				return partial_cues;
			} else if (semantic == Semantic.INSIDE) {
				return partial_cues.filter(function (cue) {
					return interval.coversInterval(cue.interval);
				});
			} else if (semantic == Semantic.OVERLAP) {
				const outside_cues = this._lookupOutsideCuesFromInterval(interval);
				return mergeArrays(partial_cues, outside_cues);
			} else {
				throw new Error("illegal semantic " + semantic);
			}
		}


		/*
			REMOVE CUES
		*/
		removeCues(interval, semantic) {
			/*
				update pointMap
				- remove all cues from pointMap
				- remove empty entries in pointMap
				- record points that became empty, as these need to be deleted in pointIndex
				- separate into two bucketes, inside and outside
			*/
			const cues = this.execute(Method.LOOKUP_CUES, interval, semantic);
			const to_remove = [];
			let cue, point, points;
			for (let i=0; i<cues.length; i++) {
				cue = cues[i];
				// points of cue
				if (cue.interval.singular) {
					points = [cue.interval.low];
				} else {
					points = [cue.interval.low, cue.interval.high];
				}
				for (let j=0; j<points.length; j++) {
					point = points[j];
					// remove cue from pointMap
					// delete pointMap entry only if empty
					let empty = removeCueFromArray(this._pointMap.get(point), cue);
					if (empty) {
						this._pointMap.delete(point);
						to_remove.push(point);
					}
				}
			}

			/*
				update pointIndex

				- remove all points within pointIndex
				- exploit locality, the operation is limited to a segment of the index, so
				  the basic idea is to take out a copy of segment (slice), do modifications, and then reinsert (splice)
				- the segment to modify is limited by [interval.low - maxLength, interval.high + maxLenght] as this will cover
				  both cues inside, partial and overlapping.

				# Possible - optimization
				alternative approach using regular update could be more efficient for very samll batches
				this._pointIndex.update(to_remove, []);
				it could also be comparable for huge loads (250.000 cues)
			*/

			to_remove.sort(function(a,b){return a-b});
			this._pointIndex.removeInSlice(to_remove);

			/*
				alternative solution
				this._pointIndex.update(to_remove, []);
			*/

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
		clear() {
			this._pointMap = new Map();
			this._pointIndex = new BinarySearch();
		};


		/*
			Integrity test for cue bucket datastructures
			pointMap and pointIndex
		*/
		_integrity() {

			if (this._pointMap.size !== this._pointIndex.length) {
				throw new Error("unequal number of points " + (this._pointMap.size - this._pointIndex.length));
			}

			// check that the same cues are present in both pointMap and pointIndex
			const missing = new Set();
			for (let point of this._pointIndex.values()) {
				if (!this._pointMap.has(point)){
					missing.add(point);
				}
			}
			if (missing.size > 0) {
				throw new Error("differences in points " + [...missing]);
			}

			// collect all cues
			let cues = [];
			for (let _cues of this._pointMap.values()) {
				for (let cue of _cues.values()) {
					cues.push(cue);
				}
			}
			// remove duplicates
			cues = [...new Map(cues.map(function(cue){
				return [cue.key, cue];
			})).values()];

			// check all cues
			for (let cue of cues.values()) {
				if (cue.interval.length > this._maxLength) {
					throw new Error("cue interval violates maxLength ",  cue);
				}
				let points;
				if (cue.singular) {
					points = [cue.interval.low];
				} else {
					points = [cue.interval.low, cue.interval.high];
				}
				for (let point of points.values()) {
					if (!this._pointIndex.has(point)) {
						throw new Error("point from pointMap cue not found in pointIndex ", point);
					}
				}
			}

			return [{
				maxLength: this._maxLength,
				points: [...this._pointMap.keys()],
				cues: cues
			}];
		};

	}


	// Static variables
	Axis.Delta = Delta;
	Axis.cue_equals = cue_equals;
	Axis.equals = object_equals;
	// module definition
	return Axis;
});
