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
	DELAY CONVERTER

	Delay Converter introduces a positive time delay on a source timing object.

	Generally - if the source timing object has some value at time t,
	then the delayConverter will provide the same value at time t + delay.

	Since the delay Converter is effectively replaying past events after the fact,
	it is not LIVE and not open to interactivity (i.e. update)

*/

import TimingObject from './timingobject.js';
import Timeout from '../util/timeout.js';


class DelayConverter extends TimingObject {
	constructor (timingObject, delay) {
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delayconverter pointless");}
		super(timingObject);
		// fixed delay
		this._delay = delay;
		// buffer
		this._buffer = [];
		// timeoutid
		this._timeout = new Timeout(this, this.__handleDelayed.bind(this));
        this.eventifyDefine("delaychange", {init:true});
	};

    // extend
    eventifyInitEventArgs(name) {
        if (name == "delaychange") {
            return [this._delay];
        } else {
            return super.eventifyInitEventArgs(name)
        }
    }

	// overrides
	onUpdateStart(arg) {
		/*
			Vector's timestamp always time-shifted (back-dated) by delay

			Normal operation is to delay every incoming vector update.
			This implies returning null to abort further processing at this time,
			and instead trigger a later continuation.

			However, delay is calculated based on the timestamp of the vector (age), not when the vector is
			processed in this method. So, for small small delays the age of the vector could already be
			greater than delay, indicating that the vector is immediately valid and do not require delayed processing.

			This is particularly true for the first vector, which may be old.

			So we generally check the age to figure out whether to apply the vector immediately or to delay it.
		*/

		this._buffer.push(arg);
		// if timeout for next already defined, nothing to do
		if (!this._timeout.isSet()) {
			this.__handleDelayed();
		}
		return;
	};

	__handleDelayed() {
		// run through buffer and apply vectors that are due
		let now = this.clock.now();
		let arg, due;
		while (this._buffer.length > 0) {
			due = this._buffer[0].timestamp + this._delay;
			if (now < due) {
				break;
			} else {
				arg = this._buffer.shift();
				// apply
				arg.timestamp = due;
				this.__process(arg);
			}
		}
		// set new timeout
		if (this._buffer.length > 0) {
			due = this._buffer[0].timestamp + this._delay;
			this._timeout.setTimeout(due);
		}
	};

	update(arg) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

    get delay() {return this._delay;};

	set delay(delay) {
        if (delay != this._delay) {
            // set delay and emulate new event from timingsrc
            this._delay = delay;
            this._timeout.clear();
            this.__handleDelayed();
            this.eventifyTrigger("delaychange", delay);
        }
    }
}

export default DelayConverter;

