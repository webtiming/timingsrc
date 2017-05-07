---
layout: default
title: Example Sequencer (page-local)
demojs : exp_sequencer
---

<style type="text/css">
	.active {color:red}
</style>

- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html) 
- [Sequencer Usage](usage_sequencer.html)


The Sequencer provides enter and exit events based on a moving point. This moving point is implemented and controlled by a timing object.
Sequencer events is used to control styling (red color).

#### Demo

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
var to = new TIMINGSRC.TimingObject({range:[0,52]});

// Sequencer
var s = new TIMINGSRC.Sequencer(to); 

// Load data
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
