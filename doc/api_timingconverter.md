---
layout: default
title: Timing Converter API
---

- [Timing Converter Background](background_timingconverter.html)
- [Timing Converter API](api_timingconverter.html)
- [Timing Converter Example (page-local)](online_timingconverter.html)
- [Timing Converter Example (multi-device)](online_timingconverter.html)

This describes the Timing Converter API


#### Timing Converter

All timing converters implement the [Timing Object API](api_timingobject.html).

- [SkewConverter](#skewconverter)
- [ScaleConverter](#scaleconverter)
- [DelayConverter](#delayconverter)
- [TimeshiftConverter](#timeshiftconverter)
- [RangeConverter](#rangeconverter)
- [LoopConverter](#loopconverter)
- [LocalConverter](#localconverter)
- [DerivativeConverter](#derivativeconverter)



<a name="skewconverter"></a>

#### Skew Converter

Skewing the timeline of a timing object by 2 means that the timeline position 0 of the timingsrc becomes position 2 of the converter.

```javascript
var skewConverter = new timingsrc.SkewConverter(timingObject, skew);
```

- param: {Object} [timingObject] source timing object
- param: {float} [skew] timeline skew
- return: {Object} [skewConverter] 

<a name="scaleconverter"></a>

#### Scale Converter

Scaling the timeline of timing object by a factor 2 means that the timeline is streached, i.e. the unit length is doubled.
As a consequencer, the velocity of the timing converter will appear to have slowed down by the same factor.

```javascript
var scaleConverter = new timingsrc.ScaleConverter(timingObject, factor);
```

- param: {Object} [timingObject] source timing object
- param: {float} [factor] timeline scaling factor
- return: {Object} [scaleConverter] 

<a name="delayconverter"></a>

#### Delay Converter

Delay converter repeats the exact behavior of the source timing object, but adds a positive time delay. 
So, if the source timing object has some position at time t, then the delay converter will have the same position at time t + delay.
Since the delay converter is effectively replaying past events after the fact, it is not considered a LIVE timing object,
 and therefore not open to interactivity (i.e. update).

```javascript
var delayConverter = new timingsrc.DelayConverter(timingObject, delay);
```

- param: {Object} [timingObject] source timing object
- param: {float} [delay] positive time delay in seconds
- return: {Object} [delayConverter]

<a name="timeshiftconverter"></a>

#### Timeshift Converter

Timeshift converter timeshifts a timing object by timeoffset. 

The timeshift converter is similar to [delay converter](#delayconverter), but differ in some important details.

First, the timeshift converter supports both positive and negative values for timeoffset. 
Positive timeoffset means that the timeshift converter will (speculatively) run ahead of the source timing object. 
Negative timeoffset means that the timeshift converter will run after the source timing object.
	
Second, change events from the source timing object is not delayed, but affect the timing converter immediately. 
This means that vector timestamps are not time-shifted, instead, update vectors are re-calculated.
For instance (with zero acceleration) [p, v, ts] from timing object becomes [p+(v*timeoffset), 1, ts]. 
The timeshift converter is considered a LIVE timining object.

The timeshift converter is also similar to [skew converter](#skewconverter). 
If differs by shifting the timing object in the time space instad of the position space.

```javascript
var timeshiftConverter = new timingsrc.TimeshiftConverter(timingObject, timeoffset);
```

- param: {Object} [timingObject] source timing object
- param: {float} [timeoffset] positive or negative time offset in seconds
- return: {Object} [timeshiftConverter]

<a name="rangeconverter"></a>

#### Range Converter

The range converter enforces a range restriction on position. This range converter replicates the behaviour of
the source timing object, but only when the source timing object is withing the given range. When the source timing 
object is outside the range, the range converter is stopped (at range.min or range.max). 

```javascript
var rangeConverter = new timingsrc.RangeConverter(timingObject, range);
```

- param: {Object} [timingObject] source timing object
- param: {[float, float]} [range] range 
- return: {Object} [rangeConverter]

<a name="loopconverter"></a>

#### Loop Converter

Loop converter makes a modulo type transformation on the position of the timing object, 
so that the loop converter will be looping within a given range.

```javascript
var loopConverter = new timingsrc.LoopConverter(timingObject, range);
```

- param: {Object} [timingObject] source timing object
- param: {[float, float]} [range] range 
- return: {Object} [loopConverter]


<a name="localconverter"></a>

#### Local Converter

Timing objects that are connected with online timing providers will have increased latency for update operations.
Added latency may be unwanted with respect to responsiveness in UI. If so, the local converter removes the update latency
by applying the vector changes locally (speculatively) immediately. 

```javascript
var localConverter = new timingsrc.LocalConverter(timingObject);
```

- param: {Object} [timingObject] source timing object
- return: {Object} [localeConverter]


<a name="derivativeconverter"></a>

#### Derivative Converter

Derivative converter implements the derivative movements of the source timing object.
In short, velocity of the source timing object becomes the position of the derivative converter.
This means that the derivative converter allows sequencing on velocity of a timing object, 
by attatching the derivative converter to a sequencer.

```javascript
var derivativeConverter = new timingsrc.DerivativeConverter(timingObject);
```

- param: {Object} [timingObject] source timing object
- return: {Object} [derivativeConverter]
