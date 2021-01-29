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

import {map_intersect, map_difference} from '../util/utils.js';
import Interval from '../util/interval.js';
import CueCollection from '../dataset/cuecollection.js';
import Dataset from '../dataset/dataset.js';


function isNoop(delta) {
    return (delta.interval == Dataset.Delta.NOOP && delta.data == Dataset.Delta.NOOP);
}


/*******************************************************************
 ACTIVE MAP
*******************************************************************/
/*

    This table describes cue changes to/from active state
    based on

    - to_role - the role of the timing object

      in the case of the double sequencer a timing object
      may be *LEFT* (L), *RIGHT* (R) or, in the corner case that
      the two timing objects are at the same position,
      *SINGULAR* (S)

      in the case of the single sequencer, the role is
      always *SINGULAR* (S)


    - to_direction - the direction of the movement of the
      timing object, either *RIGHT* (R) or *LEFT* (L)

      This map is only used when timing object is in a
      moving state, so *PAUSED* (P) is not needed.

    - endpoint_type - the type of endpoint which is
      passed by the timing object during motion, either
      *LEFT* (R) endpoint or *RIGHT* (R) endpoint, or
      *SINGULAR* (S) endpoint.

    - cue_change
      *ENTER* : cue changes from not active to active
      *EXIT*: cue changes from active to not active
      *STAY*: cue stays active
      *ENTER-EXIT*: cue changes from not active to active,
                    and immediately back agoind to not active
                    This only occurs when a *SINGULAR*
                    timing object passed a *SINGULAR* cue.


    Table columns are:

    | to_role | to_direction | endpoint_type | cue change |

    left, right, left -> stay
    left, right, right -> exit
    left, right, singular -> exit

    left, left, left -> stay
    left, left, right -> enter
    left, left, singular -> enter

    right, right, left -> enter
    right, right, right -> stay
    right, right, singular -> enter

    right, left, left -> exit
    right, left, right -> stay
    right, left, singular -> exit

    // cornercase - timing objects are the same

    singular, right, left -> enter
    singular, right, right -> exit
    singular, right, singular -> enter, exit

    singular, left, left -> exit
    singular, left, right -> enter
    singular, left, singular -> enter, exit

*/

const Active = Object.freeze({
    ENTER: 1,
    STAY: 0,
    EXIT: -1,
    ENTER_EXIT: 2
});

const ActiveMap = new Map([
    ["LRL", Active.STAY],
    ["LRR", Active.EXIT],
    ["LRS", Active.EXIT],
    ["LLL", Active.STAY],
    ["LLR", Active.ENTER],
    ["LLS", Active.ENTER],
    ["RRL", Active.ENTER],
    ["RRR", Active.STAY],
    ["RRS", Active.ENTER],
    ["RLL", Active.EXIT],
    ["RLR", Active.STAY],
    ["RLS", Active.EXIT],
    ["SRL", Active.ENTER],
    ["SRR", Active.EXIT],
    ["SRS", Active.ENTER_EXIT],
    ["SLL", Active.EXIT],
    ["SLR", Active.ENTER],
    ["SLS", Active.ENTER_EXIT]
]);



/*******************************************************************
 DEFAULT EVENT ITEM ORDERING
*******************************************************************/

function cue_cmp_forwards (cue_a, cue_b) {
    return Interval.cmpLow(cue_a.interval, cue_b.interval);
}

function cue_cmp_backwards (cue_a, cue_b) {
    return -1 * Interval.cmpHigh(cue_a.interval, cue_b.interval);
}

function item_cmp_forwards (item_a, item_b) {
    let cue_a = (item_a.new) ? item_a.new : item_a.old;
    let cue_b = (item_b.new) ? item_b.new : item_b.old;
    return cue_cmp_forwards(cue_a, cue_b);
}

function item_cmp_backwards (item_a, item_b) {
    let cue_a = (item_a.new) ? item_a.new : item_a.old;
    let cue_b = (item_b.new) ? item_b.new : item_b.old;
    return cue_cmp_backwards(cue_a, cue_b);
}

/*******************************************************************
 BASE SEQUENCER
*******************************************************************/

/*
    This is an abstract base class for sequencers
    It implements common logic related to Dataset, events and activeCues.
*/

class BaseSequencer extends CueCollection {

    static Active = Active;
    static ActiveMap = ActiveMap;

    constructor (dataset, options) {
        super(options);

        // Active cues
        this._map = new Map();

        // Dataset
        this._ds = dataset;
        let cb = this._onDatasetCallback.bind(this)
        this._ds_cb = this._ds.add_callback(cb);
    }

    /**
     * CueCollection (ObservableMap) needs access to map 
     */
    get datasource () {
        return this._map;
    }

    /**
     * Access to dataset of sequencer
     */

    get dataset () { 
        return this._ds;
    }

    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        Get the direction of movement
        To be implemented by subclass
    */
    _movementDirection() {
        throw new Error("not implemented");
    }

    // override ObservableMap.sortValues to add special support for
    // direction sensitive ordering as default ordering
    sortValues(iter, options={}) {
        let order = this.sortOrder(options);
        if (typeof order == "function") {
            // use order specified by options
            return super.sortValues(iter, options)
        } else {
            // if iterable not array - convert into array ahead of sorting
            let cues = (Array.isArray(iter)) ? iter : [...iter];
            // default order is direction sensitive
            let direction = this._movementDirection();
            if (direction >= 0) {
                cues.sort(cue_cmp_forwards);
            } else {
                cues.sort(cue_cmp_backwards);
            }
            return cues
        } 
    }


    // override ObservableMap.sortItems to add special support for
    // direction sensitive ordering as default ordering
    sortItems(items, direction) {
        let order = this.sortOrder(); 
        if (typeof order == "function") {
            // use order speciied by options
            return super.sortItems(items)            
        } 
        if (order == undefined) {
            // default order is direction sensitive
            if (direction == undefined) {
                direction = this._movementDirection();
            }
            if (direction >= 0) {
                items.sort(item_cmp_forwards);
            } else {
                items.sort(item_cmp_backwards);
            }
        }
    }

    /***************************************************************
     MAP METHODS
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

    /***************************************************************
     DATASET
    ***************************************************************/



    _onDatasetCallback(eventMap, relevanceInterval) {
        throw new Error("not implemented");
    }

    /*
        make exit, change and enter events
        - based on eventMap
    */
    _items_from_dataset_events(eventMap, interval) {
        const enterEvents = [];
        const changeEvents = [];
        const exitEvents = [];
        const first = this._map.size == 0;
        let is_active, should_be_active, _item;
        for (let item of eventMap.values()) {
            if (isNoop(item.delta)) {
                continue;
            }
            // exit, change, enter events
            is_active = (first) ? false : this._map.has(item.key);
            should_be_active = false;
            if (item.new != undefined) {
                if (item.new.interval.match(interval)) {
                    should_be_active = true;
                }
            }
            if (is_active && !should_be_active) {
                // exit
                _item = {key:item.key, new:undefined, old:item.old};
                exitEvents.push(_item);
            } else if (!is_active && should_be_active) {
                // enter
                _item = {key:item.key, new:item.new, old:undefined};
                enterEvents.push(_item);
            } else if (is_active && should_be_active) {
                // change
                _item = {key:item.key, new:item.new, old:item.old};
                changeEvents.push(_item);
            }
        };
        return [exitEvents, changeEvents, enterEvents];
    }

    /*
        make exit, change and enter events
        - based on dataset.lookup
    */
    _items_from_dataset_lookup(eventMap, interval) {

        /*
            Active cues

            find new set of active cues by querying the dataset
        */
        const _activeCues = new Map(this._ds.lookup(interval).map(function(cue) {
            return [cue.key, cue];
        }));

        let changeEvents = [];
        let exitEvents = [];
        let first = (this._map.size == 0);
        if (!first){

            /*
                Change Events

                change cues - cues which are modified, yet remain active cues
            */
            let remainCues = map_intersect(this._map, _activeCues);
            if (remainCues.size > 0) {
                /*
                    Two approaches

                    1) large eventMap
                    eventMap larger than remainCues
                    - iterate remainCues
                    - keep those that are found in eventMap

                    2) large remainCues
                    remainCues larger than eventMap
                    - iterate eventMap
                    - keep those that are found in remainCues

                    measurement shows that 2) is better
                */
                let cue, _item;
                for (let item of eventMap.values()) {
                    cue = remainCues.get(item.key);
                    if (cue != undefined && !isNoop(item.delta)) {
                        _item = {key:item.key, new:item.new, old:item.old};
                        changeEvents.push(_item);
                    }
                }
            }

            /*
                Exit Events
                exit cues were in old active cues - but not in new
            */
            let exitCues = map_difference(this._map, _activeCues);
            exitEvents = [...exitCues.values()]
                .map(cue => {
                    return {key:cue.key, new:undefined, old:cue};
                });
        }

        /*
            Enter Events
            enter cues were not in old active cues - but are in new
        */
        let enterCues;
        if (first) {
            enterCues = _activeCues
        } else {
            enterCues = map_difference(_activeCues, this._map);
        }
        let enterEvents = [...enterCues.values()]
            .map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });

        return [exitEvents, changeEvents, enterEvents];
    }

    /***************************************************************
     V2 COMPATIBILTY

     Sequencers forward dataset operation to datase
    ***************************************************************/

    get builder() {
        return this.dataset.builder;
    }

    addCue(key, interval, data) {
        return this.dataset.addCue(key, interval, data);
    }

    removeCue(key) {
        return this.dataset.removeCue(key);
    }

    _addCue(key, interval, data) {
        return this.dataset._addCue(key, interval, data);
    }

    _removeCue(key) {
        return this.dataset._removeCue(key);
    }

    update(cues, options) {
        return this.dataset.update(cues, options);
    }

    clear() {
        return this.dataset.clear();
    }

    hasCue(key) {
        return this.dataset.has(key);
    }

    getCue(key) {
        return this.dataset.get(key);
    }

    getCues() {
        return this.dataset.cues();
    }

    getActiveKeys() {
        return [...this.keys()];
    }

    getActiveCues() {
        return this.cues();
    }

    isActive(key) {
        return this.has(key);
    }

}

export default BaseSequencer;
