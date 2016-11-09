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

define(['./sequencer'], function (seq) {

	'use strict';

	/* 
		ArraySequencer Works on an array of timed data which will not be modified.
		Uses array index as unique key.
		Uses "start" and "end" properties of elements in array for intervals 
	*/
	var ArraySequencer = function (motion, array) {
		this._array = array;
		seq.Sequencer.call(this, motion);
	};
	seq.inherit(ArraySequencer, seq.Sequencer);

	ArraySequencer.prototype.loadData = function () {
		if (this._array.length === 0) return;
		var r = this.request();
		for (var i=0; i<this._array.length; i++) {
			r.addCue(i.toString(), new seq.Interval(this._array[i].start, this._array[i].end), this._array[i]);
		}
		r.submit();
	};

	ArraySequencer.prototype.getData = function (key) {
		return this._array[parseInt(key)];
	};

	return {
		ArraySequencer : ArraySequencer,
		Interval : seq.Interval,
		inherit : seq.inherit,
		SequencerError : seq.SequencerError
	};
});