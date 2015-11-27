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

define (['util/motionutils', 'util/eventutils'], 
  function (motionutils, eventutils) {

    'use strict';


    var SetTimingCallback = function (timingObject, position, handler, ctx) {
      this._timingsrc = to;
      this._handler = handler;
      this._ctx = ctx;
      this._target = position;
      this._tid = null;
      this._wrappedOnChange = function () {this._onChange();};

      // initialise
      this.timingsrc = to;
    }; 

    // update event from timing object
    SetTimingCallback.prototype._onChange = function () {

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