---
layout: default
title: Example Timing Callback (multi-device)
demojs : exp_timingcallback
appidmcorp: 8456579076771837888
---

<style>
.enabled {
  font-weight: bold;
}
.disabled {
  font-weight: normal;
}
</style>

- [TimingCallback API](api_timingcallback.html)
- [TimingCallback Example (page-local)](exp_timingcallback.html)
- [TimingCallback Example (multi-device)](online_timingcallback.html)

This is a modification of [Timing Callback Example (page-local)](exp_timingcallback.html), using [Shared Motion](shared_motion.html) as online timing provider. 

To play with an online timing provider yourself, please consult [Shared Motion Timing Provider](shared_motion.html)


#### Demo Tips

- open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.

- the timing provider is shared globally, so others might be playing with demo too...

- try reloading the demo on one device/tab while the demo is running on others.

#### Demo

**Timing Object**

<p>
  <button id="play">Play</button>
  <button id="pause">Pause</button>
  <button id="reset">Reset</button>
  <button id="backwards">Backwards</button>
</p>
<div style="font-weight:bold" id="value"></div>

**SetPointCallback**
<p>
  <button id="setpointcallbackonce" class="enabled">SetPointCallbackOnce</button>
  <button id="cancelpointcallbackonce" class="disabled" disabled="true">CancelPointCallbackOnce</button>
</p>
<p>
  <button id="setpointcallbackrepeat" class="enabled">SetPointCallbackRepeat</button>
  <button id="cancelpointcallbackrepeat" class="disabled" disabled="true">CancelPointCallbackRepeat</button>
</p>
<ul>
  <li>SetPointCallbackOnce generates a callback the first time position 4 is reached.</li>
  <li>SetPointCallbackRepeat generates a callback every time position 6 is reached.</li>
</ul>

**SetIntervalCallback**
<p>
  <button id="setintervalcallback" class="enabled">SetIntervalCallback</button>
  <button id="cancelintervalcallback" class="disabled" disabled="true">CancelIntervalCallback</button>
</p>
<ul>
  <li>SetIntervalCallback is set up with length 6 and offset 2, generating <i>periodical</i> callbacks at ...,2,8,14,20,...</li>
</ul>

**Callback Log**
<ul id="log">
</ul>


#### JavaScript

```javascript
TIMINGSRC.setPointCallback(to, function () {
	append("point callback (once) at position " + to.query().position.toFixed(2));
}, 4);

TIMINGSRC.setPointCallback(to, function () {
    append("point callback (repeated) at position " + to.query().position.toFixed(2));
}, 6, {repeat:true});

TIMINGSRC.setIntervalCallback(to, function () {
    append("interval callback at position " + to.query().position.toFixed(2));
}, 6, {offset:2});
```    
