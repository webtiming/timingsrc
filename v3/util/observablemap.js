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

        // Events
        eventify.eventifyInstance(this);
        this.eventifyDefine("batch", {init:true});
        this.eventifyDefine("change", {init:true});
        this.eventifyDefine("remove", {init:false});
    }

    /**
     *  Abstract accessor to datasource backing implementation
     *  of observable map. Typically this is an instance of Map() class.
     * 
     *  Must be implemented by subclass. 
     */

    get datasource () {
        throw new Error("not implemented");
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
            let items = [...this.datasource.entries()].map(([key, item]) => {
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
        return this.datasource.size;
    }

    has(key) {
        return this.datasource.has(key);
    };

    get(key) {
        return this.datasource.get(key);
    };

    keys() {
        return this.datasource.keys();
    };

    values() {
        return this.datasource.values();
    };

    entries() {
        return this.datasource.entries();
    }


    /***************************************************************
     MODIFY
    ***************************************************************/

    set(key, value) {
        let old = undefined;
        if (this.datasource.has(key)) {
            old = this.datasource.get(key);
        }
        this.datasource.set(key, value);
        this._notifyEvents([{key: key, new:value, old: old}]);
        return this;
    }

    delete(key) {
        let result = false;
        let old = undefined;
        if (this.datasource.has(key)) {
            old = this.datasource.get(key);
            this.datasource.delete(key);
            result = true;
        }
        this._notifyEvents([{key: key, new:undefined, old: old}]);
        return result;
    }

    clear() {
        // create change events for all cues
        const items = [...this.datasource.entries()].map(([key, val]) => {
            return {key: key, new: undefined, old: val};
        })
        // clear _map
        this.datasource.clear();
        // event notification
        this._notifyEvents(items);
    }

}

eventify.eventifyPrototype(ObservableMap.prototype);

export default ObservableMap;
