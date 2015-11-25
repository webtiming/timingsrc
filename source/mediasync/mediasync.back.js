/**
 * MediaSync
 *
 * author: njaal.borch@motioncorporation.com
 *
 * Copyright 2015
 * License: LGPL
 */

define(function(){

  /**
   * Detect if we need to kick the element
   * If it returns true, you can re-run this function on
   * a user interaction to actually perform the kick
   */
  var _need_kick;
  function needKick(elem) {
    if (_need_kick === false) {
      return false;
    }
    if (elem.canplay) {
      _need_kick = false;
      return false;
    }
    var m = elem.muted;
    elem.muted = true
    elem.play();
    _need_kick = elem.paused == true;
    elem.pause();
    elem.muted = m;
    return _need_kick;
  }

  /**
   * The mediaSync object will try to synchronize an HTML 
   * media element to a Shared Motion.  It exploits 
   * playbackRate functionality if possible, but will fallback 
   * to only currentTime manipulation (skipping) if neccesariy.
   *
   * Options: 
   *  * skew (default 0.0) 
   *     how many seconds (float) should be added to the 
   *     motion before synchronization.  Calculate by 
   *     start point of element - start point of motion
   *  * automute (default true)
   *     Mute the media element when playing too fast (or too slow) 
   *  * mode (default "auto")
   *     "skip": Force "skip" mode - i.e. don't try using playbackRate.
   *     "vpbr": Force variable playback rate.  Normally not a good idea
   *     "auto" (default): try playbackRate. If it's not supported, it will
   *     struggle for a while before reverting.  If 'remember' is not set to
   *     false, this will only happen once after each browser update.
   *  * loop (default false)
   *     Loop the media   
   *  * debug (default null)
   *     If debug is true, log to console, if a function, the function
   *     will be called with debug info
   *  * target (default 0.025 - 25ms ~ lipsync)
   *     What are we aiming for?  Default is likely OK, if we can do 
   *     better, we will.  If the target is too narrow, you'll end up
   *     with a more skippy experience.  When using variable playback
   *     rates, this parameter is ignored (target is always 0)
   *  * remember (default true)
   *     Remember the last experience on this device - stores support
   *     or lack of support for variable playback rate.  Records in
   *     localStorage under key "mediascape_vpbr", clear it to re-learn
   */
  var MediaSync = function(elem, motion, options) {
 
    // options
    this._options = options || {};
    this._options.skew = this._options.skew || 0.0;
    this._options.target = this._options.target || 0.025;
    this._options.original_target = this._options.target;
    this._options.loop = this._options.loop || false;
    this._options.target = this._options.target * 2; // Start out coarse
    if (this._options.remember === undefined){
      this._options.remember = true;
    }
    if (this._options.debug) {
      localStorage.removeItem("mediascape_vpbr")
      this._options.remember = false;
    }
    if (this._options.automute === undefined) {
      this._options.automute = true;
    }
  
    // variables
    this._auto_muted = false;   
    this._bad = 0;
    this._amazing = 0;
    this.last_update;
    this._samples = [];
    this._vpbr; // Variable playback rate
    this._last_bad = 0;
    this._perfect = 5;
    this._is_in_sync = false;
    this._last_skip = null;
    this._thrashing = 0;
    this._stopped = false;
    this._paused = false;
    this._motion;
    this._update_func = undefined;
    this._elem = elem;
  };




  MediaSync.prototype.onchange = function(e) {
    this._bad = 0;
    this._samples = [];
    this._last_skip = null;

    // If we're paused, ignore
    if (this._stopped || this._paused) {
      return;
    }
   
    if (this._update_func != undefined) {
      this._update_func(e);          
    } else {
      console.log("WARNING: onchange but no update func yet");
    }
  };

  MediaSync.prototype.setMotion = function(motion) {
    this._bad = 0;
    if (this._motion) {
      this._motion.off("change", onchange);        
    }
    this._motion = motion;

    // if motion is a timing object, we add some shortcuts
    if (this._motion.version == 3) {
      this._motion.__defineGetter__("pos", function() {return _motion.query().position});
      this._motion.__defineGetter__("vel", function() {return _motion.query().velocity});
      this._motion.__defineGetter__("acc", function() {return _motion.query().acceleration});
    }
    this._motion.on("change", onchange, this);
  };

  if (!motion) {
    console.log("WARNING: No motion has been set");
  } else {
    //setMotion(motion);      
  }
};


   

MediaSync.prototype.onpaused = function () {
  if (this._motion.vel == 1) {
    this._elem.play();
  }      
};

MediaSync.prototype.onplay = function() {
  if (this._motion.vel == 0) {
    this._elem.pause();
  }
};

MediaSync.prototype.onerror = function() {
  // TODO: REPORT ERRORS
  this.stop();      
};

MediaSync.prototype.pause = function (val) {
  if (val == undefined) {
    val = true;
  }
  this._paused = val;
  if (!this._paused) {
    this.onchange();
  }
};

MediaSync.prototype.stop = function() {
  this._stopped = true;
  this._elem.removeEventListener("paused", this.onpaused);
  this._elem.removeEventListener("play", this.onplay);
  this._elem.removeEventListener("error", this.onerror);
};


MediaSync.prototype.skip = function(pos) {
  if (elem.readyState == 0) {
    return;
  }
  if (_motion.vel != 1) {
    // Just skip, don't do estimation
    elem.currentTime = pos;
    _last_skip = undefined;
    _doCallbacks("skip", {event:"skip", pos:pos, target:_motion.pos, adjust:0})
    return;
  }

  var adjust = 0;
  var now = performance.now();
  if (_last_skip) {
    if (now - _last_skip.ts < 1500) {
      _thrashing += 1;
      if (_thrashing > 3) {
        // We skipped just a short time ago, we're thrashing
        _dbg("Lost all confidence (thrashing)");
        _options.target = Math.min(1, _options.target*2);            
        _doCallbacks("target_change", {
          event: "target_change",
          target: _options.target,
          reason: "thrashing"
        });
        _thrashing = 0;
      }
    } else {
      _thrashing = 0;
    }
    var elapsed = (now - _last_skip.ts) / 1000;
    var cur_pos = elem.currentTime;
    var miss = (loop(_last_skip.pos + elapsed)) - cur_pos;
    adjust = _last_skip.adjust + miss;
    if (Math.abs(adjust) > 5) adjust = 0; // Too sluggish, likely unlucky
  }
  // Ensure that we're playing back at speed 1
  elem.playbackRate = 1.0;
  _dbg({type:"skip", pos:pos + adjust, target:loop(_motion.pos), adjust:adjust});
  _perfect = Math.min(5, _perfect + 5);
  if (_motion.vel != 1) {
    elem.currentTime = pos;
  } else {
    elem.currentTime = pos + adjust;
    _last_skip = {
      ts: now, //performance.now(),
      pos: pos,
      adjust: adjust
    }
  }
  if (_is_in_sync) {
    _is_in_sync = false;
    _doCallbacks("sync", {event:"sync", sync:false});
  }
  _doCallbacks("skip", {event:"skip", pos:pos + adjust, target:_motion.pos, adjust:adjust})
};


    function loop(pos) {
      if (_options.loop) {
        if (_options.duration) {
          return pos % _options.duration;          
        } else {
          return pos % elem.duration;                    
        }
      }
      return pos;
    }

    // onTimeChange handler for variable playback rate
    var update_func_playbackspeed = function(e) {
      if (_stopped || _paused) {
        return;
      }
        var snapshot = query();
        if (loop(snapshot.pos) == last_update) {
          return;
        }
        last_update = loop(snapshot.pos);

        // If we're outside of the media range, don't stress the system
        var p = loop(snapshot.pos + _options.skew);
        var duration = elem.duration;
        if (duration) {
          if (p < 0 || p > duration) {
            if (!elem.paused) {
              elem.pause();
            }
            return;
          }
        }

        // Force element to play/pause correctly
        if (snapshot.vel != 0) {
          if (elem.paused) {
            elem.play();
          }
        } else if (!elem.paused) {
          elem.pause();
        }

        try {
          if (!_vpbr && _bad > 40) {
            if (_auto_muted) {
              elem.muted = false;
              _auto_muted = false;              
            }
            _doCallbacks("muted", {event:"muted", muted:false});
            throw new Error("Variable playback rate seems broken - " + _bad + " bad");
          }
          // If we're WAY OFF, jump
          var diff = p - elem.currentTime;
          if ((diff < -1) || (snapshot.vel == 0 || Math.abs(diff) > 1)) {
            _dbg({type:"jump", diff:diff});
            // Stationary, we need to just jump
            var new_pos = loop(snapshot.pos + _options.skew);
            if (performance.now() - _last_bad > 150) {
              _bad += 10;
              _last_bad = performance.now();            
              skip(new_pos);
            }
            return;
          }

          // Need to smooth diffs, many browsers are too inconsistent!
          _samples.push(diff);
          if (_samples.length >= 3) {
            var avg = 0;
            for (var i = 0; i < _samples.length; i++) {
              avg += _samples[i];
            }
            diff = avg / _samples.length;
            _samples = _samples.splice(0, 1);;
          } else {
            return;
          }

          // Actual sync
          _dbg({type:"dbg", diff:diff, bad:_bad, vpbr:_vpbr});
          function getRate(limit, suggested) {
            //return _motion.vel + (diff*1000*diff*1000)/1000;
            return Math.min(_motion.vel+limit, Math.max(_motion.vel-limit, _motion.vel + suggested));
            /*
            var mult = 7;
            if (limit < 1) mult = 5;
            if (limit < 0.1) mult = 3;
            if (limit < 0.025) mult = 2;
            if (diff < 0) {
              return Math.max(_motion.vel - limit, _motion.vel - mult*Math.pow(diff, 2));
            }
            return Math.min(_motion.vel + limit, _motion.vel + mult*Math.pow(diff, 2));
            */
          }

          if (Math.abs(diff) > 1) {
            _samples = [];
            elem.playbackRate = getRate(1, diff*1.3); //Math.max(0, _motion.vel + (diff * 1.30));
            _dbg({type:"vpbr", level:"coarse", rate:elem.playbackRate});
            _bad += 20;
          } else if (Math.abs(diff) > 0.5) {
            _samples = [];
            elem.playbackRate = getRate(0.5, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            _dbg({type:"vpbr", level:"mid", rate:elem.playbackRate});
            _bad += 10;
          } else if (Math.abs(diff) > 0.1) {
            _samples = [];
            elem.playbackRate = getRate(0.4, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            _dbg({type:"vpbr", level:"midfine", rate:elem.playbackRate});
            _bad += 6;
          } else if (Math.abs(diff) > 0.025) {
            _samples = [];
            elem.playbackRate = getRate(0.30, diff*0.60)//Math.min(1.015, _motion.vel + (diff * 0.30));
            _dbg({type:"vpbr", level:"fine", rate:elem.playbackRate});
          } else {
            if (!_vpbr) {
              _bad = Math.max(0, _bad-20);
              _amazing++;
              if (_amazing > 5) {
                _vpbr = true; // Very unlikely to get here if we don't support it!
                if (localStorage && _options.remember) {
                  _dbg("Variable Playback Rate capability stored");
                  localStorage["mediascape_vpbr"] = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":true});
                }
              }
            }
            if (!_is_in_sync) {
              _is_in_sync = true;
              _doCallbacks("sync", {
                event: "sync",
                sync: true
              });
            }
            elem.playbackRate = getRate(0.02, diff * 0.07); //_motion.vel + (diff * 0.1);
          }
        if (_options.automute) {
          if (!elem.muted && (elem.playbackRate > 1.05 || elem.playbackRate < 0.95)) {
            _auto_muted = true;              
            elem.muted = true;
            _doCallbacks("muted", {event:"muted", muted:true});
            _dbg({type:"mute", muted:true});
          } else if (elem.muted && _auto_muted) {
            _auto_muted = false;
            elem.muted = false;
            _dbg({type:"mute", muted:false});
            _doCallbacks("muted", {event:"muted", muted:false});
          }
        }

      } catch (err) {
        // Not supported after all!
        if (_options.automute) {
          elem.muted = false;
        }
        _last_skip = null;  // Reset skip stuff
        if (localStorage && _options.remember) {
          _dbg("Variable Playback Rate NOT SUPPORTED, remembering this  ");
          localStorage["mediascape_vpbr"] = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":false});
        }
        console.log("Error setting variable playback speed - seems broken", err);
        _setUpdateFunc(update_func_skip);
      }
    };

    var last_pos;
    var last_diff;
    // timeUpdate handler for skip based sync
    var update_func_skip = function(ev) {
      if (_stopped || _paused) {
        return;
      }

      var snapshot = query();
      if (snapshot.vel > 0) {
        if (elem.paused) {
          elem.play();
        }
      } else if (!elem.paused) {
        elem.pause();
      }

      if (snapshot.vel != 1) {
        if (loop(snapshot.pos) == last_pos) {
          return;
        }
        last_pos = snapshot.pos;
        _dbg("Jump, playback speed is not :", snapshot.vel);
        // We need to just jump
        var new_pos = loop(snapshot.pos + _options.skew);
        if (elem.currentTime != new_pos) {
          skip(new_pos, "jump");
        }
        return;
      }

      var p = snapshot.pos + _options.skew;
      var diff = p - elem.currentTime;

      // If this was a Motion jump, skip immediately
      if (ev != undefined && ev.pos != undefined) {
        _dbg("MOTION JUMP");
        var new_pos = snapshot.pos + _options.skew;
        skip(new_pos);
        return;
      }

      // Smooth diffs as currentTime is often inconsistent
      _samples.push(diff);
      if (_samples.length >= 3) {
        var avg = 0;
        for (var i = 0; i < _samples.length; i++) {
          avg += _samples[i];
        }
        diff = avg / _samples.length;
        _samples.splice(0, 1);
      } else {
        return;
      }

      // We use the number of very good hits to build confidence
      if (Math.abs(diff) < 0.001) {
        _perfect = Math.max(5, _perfect); // Give us some breathing space!      
      }

      if (_perfect <= -2) {
        // We are failing to meet the target, make target bigger
        _dbg("Lost all confidence");
        _options.target = Math.min(1, _options.target*1.4);
        _perfect = 0;
        _doCallbacks("target_change", {
          event: "target_change",
          target: _options.target,
          reason: "unknown"
        });
      } else if (_perfect > 15) {
        // We are hitting the target, make target smaller if we're beyond the users preference
        _dbg("Feels better");
        if (_options.target == _options.original_target) {
          // We're improving yet 'perfect', trigger "good" sync event
          if (!_is_in_sync) {
            _is_in_sync = true;
            _doCallbacks("sync", {event:"sync", sync:true});
          }
        }
        _options.target = Math.max(Math.abs(diff) * 0.7, _options.original_target);
        _perfect -= 8;
        _doCallbacks("target_change", {
          event: "target_change",
          target: _options.target,
          reason: "improving"
        });
      }

      _dbg({type:"dbg", diff:diff, target:_options.target, perfect:_perfect});

      if (Math.abs(diff) > _options.target) {
        // Target miss - if we're still confident, don't do anything about it
        _perfect -= 1;
        if (_perfect > 0) {
          return;
        }
        // We've had too many misses, skip
        new_pos = _motion.pos + _options.skew
        //_dbg("Adjusting time to " + new_pos);
        _perfect += 8;  // Give some breathing space
        skip(new_pos);
      } else {
        // Target hit
        if (Math.abs(diff - last_diff) < _options.target / 2) {
          _perfect++;
        }
        last_diff = diff;
      }
    }

    var _initialized = false;
    function init() {
      if (_initialized) return;
      _initialized = true;
      if (_motion === undefined) {
        setMotion(motion);
      }
      if (localStorage && _options.remember) {
         if (localStorage["mediascape_vpbr"]) {
            var vpbr = JSON.parse(localStorage["mediascape_vpbr"]);
            if (vpbr.appVersion === navigator.appVersion) {
              _vpbr = vpbr.vpbr;
            }
         }
      }

      if (_options.mode === "vpbr") {
        _vpbr = true;
      }
      if (_options.mode === "skip" || _vpbr === false) {
        elem.playbackRate = 1.0;
        _update_func = update_func_skip;
      } else {
        if (_options.automute) {
          elem.muted = true;
          _auto_muted = true;
          _doCallbacks("muted", {event:"muted", muted:true});
        }
        _update_func = update_func_playbackspeed;
      }
      elem.removeEventListener("canplay", init);
      elem.removeEventListener("playing", init);
      _setUpdateFunc(_update_func);
      _motion.on("change", onchange);
    } 

    elem.addEventListener("canplay", init);
    elem.addEventListener("playing", init);    

    var _last_update_func;
    var _setUpdateFunc = function(func) {
      if (_last_update_func) {
        elem.removeEventListener("timeupdate", _last_update_func);
        elem.removeEventListener("pause", _last_update_func);
        elem.removeEventListener("ended", _last_update_func);        
      }
      _last_update_func = func;
      elem.playbackRate = 1.0;
      elem.addEventListener("timeupdate", func);
      elem.addEventListener("pause", func);
      elem.addEventListener("ended", func);

      if (func === update_func_playbackspeed) {
        _doCallbacks("mode_change", {event:"mode_change", mode:"vpbr"});
      } else {
        _doCallbacks("mode_change", {event:"mode_change", mode:"skip"});
      }
    }

    var query = function() {
      // Handle both msvs and timing objects
      if (_motion.version == 3) {
        var q = _motion.query();
        return {
          pos: q.position,
          vel: q.velocity,
          acc: q.acceleration
        }
      }
      return _motion.query();
    }


    var setSkew = function(skew) {
      _options.skew = skew;
    }

    var getSkew = function() {
      return _options.skew;
    }

    var setOption = function(option, value) {
      _options[option] = value;
      if (option === "target") {
        _options.original_target = value;
      }
    }

    /*
     * Return 'playbackRate' or 'skip' for play method 
     */
    var getMethod = function() {
      if (_update_func === update_func_playbackspeed) {
        return "playbackRate";
      } 
      return "skip";
    }

    // As we are likely asynchronous, we don't really know if elem is already
    // ready!  If it has, it will not emit canplay.  Also, canplay seems shady
    // regardless
    var beater = setInterval(function() {
      if (elem.readyState >= 2) {
        clearInterval(beater);
        try {
          var event = new Event("canplay");
          elem.dispatchEvent(event);
        } catch (e) {
          var event = document.createEvent("Event");
          event.initEvent("canplay", true, false)
          elem.dispatchEvent(event);
        }
      };
    }, 100);


    // callbacks    
    var _callbacks = {
      skip: [],
      mode_change: [],
      target_change: [],
      muted: [],
      sync: []
    };
    var _doCallbacks = function(what, e) {
      if (!_callbacks.hasOwnProperty(what)) {
        throw "Unsupported event: " + what;
      }
      for (var i = 0; i < _callbacks[what].length; i++) {
        h = _callbacks[what][i];
        try {
          h.call(API, e);
        } catch (e) {
          console.log("Error in " + what + ": " + h + ": " + e);
        }
      }
    };

    // unregister callback
    var off = function(what, handler) {
      if (!_callbacks.hasOwnProperty(what)) throw "Unknown parameter " + what;
      var index = _callbacks[what].indexOf(handler);
      if (index > -1) {
        _callbacks[what].splice(index, 1);
      }
      return API;
    };

    var on = function(what, handler, agentid) {
      if (!_callbacks.hasOwnProperty(what)) {
        throw new Error("Unsupported event: " + what);
      }
      if (!handler || typeof handler !== "function") throw "Illegal handler";
      var index = _callbacks[what].indexOf(handler);
      if (index != -1) {
        throw new Error("Already registered");
      }

      // register handler
      _callbacks[what].push(handler);

      // do immediate callback?
      setTimeout(function() {
        if (what === "sync") {
          _doCallbacks(what, {
            event: what,
            sync: _is_in_sync
          }, handler);          
        }
        if (what === "muted") {
          _doCallbacks(what, {
            event: what,
            muted: _auto_muted
          }, handler);          
        }
      }, 0);
      return API;
    };


    function _dbg() {
      if (!_options.debug) {
        return;
      }
      if (typeof(_options.debug) === "function") {
        //_options.debug(arguments);
        var args = arguments;
        setTimeout(function() {
          _options.debug.apply(window, args);
        }, 0);
      } else {
        var args = [];
        for (var k in arguments) {
          args.push(arguments[k]);
        }
        console.log(JSON.stringify(args));
      }
    }




    // Export the API
    API = {
      setSkew: setSkew,
      getSkew: getSkew,
      setOption: setOption,
      getMethod: getMethod,
      setMotion: setMotion,
      stop: stop,
      pause: pause,
      on: on,
      off: off
    };
    return API;
  }

  _MS_.mediaSync = mediaSync;
  _MS_.mediaNeedKick = needKick;
  return _MS_;

});

