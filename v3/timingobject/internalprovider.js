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
			this._range = this._options.range || [-Infinity, Infinity];
			// vector
			let vector = this._options.vector || {
				position : 0,
				velocity : 0,
				acceleration : 0
			};
			// initialise state
			this._vector = this.checkUpdateVector(vector);
			// trigger events
			this._ready.value = true;
			// renew timeout
			this._renewTimeout();
		};

		// internal clock
		get clock() {return this._clock;};

		// update
		update(vector) {
			let eArg = {
				vector: this.checkUpdateVector(vector),
				live: true
			};
			this._preProcess(eArg);
		};
	}

	return InternalProvider;
});


