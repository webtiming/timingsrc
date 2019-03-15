---
layout: default
title: Example window sequencing mode (page-local)
demojs : exp_windowsequencer
---

<style type="text/css">
	.active {color:red}
</style> 


- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html) 
- [Sequencer Usage](usage_sequencer.html)

The Sequencer may also provide enter and exit events based on a moving window. Window endpoints are implemented by two timing objects.
The two endpoints may therefore be controlled independently, though in this demo they are not. Instead, SkewConverter is used to skew a root timing object (by -5 and +4) to create two new (but dependent) timingobjects. Window sequencing may be helpful for timed prefetching, visualization of a sliding window of timed data, etc.
  

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
var to = new TIMINGSRC.TimingObject({range:[0,52]});
var toA = new TIMINGSRC.SkewConverter(to, -5.0);
var toB = new TIMINGSRC.SkewConverter(to, 4.0);
      
// Sequencer
var s = new TIMINGSRC.Sequencer(toA, toB);    

// Load Data
Object.keys(data).forEach(function (key) {
  s.addCue(key, new TIMINGSRC.Interval(data[key].start, data[key].end));
});

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
