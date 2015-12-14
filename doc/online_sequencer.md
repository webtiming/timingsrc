---
layout: default
title: Example Multi-device Sequencer
demojs : exp_sequencer
appidmcorp: 8456579076771837888
---

<style type="text/css">
	.active {color:red}
</style>


- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html) 
- [Sequencer Usage](usage_sequencer.html) 
- [Sequencer Example](exp_sequencer.html)
- [IntervalSequencer Example](exp_intervalsequencer.html)


The Sequencer provides enter and exit events based on a moving point. This moving point is implemented and controlled by a timing object.
Sequencer events is used to control styling (red color).

This is a modification of [Sequencer Example](exp_sequencer.html), using [Shared Motion](shared_motion.html) as online timing provider. 

To play with an online timing provider yourself, please consult [Shared Motion Timing Provider](shared_motion.html)

#### Demo

> Please open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.

<p>
  <!-- Timing Objects position --> 
  Timing Object position <span id="pos" style="font-weight:bold"></span>
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

// Sequencer
var s = new TIMINGSRC.Sequencer(to); 

// Load data
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
