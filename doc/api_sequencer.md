---
layout: default
title: Sequencer API
---

This describes the API of **Sequencer** and **IntervalSequencer**.

- [Sequencer Background](background_sequencer.html) provides a more detailed introduction to the Sequencer concept.
- [Sequencer Usage](usage_sequencer.html) provides guidelines and examples on Sequencer usage.

## Introduction

The core idea is that programmers express temporal validity of objects by associating them with Intervals. For instance, a subtitle may be associated with [12.1, 17.44] indicating when the object should be *active*, in reference to some media timeline. Furthermore, in order to decouple Sequencers from the data model, Intervals are not directly associated with data objects, but indirectly through some unique identifier. For instance, programmers may use identifiers from an application specific data model as keys into a Sequencer.

> A Sequencer manages a collection of (key,[Interval](#interval)) associations, also called [SequencerCue](#cue) objects. 
An *Interval* is simply the mathematical concept [12.75, 13.1>. Singular points [3.02] are considered a special case of *Interval* where length is 0. 
An *Interval* defines when a *key* is *active* or *inactive*, according to a time source. 

Sequencers in the timingsrc library uses [TimingObject](http://webtiming.github.io/timingobject) as timing source. The main function of a Sequencer is to emit [enter](#enter) and [exit](#exit) events at the correct time, as cue intervals dynamically transition between *active* and *inactive*. Sequencers also maintain a list of *active cues*, always consistent with the history of event callbacks and the state of the timing object. The Sequencer API is similar to the [TrackElement](http://www.html5rocks.com/en/tutorials/track/basics/) API.

> A Sequencer is data agnostic and can therefore be used by any application-specific data model, provided only that application data can be associated with unique keys, and that temporal aspects can be expressed in terms of intervals or singular points.


<a name="toc"></a>
## Toc

This documentation includes the following sections:

- [Interval](#interval)
- [SequencerError](#error)
- [SequencerCue](#cue)
- [SequencerEArg](#earg)
- [Sequencer](#sequencer)
- [IntervalSequencer](#intervalsequencer)

<a name="interval"></a>
## Interval

An [Interval](#interval) is expressed by two floating point values <code>low, high</code>, where <code>low <= high</code>. <code>-Infinity</code> or <code>Infinity</code> may be used to create un-bounded Intervals, e.g. <code>[low, Infinity)</code> or <code>(-Infinity, high]</code>. If <code>low === high</code> the Interval is said to represent a singular point <code>[low]</code>.

Intervals may or may not include its endpoints; <code>[a,b], [a,b>, \<b,a], \<a,b></code>. This is defined by optional boolean flags <code>lowInclude</code> and <code>highInclude</code>. If <code>lowInclude</code> and <code>highInclude</code> are omitted, <code>[a,b></code> is the default setting. When multiple Intervals have the same endpoint, these endpoint flags influence [event ordering](#event ordering). The Sequencer implementation also depends on this feature internally for correctness.

Interval objects are immutable.

### Interval: Constructor

```javascript
var i = new timingsrc.Interval(low, high, lowInclude, highInclude);
```
- param: {float} [low] value of lower endpoint of interval 
- param: {float} [high] value of higher endpoint of interval
- param: optional {boolean} [lowInclude] lower endpoint included in interval : default true
- param: optional {boolean} [highInclude] higher endpoint included in interval : default false
- returns : {Interval} Interval object

### Interval: Properties
```javascript
var low = i.low,
    high = i.high,
    lowInclude = i.lowInclude,
    highInclude = i.highInclude,
    length = i.length;
```

### Interval: Methods

#### .toString()
- returns: {string} string representation of the interval

```javascript
console.log(i.toString());
```
#### .isSingular()
- returns: {boolean} true if (low === high) 
```js
if (i.isSingular()) {}
```

#### .coversPoint(point)
- param: {float} [point]
- returns: {boolean} true if point is inside interval

#### .coversInterval(otherInterval)
- param: {Interval} [otherInterval] another Interval
- returns: {boolean} true if interval covers all points covered by other interval

#### .overlapsInterval(otherInterval)
- param: {Interval} [otherInterval] another Interval
- returns: {boolean} true if interval covers at least one point also covered by other interval


<a name="error"></a>
## SequencerError

[SequencerError](#error) is thrown by the Sequencer as a response to illegal input data. The SequencerError is defined as follows.

```javascript
	var SequencerError = function (message) {
		this.name = "SequencerError";
		this.message = (message || "");
	};
	SequencerError.prototype = Error.prototype;
```

<a name="cue"></a>
## Sequencer Cue

[SequencerCue](#cue) is a simple datatype used by [Sequencer](#sequencer) for query responses (and in some cases as parameter to event callback parameters). A SequencerCue is essentially an association between a key (string) and an [Interval](#interval). It is representated as a simple JavaScript object. The property *data* is only used in context of [sequencer specialization](usage_sequencer.html#specialization). 

```javascript
var cue = {
    key : "string",                  // unique string key
    interval : new Interval(12,13),  // interval object
    data : {}                        // javascript object - only used in context of sequencer specialization
};
```

<a name="earg"></a>
## Sequencer EArg


[SequencerEArg](#earg) is a simple datatype used by the Sequencer as argument for event callbacks. SequencerEArg is a [SequencerCue](#cue) but includes additional properties relevant for specific event types. 

```javascript
var eArg = {
	// SequencerCue properties
    key : "string", 				 // unique key
    interval : new Interval(12,13),  // interval 
    data : {}, 						 // javascript object - only used in context of sequencer specialization
    // additional properties
    src: object, 					 // reference to emitter of event, i.e. Sequencer object
    point : 12.0, 					 // position of timing object when event was (should have been) triggered
    pointType : "low",				 // how point relates to the interval {"low"|"high"|"inside"|"outside"|"singular"}
    dueTs : 1441266518486, 			 // timestamp when the event should ideally be emitted - from performance.now()
    delay : 0.9,					 // lateness in milliseconds relative to dueTs
    directionType : "forwards",		 // direction of timingobject at point {"backwards"|"forwards"|"nodirection"}
    type : "enter"				     // entering or leaving interval, or cue change {"enter"|"exit"|"change"}
};

```


<a name="sequencer"></a>
## Sequencer


### Sequencer: Constructor
Returns a Sequencer object. There is no need to start the Sequencer. Execution is driven by the given timing object, and the Sequencer is operational when the constructed finalizes. 

```javascript
var s = new timingsrc.Sequencer(timingObject);
```
- param: {object} [timingObject] The [TimingObject](http://webtiming.github.io/timingobject) that drives the execution of the Sequencer. 

### Sequencer: Operations

#### .addCue(key, interval)
- param: {string} [key] unique key identifying an Interval.  
- param: {Interval} [interval] defines when the associated key is active. 
- returns : {undefined}

Associate a unique key with an Interval. addCue() will replace any previous association for given key. Since Intervals are immutable objects, modification of a cue must be be done by generating a new Interval and replacing the association using .addCue() with the same key.

>  The keyspace is designed by the programmer. In this regard, the Sequencer is essentially an associative array for Interval objects. Often, application specific datamodels include unique keys of some sort, and these may be used directly with the sequencer. These application specific keys are then reported back to application code by correctly timed Sequencer events. Intervals define when keys are *active*. So, when the current position of the timing object enters an Interval, the associated key becomes *active*.


```javascript
s.addCue("key", new Interval(12.1, 24.22));
```

#### .removeCue(key, removedData)
- param: {string} [key] unique key identifying an Interval.
- param: optional: {object} [removeData] data associated with cue that is to be removed

Removes existing association (if any) between key and Interval. The removeData parameter is only useful in context of [sequencer specialization](usage_sequencer.html#specialization). If some data item has been removed from a datamodel, the removed item can still be provided in [exit](#exit) events from the Sequencer.

```javascript
s.removeCue("key");
```

#### .request().submit()
Using the builder pattern .addCue() and .removeCue() operations may be batched and processed together. This allows related operations to be performed together by the Sequencer. Resulting events will also be batched, reducing the number of event callbacks and allowing application code to make decisions on the level of event-batches of the event type [events](#events), as opposed to individual events. 

- returns {object} request object, where Sequencer operations can be registered and submitted.

```javascript
var r = s.request()
    .addCue("key1", new Interval(23.56, 27.8))
    .addCue("key2", new Interval(27.8, Infinity))
    .removeCue("key3")
    .submit();
```


### Sequencer: Search

The Sequencer supports a number of efficient search operations on its collection of [SequencerCues](#cue).

#### keys()
- returns: {list} list of keys of all [SequencerCues](#cue)

```javascript
s.keys().forEach(function (key){});
```


#### .hasCue(key)
- param: {string} [key] unique key identifying an Interval.
- returns: {boolean} True if [Interval](#interval) is defined for key

```javascript
if (s.hasCue("key1")) {}
```


#### .getCues()
- returns: {list} list of all [SequencerCues](#cue)

```javascript
s.getCues().forEach(function (cue){});
```

#### .getCue(key)
- param: {string} [key] unique key identifying an Interval.
- returns: {object} [SequencerCue](#cue) if exists for key else null

```javascript
var cue = s.getCue("key1");
```

<a name="activecue"></a>
### Active Cues

The Sequencer maintains a list of [Active SequencerCues](#activecue). A [SequencerCue](#cue) is *active* if <code>cue.interval.low <= timingobject.query().position <= cue.interval.high</code>. In other words, if the position of the timing object is inside the [Interval](#interval) of a cue, that cue is said to be active. More generally, for timed media, the union of *active* cues may define the state of media, at any given point in time. 

#### .getActiveKeys()
- returns: {list} list of keys of active [SequencerCues](#cue)

```javascript
s.getActiveKeys().forEach(function(key){});
```

#### .getActiveCues()
- returns: {list} of active [SequencerCues](#cue)

```javascript
s.getActiveCues().forEach(function(cue){});
```

#### .isActive(key)
- param: {string} [key] unique key identifying an Interval.
- returns: {boolean} true if [SequencerCue](#cue) identified by key is found within [active SequencerCues](#activecue)

```javascript
if (s.isActive("key1") {};
```

#### .getCuesByPoint(searchPoint)
- param: {float} [searchPoint] return all [SequencerCues](#cue), where cue Interval cover given search point.
- returns: {list} list of [SequencerCues](#cue)

The cost of this operation is linear O(N), with N being the number of [SequencerCues](#cue) managed by the Sequencer.

```javascript
s.getCuesByPoint(4.0).forEach(function(cue){});
```

#### .getCuesByInterval(searchInterval)
- param: {Interval} [searchInterval] search Interval
- returns: {list} list of all [SequencerCues](#cue), where cue Interval overlaps with given search Interval.

The cost of this operation is logarithmic O(logN), with N being the number of [SequencerCues](#cue) managed by the Sequencer.

```javascript
s.getCuesByInterval(new Interval(4.0, 8.0)).forEach(function(cue){});
```

#### .getCuesCoveredByInterval(searchInterval)
- param: {Interval} [searchInterval] search Interval
- returns: {list} list of all [SequencerCues](#cue), where cue Interval is covered by given search Interval.

```javascript
s.getCuesCoveredByInterval(new Interval(4.0, 8.0)).forEach(function(cue){});
```
The cost of this operation is logarithmic O(logN), with N being the number of [SequencerCues](#cue) managed by the Sequencer.

<a name="events"></a>
### Sequencer: Events

The Sequencer supports four event types; <code>"enter", "exit", "change", "events"</code>. "Enter" and "exit" correspond to the timing object entering or exiting the interval of a specific [SequencerCue](#cue). "Events" delivers a batch (list) of events and may include both "enter", "exit" and "change" events. The programmer should likely choose to handle events in batch mode using "events" callback, or handle events individually using "enter", "exit" and "change" events. 

Event types "enter", "exit" relate to changes to the set of [active cues](#activecue). In constrast, "change" events report modifications to [active cues](#activecue) that **remain** active, even though they have been modified in some way. This allow visualizations to pick up all events relevant to active cues.

Intervals that are singular points will emit both "enter" and "exit" events during playback. If the timing object is paused precisely within a singular Interval, only the "enter" event is emitted, just like non-singular Interval. The "exit" event will be emitted as the position is later changed.

#### EventHandler(e)
- param: {[SequencerEArg](#earg)|[SequencerCue](#cue)} [e] event argument.
An event handlers is a function that takes one parameter type [SequencerEArg](#earg) or [SequencerCue](#cue) (depending on event type).

```javascript
var handler = function (e) {};
```
Events "enter", "exit" and "events" provide [SequencerEArgs](#earg) as event parameter, whereas event "change" provides [SequencerCue](#cue) as event parameter.

#### .on(type, handler, ctx)
- param: {string} [type] event type
- param: {function} [handler] event handler
- param: optional {object} [ctx] *this* === ctx in event handler, if ctxt is provided, else *this* === Sequencer instance.

```javascript
this.handler = function (e) {};
// register callback
s.on("enter", this.handler, this);

// callback invocation from sequencer
handler.call(ctx, e);
```

#### .off(type, handler)
- param: {string} [type] event type
- param: {function} [handler] event handler
Remove handler from Sequencer. 

```javascript
var handler = function(e) {};
s.on("enter", handler);
s.off("enter", handler);
```


#### Immediate Events

The classical pattern for programming towards an event source typically involves two steps

1. fetch the current state from the event source
2. register event handlers for listening to subsequent changes to the state of the event source

The Sequencer event API simplifies this process for the programmer by delivering current state ([active cues](#activecue)) as events on handler callback, *immediately after* an event handler is registered, but before any subsequent events. So, registering a handler or event types "enter" or "events" will cause a batch of immediate "enter" events corresponding to [active cues](#activecue). This is equivalent to current state being empty initially, but then changing quickly. This implies that current state based on [active cues](#activecue) can always be built the same way, through a single event handler. In this context, *immediately after* means that the events will be dispatched to the JaveScript task queue during .on() call, and consequently not be processed until after the .on() call has completed.  


#### Event delay
Note that event delay is not a direct measure of the timeliness of the Sequencer. This is because dueTs is derived from the timestamp of the underlying timing object. In particular, whenever a timing object connected to an online timing resource is updated, the effects will suffer network delay before clients (Sequencers) are notified. The Sequencer is aware of the distributed nature of the timing object, and takes such delays into account. In short, the Sequencer replays events that should ideally have been emitted earlier, were it not for the network delay. This effect can only be observed for a brief moment following "change" events from the timing object. In these cases, dueTs effectively means the time when the event would have been emitted if network delay was zero. This behavior of the Sequencer also ensures consistent behaviour between distributed Sequencers (provided that they are working on the same collection of timed data).

#### Event ordering.

If multiple Intervals are bound to the same endpoint, multiple events will be emitted according to the following ordering, given that direction of the timing object is forwards. If direction is backwards, the ordering is reversed.

- > exit Interval with > exit-endpoint
- [ enter Interval with [ enter-endpoint
- [ enter singular Interval
- ] exit singular Interval
- ] exit Interval with ] exit-endpoint
- \< enter Intervals with \< enter-endpoint



<a name="intervalsequencer"></a>
## Interval Sequencer

The Interval Sequencer construction requires two timing objects.
It implements the same API as the Sequencer, with the single exeption that [SequencerCues](#cue) are provided with events instead of [EArg](#earg).  

### IntervalSequencer: Constructor
Returns an IntervalSequencer object. There is no need to start the IntervalSequencer. Execution is driven by the given timing objects, and the IntervalSequencer is operational when the constructed finalizes.

```javascript
var s = new timingsrc.IntervalSequencer(timingObjectA, timingObjectB);
```
- param: {object} [timingObjectA] Timing object A represents one endpoint of the *active interval* of the IntervaSequencer. 
- param: {object} [timingObjectB] Timing object B represents the other endpoint of the *active interval* of the IntervaSequencer. 