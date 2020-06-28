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


import TimingObject from './timingobject.js';


class SkewConverter extends TimingObject {

	constructor (timingsrc, skew, options) {
		super(timingsrc, options);
		this._skew = skew;
        this.eventifyDefine("skewchange", {init:true});
	}

    // extend
    eventifyInitEventArgs(name) {
        if (name == "skewchange") {
            return [this._skew];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

	// overrides
	onUpdateStart(arg) {
        if (arg.range != undefined) {
            arg.range[0] += this._skew;
            arg.range[1] += this._skew;
        }
        if (arg.position != undefined) {
			arg.position += this._skew;
        }
        return arg;
	};

	// overrides
	update(arg) {
        if (arg.position != undefined) {
			arg.position -= this._skew;
        }
        if (arg.range != undefined) {
            let [low, high] = arg.range;
            arg.range = [low - this._skew, high - this._skew];
        }
		return super.update(arg);
	};

	get skew() {return this._skew;};

	set skew(skew) {
        if (skew != this._skew) {
            // set skew and emulate new event from timingsrc
			this._skew = skew;
			this.__handleEvent({
                ...this.timingsrc.vector,
                range: this.timingsrc.range
            });
            this.eventifyTrigger("skewchange", skew);
        }
	}
};

export default SkewConverter;
