---
layout: default
title: Example window sequencing mode(multi-device)
demojs : exp_windowsequencer
appidmcorp: 8456579076771837888
---

<style type="text/css">
	.active {color:red}
</style>

- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html)
- [Sequencer Usage](usage_sequencer.html)

The Sequencer may also provide enter and exit events based on a moving window. Window endpoints are implemented by two timing objects.
The two endpoints may therefore be controlled independently, though in this demo they are not. Instead, SkewConverter is used to skew a root timing object (by -5 and +4) to create two new (but dependent) timingobjects. Window sequencing may be helpful for timed prefetching, visualization of a sliding window of timed data, etc.

#### Demo Tips

- open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.
- the timing provider is shared globally, so others might be playing with demo too...
- try reloading the demo on one device/tab while the demo is running on others.


#### Demo

<p>
  <!-- Timing Objects position -->
  Active Window : [ <span style="font-weight:bold" id="posBefore"></span>, <span style="font-weight:bold" id="posAfter"></span> ]
</p>
<p>
  <!-- Timing Object Controls -->
  <button id="play">Play</button>
  <button id="pause">Pause</button>
  <button id="reset">Reset</button>
  <button id="backwards">Backwards</button>
</p>
<p>
  <div id="data"></div>
</p>


#### JavaScript

```javascript
 // Timing Object
var to = new TIMINGSRC.TimingObject({provider:timingProvider});
var toA = new TIMINGSRC.SkewConverter(to, -5.0);
var toB = new TIMINGSRC.SkewConverter(to, 4.0);

// Sequencer
var s = new TIMINGSRC.Sequencer(toA, toB);

// Load Data
var r = s.request();
Object.keys(data).forEach(function (key) {
	r.addCue(key, new TIMINGSRC.Interval(data[key].start, data[key].end));
});
r.submit();

// Register Handlers
s.on("change", function (e) {
  var el =  document.getElementById(e.key);
  el.classList.add("active");
});
s.on("remove", function (e) {
  var el = document.getElementById(e.key);
  el.classList.remove("active");
});

```
