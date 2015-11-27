var TM = function(_TM_) {

  /**
   * Sync provides a similar function to setTimeout, but it is based
   * on an MSV as opposed to local time, and the target is absolute.
   *
   * For example, calling sync(myfunc, 1.01, mymsv) will trigger
   * callback of myfunc when the msv hits the point 0.01 (regardless
   * of speed or direction of the msv).  It can however take arbitrary time
   */
  var setSync = function(func, target, msv) {
    var state = msv.query();

    if (state.vel == 0) {
      // We stopped, trigger a single sync when the MSV changes
      function handle_change() {
        TM.setSync(func, target, msv);
      };
      msv.on("change", function() {
        if (this.query().vel != 0) {
          console.log("Restart");
          msv.off("change", handle_change);
          handle_change();
        }
      });
      return this;
    }

    var time_left = Math.abs(target - state.pos)/state.vel;
    console.log(time_left);
    if (time_left > 0.05) {
      var sub_timer = setTimeout(function() {
        TM.setSync(func, target, msv)
      }, Math.abs((time_left / 2.) / state.vel));
      //return sub_timer;
      return this;
    }

    while (true) {
      var q = msv.query();
      if (q.vel == 0) {
        return TM.setSync(func, target, msv);
      }
      time_left = Math.abs(target - q.pos);
      console.log(time_left);
      if (time_left < 0.001 || time_left > 0.055 || Math.abs(time_left) > 0.1) {
        TM.setSync(func, target, msv);
      } 
      return;
    }
    func.call();
    return {cancel:function()  {}};
  }

  // Interval thing - trigger on every X position (basically %)
  var setInterval = function(func, target, msv, offset) {
    offset = parseFloat(offset) || 0.0;
    var running = true;
    var timeout = null; // For cancelling it
    var cancel = function() {
      running = false;
    }

    msv.on("change", function() {
      clearTimeout(timeout);
    });

    function find_next_time() {
      // Calculate next time
      if (isNaN(target)) {
        return target.call(msv);
      }

      // Calculate the time to the next one
      if (msv.query().vel > 0) {
        return msv.query().pos + (offset + target - ((msv.query().pos) % target))
      }
      return msv.query().pos - ((msv.query().pos + offset) % target);
    }

    function waitfor(it) {
      if (running == false)
        return;

      var state = msv.query();
      if (state.vel == 0) {
        return;
      }

      var time_left = it - state.pos;
      if ((time_left > 0.04 && state.vel > 0) || (time_left < 0.04 && state.vel < 0)) {
        timer = setTimeout(function() {
          waitfor(it)
        }, Math.abs((time_left / 2.) / state.vel));
        return;
      }

      if (Math.abs(time_left) < 0.05) {
        // Very short left, busyloop
        while (true) {
          //for (var x=0; x<100; x++) {
          var q = msv.query();
          if (q.vel == 0) {
            setTimeout(waitfor(it), 0);
            return;
          }
          time_left = it - q.pos;
          if (q.vel > 0 && time_left < 0) break;
          if (q.vel < 0 && time_left > 0) break;
        }
        // We're there, call it
        //setTimeout(func, 0);
        func.call()
      }

      // Schedule the next one!
      if (isNaN(target)) {
        next_time = target.call(msv);
      } else {
        if (msv.query().vel > 0) {
          next_time += target;
        } else {
          // Going backwards
          next_time -= target;
        }
      }
      waitfor(next_time);
    }
    // Need to set the first one!
    //next_time = find_next_time();
    //waitfor(next_time);

    // We stopped, trigger a single sync when the MSV changes
    function handle_change() {
      next_time = find_next_time()
      waitfor(next_time);
    };
    msv.on("change", function() {
      if (this.query().vel != 0) {
        msv.off("change", handle_change);
        handle_change();
      }
    });

    return {
      "cancel": cancel
    };
  }

  _TM_.setSync = setSync;
  _TM_.setInterval = setInterval;
  return _TM_;

}(TM || {});