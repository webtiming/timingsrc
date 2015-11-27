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

define (['util/motionutils'], function (motionutils) {

    'use strict';


    var SetTimingCallback = function (timingObject, position, handler) {
      this._timingsrc = to;
      this._handler = handler;
      this._target = position;
      this._timeout = null;
      this._wrappedOnChange = function () {this._onChange();};

      // initialise
      this.timingsrc = to;
    }; 

    // update event from timing object
    SetTimingCallback.prototype._onChange = function () {
      this._clearTimeout();
      var vector = this._timingsrc.query();
      var secDelay = motionutils.calculateMinPositiveRealSolution(vector, this._target);
      console.log(secDelay);
      if (secDelay === null) return null;
      var self = this;
      this._timeout = this._timingsrc.clock.setTimeout(function () {
        self._onTimeout();
      }, secDelay, {anchor: vector.timestamp, early: 0.0005});    
    };

     // update event from timing object
    SetTimingCallback.prototype._onTimeout = function () {
      this.cancel();
      this._handler();
    };

    // update event from timing object
    SetTimingCallback.prototype._clearTimeout = function () {
      // cleanup
      if (this._timeout !== null) {
        this._timeout.cancel();
        this._timeout = null;
      }
    };

    // update event from timing object
    SetTimingCallback.prototype.cancel = function () {
      // cleanup
      this._clearTimeout();
      this._timingsrc.off("change", this._wrappedOnChange, this);  
    };
 
    /*
      Accessor for timingsrc.
      Supports dynamic switching of timing source by assignment.
    */
    Object.defineProperty(SetTimingCallback.prototype, 'timingsrc', {
      get : function () {return this._timingsrc;},
      set : function (timingObject) {
        if (this._timingsrc) {
          this._timingsrc.off("change", this._wrappedOnChange, this);
        }
        clearTimeout(this._tid);
        this._timingsrc = timingObject;
        this._timingsrc.on("change", this._wrappedOnChange, this);
      }
    });

    // module definition
    return {
      SetTimingCallback: SetTimingCallback
    };
}); 