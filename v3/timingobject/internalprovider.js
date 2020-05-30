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
			// range
			let range = this._options.range || [-Infinity, Infinity];
			if (range == undefined) {
				throw new Error ("illegal range", range);
			}
			this._range = range;
			// vector
			let vector = this._options.vector || {
				position : 0,
				velocity : 0,
				acceleration : 0
			};
			// initialise state
			vector = this.__check_update_vector(vector);
			if (vector == undefined) {
				throw new Error ("illegal update vector", vector);
			}
			this._vector = vector;

			// trigger events
			this._ready.value = true;
			// renew timeout
			this.__renewTimeout();
		};

		// internal clock
		get clock() {return this._clock;};

		// check update vector, complete if necessary
		__check_update_vector(vector) {
			if (vector == undefined) {
				return;
			}
			vector.timestamp = vector.timestamp || this._clock.now();
			let {
				position:pos,
				velocity:vel,
				acceleration:acc,
				timestamp:now} = vector;

			// preserving values form current motion if vector elements
			// are undefined
			let p = 0, v = 0, a = 0;
			if (this._vector) {
				let nowVector = motionutils.calculateVector(this._vector, now);
				nowVector = motionutils.checkRange(nowVector, this._range);
				p = nowVector.position;
				v = nowVector.velocity;
				a = nowVector.acceleration;
			}

			vector = {
				position : (pos != undefined) ? pos : p,
				velocity : (vel != undefined) ? vel : v,
				acceleration : (acc != undefined) ? acc : a,
				timestamp : now
			};

			// check range
			vector = motionutils.checkRange(vector, this._range);

			// check noop
			if (this._vector) {
				if (motionutils.equalVectors(vector, this._vector)){
					console.log("update noop");
					return;
				}
			}
			return vector;
		}

		// check range
		__check_range(range) {
			if (range == undefined) {
				return;
			}
			let [low, high] = range;
			if (low < high) {
				return range;
			}
			return;
		}


		// update
		__update(arg) {
			let eArg = {live:true};
			// vector
			let vector = this.__check_update_vector(arg.vector);
			if (vector != undefined) {
				eArg.vector = vector;
			}
			let range = this.__check_range(arg.range);
			if (range != undefined) {
				eArg.range = range;
			}
			eArg.tunnel = arg.tunnel;
			// emulate event
			return this.__handleEvent(eArg);
		};
	}

	return InternalProvider;
});


