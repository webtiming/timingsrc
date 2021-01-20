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
import Interval from '../util/interval.js';

/**
 *  Extends ObservableMap
 * 
 *  with logic specific to collections of cues.
 */

class CueCollection extends ObservableMap {

    static cmpLow(cue_a, cue_b) {
        return Interval.cmpLow(cue_a.interval, cue_b.interval);
    }

    static cmpHigh(cue_a, cue_b) {
        return Interval.cmpHigh(cue_a.interval, cue_b.interval);
    }

    // extend sortOrder to accept order as string
    sortOrder(options={}) {
        let order = options.order || super.sortOrder(options);
        if (order == "low") {
            return CueCollection.cmpLow;
        } else if (order == "high") {
            return CueCollection.cmpHigh;
        } else {
            if (typeof order != "function") {
                return;
            }
        }
        return order;
    }

    // add cues method
    cues (options = {}) {
        let iter = this.values();
        // ensure array
        let arr = (Array.isArray(iter)) ? iter : [...iter];
        return this.sortValues(arr, options);
    }
}

// module definition
export default CueCollection;