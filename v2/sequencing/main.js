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

define(['./sequencer', './windowsequencer', './timingcallbacks', './timinginteger', './activecue'], 
	function (seq, WindowSequencer, timingcallbacks, TimingInteger, ActiveCue) {		
		'use strict';


    // Common constructor for Sequencer and WindowConstructor
    var Sequencer = function (toA, toB, _axis) {
      if (toB === undefined) {
        return new seq.DefaultSequencer(toA, _axis);
      } else {
        return new WindowSequencer(toA, toB, _axis); 
      }
    };

    // Add clone prototype to both Sequencer and WindowSequencer
    seq.DefaultSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
    WindowSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };



		return {
			Sequencer : Sequencer,
			Interval : seq.Interval,
			inherit : seq.inherit,
      setPointCallback : timingcallbacks.setPointCallback,
      setIntervalCallback : timingcallbacks.setIntervalCallback,
      TimingInteger : TimingInteger,
      ActiveCue : ActiveCue
		};
	}
);