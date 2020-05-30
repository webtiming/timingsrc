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

	const TimingObjectBase = require('./timingobjectbase');

	/*
		Timing Object
	*/
	class TimingObject extends TimingObjectBase {
		constructor (options) {
			options = options || {};
			// support timing object instead of options
			if (options instanceof TimingObjectBase){
				super(options);
			} else {
				let timingsrc = options.timingsrc || options.provider;
				super(timingsrc, options);
			}
		};
	}

	return TimingObject;
});


