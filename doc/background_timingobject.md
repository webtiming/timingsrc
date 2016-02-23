---
layout: default
title: Timing Object Background
demojs : exp_timingobject
---

- [Timing Object Background](background_timingobject.html)
- [Timing Object API](api_timingobject.html)
- [Timing Object Example (page-local)](exp_timingobject.html)
- [Timing Object Example (multi-device)](online_timingobject.html)


The timingsrc library is a JavaScript implementation of the timing object programming model, introduced in the [Timing Object Draft Spec](http://webtiming.github.io/timingobject/). Standardization of the timing object is advocated by the [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/).Here are some key points:

<a name="nutshell"></a>

## Timing Object

#### In a nutshell
The timing object is a very simple object, essentially an advanced stop watch. If started with a velocity, its position changes predictably in time, until at some point later, it is paused, or perhaps reset. It may be queried for its current position at any time. For example, it should take exactly 2.0 seconds for the position to advance from 3.0 to 5.0, if the velocity is 1.0. The timing object supports discrete jumps on the timeline, useful for controlling, say a slide show. Velocity is useful for the control of any linear media, including continuous media. Acceleration may not be commonly required, but it is there if you need it. Crucially, the timing object provides a *change* event, emmitted every time its behavior has been altered. This allows timing sensitive components to quickly detect changes and respond by correcting their timing-sensitive behaviour accordingly. 

More about the the timing object in [Timing Object Draft Spec](http://webtiming.github.io/timingobject/#the-timing-object)

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

<a name="motivation"></a>

## Motivation

#### A common API for all things timed

The timing object defines a common API for all things timed. Currently timing sensitive applications, animation frameworks, media frameworks, timed components and widgets all implement their own timing and control mechanisms internally. As a consequence, making them do something together is hard. What we propose instead is a simple model where timing sensitive applications can interface and take direction from an external timing source, a timing object. This way, timing, synchronization and control for heterogeneous components is solved simply sharing the same timing object. A common API for timing also implies a common programming model where higher level concepts, tools and practises can be shared between timing sensitive applications.

#### A gateway to precisely timed multi-device (distributed) applications

Crucially, the timing object also supports integration with online timing services. This extends the idea of sharing a timing object between timing sensitive components in a web page, to timing sensitive components scattered across different devices, globally if needed. We call this multi-device timing. An important implication of this model is that timing sensitive components can be reused in single-device or multi-device applications, without modification. Multi-device support has become a feature of the timing object, not the component. As a result, web developers can focus on exploiting timing in the interest of creating great user experiences, while timing providers can focus on the challenges of multi-device timing.

<a name="programming"></a>

## Programming with Timing Objects

Timing objects are resources used by a Web application, and the programmer may define as many as required. What purposes they serve in the application is up to the programmer. If the application needs a shared, multi-device clock, simply starting a timing object (and never stopping it) might be sufficient. If the clock value should represent milliseconds, set the velocity to 1000 (advances the timing object with 1000 milliseconds per second). If the timing object represents media offset, specify the playback position, the velocity, and perhaps a media duration (range). For videos where offset is measured in seconds or frames, set the velocity accordingly. Or, for musical applications it may be practical to let the timing object represent beats per second. Note also that the timing object may represent time-changes with any kind of floating-point variable. For example, if you have data that is organized according to, say height above sea level, you may want to animate how this data changes as you move vertically. In this case the timing object could represent meters or feet above sea level, and positive and negative velocities would allow you to move gradually both upwards and downwards.


<a name="terminology"></a>

## Terminology

> Timed media is created from two distinct entities; timing objects and timed content.

- **Timeline** A timeline is simply the set of floating point numbers p where min \<= p \<= max. min and max are floating point numbers and may take on values -Infinity or Infinity. Values on the timeline are usually associated with a unit, such as seconds, frame counter or slide number.

- **Timing object** Defines a timeline and movement of a point along this timeline. Point *not moving* (i.e. standing still or paused) is considered a special case of movement. The timing object supports continuous movements (expressed through velocity and acceleration) as well as discrete jumps on the timeline. A discrete jumps from A to B here implies that no time was spent on the transition and that no point p between A and B was visited.

- **Timed data** Objects, whose validity is defined in reference to a timeline. For instance, the validity of subtitles are typically defined in reference to a media timeline. Points and intervals on the timeline is a common way of defining object validity, but not the only way. Timed scripts are a special case of timed data where objects represent operations or commands to be executed.

- **Sequencing** The process of translating timed data or a timed script into timed execution.

- **Timed Media** A timed media presentation is created by mapping timed media content (i.e. timed data) to a common timeline, and applying movement along this timeline. *So, timed media is ultimately created from two distinct entities; timing resources and timed content resources.* No timed content (i.e. empty) is considered a special case. This way, a media presentation may dynamically replace all its timed content during playback/presentation, yet remain well defined at all times. Multiple timingobjects/timelines may be defined for a single media presentation, and media content may define validity with respect to multiple timelines.

- **Multi-device Timed Media** generally means a timed media presentation where at least one resource is online. We use a stricter definition: **Multi-device Timed Media** means a timed media presentation where at least one timing object is connected to an online timing resource.






