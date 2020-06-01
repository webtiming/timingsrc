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

	const TimingBase = require('./timingbase');
	const InternalProvider = require('./internalprovider');
	const ExternalProvider = require('./externalprovider');
	const eventify = require('../util/eventify');

	const MAX_NONCE = 10000;

	function getRandomInt() {
	 	return Math.floor(Math.random() * MAX_NONCE);
	};

	/*

		TIMING OBJECT BASE

	*/

	class TimingObjectBase extends TimingBase {

		constructor (timingsrc, options) {
			super(options);
			this.__version = 4;
			this.__timingsrc;
			this.__sub;

			// update
			this.__update_events = new Map();

			// initialise timingsrc
			this.__set_timingsrc(timingsrc, options);
		};

		// clock - from timingsrc or provider
		get clock() {return this.__timingsrc.clock};

		// version
		get version () {return this.__version;};

		/*

			timingsrc property and switching on assignment

		*/
		__clear_timingsrc() {
			// clear timingsrc
			if (this.__timingsrc != undefined) {
				if (this.__timingsrc instanceof TimingObjectBase) {
					this.__timingsrc.off(this.__sub);
					this.__sub = undefined;
					this.__timingsrc = undefined;
				} else {
					// provider
					this.__timingsrc.close();
					this.__timingsrc = undefined;
				}
			}
		}

		__set_timingsrc(timingsrc, options) {
			// set timingsrc
			let callback = this.__handleEvent.bind(this);
			if (timingsrc instanceof TimingObjectBase) {
				// timingsrc
				this.__timingsrc = timingsrc;
				this.__sub = this.__timingsrc.on("timingsrc", callback);
			} else {
				// provider
				if (timingsrc == undefined) {
					// Internal Provider
					this.__timingsrc = new InternalProvider(callback, options);
				} else {
					// External Provider
					this.__timingsrc = new ExternalProvider(timingsrc, callback, options);
				}
				// emulating initial event from provider, causing
				// this timingobject to initialise
				if (this.__timingsrc.isReady()) {
					let arg = {
						range: this.__timingsrc.range,
						...this.__timingsrc.vector,
						live: false
					}
					// generate initial event
					callback(arg);
				}
			}
		}

		get timingsrc () {return this.__timingsrc;};
		set timingsrc(timingsrc) {
			this.__clear_timingsrc();
			this.__set_timingsrc(timingsrc);
		}

		// internal update
		__update(arg) {
			if (this.__timingsrc instanceof TimingObjectBase) {
				return this.__timingsrc.__update(arg);
			} else {
				// provider
				return this.__timingsrc.update(arg);
			}
		};

		// external update
		update(arg) {
			arg.tunnel = getRandomInt();
			if (arg.timestamp == undefined) {
				arg.timestamp = this.clock.now();
			}
			this.__update(arg);
			let event = new eventify.EventVariable();
			this.__update_events.set(arg.tunnel, event);
			return eventify.makePromise(event, val => (val != undefined));
		}

		onUpdateDone(arg) {
			// unlock update promises
			if (arg.tunnel != undefined) {
				let event = this.__update_events.get(arg.tunnel);
				if (event) {
					this.__update_events.delete(arg.tunnel);
					delete arg.tunnel;
					event.value = arg;
				}
			}
			// since externalprovider does not support tunnel yet
			// free all remaining promises
			for (let event of this.__update_events.values()) {
				event.value = {};
			}
		}
	}

	return TimingObjectBase;
});


