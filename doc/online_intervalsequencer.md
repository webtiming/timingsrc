---
layout: default
title: Example Interval Sequencer (multi-device)
demojs : exp_intervalsequencer
appidmcorp: 8456579076771837888
---

<style type="text/css">
	.active {color:red}
</style> 


- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html) 
- [Sequencer Usage](usage_sequencer.html) 
- [Sequencer Example (page-local)](exp_sequencer.html)
- [Sequencer Example (multi-device)](online_sequencer.html)
- [IntervalSequencer Example (page-local)](exp_intervalsequencer.html)
- [IntervalSequencer Example (multi-device)](online_intervalsequencer.html)


The Interval Sequencer provides enter and exit events based on a moving interval. Interval endpoints are implemented by two timing objects.
The two endpoints may therefore be controlled independently, though in this demo they are not. Instead, SkewConverter is used to skew a root timing object (by -5 and +4) to create two new (but dependent) timingobjects. The Interval Sequencer may be helpful for timed prefetching, visualization of a sliding window of timed data, etc.

This is a modification of [IntervalSequencer Example (page-local)](exp_intervalsequencer.html), using [Shared Motion](shared_motion.html) as online timing provider. 

To play with an online timing provider yourself, please consult [Shared Motion Timing Provider](shared_motion.html)


#### Demo Tips

- open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.

- the timing provider is shared globally, so others might be playing with demo too...

- try reloading the demo on one device/tab while the demo is running on others.

#### Demo

<p>
  <!-- Timing Objects position --> 
  Active Interval : [ <span style="font-weight:bold" id="posBefore"></span>, <span style="font-weight:bold" id="posAfter"></span> ]
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
var s = new TIMINGSRC.IntervalSequencer(toA, toB);    

// Load Data
var r = s.request();
Object.keys(data).forEach(function (key) {
	r.addCue(key, new TIMINGSRC.Interval(data[key].start, data[key].end));
});
r.submit();

// Register Handlers
s.on("enter", function (e) {
  var el =  document.getElementById(e.key);
  el.classList.add("active");
});
s.on("exit", function (e) {
  var el = document.getElementById(e.key);
  el.classList.remove("active");
});

```    
