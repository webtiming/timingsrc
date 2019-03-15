---
layout: default
title: Example Timing Object (multi-device)
demojs : exp_timingobject
appidmcorp: 8456579076771837888
---

- [Timing Object Background](background_timingobject.html)
- [Timing Object API](api_timingobject.html)

Timing Objects may become *online timing objects* if they are connected to an *online timing provider*. This way, turning a single-device demo into a multi-device demo is almost trivial.

#### Demo Tips

- open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.
- the timing provider is shared globally, so others might be playing with demo too...
- try reloading the demo on one device/tab while the demo is running on others.

#### Demo

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

