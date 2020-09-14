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

import eventify from './eventify.js';

/*******************************************************************
 BASE OBSERVABLE MAP
*******************************************************************/

/*
    This is a base class for observable map
*/

class ObservableMap {

    constructor () {

        // Internal Map
        this._map = new Map(); // (key -> item)

        // Events
        eventify.eventifyInstance(this);
        this.eventifyDefine("batch", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    }

    /***************************************************************
     EVENTS
    ***************************************************************/

    /*
        item ordering
    */
    _sortItems(items) {
        return items;
    }

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            let items = [...this._map.entries()].map(([key, item]) => {
                return {key:key, new:item, old:undefined};
            });
            items = this._sortItems(items);
            return (name == "batch") ? [items] : items;
        }
    }

    /*
        Event Notification
    */
    _notifyEvents(items) {
        // event notification
        if (items.length == 0) {
            return;
        }
        const has_update_subs = this.eventifySubscriptions("batch").length > 0;
        const has_remove_subs = this.eventifySubscriptions("remove").length > 0;
        const has_change_subs = this.eventifySubscriptions("change").length > 0;
        // update
        if (has_update_subs) {
            this.eventifyTrigger("batch", items);
        }
        // change, remove
        if (has_remove_subs || has_change_subs) {
            for (let item of items) {
                if (item.new == undefined && item.old != undefined) {
                    if (has_remove_subs) {
                        this.eventifyTrigger("remove", item);
                    }
                } else {
                    if (has_change_subs) {
                        this.eventifyTrigger("change", item);
                    }
                }
            }
        }
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
     MODIFY
    ***************************************************************/

    set(key, value) {
        let old = undefined;
        if (this._map.has(key)) {
            old = this._map.get(key);
        }
        this._map.set(key, value);
        this._notifyEvents([{key: key, new:value, old: old}]);
        return this;
    }

    delete(key) {
        let result = false;
        let old = undefined;
        if (this._map.has(key)) {
            old = this._map.get(key);
            this._map.delete(key);
            result = true;
        }
        this._notifyEvents([{key: key, new:undefined, old: old}]);
        return result;
    }

    clear() {
        // clear _map
        let _map = this._map;
        this._map = new Map();
        // create change events for all cues
        const items = [];
        for (let [key, val] of _map.entries()) {
            items.push({key: key, new: undefined, old: val});
        }
        // event notification
        this._notifyEvents(items);
    }

}

eventify.eventifyPrototype(ObservableMap.prototype);

export default ObservableMap;
