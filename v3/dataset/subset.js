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

import ObservableMap from '../util/observablemap.js';
import {array_concat, map_difference} from '../util/utils.js';
import Interval from '../util/interval.js';

/*
    Subset provides read-only access to subset of a source Dataset

    - <options>
        - <interva>: if defined only include cues that match the interval
        - <key_filter> : filter by cue key
            function keep(key) returns boolena
        - <data_filter> : filter by cue data
            function keep(data) returns boolean
        - <data_convert> : change cue data
            function convert(data) returns data
            NOTE: filtering occurs BEFORE convert
            and only impacts the presentation of cues
            WARNING: it is possible to change the value
            in such a way that filtering appears incorrect

    This subset implementation is STATELESS
    It does not manage its own state, only implements a
    stateless frontend over its source dataset.

*/

class Subset extends ObservableMap {

    constructor(dataset, options={}) {
        super();
        this._key_filter = options.key_filter;
        this._data_filter = options.data_filter;
        this._interval = options.interval;
        this._data_convert = options.data_convert;
        this._size = 0;

        // Callbacks
        this._callbacks = [];

        // Source Dataset
        this._src_ds = dataset;
        let cb = this._onDatasetCallback.bind(this)
        this._src_ds_cb = this._src_ds.add_callback(cb);
    }


    /***************************************************************
        ACCESSORS
    ***************************************************************/

    get datasource () {
        return this._src_ds;
    }

    get dataset () {
        return this._src_ds;
    }


    get interval () {
        return this._interval;
    }

    set interval (itv) {
        this._setInterval(itv);
    }


    /***************************************************************
        EVENT CALLBACKS - FOR SEQUENCERS
    ***************************************************************/

    add_callback (handler) {
        let handle = {
            handler: handler
        }
        this._callbacks.push(handle);
        return handle;
    };


    del_callback (handle) {
        let index = this._callbacks.indexof(handle);
        if (index > -1) {
            this._callbacks.splice(index, 1);
        }
    };


    _notify_callbacks (batchMap, relevanceInterval) {
        this._callbacks.forEach(function(handle) {
            handle.handler(batchMap, relevanceInterval);
        });
    };


   /***************************************************************
        FILTER & CONVER
    ***************************************************************/

    /* 
        Keep cue 
    */

    _cue_keep(cue) {
        if (cue == undefined) {
            return false;
        }
        // check if cue matches interval
        if (this._interval) {
            if (!this._interval.match(cue.interval)) {
                return false;
            }
        }
        // check key filter
        if (this._key_filter) {
            if (!this._key_filter(cue.key)) {
                return false;
            }
        }
        // check data filter
        if (this._data_filter) {
            if (!this._data_filter(cue.data)) {
                return false;
            }
        }
        return true;
    }

    /**
     *  Convert cue
     */
    _cue_convert(cue) {
        if (cue != undefined && this._data_convert) {
            // copy
            return {
                key: cue.key,
                interval: cue.interval,
                data: this._data_convert(cue.data)
            }
        }
        return cue;
    }

    /**
     * Filter (and modify) event items based on key_filter and data_filter
     */

    _items_filter_convert(items) {
        let _items = [];
        for (let item of items) {
            if (item.new == undefined && item.old == undefined) {
                continue;
            }
            /* 
            use cue filter function to check relevance of both old and new
            consider change of unrelevant cue into relevant cue.
            old cue would be non-relevant, new cue would be relevant
            Since old cue was not part of the subset before, it needs
            to be removed from the item - effectively turning the change
            operation into an add operation. 
            */
            let _old = (this._cue_keep(item.old)) ? item.old : undefined;
            let _new = (this._cue_keep(item.new)) ? item.new : undefined;
            if (_old == undefined && _new == undefined) {
                continue;
            }
            // convert
            _old = this._cue_convert(_old);
            _new = this._cue_convert(_new);
            // push
            _items.push({key:item.key, new: _new, old: _old});
        }
        return _items;
    }


    /***************************************************************
     LOOKUP
    ***************************************************************/

    _check_interval(interval) {
        if (this._interval) {
           // subset interval
           if (interval) {
               // lookup interval - find intersection
               let intersects = Interval.intersect(interval, this._interval);
               if (intersects.length == 0) {
                   console.log(`warning - lookup interval ${interval.toString()} outside the subset interval ${this._interval.toString()}`);
                   return [];
                } else {
                    interval = intersects[0];
                }
            } else {
                // no lookup interval - use subset interval   
                interval = this._interval;
            }
        }
        return interval;
    }

    /** 
     * lookup cues
    */

    lookup(interval, mask) {
        let _interval = this._check_interval(interval);
        let cues;
        if (_interval) {
            cues = this.datasource.lookup(_interval, mask);
        } else {
            cues = [...this.datasource.values()];
        }
        // filter & convert cues
        return cues.filter(this._cue_keep, this)
            .map(this._cue_convert, this);
    }

    /* 
        lookup endpoints
        used by sequencers
    */

    lookup_endpoints(interval) {
        let _interval = this._check_interval(interval);
        let items = this.datasource.lookup_endpoints(_interval);
        // filter and convert
        return items.filter((item) => {
            return this._cue_keep(item.cue);
        }, this).map((item) => {
            return {endpoint: item.endpoint, cue: this._cue_convert(item.cue)};
        }, this);
    }

    /***************************************************************
     INITIAL STATE
    ***************************************************************/

    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            // find cues
            let cues = this.lookup();
            // make event items
            let items = cues.map((cue) => {
                return {key:cue.key, new:cue, old:undefined};
            });
            // sort
            items = this._sortItems(items);
            return (name == "batch") ? [items] : items;
        }
    }


    /***************************************************************
     DATASET CALLBACK
    ***************************************************************/

    _onDatasetCallback(eventMap, relevanceInterval) {
        let items = [...eventMap.values()];
        items = this._items_filter_convert(items);
        // update size
        for (let item of items) {
            if (item.new != undefined && item.old == undefined) {
                // add
                this._size += 1;
            } else if (item.new == undefined && item.old != undefined) {
                // remove
                this._size -= 1;
            }           
        }        
        // forward as events
        super._notifyEvents(items);
        // forward as callbacks
        let batchMap = new Map(items.map((item) => {
            return [item.key, item];
        }));
        if (this._interval) {
            relevanceInterval = Interval.intersect(this._inverval, relevanceInterval);
        }
        this._notify_callbacks(batchMap, relevanceInterval);
    }


    /***************************************************************
        SET INTERVAL
    ***************************************************************/

    _setInterval (itv) {
        if (!itv instanceof Interval) {
            throw new Error("must be interval", itv.toString());
        }
        if (!this._interval || !this._interval.equals(itv)) {
            // current cues (before interval update)
            let current_cues = this.lookup();
            // update interval
            this._interval = itv;
            // cues (after interval update)
            let new_cues = this.datasource.lookup(itv);
            // filter & convert cues
            new_cues = new_cues
                .filter(this._cue_keep, this)
                .map(this._cue_convert, this);
            // switch to map representation
            let currentCueMap = new Map([...current_cues].map((cue) => {
                return [cue.key, cue];
            }));
            let newCueMap = new Map([...new_cues].map((cue) => {
                return [cue.key, cue];
            }));
            // exit and enter cues
            let exitCueMap = map_difference(currentCueMap, newCueMap);
            let enterCueMap = map_difference(newCueMap, currentCueMap);
            // make list of event items
            let exitItems = [...exitCueMap.values()].map((cue) => {
                return {key: cue.key, new:undefined, old: cue}
            });
            let enterItems = [...enterCueMap.values()].map((cue) => {
                return {key: cue.key, new:cue, old: undefined}
            });
            // update size
            this._size -= exitItems.length;
            this._size += enterItems.length;            
            // event notification
            const items = array_concat([exitItems, enterItems], {copy:false, order:true});
            this._notifyEvents(items);
        }
    }

    /***************************************************************
     MAP ACCESSORS
    ***************************************************************/

    get size () {
        return this._size;
    }

    has(key) {
        return (this.get(key) != undefined);
    };

    get(key) {
        let cue = super.get(key);
        if (cue != undefined && this._cue_keep(cue)) {
            return this._cue_convert(cue);
        }
    };

    keys() {
        return this.values().map((cue => {
            return cue.key;
        }));
    };

    values() {
        return [...super.values()]
            .filter((cue) => {
                return this._cue_keep(cue);
            }, this)
            .map((cue) => {
                return this._cue_convert(cue);
            }, this);
    };

    entries() {
        return this.values().map((cue) => {
            return [cue.key, cue];
        });
    };


    /***************************************************************
     MAP MODIFICATION METHODS
    ***************************************************************/

    update(cues, options) {
        throw new Error("not implemented");
    }

    set (key, value) {
        throw new Error("not implemented");
    }

    delete (key) {
        throw new Error("not implemented");
    }

    clear (key) {
        throw new Error("not implemented");
    }

}

// module definition
export default Subset;