/**
 * MediaSync
 *
 * author: njaal.borch@motioncorporation.com
 *
 * Copyright 2015
 * License: LGPL
 */

var mediascape = function(_MS_) {

  /**
   * Detect if we need to kick the element
   * If it returns true, you can re-run this function on
   * a user interaction to actually perform the kick
   */
  var _need_kick;
  function needKick(elem, onerror) {
    if (_need_kick === false) {
      return false;
    }
    if (elem.canplay) {
      _need_kick = false;
      return false;
    }
    var vol = elem.volume;
    // If muted, we won't detect MEI on Chrome but we want to be quiet
    elem.volume = 0.01;  
    var p;
    try {
      p = elem.play();
    } catch (err) {
      onerror(err);
    }
    if (p !== undefined && p.then) {
      p.then(function() {
        setTimeout(function() {
          elem.pause();
          elem.volume = vol;
        }, 0);

      })
      .catch(function(err) {
        if (onerror) {
          onerror(err);
        } else {
          console.log("Play failed, pass an error function to the needKick function to handle it (likely get the user to click a play button)");          
        }
      });
    } else {
      _need_kick = elem.paused === true;
      elem.pause();    
      elem.volume = vol;
    }
    if (_need_kick && onerror) {
      onerror("Play failed");
    }
    return _need_kick;
  }

  var setSync = function(func, target, msv) {
    var state = msv.query();

    if (state.vel === 0) {
      // We stopped, trigger a single sync when the MSV changes
      var handle_change = function() {
        setSync(func, target, msv);
      };
      msv.on("change", function() {
        if (this.query().vel !== 0) {
          msv.off("change", handle_change);
          handle_change();
        }
      });
      return this;
    }

    var time_left = (target - state.pos)/state.vel;
    if (time_left > 0.001) {
      setTimeout(function() {
        setSync(func, target, msv);
      }, 1000 * ((time_left / 2.0) / state.vel));
      return this;
    }
    func.call();
    return {cancel:function()  {}};
  };


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
   *  * automute (default false)
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
   *  * remember (default false)
   *     Remember the last experience on this device - stores support
   *     or lack of support for variable playback rate.  Records in
   *     localStorage under key.mediasync_vpbr clear it to re-learn
   */
  function mediaSync(elem, motion, options) {
    var API;
    options = options || {};
    options.skew = options.skew || 0.0;
    options.target = options.target || 0.025;
    options.original_target = options.target;
    options.loop = options.loop || false;
    options.target = options.target * 2; // Start out coarse
    if (!options.mode) {
      if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        options.mode = "skip";
      } else {
        options.mode = "auto";
      }
    }
    if (options.remember === undefined){
      options.remember = false;
    }
    if (options.debug || options.remember === false) {
      localStorage.removeItem("mediasync_vpbr");
      options.remember = false;
    }
    if (options.automute === undefined) {
      options.automute = false;
    }
    var _auto_muted = false;

    var play = function() {
      try {
        var p = elem.play();
        if (p) {
          p.catch(function(err) {
            _doCallbacks("error", {event:"error", op:"play", msg:err});
          });
        }
      } catch (err) {
        _doCallbacks("error", {event:"error", op:"play"});
      }
    };

    var onchange = function(e) {
      _bad = 0;
      _samples = [];
      _last_skip = null;

      // If we're running but less than zero, we need to wake up when starting
      if (motion.pos < -options.skew && motion.vel > 0) {
        setTimeout(function() { setSync(onchange, -options.skew, motion) }, 100);
        return;
      }
      // If we're paused, ignore
      //if (_stopped || _paused) {
      //  console.log("Not active");
      //  return;
      // }
     
      if (_update_func !== undefined) {
        _update_func(e);          
      } else {
        console.log("WARNING: onchange but no update func yet");
      }
    };

    var setMotion = function(motion) {
      _bad = 0;
      if (_motion) {
        /* CHANGE BEGIN
          _motion.off("change", onchange);        
        */
        _motion.off("change", _sub);
        _sub = undefined;
        /* CHANGE END */
      }
      _motion = motion;


      /* CHANGE BEGIN

      // if motion is a timing object, we add some shortcuts
      if (_motion.version >= 3) {
        _motion.__defineGetter__("pos", function() {return _motion.query().position;});
        _motion.__defineGetter__("vel", function() {return _motion.query().velocity;});
        _motion.__defineGetter__("acc", function() {return _motion.query().acceleration;});
      }
      needed only for direct access to motions
      */ 

      if (!("pos" in _motion)) {
        _motion.__defineGetter__("pos", function() {return _motion.query().position;});
      }
      if (!("vel" in _motion)) {
        _motion.__defineGetter__("vel", function() {return _motion.query().velocity;});
      }
      if (!("acc" in _motion)) {
        _motion.__defineGetter__("acc", function() {return _motion.query().acceleration;});
      }

      /* CHANGE END */

      /* CHANGE BEGIN 
        _motion.on("change", onchange);
      */
      let ret = _motion.on("change", onchange);      
      if (ret === undefined || ret === _motion) {
        // motion of timingsrc v2
        _sub = onchange;
      } else {
        // timingsrc v3
        _sub = ret;
      }
      /* CHANGE END */
    };

    if (!motion) {
      console.log("WARNING: No motion has been set");
    } else {
      //setMotion(motion);      
    }


    var _stopped = false;
    var _paused = false;
    var _motion;

    function onpaused() {
      if (_motion.vel == 1) {
        play();          
      }      
    }

    function onplay() {
      if (_motion.vel === 0) {
        elem.pause();
      }
    }
    function onerror() {
      console.log(err); // TODO: REPORT ERRORS
      stop();      
    }

    var pause = function(val) {
      if (val === undefined) val = true;
      _paused = val;
      if (!_paused) {
        onchange();
      }
    };

    var stop = function() {
      _stopped = true;
      elem.removeEventListener("paused", onpaused);
      elem.removeEventListener("playing", onplay);
      elem.removeEventListener("error", onerror);
    };

    var _update_func;
    var _bad = 0;
    var _amazing = 0;
    var last_update;
    var _samples = [];
    var _vpbr; // Variable playback rate
    var _last_bad = 0;
    var _perfect = 5;
    var _is_in_sync = false;
    var _last_skip;
    var _thrashing = 0;

    /*
      CHANGE BEGIN
    */
    var _sub;
    /*
      CHANGE END
    */

    var skip = function(pos) {
      if (elem.readyState === 0) {
        return;
      }
      if (_motion.vel != 1) {
        // Just skip, don't do estimation
        elem.currentTime = pos;
        _last_skip = undefined;
        _doCallbacks("skip", {event:"skip", pos:pos, target:_motion.pos, adjust:0});
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
            options.target = Math.min(1, options.target*2);            
            _doCallbacks("target_change", {
              event: "target_change",
              target: options.target,
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
        };
      }
      if (_is_in_sync) {
        _is_in_sync = false;
        _doCallbacks("sync", {event:"sync", sync:false});
      }
      _doCallbacks("skip", {event:"skip", pos:pos + adjust, target:_motion.pos, adjust:adjust});
    };


    function loop(pos) {
      if (options.loop) {
        if (options.duration) {
          return pos % options.duration;          
        } else {
          return pos % elem.duration;                    
        }
      }
      return pos;
    }

    // onTimeChange handler for variable playback rate
    var last_pbr_diff;
    var update_func_playbackspeed = function(e) {
      if (_stopped || _paused) {
        return;
      }
        var snapshot = query();
        if (loop(snapshot.pos) == last_update) {
        /*  Figure out what this does - it makes it impossible to detect a reloaded video playing while we're not playing...
          return;
          */
        }
        last_update = loop(snapshot.pos);
        // If we're outside of the media range, don't stress the system
        var p = loop(snapshot.pos + options.skew);
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
        if (snapshot.vel !== 0) {
          if (elem.paused) {
            play();
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
          var ts = performance.now();
          var diff = p - elem.currentTime;
          if ((diff < -1) || (snapshot.vel === 0 || Math.abs(diff) > 1)) {
            _dbg({type:"jump", diff:diff});
            // Stationary, we need to just jump
            var new_pos = loop(snapshot.pos + options.skew);
            if (performance.now() - _last_bad > 150) {
              //_bad += 10;
              _last_bad = performance.now();            
              skip(new_pos);
            }
            return;
          }

          // If the diff is substantially larger than last time we updated it, trigger as broken
          if (last_pbr_diff && Math.abs(diff - last_pbr_diff) > 0.500) {
            //console.log("VPBR broken it seems", diff-last_pbr_diff);
            _bad += 10;
            //throw new Error("Variable playback rate seems broken");

          }

          // Need to smooth diffs, many browsers are too inconsistent!
          _samples.push({diff:diff, ts:ts, pos: p});
          var dp = _samples[_samples.length - 1].pos - _samples[0].pos;
          var dt = _samples[_samples.length - 1].ts - _samples[0].ts;
          if (_samples.length >= 3) {
            var avg = 0;
            for (var i = 0; i < _samples.length; i++) {
              avg += _samples[i].diff;
            }
            diff = avg / _samples.length;
            if (_samples.length > 3) {
              _samples = _samples.splice(0, 1);              
            }
          } else {
            return;
          }

          var pbr = 1000 * dp / dt;
          //console.log("Playback rate was:", pbr, "reported", elem.playbackRate, elem.playbackRate - pbr);
          // Actual sync
          _dbg({type:"dbg", diff:diff, bad:_bad, vpbr:_vpbr});
          var getRate = function(limit, suggested) {
            return Math.min(_motion.vel+limit, Math.max(_motion.vel-limit, _motion.vel + suggested));
          };

          if (Math.abs(diff) > 1) {
            _samples = [];
            elem.playbackRate = getRate(1, diff*1.3); //Math.max(0, _motion.vel + (diff * 1.30));
            last_pbr_diff = diff;
            _dbg({type:"vpbr", level:"coarse", rate:elem.playbackRate});
            _bad += 4;
          } else if (Math.abs(diff) > 0.5) {
            _samples = [];
            elem.playbackRate = getRate(0.5, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            last_pbr_diff = diff;
            _dbg({type:"vpbr", level:"mid", rate:elem.playbackRate});
            _bad += 2;
          } else if (Math.abs(diff) > 0.1) {
            _samples = [];
            elem.playbackRate = getRate(0.4, diff*0.75);//Math.min(1.10, _motion.vel + (diff * 0.75));
            last_pbr_diff = diff;
            _dbg({type:"vpbr", level:"midfine", rate:elem.playbackRate});
            _bad += 1;
          } else if (Math.abs(diff) > 0.025) {
            _samples = [];
            var newpbr = pbr - elem.playbackRate;
            //console.log("New pbr", elem.playbackRate, "->", newpbr, getRate(0.30, diff*0.60));
            //elem.playbackRate = newpbr;
            elem.playbackRate = getRate(0.30, diff*0.60); //Math.min(1.015, _motion.vel + (diff * 0.30));
             last_pbr_diff = diff;
           _dbg({type:"vpbr", level:"fine", rate:elem.playbackRate});
          } else {
            if (!_vpbr) {
              _bad = Math.max(0, _bad-20);
              _amazing++;
              if (_amazing > 5) {
                _vpbr = true; // Very unlikely to get here if we don't support it!
                if (localStorage && options.remember) {
                  _dbg("Variable Playback Rate capability stored");
                  localStorage.mediasync_vpbr = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":true});
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
            //elem.playbackRate = getRate(0.02, diff * 0.07) + (pbr - 1); //_motion.vel + (diff * 0.1);
            elem.playbackRate = getRate(0.02, diff * 0.07); //_motion.vel + (diff * 0.1);
            last_pbr_diff = diff;              
        }
        if (options.automute) {
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
        if (options.automute) {
          elem.muted = false;
        }
        _last_skip = null;  // Reset skip stuff
        if (localStorage && options.remember) {
          _dbg("Variable Playback Rate NOT SUPPORTED, remembering this  ");
          console.log("Variable playback speed not supported (remembered)");
          localStorage.mediasync_vpbr = JSON.stringify({'appVersion':navigator.appVersion, "vpbr":false});
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
      var duration = elem.duration;
      var new_pos;
      if (duration) {
        if (snapshot.pos < 0 || snapshot.pos > duration) {  // Use snapshot, skew is not part of this
          if (!elem.paused) {
            elem.currentTime = duration - 0.03;
            elem.pause();
          }
          return;
        }
      }

      if (snapshot.vel > 0) {
        if (elem.paused) {
          play();
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
        new_pos = loop(snapshot.pos + options.skew);
        if (elem.currentTime != new_pos) {
          skip(new_pos, "jump");
        }
        return;
      }

      var p = snapshot.pos + options.skew;
      var diff = p - elem.currentTime;
      var ts = performance.now();

      // If this was a Motion jump, skip immediately
      if (ev !== undefined && ev.pos !== undefined) {
        _dbg("MOTION JUMP");
        new_pos = snapshot.pos + options.skew;
        skip(new_pos);
        return;
      }

      // Smooth diffs as currentTime is often inconsistent
      _samples.push({diff:diff, ts:ts, pos: p});
      if (_samples.length >= 3) {
        var avg = 0;
        for (var i = 0; i < _samples.length; i++) {
          avg += _samples[i].diff;
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
        options.target = Math.min(1, options.target*1.4);
        _perfect = 0;
        _doCallbacks("target_change", {
          event: "target_change",
          target: options.target,
          reason: "unknown"
        });
      } else if (_perfect > 15) {
        // We are hitting the target, make target smaller if we're beyond the users preference
        _dbg("Feels better");
        if (options.target == options.original_target) {
          // We're improving yet 'perfect', trigger "good" sync event
          if (!_is_in_sync) {
            _is_in_sync = true;
            _doCallbacks("sync", {event:"sync", sync:true});
          }
        }
        options.target = Math.max(Math.abs(diff) * 0.7, options.original_target);
        _perfect -= 8;
        _doCallbacks("target_change", {
          event: "target_change",
          target: options.target,
          reason: "improving"
        });
      }

      _dbg({type:"dbg", diff:diff, target:options.target, perfect:_perfect});

      if (Math.abs(diff) > options.target) {
        // Target miss - if we're still confident, don't do anything about it
        _perfect -= 1;
        if (_perfect > 0) {
          return;
        }
        // We've had too many misses, skip
        new_pos = _motion.pos + options.skew;
        //_dbg("Adjusting time to " + new_pos);
        _perfect += 8;  // Give some breathing space
        skip(new_pos);
      } else {
        // Target hit
        if (Math.abs(diff - last_diff) < options.target / 2) {
          _perfect++;
        }
        last_diff = diff;
      }
    };

    var _initialized = false;
    var init = function() {
      if (_initialized) return;
      _initialized = true;
      if (_motion === undefined) {
        setMotion(motion);
      }
      if (localStorage && options.remember) {
         if (localStorage.mediasync_vpbr) {
            var vpbr = JSON.parse(localStorage.mediasync_vpbr);
            if (vpbr.appVersion === navigator.appVersion) {
              _vpbr = vpbr.vpbr;
            }
         }
      }

      if (options.mode === "vpbr") {
        _vpbr = true;
      }
      if (options.mode === "skip" || _vpbr === false) {
        elem.playbackRate = 1.0;
        _update_func = update_func_skip;
      } else {
        if (options.automute) {
          elem.muted = true;
          _auto_muted = true;
          _doCallbacks("muted", {event:"muted", muted:true});
        }
        _update_func = update_func_playbackspeed;
      }
      elem.removeEventListener("canplay", init);
      elem.removeEventListener("playing", init);
      _setUpdateFunc(_update_func);
      //_motion.on("change", onchange);
    };

    elem.addEventListener("canplay", init);
    elem.addEventListener("playing", init);    

    var _last_update_func;
    var _poller;
    var _setUpdateFunc = function(func) {
      if (_last_update_func) {
        clearInterval(_poller);
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
    };

    var query = function() {
      // Handle both msvs and timing objects

      /*
        CHANGE BEGIN

        if (_motion.version >= 3) {
          var q = _motion.query();
          return {
            pos: q.position,
            vel: q.velocity,
            acc: q.acceleration
          };
        }

      */
      if ("version" in _motion) {
        if (_motion.version < 3) {
          // motion
          return _motion.query();
        }        
      }
      // timing object
      let {position:pos, velocity:vel, acceleration:acc} = _motion.query();
      return {pos, vel, acc};
      /*
        CHANGE END
      */
    };


    var setSkew = function(skew) {
      options.skew = skew;
    };

    var getSkew = function() {
      return options.skew;
    };

    var setOption = function(option, value) {
      options[option] = value;
      if (option === "target") {
        options.original_target = value;
      }
    };

    /*
     * Return 'playbackRate' or 'skip' for play method 
     */
    var getMethod = function() {
      if (_update_func === update_func_playbackspeed) {
        return "playbackRate";
      } 
      return "skip";
    };

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
          var event2 = document.createEvent("Event");
          event2.initEvent("canplay", true, false);
          elem.dispatchEvent(event2);
        }
      }
    }, 100);


    // callbacks    
    var _callbacks = {
      skip: [],
      mode_change: [],
      target_change: [],
      muted: [],
      sync: [],
      error: []
    };
    var _doCallbacks = function(what, e) {
      if (!_callbacks.hasOwnProperty(what)) {
        throw "Unsupported event: " + what;
      }
      for (var i = 0; i < _callbacks[what].length; i++) {
        h = _callbacks[what][i];
        try {
          h.call(API, e);
        } catch (e2) {
          console.log("Error in " + what + ": " + h + ": " + e2);
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
      if (!options.debug) {
        return;
      }
      if (typeof(options.debug) === "function") {
        //options.debug(arguments);
        var args = arguments;
        setTimeout(function() {
          options.debug.apply(window, args);
        }, 0);
      } else {
        var args2 = [];
        for (var k in arguments) {
          args2.push(arguments[k]);
        }
        console.log(JSON.stringify(args2));
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
      off: off,
      init:init
    };
    return API;
  }

  _MS_.mediaSync = mediaSync;
  _MS_.mediaNeedKick = needKick;
  return _MS_;
} (mediascape || {});


// Support mcorp integration too
if (!window.hasOwnProperty("MCorp")) {
  MCorp = {};
}

MCorp.mediaSync = mediascape.mediaSync;
MCorp.mediaNeedKick = mediascape.mediaNeedKick;
