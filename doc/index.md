---
layout: default
title: Documentation
---

The timingsrc library implements the timing object programming model. 
This document briefly introduces the following concepts and provides links for further documentation.

- [timing objects](#timingobject)
- [timing providers](#timingprovider)
- [sequencing tools](#sequencing)
- [media synchronization tools](#mediasync)
 
Note that the timingsrc library implements [Immediate Events Background](background_eventing.html) semantics for many of its event types. 

Finally, terms and definitions used in this documentation are clarified in [terminology](#terminology).  


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

Additionally, timing converters are a special kind of timing objects that depend on an other timing object.
Timing converters are useful when you need an alternative representations for a single timing object. For instance, 
timing converters may be used to shift or scale the timeline.


- [TimingObject API](api_timingobject.html)
- [TimingObject Example](exp_timingobject.html)
- [TimingConverter API](api_timingconverter.html)
- [TimingConverter Example](exp_timingconverter.html)

<a name="timingprovider"></a>
## Timing Providers

work in progress..


<a name="sequencing"></a>
## Sequencing Tools

Given a timing object, a common challenge is to correctly align timed data. This challenge is known under many names;
timed events, triggers, upcalls etc. Such timed data are also commonly collected into scripts, tracks, logs or time-series. 
Here the term sequencing broadly refers to the translation of timed data into timed execution. We are not making any
distinction concerning the specific type of data, and instead aim to provide generic mechanisms useful for a wide variety of applications.

**setPointCallback** and **setIntervalCallback** are simple tools inspired by _setTimeout_ and _setInterval_. setPointCallback triggers a callback when the timing object passes by a specific point on the timeline. setIntervalCallback is associated with periodic points along the timeline.

- [TimingCallback API](api_timingcallback.html)
- [TimingCallback Example](exp_timingcallback.html)

**Sequencer** and **IntervalSequencer** are more sophisticated tools designed to work on larger sets of intervals. Both emit _enter_ and _exit_ events as intervals becomes _active_ or _inactive_, but differ in how they define this condition. 

- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html)
- [Sequencer Usage](usage_sequencer.html)
- [Sequencer Example](exp_sequencer.html)
- [IntervalSequencer Example](exp_intervalsequencer.html)


<a name="mediasync"></a>
## Media Synchronization Tools

Ideally, we would like HTML5 Media Elements to implement [timed playback mode](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) and accept the timing object as timingsrc. However, until this is a reality we need to address media synchronization in JavaScript. The MediaSync library is made for this. It is based on a comprehensive study of the behavior of media elements in a variety of browsers. The MediaSync library is not optimised for specific combinations of browser, media type and architecture, but aims to provide best effort synchronization in very different settings.

- [MediaSync Background](background_mediasync.html)
- [MediaSync API](api_mediasync.html)
- [MediaSync Example](exp_mediasync.html)


<a name="terminology"></a>
## Terminology

- **Timeline** A timeline is simply the set of floating point numbers p where min \<= p \<= max. min and max are floating point numbers and may take on values -Infinity or Infinity. Values on the timeline are usually associated with a unit, such as seconds, frame counter or slide number.

- **Timing object** Defines a timeline and movement of a point along this timeline. Point *not moving* (i.e. standing still or paused) is considered a special case of movement. The timing object supports continuous movements (expressed through velocity and acceleration) as well as discrete jumps on the timeline. A discrete jumps from A to B here implies that no time was spent on the transition and that no point p between A and B was visited.

- **Timed data** Objects, whose validity is defined in reference to a timeline. For instance, the validity of subtitles are typically defined in reference to a media timeline. Points and intervals on the timeline is a common way of defining object validity, but not the only way. Timed scripts are a special case of timed data where objects represent operations or commands to be executed.

- **Sequencing** The process of translating timed data or a timed script into timed execution.

- **Timed Media** A timed media presentation is created by mapping timed media content (i.e. timed data) to a common timeline, and applying movement along this timeline. *So, timed media is ultimately created from two distinct entities; timing resources and timed content resources.* No timed content (i.e. empty) is considered a special case. This way, a media presentation may dynamically replace all its timed content during playback/presentation, yet remain well defined at all times. Multiple timingobjects/timelines may be defined for a single media presentation, and media content may define validity with respect to multiple timelines.

- **Online Timed Media** Online timed media is media presentation where at least one resource (timing resource or content resource) is connected to an online resource.

- **Multi-device Timed Media** A timed media presentation where at least one timing object is connected to an online timing resource. It follows that multi-device timed media is also online timed media.

> Timed media is created from two distinct entities; timing objects and timed content.
