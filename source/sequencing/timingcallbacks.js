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

    // Utility inheritance function.
  var inherit = function (Child, Parent) {
    var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
    F.prototype = Parent.prototype;
    Child.prototype = new F(); // child gets parents prototypes via F
    Child.uber = Parent.prototype; // reference in parent to superclass
    Child.prototype.constructor = Child; // resetting constructor pointer 
  };


  var TimingCallbackBase = function (timingObject, handler, position) {
   
    this._timingsrc = to;
    this._handler = handler;
    this._timeout = null;
    this._wrappedOnChange = function () {this._onChange();};
    // initialise
    this.timingsrc = to;
  }; 

  // update event from timing object
  TimingCallbackBase.prototype._onChange = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      var _continue = self._onTimeout();
      if (!_continue) {
        console.log("cancel");
        self.cancel();
      }
      self._handler();
    }, res.delay, {anchor: res.anchor, early: 0.0005});    
  };

  // update event from timing object
  TimingCallbackBase.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timing object
  TimingCallbackBase.prototype.cancel = function () {
    // cleanup
    this._clearTimeout();
    this._timingsrc.off("change", this._wrappedOnChange, this);  
  };

  /*
    Accessor for timingsrc.
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingCallbackBase.prototype, 'timingsrc', {
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




  var SetTimingCallback = function (timingObject, handler, target, options) {
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.repeat = (this._options.repeat !== undefined) ? this._options.repeat : false;
    this._target = target;
  };
  inherit(SetTimingCallback, TimingCallbackBase);

  // update event from timing object
  SetTimingCallback.prototype._onTimeout = function () {
    return this._options.repeat;
  };

  SetTimingCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var delay = motionutils.calculateMinPositiveRealSolution(vector, this._target);
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };




  // module definition
  return {
    SetTimingCallback: SetTimingCallback
  };
}); 