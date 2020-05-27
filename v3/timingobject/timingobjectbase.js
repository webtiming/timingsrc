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

	/*

		TIMING OBJECT BASE

	*/

	class TimingObjectBase extends TimingBase {

		constructor (timingsrc, options) {
			super(options);
			this._version = 4;
			this._timingsrc = undefined;
			this._sub;
			this.timingsrc = timingsrc;
			// subscription
		};


		// internal clock
		get clock() {return this._timingsrc.clock;};


		onRangeChange(range) {return range;};

		// invoked just after timingsrc switch
		onSwitch() {};


		// timingsrc onchange handler
		_internalOnChange(eArg, eInfo) {
			let vector = this._timingsrc.vector;
			this._preProcess(vector);
		};

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
			if (!timingsrc) {
				let options;
				if (!this._timingsrc) {
					// first time - use options
					options = {
						vector : this._options.vector,
						range : this._options.range
					}
				} else {
					// not first time - use current state
					options = {
						vector : this._vector,
						range : this._range
					}
				}
				timingsrc = new InternalProvider(options);
			}
			else if ((timingsrc instanceof TimingObjectBase) === false) {
				// external provider - try to wrap it
				try {
					timingsrc = new ExternalProvider(timingsrc);
				} catch (e) {
					console.log(timingsrc);
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
				this.sub = undefined;
			}
			this._timingsrc = timingsrc;
			if (this._timingsrc.range !== this._range) {
				this._range = this.onRangeChange(this._timingsrc.range);
			}
			this.onSwitch();
			this._sub = this._timingsrc.on("change", this._internalOnChange.bind(this));
		};

		// update
		update(vector) {
			return this._timingsrc.update(vector);
		};
	}


	return TimingObjectBase;

});


