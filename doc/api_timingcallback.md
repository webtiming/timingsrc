---
layout: default
title: Timing Callback API
---

- [TimingCallback API](api_timingcallback.html)
- [TimingCallback Example (page-local)](exp_timingcallback.html)
- [TimingCallback Example (multi-device)](online_timingcallback.html)


This describes the API of [setPointCallback](#setpointcallback) and [setIntervalCallback](#setintervalcallback).


<a name="setpointcallback"></a>

## setPointCallback

Invoke a callback whenever <code>(timingObject.query().position === point)</code>. Implementation based on 
an internal timeout. If the timing object is updated in any way, the internal timeout is re-scheduled.

The default behaviour is to invoke callback at most once, similar to *setTimeout*. However, if option *reapeat* is
specified setPointCallback will provide repeated callbacks on each occasion when timing object position is equal to point.
      


```javascript
var handle = timingsrc.setPointCallback(timingObject, callback, point, options);
handle.cancel();
```
- param: {Object} [timingObject] the timing object
- param: {Function} [callback] callback to be invoked at correct time
- param: {Float} [point] point on the timeline of the timing object
- param: {Object} [options]
- param: {Boolean} [options.repeat] repeated callbacks, default "false"
- return: {Object} [handle] handle for cancelling the callback 


<a name="setintervalcallback"></a>

## setIntervalCallback

Invoke a callback whenever <code>(timingObject.query().position === x) && ((x - offset) % length === 0)</code>.
For example, if offset is 2 and length is 4, setIntervalCallback will invoke callbacks
for points <code>[... -2, 2, 6, 10, 14, ...]</code>

```javascript
var handle = timingsrc.setIntervalCallback(timingObject, callback, length, options);
handle.cancel();
```

- param: {Object} [timingObject] the timing object
- param: {Function} [callback] callback to be invoked at correct time
- param: {Float} [length] length of interval between points
- param: {Object} [options]
- param: {Float} [options.offset] offset applied to all points, default 0.
- return: {Object} [handle] handle for cancelling the callback 
