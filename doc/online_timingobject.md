---
layout: default
title: Example Multi-device Timing Object
demojs : exp_timingobject
appidmcorp: 8456579076771837888
---

- [Timing Provider Background](background_timingprovider.html)
- [Timing Provider API](api_timingprovider.html)
- [Timing Provider Example](online_timingobject.html)

Timing Objects may become *online timing objects* if they are connected to an *online timing provider*.

This way, turning a single-device demo into a multi-device demo is almost trivial.

This is a modification of [Timing Object Example](exp_timingobject.html), using [Shared Motion](shared_motion.html) as online timing provider. 


To play with an online timing provider yourself, please consult [Shared Motion Timing Provider](shared_motion.html)

#### Demo

> Please open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.

<p id="buttons">
  <!-- absolute -->
  <button id='reset'>Reset</button>
  <button id='pause'>Pause</button>
  <button id='play'>Play</button>
  <button id='end'>End</button>
  <!-- relative-->
  <button id='p-'>Pos-1</button>
  <button id='p+'>Pos+1</button>
  <button id='v-'>Vel-1</button>
  <button id='v+'>Vel+1</button>
  <button id='a-'>Acc-1</button>
  <button id='a+'>Acc+1</button>
</p>
<p>
  <!-- position -->
  <div id='position' style="font-weight:bold"></div>
</p>


#### JavaScript

This is the essential JavaScript of the original [Timing Object Example](exp_timingobject.html).

```javascript
var run = function () {
    // timing object
    var to = new TIMINGSRC.TimingObject({range:[0,100]});
    ...
};
``` 

Turn this into a multi-device demo by plugging an online timing provider into the timing object.

```javascript
var run = function (timingProvider) {
    // timing object
    var to = new TIMINGSRC.TimingObject({provider:timingProvider});
    ...
};
``` 

