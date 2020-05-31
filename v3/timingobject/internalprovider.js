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


define(function (require) {

	'use strict';

	const MasterClock = require('./masterclock');
	const TimingBase = require('./timingbase');
	const motionutils = require('../util/motionutils');

	/*
		INTERNAL PROVIDER

		Timing provider internal to the browser context

		Used by timing objects as timingsrc if no timingsrc is specified.
	*/

	class InternalProvider extends TimingBase {

		constructor (options) {
			options = options || {};
			options.timeout = true;
			super(options);
			// initialise internal state
			this._clock = new MasterClock({skew:0});
			this._range;
			this._vector;
			// options
			options.timestamp = options.timestamp || this._clock.now();
			options.range = options.range || [-Infinity, Infinity];
			this.__process_update(options);
			// trigger events
			this._ready.value = true;
			// renew timeout
			this.__renewTimeout();
		};

		// internal clock
		get clock() {return this._clock;};


		// update
		__process_update(arg) {
			// process arg
			let {
				position: pos,
				velocity: vel,
				acceleration: acc,
				timestamp: ts,
				range: range
			} = arg;

			// record state from current motion
			let p = 0, v = 0, a = 0;
			if (this._vector != undefined) {
				let nowVector = motionutils.calculateVector(this._vector, ts);
				nowVector = motionutils.checkRange(nowVector, this._range);
				p = nowVector.position;
				v = nowVector.velocity;
				a = nowVector.acceleration;
			}

			// fill in from current motion, for missing properties
			let vector = {
				position : (pos != undefined) ? pos : p,
				velocity : (vel != undefined) ? vel : v,
				acceleration : (acc != undefined) ? acc : a,
				timestamp : ts
			};

			// update range
			if (range != undefined) {
				let [low, high] = range;
				if (low < high) {
					if (low != this._range[0] || high != this._range[1]) {
						this._range = [low, high];
					}
				}
			}

			// check vector with respect to range
			vector = motionutils.checkRange(vector, this._range);
			// save old vector
			this._old_vector = this._vector;
			// update vector
			this._vector = vector;
			return {range, ...vector};
		};

		// update
		__update(arg) {
			arg = this.__process_update(arg);
			// emulate event
			return this.__handleEvent(arg);
		}
	}

	return InternalProvider;
});


