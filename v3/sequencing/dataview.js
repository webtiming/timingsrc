
import * as utils from '../util/utils.js';
import endpoint from '../util/endpoint.js';
import Interval from '../util/interval.js';
import eventify from '../util/eventify.js';
import BinarySearch from '../util/binarysearch.js';
import ObservableMap from '../util/observablemap.js';

const Relation = Interval.Relation;


/**
 * Read only wrapper around dataset.
 * Implements ObservableMap
 * 
 * 
 * Maybe instead just add filter/convert 
 * to original dataset implementation
 * 
 */


class Dataview extends ObservableMap {

    constructor(dataset, options={}) {
        super();
        this._filter = filter;
        this._convert = convert;

        // Source Dataset
        this._src_ds = dataset;
        this._src_ds.on("batch", this.onBatchCallback.bind(this));
    }

    onBatchCallback(eArgList) {

    }

    /***************************************************************
     ACCESSORS
    ***************************************************************/

    get size () {
        return this._map.size;
    }

    has(key) {
        return this._map.has(key);
    };

    get(key) {
        return this._map.get(key);
    };

    keys() {
        return this._map.keys();
    };

    values() {
        return this._map.values();
    };

    entries() {
        return this._map.entries();
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