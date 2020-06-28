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



import MasterClock from './masterclock.js';


function checkTimingProvider(obj){
	let required = ["on", "skew", "vector", "range", "update"];
	for (let prop of required) {
		if (!(prop in obj)) {
			throw new Error(`TimingProvider ${obj} missing property ${prop}`);
		}
	}
}


/*
	EXTERNAL PROVIDER

	External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
	and the TIMINGSRC API

	Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

	- wraps a timing provider external
	- handles some complexity that arises due to the very simple API of providers
	- implements a clock for the provider
*/

class ExternalProvider {

	constructor(provider, callback, options) {
		checkTimingProvider(provider);
		options = options || {};

		this._provider = provider;
		this._callback = callback;
		this._range;
		this._vector;
		this._ready = false

		/*
			provider clock (may fluctuate based on live skew estimates)
		*/
		this._provider_clock;
		/*
			local clock
			provider clock normalised to values of performance now
			normalisation based on first skew measurement, so
		*/
		this._clock;


		// register event handlers
		this._provider.on("vectorchange", this._onVectorChange.bind(this));
		this._provider.on("skewchange", this._onSkewChange.bind(this));

		// check if provider is ready
		let self = this;
		if (this._provider.skew != undefined) {
			let self = this;
			Promise.resolve(function () {
				self._onSkewChange();
			});
		}
	};

	isReady() {return this._ready;};

	// internal clock
	get clock() {return this._clock;};
	get range() {return this._range;};


	/*
		- local timestamp of vector is set for each new vector, using the skew available at that time
		- the vector then remains unchanged
		- skew changes affect local clock, thereby affecting the result of query operations

		- one could imagine reevaluating the vector as well when the skew changes,
			but then this should be done without triggering change events

		- ideally the vector timestamp should be a function of the provider clock
	*/

	get vector() {
		// local_ts = provider_ts - skew
		let local_ts = this._vector.timestamp - this._provider.skew;
		return {
			position : this._vector.position,
			velocity : this._vector.velocity,
			acceleration : this._vector.acceleration,
			timestamp : local_ts
		}
	}


	// internal provider object
	get provider() {return this._provider;};


	_onSkewChange() {
		if (!this._clock) {
			this._provider_clock = new MasterClock({skew: this._provider.skew});
			this._clock = new MasterClock({skew:0});
		} else {
			this._provider_clock.adjust({skew: this._provider.skew});
			// provider clock adjusted with new skew - correct local clock similarly
			// current_skew = clock_provider - clock_local
			let current_skew = this._provider_clock.now() - this._clock.now();
			// skew delta = new_skew - current_skew
			let skew_delta = this._provider.skew - current_skew;
			this._clock.adjust({skew: skew_delta});
		}
		if (!this.isReady() && this._provider.vector != undefined) {
			// just became ready
			this._ready = true;
			this._range = this._provider.range;
			this._vector = this._provider.vector;
			let eArg = {
				range: this.range,
				...this.vector,
				live: false
			}
			this._callback(eArg);
		}
	};

	_onVectorChange() {
		if (this._clock) {
			// is ready (onSkewChange has fired earlier)
			if (!this._ready) {
				this._ready = true;
			}
			if (!this._range) {
				this._range = this._provider.range;
			}
			this._vector = this._provider.vector;
			let eArg = {
				range: this.range,
				...this.vector
			}
			this._callback(eArg);
		}
	};


	// update
	/*
		TODO - support setting range on provider
		TODO - suppport tunnel
		TODO - support onRangeChange from provider
	*/
	update(arg) {
		let vector = {
			position: arg.position,
			velocity: arg.velocity,
			acceleration: arg.acceleration,
			timestamp: arg.timestamp
		};
		// calc back to provider ts
		// local_ts = provider_ts - skew
		vector.timestamp = vector.timestamp + this._provider.skew;
		let res = this._provider.update(vector);
		// return success
		return true;
	};
}

export default ExternalProvider;


