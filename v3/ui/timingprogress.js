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

import TimingSampler from "../timingobject/timingsampler.js";

/*
    TODO

    - treat progress change as a speculative
        change, (with a timeout)
        implementation - ideally as speculative converter
        easy solution - just lock
*/

class TimingProgress {

    static position2percent(position, range) {
        let [low, high] = range;

        let offset = position - low;
        let length = high - low;
        return 100.0*offset/length;
    };

    static percent2position(percent, range) {
        let [low, high] = range;
        // make sure percent is [0,100]
        percent = Math.max(0, percent);
        percent = Math.min(100, percent);
        let length = high - low;
        let offset = length*percent/100.0;
        return low + offset;
    };

    constructor (timingObject, progress_elem, options={}) {
        this._to = timingObject;
        this._sampler = options.sampler;
        this._progress_elem = progress_elem;
        this._lock = false;
        this._options = options;
        this._range = options.range || this._to.range;
        let [low, high] = this._range;
        if (low == -Infinity || high == Infinity) {
            throw new Error("illegal range", this._range);
        }

        // subscribe to input event from progress elem
        this._progress_elem.addEventListener("input", function() {
            // set lock
            // no updates on progress elem from timing object until lock is released
            this._lock_value = true;
        }.bind(this));

        // subscribe to change event from progress elem
        this._progress_elem.addEventListener("change", function () { 
            // clear lock
            this._lock_value = false;
            // update the timing object
            let percent = parseInt(this._progress_elem.value);               
            let position = TimingProgress.percent2position(percent, this._range);
            this._to.update({position: position});
        }.bind(this));
        
        // sampler
        if (this._sampler) {
            this._sampler.on("change", this.refresh.bind(this));
        }
    }

    refresh() {
        position = this._to.pos;
        // update progress elem if unlocked
        if (!this._lock_value) {
            let percent = TimingProgress.position2percent(position, this._range);
            if (this._options.thumb) {
                // check if percent is legal
                if (percent < 0.0 || 100.0 < percent) {
                    // hide
                    this._options.thumb.hide();
                    return;
                }
            } else {
                percent = (percent < 0.0) ? 0.0 : percent;
                percent = (100.0 < percent) ? 100.0: percent;
            }
            this._progress_elem.value = `${percent}`;
            if (this._options.thumb) {
                this._options.thumb.show();            
            }
        }
    }
}

export default TimingProgress;