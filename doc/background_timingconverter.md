---
layout: default
title: Timing Converter Background
---

- [Timing Converter Background](background_timingconverter.html)
- [Timing Converter API](api_timingconverter.html)
- [Timing Converter Example](exp_timingconverter.html)

Timing Converters are useful when you need an alternative representation for a Timing Object. For instance, 
if different media components refer to different timelines, *skewed* representations of a common timing object could make up for this.
*Scaling* the timeline might also be useful in some circumstances. In video playback the position of a timing object typically represents media offset in seconds. 
Alternatively, frame numbers could be reported as position, with standard playback velocity being 24 or 25 (fps), depending on the media format.
Or, when working with music it might be sensible to use beat number as position, and beats per second (bps) as velocity. 
Again, different representations might be required to integrate different media components, or simply to suit the preferences of different programmers.

A Timing Converter provides an alternative representation for a Timing Object. 

- a timing converter **is** a timing object that depends on another timing object. 
- the *timingsrc* property of a Timing Converter identifies its source timing object.  
- a timing converter implements some modification relative to its *timingsrc*, but never affects the *timingsrc* in any way.
- different timing converters can depend on the same *timingsrc*.
- a timing converter can itself be the *timingsrc* of another timing converter.

So, a hierarchy/chain of timing converters can be created, where all timing converters ultimately depend on a common timing object as root.
Timing converters typically provide a single modification. More complex modifications can be achieved by combining multiple timing converters. 



