/*
	Copyright 2020
	Author : Ingar Mæhlum Arntzen

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


/**
 * Sampler for Timing Object
 * 
 * - samples timing object position and emits a change event at certain frequency
 * - does not emit any events when timing object is paused
 * - options
 *      - period (between samples) in ms
 *      - frequency (sample frequency) in hz
 *      if both given - period takes precedence
 *      if none given - default period = 1000 ms 
 */

import eventify from '../util/eventify.js';

const DEFAULT_PERIOD = 1000;

class TimingSampler {

    constructor (timingObject, options = {}) {
        this._to = timingObject;
        // timeout id
        this._tid;
        // period
        let {period, frequency} = options;
        this._period = DEFAULT_PERIOD;
        if (period != undefined) {
            this._period = period;
        } else if (frequency != undefined) {
            this._period = 1.0/frequency;
        }        
        // Events
        eventify.eventifyInstance(this);
        this.eventifyDefine("change", {init:true});
        // Handle timing object change event
        this._sub = this._to.on("change", this._onChange.bind(this));
    }

    /*
        Eventify: immediate events
    */
    eventifyInitEventArgs(name) {
        if (name == "change" && this._to.isReady()) {
            return this._to.pos;
        }
    }

    /**
     * Start/stop sampling
     */
    _onChange() {
        if (this._tid) {
            let v = this._to.query();
            let moving = (v.velocity != 0.0 || v.acceleration != 0.0);
            // start or stop sampling
            if (moving && this._tid == undefined) {
                this._tid = setInterval(function(){
                    this._onSample();
                }.bind(this), this._period);
            }
            if (!moving && this._tid != undefined) {
                clearTimeout(this._tid);
                this._tid = undefined;
            }
            this._onSample(v.position);
        }
    }

    /**
     * Sample timing object
     */
    _onSample(pos) {
        pos = pos || this._to.pos;
        this._eventifyTrigger("change", pos);
    }
   
    /**
     * Terminate sampler
     */
    clear() {
        // stop sampling
        if (this._tid) {
            clearTimeout(this._tid);
            this._tid = undefined;
        }
        // disconnect handler
        this._to.off(this._sub);
    }
}

export default TimingSampler;