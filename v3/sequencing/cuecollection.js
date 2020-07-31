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

import eventify from '../util/eventify.js';

/*******************************************************************
 CUE COLLECTION
*******************************************************************/

/*
    This is an abstract class for cue collection
*/

class CueCollection {

    constructor () {

        // CueMap
        this._cueMap = new Map(); // (key -> cue)

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
        event ordering
    */
    _sortEvents(events) {
        return events;
    }

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "batch" || name == "change") {
            let events = [...this._cueMap.values()].map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });
            events = this._sortEvents(events);
            return (name == "batch") ? [events] : events;
        }
    }

    /*
        Event Notification
    */
    _notifyEvents(events) {
        // event notification
        if (events.length == 0) {
            return;
        }
        const has_update_subs = this.eventifySubscriptions("batch").length > 0;
        const has_remove_subs = this.eventifySubscriptions("remove").length > 0;
        const has_change_subs = this.eventifySubscriptions("change").length > 0;
        // update
        if (has_update_subs) {
            this.eventifyTrigger("batch", events);
        }
        // change, remove
        if (has_remove_subs || has_change_subs) {
            for (let item of events) {
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
     MAP ACCESSORS
    ***************************************************************/

    get size () {
        return this._cueMap.size;
    }

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
}

eventify.eventifyPrototype(CueCollection.prototype);

export default CueCollection;
