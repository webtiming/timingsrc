---
layout: default
title: Documentation
---

The timingsrc library implements the timing object programming model. 
This document briefly introduces the following concepts and provides links for further documentation.

- [timing objects](#timingobject)
- [timing converters](#timingconverter)
- [timing providers](#timingprovider)
- [sequencing tools](#sequencing)
- [media synchronization tools](#mediasync)
 
Note that the timingsrc library implements [Initial Events](background_eventing.html) semantics for many of its event types. 

 

<a name="timingsrc"></a>

## Module

The timingsrc module provides [timing objects](#timingobject), [timing providers](#timingprovider), and tools for [sequencing](#sequencing) and [media synchronization](#mediasync). The module is implemented as plain JavaScript and packaged for regular script inclusion as well as [AMD](http://requirejs.org/) module for use with requirejs, see [helloworld](../examples/helloworld.html) and [helloworld-require](../examples/helloworld-require.html) for full examples. 

```javascript
// regular script import - 'TIMINGSRC' property on global object 
var timingsrc = TIMINGSRC;              
// require js module import
var timingsrc = require("./timingsrc");
// use the module
var timingObject = new timingsrc.TimingObject();
```

The timingsrc module is implemented in plain JavaScript and should run in every modern Web browser.

The timingsrc library is available from GitHub.

- [timingsrc.js](../lib/timingsrc.js)
- [timingsrc-min.js](../lib/timingsrc-min.js)
- [timingsrc-require.js](../lib/timingsrc-require.js)
- [timingsrc-require-min.js](../lib/timingsrc-require-min.js)


<a name="timingobject"></a>

## Timing Objects

The timing objects is the basic concept of this programming model. You may think of it as an advanced stop-watch.
If you start it, its value progresses as a clock, until you pause or resume it later. The timing object additionally 
supports behavior like time-shifting, different velocities (including backwards), and acceleration.

- [TimingObject Background](background_timingobject.html)
- [TimingObject API](api_timingobject.html)
- [TimingObject Example (page-local)](exp_timingobject.html)
- [TimingObject Example (multi-device)](online_timingobject.html)

<a name="timingconverter"></a>

## Timing Converters

Timing converters are a special kind of timing objects that depend on an other timing object.
Timing converters are useful when you need an alternative representations for a single timing object. For instance, 
timing converters may be used to shift or scale the timeline.

- [TimingConverter Background](background_timingconverter.html)
- [TimingConverter API](api_timingconverter.html)
- [TimingConverter Example (page-local)](exp_timingconverter.html)
- [TimingConverter Example (multi-device)](online_timingconverter.html)

<a name="timingprovider"></a>

## Timing Providers

Timing objects may become multi-device by connecting with an online timing provider. *Shared Motion* by Motion Corporation implements the [Timing Provider API](api_timingprovider.html) and can therefore be used directly with the timing object.

- [TimingProvider API](api_timingprovider.html)
- [Shared Motion Timing Provider](shared_motion.html)

<a name="sequencing"></a>

## Sequencing Tools

Given a timing object, a common challenge is to correctly align timed data. This challenge is known under many names;
timed events, triggers, upcalls etc. Such timed data are also commonly collected into scripts, tracks, logs or time-series. 
Here the term sequencing broadly refers to the translation of timed data into timed execution. We are not making any
distinction concerning the specific type of data, and instead aim to provide generic mechanisms useful for a wide variety of applications.

**setPointCallback** and **setIntervalCallback** are simple tools inspired by _setTimeout_ and _setInterval_. setPointCallback triggers a callback when the timing object passes by a specific point on the timeline. setIntervalCallback is associated with periodic points along the timeline.

- [TimingCallback API](api_timingcallback.html)
- [TimingCallback Example (page-local)](exp_timingcallback.html)
- [TimingCallback Example (multi-device)](online_timingcallback.html)

The **Sequencer** is a more sophisticated tool designed to work on larger sets of points and intervals. Both emit _enter_ and _exit_ events as intervals becomes _active_ or _inactive_, but differ in how they define this condition. 

[check out impressive old style sequencing video here!](https://www.facebook.com/Excite.Espana/videos/10154330747448032/)

- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html)
- [Sequencer Usage](usage_sequencer.html)
- [Sequencer Example (page-local)](exp_sequencer.html)
- [Sequencer Example (multi-device)](online_sequencer.html)
- [Window sequencing Example (page-local)](exp_windowsequencer.html)
- [Window sequencing Example (multi-device)](online_windowsequencer.html)


<a name="mediasync"></a>

## Media Synchronization Tools

Ideally, we would like HTML5 Media Elements to implement [timed playback mode](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) and accept the timing object as timingsrc. However, until this is a reality we need to address media synchronization in JavaScript. The MediaSync library is made for this. It is based on a comprehensive study of the behavior of media elements in a variety of browsers. The MediaSync library is not optimised for specific combinations of browser, media type and architecture, but aims to provide best effort synchronization in very different settings.

- [MediaSync Background](background_mediasync.html)
- [MediaSync API](api_mediasync.html)
- [MediaSync Example (page-local)](exp_mediasync.html)
- [MediaSync Example (multi-device)](online_mediasync.html)

