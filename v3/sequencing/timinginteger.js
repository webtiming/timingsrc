/*
    Copyright 2017 Norut Northern Research Institute
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

define (['../util/motionutils', '../util/eventify'], function (motionutils, eventify) {

  /*
    Integer value that is controlled by a timing object.
    implemented as a tiny wrapper around a timing object.
    Change event emitted whenever the integer value changes.
  */
  var isNumeric = function(obj){
    return !Array.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
  };


  var TimingInteger = function (timingObject, options) {
    // timingsrc
    this._timingsrc;

    options = options || {};
  
    // option value
    if (options.value === undefined) {
      options.value = 0;
    }
    if (!isNumeric(options.value)) {
      throw new Error ("value not nummeric", options.value);
    }
    this._value = options.value;
  
    // option - min - max
    if (options.min !== undefined) {
      if (!isNumeric(options.min)) {
        throw new Error ("option.min not nummeric", options.min);
      }
    }
    if (options.max !== undefined) {
      if (!isNumeric(options.max)) {
        throw new Error ("option.min not nummeric", options.max);
      }
    }
    this._options = options;


    // events
    eventify.eventifyInstance(this);
    this.eventifyDefineEvent("change", {init:true});

    // timeout
    this._timeout = null;

    // timing object
    var self = this;
    this._wrappedOnChange = function () {self._onChange();};
    this.timingsrc = timingObject;
  }
  eventify.eventifyPrototype(TimingInteger.prototype);

  
  /*
    events
  */

  TimingInteger.prototype.eventifyMakeInitEvents = function (type) {
    if (type === "change") {
      return [this.value];
    }
    return [];
  };

  /*
    readiness
  */

  Object.defineProperty(TimingInteger.prototype, "ready", {
    get: function () {return this._timingsrc.ready;}
  });

  TimingInteger.prototype.isReady = function () {
    return this._timingsrc.isReady();
  };

  /*
    public api - integer value
    forwards to timing object position
  */

  Object.defineProperty(TimingInteger.prototype, "value", {
    get : function () {
      return this._value;
    },
    set : function (value) {
      // set will fail if to is not ready
      this._timingsrc.update({position:value});
    }
  });


  /*
    timingsrc
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingInteger.prototype, 'timingsrc', {
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
    Timeouts
  */

  TimingInteger.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
  };

  // update event from timing object
  TimingInteger.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timingsrc
  TimingInteger.prototype._onChange = function () {
    this._refresh();
    this._renewTimeout();
  };

  // update event from timing object
  TimingInteger.prototype._onTimeout = function () {
    this._refresh();
    this._renewTimeout();
  };

  TimingInteger.prototype._refresh = function () {
    var value = Math.floor(this._timingsrc.query().position);
    if (this._options.max !== undefined && value > this._options.max) {
      value = this._options.max;
    }
    if (this._options.min !== undefined && value < this._options.min) {
      value = this._options.min;
    }
    if (value !== this._value) {
      this._value = value;
      this.eventifyTriggerEvent("change", this.value);
    }
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  TimingInteger.prototype._calculatePoints = function (position) {
    var before, after;
    var isTarget = Number.isInteger(position);
    if (isTarget === true) {
      before = position - 1;
      after = position + 1;
    } else {
      before = Math.floor(position);
      after = before + 1;
    }
    return {
      isTarget : isTarget,
      before : before,
      after : after
    };
  };


  TimingInteger.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  TimingInteger.prototype.close = function () {
    this._clearTimeout();
    if (this._timingsrc) {
      this._timingsrc.off("change", this._wrappedOnChange, this);
      this._timingsrc = undefined;
    }
  };

  return TimingInteger;
}); 