/*
	Copyright 2015 Norut Northern Research Institute
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


/*
	SKEW CONVERTER

	Skewing the timeline by 2 means that the timeline position 0 of the timingsrc becomes position 2 of Converter.

*/

define(function (require) {

	'use strict';

    const TimingObjectBase = require('./timingobjectbase');

	class SkewConverter extends TimingObjectBase {

		constructor (timingsrc, skew, options) {
			super(timingsrc, options);
			this._skew = skew;
            this.eventifyDefineEvent("skewchange", {init:true});
		}

        // extend
        eventifyInitEventArg(name) {
            if (this._ready.value && name == "skewchange") {
                return [true, this._skew];
            } else {
                return super.eventifyInitEventArg(name)
            }
        }

		// overrides
		onRangeChange(range) {
			range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._skew;
			range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._skew;
			return range;
		};

		// overrides
		onVectorChange(vector) {
			vector.position += this._skew;
            return vector;

		};

		update(vector, range) {
            if (vector != undefined) {
    			if (vector.position !== undefined) {
    				vector.position = vector.position - this._skew;
    			}
            }
            if (range != undefined) {
                let [low, high] = range;
                range = [low - this._skew, high - this._skew];
            }
			return super.update(vector, range);
		};

		get skew() {return this._skew;};

		set skew(skew) {
            if (skew != this._skew) {
                // set skew and emulate new event from timingsrc
    			this._skew = skew;
    			this.__handleEvent({
                    vector: this.timingsrc.vector,
                    range: this.timingsrc.range
                });
                this.eventifyTriggerEvent("skewchange", skew);
            }
		}
	};

	return SkewConverter;
});
