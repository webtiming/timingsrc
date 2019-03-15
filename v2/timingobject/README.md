
# Timing Object and Timing Converters

This implements the *Timing Object* as well as a set of *Timing Converters*. 


### Timing Object

The [Timing Object](https://webtiming.github.io/timingobject/) is defined by [Multi-Device Timing Community Group](https://www.w3.org/community/webtiming/).


### Timing Converters

Timing Converters are useful when you need an alternative representation for a Timing Object. For instance, 
if different media components refer to different timelines, *skewed* representations of a common Timing Object could make up for this.
*Scaling* the timeline might also be useful in some circumstances. In video playback the position of a Timing Object typically represents media offset in seconds. 
Alternatively, frame numbers could be reported as position, with standard playback velocity being 24 or 25 (fps), depending on the media format.
Or, when working with music it might be sensible to use beat number as position, and beats per second (bps) as velocity. 
Again, different representations might be required to integrate different media components, or simply to suit the preferences of different programmers.

A Timing Converter provides an alternative representation for a Timing Object. 

- a Timing Converter is a Timing Object that depends on another Timing Object. 
- the *timingsrc* property of a Timing Converter identifies its source Timing Object.  
- a Timing Converter implements some modification relative to *timingsrc*, but never affect the *timingsrc*.
- different Timing Converters can depend on the same *timingsrc*.
- a Timing Converter can itself be the *timingsrc* of another Timing Converter.

So, a hierarchy/chain of Timing Converters can be created, where all Timing Converters ultimately depend on a common Timing Object as root.
Timing Converters provide a simple modification. More complex modifications can be achieved by combining multiple Timing Converters. 

Some Timing Converters of common utility are provided in this module:

- [skewconverter.js](skewconverter.js) skews the timeline.
- [scaleconverter.js](scaleconverter.js) scales the timeline.
- [loopconverter.js](loopconverter.js) transformes infinite timeline into looped timeline.
- [delayconverter.js](delayconverter.js) delayed replay of *timingsrc*.
- [timeshiftconverter.js](timeshiftconverter.js) time-shift ahead or after timingsrc.
- [rangeconverter.js](rangeconverter.js) enforces a range on position.


### Module

- [timingbase.js](timingbase.js) implements base classes *TimingBase* and *ConverterBase* used to implement Timing Object and Timing Converters.
