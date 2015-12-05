---
layout: default
title: Immediate Events
---

This describes **Immediate Events**, a specific eventing semantics supported by TimingObject, TimingConverters and Sequencers.

The presentation is based on an earlier discussion on the Webtiming mail list.
The email thread starts [here](https://lists.w3.org/Archives/Public/public-webtiming/2015Jun/0005.html).


## Immediate Events

*Immediate events* represents a subtle change in semantics with respect to event callbacks. 
The timingsrc library uses the immediate events for several event types in timing objects, 
timing converters and sequencers.

Consider an object where internal state changes are communicated by events. 

```javascript
var state = object.get_state();
do_something_with_state(state);
object.on("change", function () {
	var state = object.get_state();
	do_something_with_state(state);
});
```

This code snippet illustrates a very common pattern with *stateful* event sources.

- step 1) get current state
- step 2) subscribe to future state changes

The basic idea of immediate events is merge step 1) into step 2). This can easily be achieved
by letting the event source emit a *fake* change event, immediately after a callback handler has been registered, 
exclusively for the new callback handler.

```javascript
object.on("change", function () {
	var state = object.get_state();
	do_something_with_state(state);
});
```

Immediate events provide a very simple model to the programmer. 

- the programmer registers a handler
- the event source guarantees that all required events are delivered on this handler. 
	- a) first immediate events corresponding to current state (if any)
	- b) later more events corresponding to subsequent state changes

Crucially, this simple contract is honored independent of *when* callback handlers are registered.

- handler registered **before** the event source is initialized. 
	- a) The current state of the event source is effectively empty, and no events will be delivered until the event source has completed initialization.
	- b) Later, dispatch more events corresponding to subsequencer state changes. Completion of the initialization prodecure 
	is only a special case. If initialization caused the current state of the event source to become non-empty, events will be dispatched.
- handler registered **after** the event source is initialized.
	- a) If current state of the event source is empty, no immediate events are generated. Else, generate events corresponding to current state.
	- b) Later, dispatch more events corresponding to subsequencer state changes. 


## Arguments

#### Immediate events simplifies code

At first glance, immediate events may not look like a hugely important optimization, but it adds up. The
two-step pattern leads to boilerplate code, and may have to be repeated for multiple event types, and recursively in
higher-level api's that depend on underlying events. This implies code repetition which
reduces readability and increases the likelihood of programming errors. With immediate events the callback
handler is always the sole entry point to execution, possibly simplyfying debugging. 

#### Immediate events make ready events obsolete.

Many objects provide ready events to let the programmer know when object initialisation has finalized. 
This typically introduces another step to the two-step procedure.

``javascript
// original complexity in run method
var run = function () {
	var state = object.get_state();
	do_something_with_state(state);
	object.on("change", function () {
		var state = object.get_state();
		do_something_with_state(state);
	});
};
// added complexity related to readyness
if (object.is_ready()) {
	run();
} else {
	object.on("ready", run);	
}
```

Here the value of immediate events becomes more evident. 
If the event source supports the immediate event pattern there is not need to listen to the ready event.
Event source initialization does not add any complexity for the event consumer, and it does not matter *when* this handler is registered.

```javascript
object.on("change", function () {
	var state = object.get_state();
	do_something_with_state(state);
});
```

#### Immediate events makes it easier to reason about correctness

Reduction of code complexity and a simplified mental model means that reasoning about correctness becomes much easier. 
This is important since complexity tends to build up quickly with asynchronous event based programming. 
A stricter semantic guaranteed by event sources reduces the challenges for programmers, and will ultimately allow them to build 
more complexity without being overwhelmed by it. The stricter semantic of immediate events also protects against nasty bugs related to ordering in initialisation and handler registration. 


#### Immediate Events is not a violation of established event semantics.

Immediate event semantic is not really a violation of the original event semantic, at least if implemented correctly. Specifically, immediate events are not to be emitted as part of the handler registration routine. This would violate the principle that subscribing to an event should not have side effects. Instead, immediate events must be dispatched to the JS event queue (setTimeout(handler, 0)) so that it is performed *after* registration has completed. This ensures that immediate events are delivered asynchronously, just like any other event from the event source. From the perspective of the event consumer, an immedite event is indistinguishable from an early event.

#### Immediate Events are safe.

If a programmer does not understand immediate events, or is not aware of it, the consequences are not dire. Essentially there will be an obsolete event in the system.


#### The immediate event semantic complicates the event source.

Yes it does, and that is a good thing! Immediate events is about shifting complexity from the event consumer to the event source. This is a good idea for several reasons:

- good api design is generally targets a the programming experience of the api consumer, not the programmer of the api.
- the event model generally encourages multiple event consumers per event source. If a problem is not solved by the event source, this means that the problem must be solved independently by each event consumer
- the designer of the events source api is likely better placed for implementing this correctly.

The original problem of montoring the state of an event source may not be as trivial as it seems, at least if guaranteed correctness is required. For instance, if setTimeout(dispatch,0) is used by the event source to dispatch events, an event consumer can observe effects of state changes with <code>object.get_state()</code> before corresponding event upcalls have been delivered. Use of setTimeout(dispatch,0) also introduces the question of when to evaluate the list of callback handlers, before setTimeout(dispatch,0) or inside dispatch? Reasoning about correctness in these circumstances is hard, and programmers using an event api generally have little knowledge about internals. In contrast, with immediate events, the responsibility rests on the api designer to deals with such complexity where it can best be solved - within the event source.

Finally, the costs of implementing immediate events for different event sources can be greately reduced by isolating and reusing the logic. In the timinsrc library event sources share and specialize a single implememtation of the immediate event pattern [source/util/eventutils.js](../source/util/eventutils.js).



<a name="timingsrc"></a>
## Use of Immediate events in timingsrc

The timingsrc library employs the immediate event pattern in its central concepts.

- TimingObject and TimingConverter: evnet types: "change" and "timeupdate"
- Sequencer and IntervalSequencer: event types: "enter" and "events"

This is particularly attractive for the timingsrc library because the model encourages a reactive programming model with chained event sources. For instance, a timed UI component may depend on sequencer events, which in turn depends on timing converter events, which in turn depends on events from a root timing object. The immediate event pattern also gives flexibility to safely make dynamic changes to this dependency chain. For instance, all components in this programming model supports dynamic replacement of timing object (i.e. setting the timingsrc properety). 

```javascript
old_timingsrc.off("change", handler);
new_timingsrc.on("change", handler);
```
Due to the immediate event pattern, the component will take on the state of the new timingsrc immediately. From the perspective of the component, switching timingsrc is no different from receiveing a new change event. Note that event consumers that cache state from their event source must empty this cache before connecting to a new event source. This could for example be part of the .off() method. 

