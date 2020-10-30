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

function filter_items(items, filter) {
    let _items = [];
    for (let item in items) {
        if (item.new != undefined && item.old != undefined) {
            /* 
                use filter function to check relevance of both old and new
                consider change of unrelevant cue into relevant cue.
                old cue would be non-relevant, new cue would be relevant
                Since old cue was not part of the dataview before, it needs
                to be removed from the item - effectively turning the change
                operation into an add operation. 
            */
            let _old = (item.old != undefined && filter(item.old)) ? item.old : undefined;
            let _new = (item.new != undefined && filter(item.new)) ? item.new : undefined;
            if (_old == undefined && _new == undefined) {
                continue;
            }
            _items.push({id:item.id, new: _new, old: _old});
        }
    }
    return _items;
}


/*
    Dataview provides read-only access to subset of a source Dataset
    - restrictions in time
    - restrictions (keep(cue))  key_filter, data_filter?
    - 
    - transformation (convert(cue)) - data_convert -- 
        warning: value filter applies before convert 
*/

class Dataview extends ObservableMap {

    constructor(dataset, options={}) {
        super();
        this._filter = options.filter;
        this._convert = options.convert;

        if (this._filter == undefined && this._convert == undefined) {
            throw new Error("Dataview pointless with no filter and no convert");
        }

        this._size = 0;

        // Source Dataset
        this._src_ds = dataset;
        this._src_ds.on("batch", this.onBatchCallback.bind(this));
    }

    /**
     * ObservableMap needs access to source dataset. 
     */
    get datasource () {
        return this._src_ds;
    }

    // extend superclass
    eventifyInitEventArgs(name) {
        let items = super.eventifyInitEventArgs(name);
        if (name == "batch") {
            items = items[0];
            return [filter_items(items[0], this._filter)];
        } else if (name == "change") {
            return filter_items(items, this._filter);
        }        
    }

    // forward events
    onBatchCallback(items) {
        items = filter_items(items, this._filter);
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
        return (cue != undefined) ? this.filter(cue) : cue;
    };

    keys() {
        return this.values().map((cue => {
            return cue.key;
        }));
    };

    values() {
        return [...super.values()].filter((cue) => {
            return this.filter(cue);
        })
    };

    entries() {
        return [...super.entries()].filter(([key, cue]) => {
            return this.filter(cue);
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