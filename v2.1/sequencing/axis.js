define (function (require) {

    'use strict';

    const BinarySearch = require("../util/binarysearch");
    const Interval = require("../util/interval");
    const eventify = require('../util/eventify');
    const util = require("../util/util");
    const Relation = Interval.Relation;



    /*
        UTILITY
    */


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
        - returns array empty
    */
    var removeCueFromArray = function (arr, cue) {
        // cue equality defined by key property
        if (arr.length == 1) {
            if (arr[0].key == cue.key) {
                arr.shift();
            }
            return arr.length == 0;
        }
        else if (arr.length == 0) {
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
        Setup ID's for cue buckets.
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
        Delta

        Used to represent statechanges in batchMap,
        for intervals and data.
    */
    const Delta = Object.freeze({
        NOOP: 0,
        INSERT: 1,
        REPLACE: 2,
        DELETE: 3
    });

    // mode mask
    const LookupMask = Object.freeze({
        OVERLAP_LEFT: 16, //bx10000
        COVERED: 8,       //bx01000
        EQUALS: 4,        //bx00100
        COVERS: 2,        //bx00010
        OVERLAP_RIGHT: 1  //bx00001
    });

    // mapping cue relations to lookupmasks
    const LookupMaskMap = new Map([
        [Relation.OVERLAP_LEFT, LookupMask.OVERLAP_LEFT],
        [Relation.COVERED, LookupMask.COVERED],
        [Relation.EQUALS, LookupMask.EQUALS],
        [Relation.COVERS, LookupMask.COVERS],
        [Relation.OVERLAP_RIGHT, LookupMask.OVERLAP_RIGHT]
    ]);


    /*
        make a shallow copy of a cue
    */
    function cue_copy(cue) {
        if (cue == undefined) {
            return;
        }
        return {
            key: cue.key,
            interval: cue.interval,
            data: cue.data
        };
    }

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
            eq = (cue_a.interval.low == cue_b.interval.low) && (cue_a.interval.high == cue_b.interval.high);
            //eq = cue_a.interval.equals(cue_b.interval);
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
                eq = util.object_equals(cue_a.data, cue_b.data);
            }
            data_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
        }
        return {interval: interval_delta, data: data_delta};
    }




    /*
        this implements Axis, a datastructure for efficient lookup of
        cues on a timeline

        - cues may be tied to one or two points on the timeline, this
          is expressed by an Interval.
        - cues are indexed both by key and by intervals
        - the timeline index is divided into a set of CueBuckets,
          based on cue interval length, for efficient lookup
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


        /***************************************************************
            UPDATE

            - insert, replace or delete cues

            update(cues, equals, check)

            <cues> ordered list of cues to be updated
            <equals> - equality function for data objects
            <check> - check cue integrity if true

            cue = {
                key:key,
                interval: Interval,
                data: data
            }

            required
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


            Update returns a batchMap - describes the effects of an update.
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

            Duplicates
            - if there are multiple cue operations for the same key,
              within the same batch of cues,
              these will be processed in order.

            - The old cue will always be the state of the cue,
              before the batch started.

            - The returned delta values will be calcultated relative to
              the cue before the batch started (old).

              This way, external mirroring observers may will be able to
              replicate the effects of the update operation.

        ***************************************************************/

        update(cues, options) {
            const batchMap = new Map();
            let current_cue;
            let has_interval, has_data;
            let init = this._cueMap.size == 0;
            // options
            options = options || {};
            // check is false by default
            if (options.check == undefined) {
                options.check = false;
            }
            // chaining is true by default
            if (options.chaining == undefined) {
                options.chaining = true;
            }

            if (!util.isIterable(cues)) {
                cues = [cues];
            }

            /***********************************************************
                process all cues
            ***********************************************************/
            for (let cue of cues) {

                /*******************************************************
                    check validity of cue argument
                *******************************************************/

                if (options.check) {
                    if (!(cue) || !cue.hasOwnProperty("key") || cue.key == undefined) {
                        throw new Error("illegal cue", cue);
                    }
                }
                has_interval = cue.hasOwnProperty("interval");
                has_data = cue.hasOwnProperty("data");
                if (options.check && has_interval) {
                    if (!cue.interval instanceof Interval) {
                        throw new Error("interval must be Interval");
                    }
                }

                /*******************************************************
                    adjust cue so that it correctly represents
                    the new cue to replace the current cue
                    - includeds preservation of values from current cue
                *******************************************************/

                current_cue = (init) ? undefined : this._cueMap.get(cue.key);
                if (current_cue == undefined) {
                    // make sure properties are defined
                    if (!has_interval) {
                        cue.interval = undefined;
                    }
                    if (!has_data) {
                        cue.data = undefined;
                    }
                } else if (current_cue != undefined) {
                    if (!has_interval && !has_data) {
                        // make sure properties are defined
                        cue.interval = undefined;
                        cue.data = undefined;
                    } else if (!has_data) {
                        // REPLACE_INTERVAL, preserve data
                        cue.data = current_cue.data;
                    } else if (!has_interval) {
                        // REPLACE_DATA, preserve interval
                        cue.interval = current_cue.interval;
                    } else {
                        // REPLACE CUE
                    }
                }

                /*******************************************************
                    update cue
                    - update cueMap
                    - update cueBuckets
                    - create batchMap
                *******************************************************/

                this._update_cue(batchMap, current_cue, cue, options);
            }
            if (batchMap.size > 0) {
                // flush all buckets so updates take effect
                this._call_buckets("flush");
                // event notification
                this.eventifyTriggerEvent("change", batchMap);
            }
            return batchMap;
        };



        /***************************************************************
            UPDATE CUE

            update operation for a single cue

            - update cueMap
            - generate entry for batchMap
            - update CueBucket
        ***************************************************************/

        _update_cue(batchMap, current_cue, cue, options) {
            let old_cue, new_cue;
            let item, _item;
            let oldCueBucket, newCueBucket;
            let low_changed, high_changed;
            let remove_needed, add_needed;
            let equals = options.equals;
            let chaining = options.chaining;

            // check for equality
            let delta = cue_delta(current_cue, cue, equals);

            // (NOOP, NOOP)
            if (delta.interval == Delta.NOOP && delta.data == Delta.NOOP) {
                batchMap.set(cue.key, {new:current_cue, old:current_cue});
                return;
            }

            /***********************************************************
                update cueMap and batchMap
            ***********************************************************/

            if (current_cue == undefined) {
                // INSERT - add cue object to cueMap
                old_cue = undefined;
                new_cue = cue;
                this._cueMap.set(cue.key, new_cue);
            } else if (cue.interval == undefined && cue.data == undefined) {
                // DELETE - remove cue object from cueMap
                old_cue = current_cue;
                new_cue = undefined;
                this._cueMap.delete(cue.key);
            } else {
                // REPLACE
                // in-place modification of current cue
                // copy old cue before modification
                old_cue = cue_copy(current_cue);
                new_cue = current_cue;
                // update current cue in place
                new_cue.interval = cue.interval;
                new_cue.data = cue.data;
            }
            item = {new:new_cue, old:old_cue};

            /*
                if this item has been set earlier in batchMap
                restore the correct old_cue by getting it from
                the previous batchMap item
                also recalculate delta relative to old_cue
            */
            if (chaining) {
                _item = batchMap.get(cue.key);
                if (_item != undefined) {
                    item.old = _item.old;
                }
            }

            batchMap.set(cue.key, item)

            /***********************************************************
                update cueBuckets

                - use delta.interval to avoid unnessesary changes

                - interval may change in several ways:
                    - low changed
                    - high changed
                    - low and high changed
                - intervals may also go from
                    - singular -> singular
                    - singular -> regular
                    - regular -> singular
                    - regular -> regular
                - changes to interval.lowInclude and interval highInclude
                  do not require any changes to CueBuckets, as long
                  as interval.low and interval.high values stay unchanged.
            ***********************************************************/

            if (delta.interval == Delta.NOOP) {
                // data changes are reflected in cueMap changes,
                // since data changes are made in-place, these
                // changes will be visible in cues registered in
                // CueBuckets
                return;
            } else if (delta.interval == Delta.INSERT) {
                remove_needed = false;
                add_needed = true;
                low_changed = true;
                high_changed = true;
            } else if (delta.interval == Delta.DELETE) {
                remove_needed = true;
                add_needed = false;
                low_changed = true;
                high_changed = true;
            } else if (delta.interval == Delta.REPLACE) {
                remove_needed = true;
                add_needed = true;
                low_changed = item.new.interval.low != item.old.interval.low;
                high_changed = item.new.interval.high != item.old.interval.high;
            }

            /*
                old cue and new cue might not belong to the same cue bucket
            */
            if (remove_needed){
                let old_bid = getCueBucketId(item.old.interval.length);
                oldCueBucket = this._cueBuckets.get(old_bid);
            }
            if (add_needed) {
                let new_bid = getCueBucketId(item.new.interval.length);
                newCueBucket = this._cueBuckets.get(new_bid);
            }

            /*
                if old CueBucket is different from the new cue Buckets
                both low and high must be moved, even it one was not
                changed
            */
            if (oldCueBucket && newCueBucket) {
                if (oldCueBucket != newCueBucket) {
                    remove_needed = true;
                    add_needed = true;
                    low_changed = true;
                    high_changed = true;
                }
            }

            /*
                dispatch add and remove operations for interval points

                cues in CueBucket may be removed using a copy of the cue,
                because remove is by key.

                cues added to CueBucket must be the correct object
                (current_cue), so that later in-place modifications become
                reflected in CueBucket.
                batchMap item.new is the current cue object.
            */

            // update low point - if changed
            if (low_changed) {
                if (remove_needed) {
                    // console.log("remove old low", item.old.interval.low);
                    oldCueBucket.del_endpoint(item.old.interval.low, item.old);
                }
                if (add_needed) {
                    // console.log("add new low", item.new.interval.low);
                    newCueBucket.add_endpoint(item.new.interval.low, item.new);
                }
            }
            // update high point - if changed
            if (high_changed) {
                if (remove_needed && !item.old.interval.singular) {
                    // console.log("remove old high", item.old.interval.high);
                    oldCueBucket.del_endpoint(item.old.interval.high, item.old);
                }
                if (add_needed && !item.new.interval.singular) {
                    // console.log("add new high", item.new.interval.high);
                    newCueBucket.add_endpoint(item.new.interval.high, item.new);
                }
            }
        }


        /*
            INTERNAL FUNCTION
            execute method across all cue buckets
            and aggregate results
        */
        _call_buckets(method, ...args) {
            const arrays = [];
            for (let cueBucket of this._cueBuckets.values()) {
                let cues = cueBucket[method](...args);
                if (cues != undefined && cues.length > 0) {
                    arrays.push(cues);
                }
            }
            return util.array_concat(...arrays);
        };

        /*
            LOOKUP ENDPOINTS

            returns (endpoint, cue) for all endpoints covered by given interval

            returns:
                - [{endpoint: endpoint, cue:cue}]
        */

        lookup_endpoints(interval) {
            return this._call_buckets("lookup_endpoints", interval);
        };


        /*
            LOOKUP
        */

        lookup(interval, mode) {
            return this._call_buckets("lookup", interval, mode);
        };


        /*
            REMOVE CUES BY INTERVAL
        */
        lookup_delete(interval, mode) {
            const cues = this._call_buckets("lookup_delete", interval, mode);
            // remove from cueMap and make events
            const batchMap = new Map();
            let cue;
            for (let i=0; i<cues.length; i++) {
                cue = cues[i];
                this._cueMap.delete(cue.key);
                // check for equality
                batchMap.set(cue.key, {new: undefined, old: cue});
            }
            if (batchMap.size > 0) {
                this.eventifyTriggerEvent("change", batchMap);
            }
            return batchMap;
        };

        /*
            CLEAR ALL CUES
        */
        clear() {
            // clear cue Buckets
            this._call_buckets("clear");
            // clear cueMap
            let cueMap = this._cueMap;
            this._cueMap = new Map();
            // create change events for all cues
            const batchMap = new Map();
            for (let cue of cueMap.values()) {
                batchMap.set(cue.key, {new: undefined, old: cue});
            }
            if (batchMap.size > 0) {
                this.eventifyTriggerEvent("change", batchMap);
            }
            return batchMap;
        };


        /*
            Map accessors
        */

        has(key) {
            return this._cueMap.has(key);
        };

        get(key) {
            return this._cueMap.get(key);
        };

        keys() {
            return this._cueMap.keys();
        };

        values() {
            return this._cueMap.values();
        };

        entries() {
            return this._cueMap.entries();
        }


        /*
            utility
        */
        integrity() {
            const res = this._call_buckets("integrity");

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

            ENDPOINT BATCH PROCESSING

            Needs to translate endpoint operations into a minimum set of
            operations on the pointIndex.

            To do this, we need to record points that are created and
            points that are removed.

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

            process buffers operations for pointMap and index so that
            all operations may be applied in one batch. This happens in flush
        */

        add_endpoint(point, cue) {
            let init = (this._pointMap.size == 0);
            let cues = (init) ? undefined : this._pointMap.get(point);
            if (cues == undefined) {
                this._pointMap.set(point, [cue]);
                this._created.add(point);
            } else {
                cues.push(cue);
                //addCueToArray(cues, cue);
            }
        }

        del_endpoint(point, cue) {
            let init = (this._pointMap.size == 0);
            let cues = (init) ? undefined : this._pointMap.get(point);
            if (cues != undefined) {
                let empty = removeCueFromArray(cues, cue);
                if (empty) {
                    this._dirty.add(point);
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

            it is possible that a cue ends up in both created and dirty

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
                if (cues == undefined) {
                    // point already deleted from created set - ignore
                    continue;
                }
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
            LOOKUP_ENDPOINTS

            returns all (endpoint, cue) pairs where
                - endpoint is a cue endpoint (cue.endpointLow or cue.endpointHigh)
                - endpoint is INSIDE search interval
                - [{endpoint:endpoint, cue: cue}]

            - a given endpoint may appear multiple times in the result,
              as multiple cues may be tied to the same endpoint
            - a given cue may appear two times in the result, if
              both cue.endpointLow and cue.endpointHigh are both INSIDE interval
            - a singular cue will appear only once
            - ordering: no specific order is guaranteed
              - results are concatenated from multiple CueBuckets
              - internally in a single CueBucket
                - no defined order for cues tied to the same endpoint
              - the natural order is endpoint order
                - but this can be added on the outside if needed
                - no order is defined if two cues have exactly the
                  same endpoint

        */

        lookup_endpoints(interval) {
            const broader_interval = new Interval(interval.low, interval.high, true, true);
            const points = this._pointIndex.lookup(broader_interval);
            const result = [];
            const len = points.length;
            let point, endpoint;
            for (let i=0; i<len; i++) {
                point = points[i];
                this._pointMap.get(point)
                    .forEach(function (cue) {
                        /*
                            figure out if point is endpoint low or high
                            include cue if the endpoint is inside search interval
                        */
                        if (point == cue.interval.low) {
                            endpoint = cue.interval.endpointLow;
                        } else if (point == cue.interval.high) {
                            endpoint = cue.interval.endpointHigh;
                        } else {
                            console.log(point)
                            console.log(cue)
                            throw new Error("fatal: point cue mismatch");
                        }
                        if (interval.inside(endpoint)) {
                            result.push({endpoint:endpoint, cue:cue});
                        }
                    });
            }
            return result;
        }


        /*
            _LOOKUP CUES

            Internal function, used by LOOKUP.

            Return list of cues
            - all cues with at least one endpoint value v,
              where interval.low <= v <= interval.high
            - no duplicates

            Note - some cues may be outside the search interval
            e.g. if the search interval is [.., 4) then
            (4, ...] will be returned, even if this strictly
            is OUTSIDE_RIGHT the search interval.
            This is necessary in lookup for correct calculation of covers
            from left_interval.
        */

        _lookup_cues(interval) {
            const broader_interval = new Interval(interval.low, interval.high, true, true);
            const points = this._pointIndex.lookup(broader_interval);
            const len = points.length;
            const cueSet = new Set();
            const result = [];
            let low_inside, high_inside;
            for (let i=0; i<len; i++) {
                this._pointMap.get(points[i])
                    .forEach(function(cue) {
                        // avoid duplicates
                        if (cueSet.has(cue.key)) {
                            return;
                        } else {
                            cueSet.add(cue.key);
                        }
                        result.push(cue);
                    });
            }
            return result;
        }



        /*
            LOOKUP

            Strategy split task into two subtasks,

            1) find cues [OVERLAP_LEFT, COVERED, EQUALS, OVERLAP_RIGHT]
            2) find cues [COVERS]

            // mode order
            Relation.OVERLAP_LEFT,
            Relation.COVERED,
            Relation.EQUALS,
            Relation.COVERS,
            Relation.OVERLAP_RIGHT
        */
        lookup(interval, mode=31) {

            let cues = [];

            // special case only [EQUALS]
            if (mode == LookupMask.EQUALS_MASK) {
                return this._pointMap.get(interval.low).filter(function(cue) {
                    return cue.interval.equals(interval)
                });
            }

            // common case: [OVERLAP_LEFT, COVERED, EQUALS, OVERLAP_RIGHT]
            // exclude [COVERS]
            if (mode - LookupMask.COVERS > 0) {
                // keep cues which match lookup mode,
                // except COVERS, which is excluded here
                cues = this._lookup_cues(interval)
                    .filter(function(cue){
                        let relation = cue.interval.compare(interval);
                        // exclude COVERS
                        if (relation == Relation.COVERS) {
                            return false;
                        }
                        return mode & LookupMaskMap.get(relation)
                    });
            }

            /*
                intervals in this CueBucket are limited by maxLength
                if interval.length is larger than maxLength, no cue
                in this CueBucket can cover interval
            */
            if (interval.length > this._maxLength) {
                return cues;
            }
            if (!(mode & LookupMask.COVERS)) {
                return cues;
            }

            /*
                special handling [COVERS]

                search left of search interval for cues
                that covers the search interval
                search left is limited by CueBucket maxlength
                left_interval: [interval.high-maxLength, interval.low]

                it would be possible to search right too, but we
                have to choose one.
            */
            let low = interval.high - this._maxLength;
            let high = interval.low;
            let left_interval = new Interval(low, high, true, true);
            this._lookup_cues(left_interval)
                .forEach(function(cue){
                    if (cue.interval.compare(interval) == Relation.COVERS) {
                        cues.push(cue);
                    }
                });
            return cues;
        }


        /*
            REMOVE CUES
        */
        lookup_delete(interval, mode) {
            /*
                update pointMap
                - remove all cues from pointMap
                - remove empty entries in pointMap
                - record points that became empty, as these need to be deleted in pointIndex
                - separate into two bucketes, inside and outside
            */
            const cues = this.lookup(interval, mode);
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
            this._pointMap.clear();
            this._pointIndex = new BinarySearch();
            this._created.clear();
            this._dirty.clear();
        };


        /*
            Integrity test for cue bucket datastructures
            pointMap and pointIndex
        */
        integrity() {

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

    // testing
    Axis.Delta = Delta;
    Axis.cue_delta = cue_delta;


    // module definition
    return Axis;
});
