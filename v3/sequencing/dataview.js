import ObservableMap from '../util/observablemap.js';

/**
 * Read only wrapper around dataset.
 * Implements ObservableMap
 * Stateless - forwards to source dataset
 * 
 * Adds filter and map/convert functionality 
 * on cues in source dataset
 * 
 * 
 * Implements the same interface as Dataset
 * 
 * Inherit from ObservableMap, but need to
 * override or remove behavior.
 * 
 * 
 * 
 */



/*
    Dataview provides read-only access to subset of a source Dataset
    - restrictions in time
    - restrictions (keep(cue))  key_filter, data_filter?
    - 
    - transformation (convert(cue)) - data_convert -- 
        warning: value filter applies before convert 
*/

class Dataview extends ObservableMap {

    constructor(dataset, interval, options={}) {
        super();
        this._key_filter = options.key_filter;
        this._data_filter = options.data_filter;
        this._interval = interval;
        this._size = 0;

        // Source Dataset
        this._src_ds = dataset;
        this._src_ds.on("batch", this.onBatchCallback.bind(this));
    }

    _cue_filter(cue) {
        let keep = true; 
        if (this._key_filter) {
            keep = keep && this._key_filter(cue.key);
        }
        if (this._data_filter) {
            keep = keep && this._data_filter(cue.data);
        }
        return keep;
    }

    /**
     * Filter (and modify) event items based on key_filter and data_filter
     */

    _items_filter(items) {
        let _items = [];
        for (let item of items) {
            if (item.new == undefined && item.old == undefined) {
                continue;
            }
            /* 
            use cue filter function to check relevance of both old and new
            consider change of unrelevant cue into relevant cue.
            old cue would be non-relevant, new cue would be relevant
            Since old cue was not part of the dataview before, it needs
            to be removed from the item - effectively turning the change
            operation into an add operation. 
            */
            let _old = (item.old != undefined && this._cue_filter(item.old)) ? item.old : undefined;
            let _new = (item.new != undefined && this._cue_filter(item.new)) ? item.new : undefined;
            if (_old == undefined && _new == undefined) {
                continue;
            }
            _items.push({key:item.key, new: _new, old: _old});
        }
        return _items;
    }

    /**
     * ObservableMap needs access to source dataset. 
     */
    get datasource () {
        return this._src_ds;
    }

    /*
        override superclass implementation with
    */
    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            // find cues
            let cues;
            if (this._interval) {
                cues = [...this.datasource.lookup(this._interval)];
            } else {
                cues = [...this.datasource.values()];
            }
            // filter
            cues = cues.filter(this._cue_filter, this);
            // make event items
            let items = cues.map((cue) => {
                return {key:cue.key, new:cue, old:undefined};
            });
            // sort
            items = this._sortItems(items);
            return (name == "batch") ? [items] : items;
        }
    }

    /*
    // extend superclass
    eventifyInitEventArgs(name) {

        let items = super.eventifyInitEventArgs(name);
        
        if (name == "batch") {
            console.log("initEvents", name, this);
            console.log(items);
        }

        if (items.length == 0) {
            return items;
        }
        if (name == "batch") {
            items = items[0];
            return [this._items_filter(items[0])];
        } else if (name == "change") {
            return this._items_filter(items);
        }        
    }
    */

    // forward events
    onBatchCallback(items) {
        console.log("batch", this);
        console.log(items);
        items = this._items_filter(items);
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
    }

    /***************************************************************
     ACCESSORS
    ***************************************************************/

    get size () {
        return this._size;
    }

    has(key) {
        return (this.get(key) != undefined);
    };

    get(key) {
        let cue = super.get(key);
        return (cue != undefined) ? this._cue_filter(cue) : cue;
    };

    keys() {
        return this.values().map((cue => {
            return cue.key;
        }));
    };

    values() {
        return [...super.values()].filter((cue) => {
            return this._cue_filter(cue);
        })
    };

    entries() {
        return [...super.entries()].filter(([key, cue]) => {
            return this._cue_filter(cue);
        });
    }


    /***************************************************************
     MAP MODIFICATION METHODS
    ***************************************************************/

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
export default Dataview;