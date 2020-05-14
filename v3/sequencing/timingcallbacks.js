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

define (['../util/motionutils'], function (motionutils) {

  'use strict';

    // Utility inheritance function.
  var inherit = function (Child, Parent) {
    var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
    F.prototype = Parent.prototype;
    Child.prototype = new F(); // child gets parents prototypes via F
    Child.uber = Parent.prototype; // reference in parent to superclass
    Child.prototype.constructor = Child; // resetting constructor pointer 
  };

  var TimingCallbackBase = function (timingObject, handler) {
    this._timingsrc = timingObject;
    this._handler = handler;
    this._timeout = null;
    this._wrappedOnChange = function () {this._onChange();};
    // initialise
    this.timingsrc = timingObject;
  }; 

  TimingCallbackBase.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
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


  /*
      SET POINT CALLBACK
      callback when timing object position is equal to point
      options {repeat:true} implies that callback will occur repeatedly
      every time timing object passes point.
      Default is to fire only once, similar to setTimeout
  */

  var SetPointCallback = function (timingObject, handler, point, options) {
    if (!(this instanceof SetPointCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.repeat = (this._options.repeat !== undefined) ? this._options.repeat : false;
    this._point = point;
  };
  inherit(SetPointCallback, TimingCallbackBase);


  // update event from timing object
  SetPointCallback.prototype._onChange = function () {
    if (this._timingsrc.query().position === this._point) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetPointCallback.prototype._onTimeout = function () {
    if (!this._options.repeat) {
      this.cancel();
    };
    this._handler();
    this._renewTimeout();
  };

  SetPointCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var delay = motionutils.calculateMinPositiveRealSolution(vector, this._point);
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };

  
  /*
    
    SET INTERVAL CALLBACK

    callback callback for every point x, where (x - offset) % length === 0
    options : {offset:offset}
    Default is offset 0
  */

  var SetIntervalCallback = function (timingObject, handler, length, options) {
    if (!(this instanceof SetIntervalCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.offset = (this._options.offset !== undefined) ? this._options.offset : 0;
    this._length = length;
  };
  inherit(SetIntervalCallback, TimingCallbackBase);

  // ovverride modulo to behave better for negative numbers 
  SetIntervalCallback.prototype._mod = function (n, m) {
    return ((n % m) + m) % m;
  };

  // get point representation from float
  SetIntervalCallback.prototype._getPoint = function (x) {
    var skew = this._options.offset;
    return {
      n : Math.floor((x-skew)/this._length),
      offset : this._mod(x-skew, this._length)
    };
  };

    // get float value from point representation
  SetIntervalCallback.prototype._getFloat = function (p) {
    var skew = this._options.offset;
    return skew + (p.n * this._length) + p.offset;
  };

  // update event from timing object
  SetIntervalCallback.prototype._onChange = function () {
    var points = this._calculatePoints(this._timingsrc.query().position);
    if (points.isTarget) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetIntervalCallback.prototype._onTimeout = function () {
    this._handler();
    this._renewTimeout();
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  SetIntervalCallback.prototype._calculatePoints = function (position) {
    var beforePoint = {}, afterPoint = {};
    var target;
    var point = this._getPoint(position);
    if (point.offset === 0) {
      target = true;
      beforePoint.n = point.n - 1;
      beforePoint.offset = point.offset;
      afterPoint.n = point.n + 1;
      afterPoint.offset = point.offset;
    } else {
      target = false;
      beforePoint.n = point.n;
      beforePoint.offset = 0;
      afterPoint.n = point.n + 1;
      afterPoint.offset = 0;
    }
    return {
      isTarget : target,
      before : this._getFloat(beforePoint),
      after : this._getFloat(afterPoint)
    }
  };

  SetIntervalCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  // module definition
  return {
    setPointCallback: function (timingObject, handler, point, options) { return new SetPointCallback(timingObject, handler, point, options);},
    setIntervalCallback : function (timingObject, handler, length, options) { return new SetIntervalCallback(timingObject, handler, length, options);}
  };
}); 