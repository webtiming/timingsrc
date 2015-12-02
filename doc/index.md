---
layout: default
title: Documentation
---

The timing object programming model currently includes four concepts;

- [timing objects](#timingobject)
- [sequencing tools](#sequencing)
- [media synchronization tools](#mediasync)
- [timing providers](#timingprovider)

This document briefly introduces these concepts and provides links for further documentation. Finally,
terminology and defintions used in this documentation are clarified in [media model](#mediamodel).  


<a name="timingobject"></a>
## Timing Objects

The timing objects is the basic concept of this programming model. You may think of it as an advanced stop-watch.
If you start it, its value progresses as a clock, until you pause or resume it later. The timing object additionally 
supports behavior like time-shifting, different velocities (including backwards), and acceleration.

Additionally, timing converters are a special kind of timing objects that depend on an other timing object.
Timing converters are useful when you need an alternative representations for a single timing object. For instance, 
timing converters may be used to shift or scale the timeline.

You may read more about programming with timing objects and timing converters in 

- [TimingObject Doc](doc/doctimingobject.html)
- [TimingObject API](doc/apitimingobject.html)

<a name="sequencing"></a>
## Sequencing

Given a timing object, 

The term sequencing here broadly refers to 

- PointCallback and IntervalCallback
- Sequencer (PointSequencer)
- IntervalSequencer

<a name="mediasync"></a>
## MediaSync

- MediaSync

<a name="timingprovider"></a>
## Timing Providers

work in progress..


<a name="mediamodel"></a>
## Media Model