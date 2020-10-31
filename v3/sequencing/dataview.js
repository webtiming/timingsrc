import ObservableMap from '../util/observablemap.js';

/*
    Dataview provides read-only access to subset of a source Dataset

    - <interval> filter in time domain, 
        include only cues that match given interval (default mode 62)

    - <options>
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

    This dataview implementation is STATELESS
    It does not manage its own state, only implements a
    stateless wrapper around its source dataset.

    NOTE: The stateless nature also means that it must remain static.
    Intervals and filters can not be changed.

*/

class Dataview extends ObservableMap {

    constructor(dataset, interval, options={}) {
        super();
        this._key_filter = options.key_filter;
        this._data_filter = options.data_filter;
        this._data_convert = options.data_convert;
        this._interval = interval;
        this._size = 0;

        // Source Dataset
        this._src_ds = dataset;
        let cb = this._onDatasetCallback.bind(this)
        this._src_ds_cb = this._src_ds.add_callback(cb);
    }

    /** 
     * Evaluate if a single cue is relevant for the dataview
    */

    _cue_keep(cue) {
        if (cue == undefined) {
            return false;
        }
        // check interval
        if (this._interval) {
            if (cue.interval == undefined) {
                return false;
            }
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
            Since old cue was not part of the dataview before, it needs
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
            // filter & convert
            cues = cues.filter(this._cue_keep, this)
                .map(this._cue_convert, this);

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
        forward events

        TODO - should be using the callback instead
    */
    _onDatasetCallback(eventMap) {
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
        if (cue != undefined && this._cue_keep(cue)) {
            return cue;
        }
    };

    keys() {
        return this.values().map((cue => {
            return cue.key;
        }));
    };

    values() {
        return [...super.values()].filter((cue) => {
            return this._cue_keep(cue);
        })
    };

    entries() {
        return [...super.entries()].filter(([key, cue]) => {
            return this._cue_keep(cue);
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