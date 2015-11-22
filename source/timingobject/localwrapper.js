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

define(['./timingbase'], function (timingbase) {

	'use strict';

	var WrapperBase = timingbase.WrapperBase;	
	var inherit = timingbase.inherit;

	/*
		LOCAL WRAPPER

		Update requests are cached locally, visible to the query
		operation, thus allowing them to take effect immediately
		(speculatively).

		A timeout clears the speculative internal vector after some time,
		unless a change notification is received in the mean time.

		NO SUPPORT for STREAMING updates. 
		- bind update request to update notification

	*/

	var LocalWrapper = function (timingObject) {
		WrapperBase.call(this, timingObject);
		this._speculative = false;
	};
	inherit(LocalWrapper, WrapperBase);

	// overrides
	LocalWrapper.prototype.update = function (vector) {		
		var newVector = this.timingsrc.update(vector);
		this._speculative = true;
		// process update immediately
		var self = this;
		setTimeout(function () {
			self._preProcess(newVector);
		}, 0);
		return newVector;
	};

	// overrides
	LocalWrapper.prototype._onChange = function (vector) {
		if (this._speculative) {
			this._speculative = false;
			// todo - suppress change only if it corresponds to change request sent by self
		}
		return vector;
	};

	return LocalWrapper;
});