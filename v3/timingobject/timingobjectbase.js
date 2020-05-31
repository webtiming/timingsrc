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

			// update
			this.__update_events = new Map();

			// initialise timingsrc
			if (timingsrc == undefined) {
				// no given timingsrc
				// create InternalProvider from options
				let _options = {
					vector : this._options.vector,
					range : this._options.range
				}
				this._timingsrc = new InternalProvider(_options);
			} else {
				this._timingsrc = timingsrc;
			}
			this._sub = this._timingsrc.on("timingsrc", this.__handleEvent.bind(this));
		};


		// internal clock
		get clock() {return this._timingsrc.clock;};

		// version
		get version () {return this.__version;};


		/*

			timingsrc property and switching on assignment

		*/
		get timingsrc () {
			if (this._timingsrc instanceof InternalProvider) {
				return undefined
			} else if (this._timingsrc instanceof ExternalProvider) {
				return this._timingsrc.provider;
			} else {
				return this._timingsrc;
			}
		}

		set timingsrc (timingsrc) {
			// new timingsrc undefined
			if (timingsrc == undefined) {
				// create InternalProvider from current state
				let _options = {
					vector : this._vector,
					range : this._range
				}
				timingsrc = new InternalProvider(_options);
			}
			else if ((timingsrc instanceof TimingObjectBase) === false) {
				// external provider - try to wrap it
				try {
					timingsrc = new ExternalProvider(timingsrc);
				} catch (e) {
					console.log(timingsrc);
					console.log(e);
					throw new Error ("illegal timingsrc - not instance of timing object base and not timing provider");
				}
			}
			// transformation when new timingsrc is ready
			if (timingsrc.isReady()) {
				this._doSwitch(timingsrc);
			} else {
				let self = this;
				timingsrc.ready.then(function (){
					self._doSwitch(timingsrc);
				});
			}
		}

		_doSwitch(timingsrc) {
			// disconnect and clean up timingsrc
			if (this._timingsrc) {
				this._timingsrc.off(this._sub);
				this._sub = undefined;
			}
			this._timingsrc = timingsrc;
			// TODO : build this into preProcess instead?
			if (this._timingsrc.range !== this._range) {
				this._range = this.onRangeChange(this._timingsrc.range);
			}
			this.onSwitch();
			this._sub = this._timingsrc.on("timingsrc", this.__handleEvent.bind(this));
		};

		// internal update
		__update(arg) {
			return this._timingsrc.__update(arg);
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


