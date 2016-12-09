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
	LOCAL CONVERTER

	Update requests are cached locally, visible to the query
	operation, thus allowing them to take effect immediately
	(speculatively).

	This allows as remote timing object to emulate the low latency of a local timing object.

	A timeout clears the speculative internal vector after some time,
	unless a change notification is received in the mean time.

	NO SUPPORT for STREAMING updates. 
	- This implementation is simple, and does not provide support
	for streaming updates.

	This would require the ability to bind update request to update notification, and to have this
	supported by the timing provider.
*/

define(['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var LocalConverter = function (timingsrc) {
		if (!(this instanceof LocalConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc);
		this._speculative = false;
	};
	inherit(LocalConverter, TimingObjectBase);

	// overrides
	LocalConverter.prototype.update = function (vector) {		
		var newVector = this.timingsrc.update(vector);
		this._speculative = true;
		// process update immediately
		var self = this;
		Promise.resolve().then(function () {
			self._preProcess(newVector);
		});
		return newVector;
	};

	// overrides
	LocalConverter.prototype.onVectorChange = function (vector) {
		if (this._speculative) {
			this._speculative = false;
			// todo - suppress change only if it corresponds to change request sent by self
		}
		return vector;
	};

	return LocalConverter;
});