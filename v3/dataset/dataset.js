/*
    Copyright 2020
    Author : Ingar Arntzen

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

import * as utils from '../util/utils.js';
import eventify from '../util/eventify.js';
import endpoint from '../util/endpoint.js';
import Interval from '../util/interval.js';
import BinarySearch from '../util/binarysearch.js';
import CueCollection from './cuecollection.js';

const Relation = Interval.Relation;

/*
    UTILITY
*/

function epoch() {
    return Date.now();
}


function asInterval(input) {
    if (input instanceof Interval || input == undefined) {
        return input;
    }
    else if (Array.isArray(input) ) {
        // support intervals as arrays
        let [low, high, lowInclude, highInclude] = input;
        return new Interval(low, high, lowInclude, highInclude);
    } else {
        throw new Error ("input not an Interval", input);
    }
}


function cue_to_string(cue) {
    if (cue) {
        return `${cue.interval.toString()} ${cue.data}`;
    } else {
        return `${cue}`;
    }    
}

/*
    Add cue to array
    - does not add if cue already exists
    - returns array length
*/
function addCueToArray(arr, cue) {
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
function removeCueFromArray(arr, cue) {
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
    Replace cue in array
    - noop if cue does not exist in array
    - returns sucess
*/

function replaceCueInArray (arr, cue) {
    if (arr.length == 0) {
        return false;
    } else if (arr.length == 1) {
        if (arr[0].key == cue.key) {
            arr[0] = cue;
            return true;
        }
    } else {
        let idx = arr.findIndex(function (_cue) {
            return _cue.key == cue.key;
        });
        if (idx > -1) {
            arr[idx] = cue;
            return true;
        }
    }
    return false;
}


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
            eq = utils.object_equals(cue_a.data, cue_b.data);
        }
        data_delta = (eq) ? Delta.NOOP : Delta.REPLACE;
    }
    return {interval: interval_delta, data: data_delta};
}


function cue_equals(cue_a, cue_b) {
    let delta = cue_delta(cue_a, cue_b);
    return delta.interval == Delta.NOOP && delta.data == Delta.NOOP;
}

/*
    CueArgBuilder

    AddCue - adds or changes a cue.
    RemoveCue - removes a cue
    Clear - remove un-submitted cues

    Cues are submitted to dataset update by ".done" promise (after task processing), which also makes the result available

    manual submit if autosubmit is false

*/

class CueArgBuilder {

    constructor (dataset, options={}) {
        
        
        // dataset
        this._ds = dataset;
        // options
        let defaults = {autosubmit:true};
        this._options = Object.assign({}, defaults, options);
        // cue arg buffer
        this._cues;
        // batch done flag
        this._done;
        // done promise
        this.updateDone;
        // initialise
        this._reset();
    }

    _reset() {
        this._cues = [];
        // create new done promise
        this._done = new eventify.EventBoolean();
        this.updateDone = eventify.makePromise(this._done).then(() => {
            return this._submit.bind(this)();
        });
    }

    _push(cue_args) {
        // append cue args
        let m = this._cues.length;
        let was_empty = m == 0;
        let n = cue_args.length;
        this._cues.length += n;
        for (let i=0; i<n; i++) {
            this._cues[m++] = cue_args[i];
        }
        if (this._options.autosubmit && was_empty && n > 0) {
            // batch done immediately 
            // will be submitted by donePromise in next microtask
            this._done.value = true;
        }
    }

    _submit() {
        let result = [];
        // carry out update if necessary
        if (this._cues.length > 0) {
            result = this._ds.update(this._cues, this._options);    
        }
        // reset cue arg builder
        this._reset();
        // update result
        return result;
    }    
    
    /*
        add or change single cue
    
        if both interval and data are undefined
        this is not interpreted as remove,
        but as a cue with no interval and a data value set
        to undefined
    */
    addCue(key, interval, data) {
        let cue_arg = {key:key};
        cue_arg.interval = interval;        
        if (arguments.length > 2) {
            cue_arg.data = data;
        }
        this._push([cue_arg]);
        return this;
    }

    /* remove single cue */
    removeCue(key) {
        this._push([{key:key}]);
        return this;
    }

    /* load array of cue args into argbuilder */
    update(cue_args) {
        this._push(cue_args);
    }

    /* clear args currently in argbuilder */
    clear() {
        this._cues = [];
        return this;
    }

    /* manually submit cue args from cue arg builder */
    submit() {
        if (this._options.autosubmit) {
            throw new Error("manual submit while options.autosubmit is true");
        }
        // mark batch as done
        // will be submitted by donePromise in next microtask
        this._done.value = true;
    }
}


/*
    this implements Dataset, a data collection supporting
    efficient lookup of cues tied to intervals on the timeline

    - cues may be tied to one or two points on the timeline, this
      is expressed by an Interval.
    - cues are indexed both by key and by intervals
    - the interval index is divided into a set of CueBuckets,
      based on cue interval length, for efficient lookup
*/

class Dataset extends CueCollection {

    constructor(options) {
        super(options);

        this._map = new Map();
        this._builder = new CueArgBuilder(this);

        /*
            Initialise set of CueBuckets
            Each CueBucket is responsible for cues of a certain length
        */
        this._cueBuckets = new Map();  // CueBucketId -> CueBucket
        for (let i=0; i<CueBucketIds.length; i++) {
            let cueBucketId = CueBucketIds[i];
            this._cueBuckets.set(cueBucketId, new CueBucket(cueBucketId));
        }

        // Inline update callbacks
        this._update_callbacks = [];
    };

    /**
     * CueCollection (ObservableMap) needs access to map 
     */
    get datasource () {
        return this._map;
    }

    /***************************************************************
        UPDATE CALLBACKS
    */

    add_callback (handler) {
        let handle = {
            handler: handler
        }
        this._update_callbacks.push(handle);
        return handle;
    };


    del_callback (handle) {
        let index = this._update_callbacks.indexof(handle);
        if (index > -1) {
            this._update_callbacks.splice(index, 1);
        }
    };


    _notify_callbacks (batchMap, relevanceInterval) {
        this._update_callbacks.forEach(function(handle) {
            handle.handler(batchMap, relevanceInterval);
        });
    };

    /***************************************************************
     MAP METHODS
    */

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }


    /***************************************************************
     CUE ARG BUILDER
    */
 
    makeBuilder(options) {
        return new CueArgBuilder(this, options);
    }

    // not really useful (v2 complience)
    get builder () {return this._builder;};

    
    /***************************************************************
     ADD CUE, REMOVE CUE

        - COMPATIBILTY WITH V2
        - SAFE TO USE repeatedly (batched using promise)
    */

    addCue(key, interval, data) {
        if (arguments.length > 2) {
            this._builder.addCue(key, interval, data);
        } else {
            this._builder.addCue(key, interval);
        }
        return this;
    }

    removeCue(key) {
        this._builder.removeCue(key);
        return this;
    }

    get updateDone() {return this._builder.updateDone};

    /***************************************************************
     ADD CUE, REMOVE CUE - INTERACTIVE USE

        - CONVENIENCE for interactive use
        - COMPATIBILTY WITH V2
        - NOT RECOMMENDED TO USE repeatedly (batched using promise)
    */

    _addCue(key, interval, data, options) {
        return this.update({key:key, interval:interval, data:data}, options);
    }

    _removeCue(key, options) {
        return this.update({key:key}, options);
    }

    /***************************************************************
        UPDATE

        - insert, replace or delete cues

        update(cues, equals, check)

        <cues> ordered list of cues to be updated
        <equals> - equality function for data objects

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


        Update returns a list of event items - describes the effects of an update.
            {
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

    update(cues, options = {}) {
        const batchMap = new Map();
        let current_cue;
        let has_interval, has_data;

        // options
        let {debug=false, equals} = options;

        // support single cue arg for convenience
        if (!utils.isIterable(cues)) {
            cues = [cues];
        }

        /***********************************************************
            process all cues
        ***********************************************************/
        const epoch_ts = epoch();
        const info = {
            ts: epoch_ts,
            author: options.author
        };

        for (let cue of cues) {

            /*******************************************************
                check validity of cue argument
            *******************************************************/

            if (cue == undefined || !cue.hasOwnProperty("key") || cue.key == undefined) {

                if (cue == undefined) {
                    throw new Error("cue is undefined");
                } else if (!cue.hasOwnProperty("key")) {
                    throw new Error("cue missing key property", cue);
                } else if (cue.key == undefined) {
                    throw new Error("cue.key is undefined", cue);                    
                }
            }

            has_interval = cue.hasOwnProperty("interval");
            has_data = cue.hasOwnProperty("data");
            if (has_interval) {
                cue.interval = asInterval(cue.interval);
            }


            /*******************************************************
                adjust cue so that it correctly represents
                the new cue to replace the current cue
                - includes preservation of values from current cue
            *******************************************************/

            current_cue = this._map.get(cue.key);
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
                - update _map
                - update cueBuckets
                - create batchMap
            *******************************************************/
            this._update_cue(batchMap, current_cue, cue, info, options);
        }

        // flush all buckets so updates take effect
        this._call_buckets("flush");

        if (batchMap.size > 0) {

            /*
                create events without delta property
                and accumulate relevance interval for batch
            */
            let relevance = {low: Infinity, high: -Infinity};

            // create list of events and remove delta property
            let items = [...batchMap.values()].map(item => {
                if (item.new && item.new.interval) {
                    relevance.low = endpoint.min(relevance.low, item.new.interval.endpointLow);
                    relevance.high = endpoint.max(relevance.high, item.new.interval.endpointHigh);
                }
                if (item.old && item.old.interval) {
                    relevance.low = endpoint.min(relevance.low, item.old.interval.endpointLow);
                    relevance.high = endpoint.max(relevance.high, item.old.interval.endpointHigh);
                }
                return {key:item.key, new:item.new, old:item.old, info: item.info};
            });

            // extra filter items to remove NOOP transitions
            let event_items = items.filter((item) => {
                let delta = cue_delta(item.new, item.old, equals);
                return (delta.interval != Delta.NOOP || delta.data != Delta.NOOP);
            });

            // event notification
            this._notifyEvents(event_items);

            // create relevance Interval
            let relevanceInterval = undefined;
            if (relevance.low != Infinity) {
                relevanceInterval = Interval.fromEndpoints(relevance.low, relevance.high);
            }

            /*
                notify sequencer last so that change event
                from the dataset will be applied before change
                events from sequencers.
            */
            this._notify_callbacks(batchMap, relevanceInterval);
          
            // debug
            if (debug) {this.integrity();}
            return items;
        }
        // debug
        if (debug) {this.integrity();}
        return [];
    };



    /***************************************************************
        UPDATE CUE

        update operation for a single cue

        - update _map
        - generate entry for batchMap
        - update CueBucket
    ***************************************************************/

    _update_cue(batchMap, current_cue, cue, info, options) {

        let old_cue, new_cue;
        let item, _item;
        let oldCueBucket, newCueBucket;
        let low_changed, high_changed;
        let remove_needed, add_needed;

        // options
        let {chaining=true, safe=false, equals} = options;
        
        if (current_cue === cue) {
            throw Error("illegal cue arg: same object as current cue");
        }

        // check for equality
        let delta = cue_delta(current_cue, cue, equals);

        // (NOOP, NOOP)
        if (delta.interval == Delta.NOOP && delta.data == Delta.NOOP) {
            item = {
                key:cue.key, new:current_cue,
                old:current_cue, delta: delta
            }
            batchMap.set(cue.key, item);
            return;
        }


        /***********************************************************
            update _map and batchMap
        ***********************************************************/

        if (current_cue == undefined) {
            // INSERT - add cue object to _map

            // cue info: add if missing
            if (cue.info == undefined) {
                cue.info = {
                    ts: info.ts,
                    change_ts: info.ts,
                    change_id: 0
                }
            }

            old_cue = undefined;
            new_cue = (safe)? Object.freeze(cue) : cue;
            this._map.set(cue.key, new_cue);


        } else if (cue.interval == undefined && cue.data == undefined) {
            // DELETE - remove cue object from _map
            old_cue = current_cue;
            new_cue = undefined;
            this._map.delete(cue.key);

            // cue info: noop

        } else {
            // REPLACE

            // cue info - update if missing
            // preserve ts from current cue, update update_ts
            if (cue.info == undefined) {
                cue.info = {
                    ts: current_cue.info.ts,
                    change_ts: info.ts,
                    change_id: current_cue.info.change_id + 1
                };
            }

            /*
                Solution used to be in-place modification
                of current cue.
                Now we instead implement replace by inserting
                a new cue object as current cue.
                Since current cue is referenced both in
                _map and in pointMap - it must be replaced both
                places.

                Adjustments to pointMap as a result of interval
                changes are handled further down

                Another design option would be to let point map
                manage only keys of cues. This however would 
                impose an extra map lookup per item in lookup - 
                so better to pay this modest price in update
            */
            old_cue = current_cue;
            new_cue = {
                key: cue.key,
                interval: cue.interval,
                data: cue.data,
                info: cue.info
            }

            if (safe) {
                new_cue = Object.freeze(new_cue);
            }

            // replace in cue map
            this._map.set(cue.key, new_cue);

            // replace in point map
            // - only necessary if old cue is in pointMap
            //  i.e. if old_cue has interval
            if (old_cue.interval) {
                let bid = getCueBucketId(old_cue.interval.length);
                let cueBucket = this._cueBuckets.get(bid);
                // replace for low
                cueBucket.replace_endpoint(old_cue.interval.low, new_cue);
                // replace for high
                if (!old_cue.singular) {
                    cueBucket.replace_endpoint(old_cue.interval.high, new_cue);
                }
            }
        }
        item = {key:cue.key, new:new_cue, old:old_cue, delta:delta, info};

        /*
            if this item has been set earlier in batchMap
            restore the correct old_cue by getting it from
            the previous batchMap item

            recalculate delta relative to old_cue
            - continue processing with the original (delta, old_cue) defined
            above, as this is required to correctly change cueBuckets
            which have already been affected by previous item.
        */
        if (chaining) {
            _item = batchMap.get(cue.key);
            if (_item != undefined) {
                item.old = _item.old;
                item.delta = cue_delta(new_cue, item.old, equals);
            }
        }

        batchMap.set(cue.key, item)

        //console.log("OLD:", cue_to_string(old_cue));
        //console.log("NEW:", cue_to_string(new_cue));

        /***********************************************************
            update cueBuckets

            - use delta.interval to avoid unnessesary changes

            - interval may change in several ways:
                - low changed
                - high changed
                - low and high changed
            - changed intervals may stay in bucket or change bucket:
            - changing to/from singular may require special consideration
              with respect to how many endpoints are being updated
                - singular -> singular
                - singular -> regular
                - regular -> singular
                - regular -> regular
            - changes to interval.lowInclude and interval highInclude
              do not require any changes to CueBuckets, as long
              as interval.low and interval.high values stay unchanged.
        ***********************************************************/

        if (delta.interval == Delta.NOOP) {
            // no changes to interval - no change needed in pointMap 
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
            low_changed = new_cue.interval.low != old_cue.interval.low;
            high_changed = new_cue.interval.high != old_cue.interval.high;
        }

        /*
            old cue and new cue might not belong to the same cue bucket
        */
        if (remove_needed){
            let old_bid = getCueBucketId(old_cue.interval.length);
            oldCueBucket = this._cueBuckets.get(old_bid);
        }
        if (add_needed) {
            let new_bid = getCueBucketId(new_cue.interval.length);
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
        */

        // update low point - if changed
        if (low_changed) {
            if (remove_needed) {
                oldCueBucket.del_endpoint(old_cue.interval.low, old_cue);
            }
            if (add_needed) {
                newCueBucket.add_endpoint(new_cue.interval.low, new_cue);
            }
        }
        // update high point - if changed
        if (high_changed) {
            if (remove_needed && !old_cue.interval.singular) {
                oldCueBucket.del_endpoint(old_cue.interval.high, old_cue);
            }
            if (add_needed && !new_cue.interval.singular) {
                newCueBucket.add_endpoint(new_cue.interval.high, new_cue);
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
        return utils.array_concat(arrays);
    };


    /*
        LOOKUP ENDPOINTS

        returns (endpoint, cue) for all endpoints covered by given interval

        returns:
            - [{endpoint: endpoint, cue:cue}]
    */

    lookup_endpoints(interval) {
        interval = asInterval(interval);
        return this._call_buckets("lookup_endpoints", interval);
    };


    /*
        LOOKUP
    */

    lookup(interval, mask) {
        interval = asInterval(interval);
        return this._call_buckets("lookup", interval, mask);
    };


    /*
        REMOVE CUES BY INTERVAL
    */
    lookup_delete(interval, mask, options={}) {
        interval = asInterval(interval);
        const cues = this._call_buckets("lookup_delete", interval, mask);
        // remove from _map and make event items
        const items = [];
        const info = {
            ts: epoch(),
            author: options.author
        };
        let cue;
        for (let i=0; i<cues.length; i++) {
            cue = cues[i];
            this._map.delete(cue.key);
            // check for equality
            items.push({key:cue.key, new: undefined, old: cue, info});
        }
        // event notification
        this._notifyEvents(items);
        return items;
    };

    /*
        CLEAR ALL CUES
    */
    clear(options={}) {
        // clear cue Buckets
        this._call_buckets("clear");
        // clear _map
        let _map = this._map;
        this._map = new Map();
        // create change events for all cues
        const items = [];
        const info = {
            ts: epoch(),
            author: options.author
        };
        for (let cue of _map.values()) {
            items.push({key: cue.key, new: undefined, old: cue, info});
        }
        // event notification
        this._notifyEvents(items);
        return items;
    };


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

        // check map cues versus all cues in all buckets
        // map cues may include cues with no interval
        let no_interval_cues = [...this._map.values()].filter(cue => cue.interval == undefined);

        let count_buckets = cues.length;
        let count_no_interval = no_interval_cues.length;
        let count_map = this._map.size;
        let diff = count_map - count_buckets - count_no_interval;
        if (diff != 0) {
            console.log("count buckets", count_buckets);
            console.log("count no intervals", count_no_interval);
            console.log("count map", count_map);
            console.log("count diff", diff);
            throw new Error("inconsistent cue count");
        }

        // check that cue maps are non overlapping
        let bucket_map = new Map(cues.map(cue => [cue.key, cue]));
        let map_map = new Map([...this._map.entries()].filter(([key, cue]) => {
            return (cue.interval != undefined);
        }));

        let missing = utils.map_difference(bucket_map, map_map);
        if (missing.size > 0) {
            console.log("buckets missing cues:")
            console.log([...missing.keys()])
            throw new Error(`buckets missing cues: ${[...missing.keys()]}`);
        }
        
        missing = utils.map_difference(map_map, bucket_map);
        if (missing.size > 0) {
            throw new Error(`buckets too many cues: ${[...missing.keys()]}`);
        }

        return {
            cues: cues.length,
            points: points.length
        };
    };

}


Dataset.Delta = Delta;
Dataset.cue_delta = cue_delta;
Dataset.cue_equals = cue_equals;


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
        in case of data update without touching the interval
        the new cue needs to be insert in place of the old
    */
    replace_endpoint(point, cue) {
        let init = (this._pointMap.size == 0);
        let cues = (init) ? undefined : this._pointMap.get(point);
        if (cues != undefined) {
            let ok = replaceCueInArray (cues, cue);
            if (!ok) {
                console.log("WARNING: attempt to replace non-existent cue in pointMap")
            }
        }
    }


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
        if (this._pointMap.size == 0) {
            return [];
        }
        const broader_interval = new Interval(interval.low, interval.high, true, true);
        const points = this._pointIndex.lookup(broader_interval);
        const result = [];
        const len = points.length;
        let point, _endpoint;
        for (let i=0; i<len; i++) {
            point = points[i];
            this._pointMap.get(point)
                .forEach(function (cue) {
                    /*
                        figure out if point is endpoint low or high
                        include cue if the endpoint is inside search interval
                    */
                    if (point == cue.interval.low) {
                        _endpoint = cue.interval.endpointLow;
                    } else if (point == cue.interval.high) {
                        _endpoint = cue.interval.endpointHigh;
                    } else {
                        console.log("DS INDEX ERROR");
                        console.log("cuebucket:", this._maxLength);
                        console.log("lookup endpoints in interval", broader_interval.toString());
                        console.log("POINT:", point); 
                        console.log("CUE:", cue.interval.toString())
                        this.integrity();
                        throw new Error("fatal: point cue mismatch");
                    }
                    if (interval.covers_endpoint(_endpoint)) {
                        result.push({endpoint:_endpoint, cue:cue});
                    }
                }, this);
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
        if (this._pointMap.size == 0) {
            return [];
        }
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


    lookup(interval, mask=Interval.Match.COVERS) {

        if (this._pointMap.size == 0) {
            return [];
        }

        let cues = [];

        // ignore illegal values
        mask &= Interval.Match.COVERS;

        // special case only [EQUALS]
        if (mask == Relation.EQUALS) {
            return this._pointMap.get(interval.low).filter(function(cue) {
                return cue.interval.match(interval, Relation.EQUALS);
            });
        }

        // handle match with the basic lookup mask first
        // [OVERLAP_LEFT, COVERED, EQUALS, OVERLAP_RIGHT]
        let _mask = mask & Interval.Match.OVERLAP;
        if (_mask) {
            // keep cues which match lookup part of basic mask,
            cues = this._lookup_cues(interval)
                .filter(function(cue){
                    return cue.interval.match(interval, _mask);
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

        /*
            handle match with COVERS separately

            search left of search interval for cues
            that covers the search interval
            search left is limited by CueBucket maxlength
            left_interval: [interval.high-maxLength, interval.low]

            it would be possible to search right too, but we
            have to choose one.
        */
        if (mask & Relation.COVERS) {


            let low = interval.high - this._maxLength;
            let high = interval.low;
            // protect against float rounding effects creating
            // high < low by a very small margin
            [low, high] = [Math.min(low, high), Math.max(low, high)];
            let left_interval = new Interval(low, high, true, true);
            this._lookup_cues(left_interval)
                .forEach(function(cue){
                    if (cue.interval.match(interval, Relation.COVERS)) {
                        cues.push(cue);
                    }
                });
        }

        return cues;
    }


    /*
        REMOVE CUES
    */
    lookup_delete(interval, mask) {
        /*
            update pointMap
            - remove all cues from pointMap
            - remove empty entries in pointMap
            - record points that became empty, as these need to be deleted in pointIndex
            - separate into two bucketes, inside and outside
        */
        const cues = this.lookup(interval, mask);
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

        /* 
            invariable - pointMap and pointIndex always manage the same set of points
        */
        const index_point_set = new Set([...this._pointIndex.values()]);
        const map_point_set = new Set([...this._pointMap.keys()]);

        if (!utils.eqSet(index_point_set, map_point_set)) {
            let missing = utils.set_difference(index_point_set, map_point_set);
            if (missing.size > 0) {
                throw new Error(`pointMap missing points: ${[...missing]}`);
            }
            
            missing = utils.set_difference(map_point_set, index_point_set);
            if (missing.size > 0) {
                throw new Error(`pointIndex missing points: ${[...missing]}`);
            }
        }

        /*
            invariable - pointIndex shall always be sorted and not contain duplicates
        */
        let points = [...this._pointIndex.values()];
        if (points.length != index_point_set.size) {
            throw new Error("pointIndex include duplicate points");
        }
        for (let i=1; i<points.length; i++) {
            if (points[i-1] >= points[i]) {
                throw new Error("pointIndex not ordered");
            }            
        }

        /**
         *  invariable - pointMap point -> cues 
         *  cues shall only include cues which are relevant to given point
         */
        for (let point of points) {
            let cues = this._pointMap.get(point);
            for (let cue of cues) {
                // figure out if point is endpoint low or high
                if (point == cue.interval.low) {
                    continue;
                } else if (point == cue.interval.high) {
                    continue;
                } else {
                    console.log("POINT:", point); 
                    console.log("CUE:", cue.interval.toString());
                    throw new Error("pointMap: wrong cue");
                }
            }        
        }


        /**
         * invariable - all endpoints from all cues from pointMap are found as points in pointMap
         */

        for (let _cue_list of [...this._pointMap.values()]) {
            for (let cue of _cue_list) {
                for (let p of [cue.interval.low, cue.interval.high]) {
                    if (!this._pointMap.has(p)) {
                        throw new Error(`cue found with low or high point not in pointMap ${p} -> ${cue.interval.toString()} `);
                    }
                }
            }
        }


        /*
            invariable - all cues in pointMap with same key are same object
        */

        // collect all cues from pointMap
        let _cues = [];
        for (let _cue_list of this._pointMap.values()) {
            for (let cue of _cue_list) {
                _cues.push(cue);
            }
        }

        // remove and check duplicates
        let cueMap = new Map();
        for (let cue of _cues) {
            let _cue = cueMap.get(cue.key);
            if (_cue == undefined) {
                cueMap.set(cue.key, cue);
            } else {
                // duplicate
                if (cue !== _cue) {
                    throw new Error("pointMap: different cue objects for same key");
                }
            }
        }
        let cues = [...cueMap.values()];

        /**
         * invariable - all cues belong to this bucket
         */

        for (let cue of cues.values()) {
            // check that cue belongs to this bucket
            if (cue.interval.length > this._maxLength) {
                throw new Error(`cue in wrong cue bucket  ${this._maxLength}, ${cue.interval.toString()}`);
            }
        }

        return [{
            maxLength: this._maxLength,
            points: [...this._pointMap.keys()],
            cues: cues
        }];
    };
}

// module definition
export default Dataset;
