var run = function (timingProvider) {

    var to = new TIMINGSRC.TimingObject({provider:timingProvider, range:[0,21]});

    // Hook up buttons UI to timing object
    document.getElementById('play').onclick = function () {to.update({velocity:1.0});};
    document.getElementById('pause').onclick = function () {to.update({velocity:0.0});};
    document.getElementById('reset').onclick = function () {to.update({position:0.0, velocity:0.0});};
    document.getElementById("backwards").onclick = function () {to.update({velocity: -1.0});};
    // Print timing object position
    var value = document.getElementById('value');
    to.on("timeupdate", function () {
      value.innerHTML = to.query().position.toFixed(2); 
    });

    var log = document.getElementById('log');
    var append = function (string) {
      var elem = document.createElement('li');
      elem.appendChild(document.createTextNode(string));
      log.appendChild(elem);
    };

    var toggleDisabled = function (elem1, elem2) {
      elem1.disabled = !elem1.disabled;
      elem2.disabled = !elem2.disabled;
      elem1.className = (elem1.disabled) ? "disabled" : "enabled";
      elem2.className = (elem2.disabled) ? "disabled" : "enabled";
    };

    var once;
    var setpointcallbackonceBtn = document.getElementById('setpointcallbackonce');
    setpointcallbackonceBtn.onclick = function () {
      if (once) return;
      var btn = this;
      once = TIMINGSRC.setPointCallback(to, function () {
        append("point callback (once) at position " + to.query().position.toFixed(2));
        // reset
        toggleDisabled(setpointcallbackonceBtn, cancelpointcallbackonceBtn);
        once = undefined;
      }, 4);
      toggleDisabled(setpointcallbackonceBtn, cancelpointcallbackonceBtn);
    };

    var cancelpointcallbackonceBtn = document.getElementById('cancelpointcallbackonce');
    cancelpointcallbackonceBtn.onclick = function () {
      if (once) {
        toggleDisabled(setpointcallbackonceBtn, cancelpointcallbackonceBtn);
        once.cancel();
        once = undefined;
      }
    };

    var repeat;
    var setpointcallbackrepeatBtn = document.getElementById('setpointcallbackrepeat');
    setpointcallbackrepeatBtn.onclick = function () {
      if (repeat) return;
      repeat = TIMINGSRC.setPointCallback(to, function () {
        append("point callback (repeated) at position " + to.query().position.toFixed(2));
      }, 6, {repeat:true});
      toggleDisabled(setpointcallbackrepeatBtn, cancelpointcallbackrepeatBtn);
    };

    var cancelpointcallbackrepeatBtn = document.getElementById('cancelpointcallbackrepeat');
    cancelpointcallbackrepeatBtn.onclick = function () {
      if (repeat) {
        toggleDisabled(setpointcallbackrepeatBtn, cancelpointcallbackrepeatBtn);
        repeat.cancel();
        repeat = undefined;
      }        
    };

    var interval;
    var setintervalcallbackBtn = document.getElementById('setintervalcallback');
    setintervalcallbackBtn.onclick = function () {
      if (interval) return;
      interval = TIMINGSRC.setIntervalCallback(to, function () {
        append("interval callback at position " + to.query().position.toFixed(2));
      }, 6, {offset:2});
      toggleDisabled(setintervalcallbackBtn, cancelintervalcallbackBtn);
    };

    var cancelintervalcallbackBtn = document.getElementById('cancelintervalcallback');
    cancelintervalcallbackBtn.onclick = function () {
      if (interval) {
        toggleDisabled(setintervalcallbackBtn, cancelintervalcallbackBtn);
        interval.cancel();
        interval = undefined;
      }
    };
};
