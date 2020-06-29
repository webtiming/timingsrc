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
	TIMESHIFT CONVERTER

	Timeshift Converter timeshifts a timing object by timeoffset.
	Positive timeoffset means that the converter will run ahead of the source timing object.
	Negative timeoffset means that the converter will run behind the source timing object.

	Updates affect the converter immediately.
    This means that update vector must be re-calculated
	to the value it would have at time-shifted time.
    Timestamps are not time-shifted, since the motion is still live.
	For instance, (0, 1, ts) becomes (0+(1*timeshift), 1, ts)

	However, this transformation may cause range violation
		- this happens only when timing object is moving.
		- implementation requires range converter logic

	- range is infinite
*/

import TimingObject from './timingobject.js';
import {calculateVector} from '../util/motionutils.js';


class TimeshiftConverter extends TimingObject {

    constructor (timingsrc, offset) {
		super(timingsrc);
		this._offset = offset;
        this.eventifyDefine("offsetchange", {init:true});
	};

    // extend
    eventifyInitEventArgs(name) {
        if (name == "offsetchange") {
            return [this._offset];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

    // overrides
    onUpdateStart(arg) {
        if (arg.range != undefined) {
            arg.range = [-Infinity, Infinity];
        }
        if (arg.position != undefined) {
            // calculate timeshifted vector
            let ts = arg.timestamp;
            let new_vector = calculateVector(arg, ts + this._offset);
            arg.position = new_vector.position;
            arg.velocity = new_vector.velocity;
            arg.acceleration = new_vector.acceleration;
            arg.timestamp = ts;
        }
        return arg;
    };

    get offset() {return this._offset;};

    set offset(offset) {
        if (offset != this._offset) {
            // set offset and emulate new event from timingsrc
            this._offset = offset;
            this.__handleEvent({
                ...this.timingsrc.vector,
                range: this.timingsrc.range
            });
            this.eventifyTrigger("offsetchange", offset);
        }
    }

}

export default TimeshiftConverter;
