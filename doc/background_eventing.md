---
layout: default
title: Initial Events
---

This describes **Initial Events**, a specific semantics for event callbacks. Initial events are supported by central concepts in the timingsrc library; including TimingObject, TimingConverters and Sequencers. This presentation is based on an earlier discussion on the Webtiming mail list.
The email thread can be found [here](https://lists.w3.org/Archives/Public/public-webtiming/2015Jun/0005.html).


## Initial Events

Initial events represents a subtle change in semantics with respect to event callbacks. 
The timingsrc library uses initial events for several event types in timing objects, 
timing converters and sequencers.

Consider an object where changes to internal state is communicated by events. 

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

The basic idea of initial events is to merge step 1) into step 2). This can be achieved
by letting the event source emit an *extra* change event with the initial state, just after a callback handler has been registered, 
and exclusively for that new callback handler.

```javascript
object.on("change", function () {
	var state = object.get_state();
	do_something_with_state(state);
});
```

Initial events provide a very simple model to the programmer. 

- the programmer registers a handler
- the event source guarantees that all required events are emitted on this handler. 
	- a) first emit events corresponding to initial state (if any)
	- b) later emit more events corresponding to subsequent state changes

Crucially, this simple contract is honored independent of *when* the callback handler is registered.

- case : handler registered **before** the event source is initialized. 
	- a) The initial state of the event source is effectively empty, and no events will be delivered until the event source has completed initialization.
	- b) Later, dispatch more events corresponding to subsequencer state changes. Completion of the initialization prodecure 
	is only a special case. If initialization caused the current state to become non-empty, events will be dispatched.
- case : handler registered **after** the event source was initialized.
	- a) If initial state of the event source is empty, no initial events are generated. Else, generate events corresponding to initial state.
	- b) Later, dispatch more events corresponding to subsequencer state changes.


## Arguments

#### Initial events simplifies code

At first glance, initial events may not look like a hugely important optimization, but it adds up. The
two-step pattern leads to boilerplate code, and may have to be repeated for multiple event types, and recursively in
higher-level api's that depend on underlying events. This implies code repetition which
reduces readability and increases the likelihood of programming errors. With initial events the callback
handler is always the sole entry point to execution, possibly simplifying debugging. 

#### Initial events implies that ready events are less important.

Many objects provide ready events to let the programmer know when object initialisation has finalized. 
This typically turns the two-step procedure into a three-step procedure.

```javascript
// original complexity in run method
var run = function () {
	var state = object.get_state();
	do_something_with_state(state);
	object.on("change", function () {
		var state = object.get_state();
		do_something_with_state(state);
	});
};
// added complexity related to readiness
if (object.is_ready()) {
	run();
} else {
	object.on("ready", run);	
}
```

This gets even more complicated for event sources with multiple initialization events. They must define an elaborate scheme that somehow indicates if a specific event has been emitted or not. For instance, video elements define a readystate property that may take a series of values, indicating whether for instance the canplay event has been fired. Furthermore, it is problematic that you can register to events that fire only once, **after they have fired**, without there being as much as a warning.

If the event source supports the initial event semantics all these issues go away. Even better, there might be no need to listen to ready events at all. Event source initialization does not add any complexity for the event consumer, and it does not matter *when* this handler is registered.

```javascript
object.on("change", function () {
	var state = object.get_state();
	do_something_with_state(state);
});
```

#### Initial events makes it easier to reason about correctness

Reduction of code complexity and a simplified mental model means that reasoning about correctness becomes much easier. 
This is important since complexity tends to build up quickly with asynchronous event based programming. 
A stricter semantic guaranteed by event sources reduces the challenges for programmers, and will ultimately allow them to build 
more complexity without being overwhelmed by it. The stricter semantic of initial events also protects against nasty bugs related to ordering in initialisation and handler registration. 


#### Initial Events is not a violation of established event semantics.

Initial event semantic is not really a violation of established event semantics, at least if implemented correctly. Specifically, initial events are not to be emitted as part of the handler registration routine. This would violate the principle that subscribing to an event should not have side effects. Instead, initial events must be dispatched as a new task on the JS event queue so that it is performed *after* handler registration has completed. This ensures that initial events are delivered asynchronously, just like any other event from the event source. From the perspective of the event consumer, an initial event is indistinguishable from an early event.

#### Initial Events are safe.

If a programmer does not understand initial events, or is not aware of it, the consequences are not dire. Essentially there will be an extra event in the system.


#### The initial event semantic complicates the event source.

Yes it does, and that is a good thing! Initial events implies shifting complexity from the event consumer to the event source. This is a good idea for several reasons:

- good api design generally targets a the programming experience of the api consumer, not the programmer of the api.
- the event model generally encourages multiple event consumers per event source. If a problem is not solved by the event source, this means that the problem must be solved independently by each event consumer
- the designer of the event source API is likely better placed for implementing this correctly.

Also, the original problem of montoring the state of an event source may not be as trivial as it seems, at least if guaranteed correctness is required. For instance, if <code>setTimeout(dispatch,0)</code> is used by the event source to dispatch events, it is possible for an event consumer to observe effects of state changes with <code>object.get_state()</code> *before* corresponding event upcalls have been delivered. Use of <code>setTimeout(dispatch,0)</code> also introduces the question of when to evaluate the list of callback handlers, before <code>setTimeout(dispatch,0)</code> or inside <code>dispatch</code>? Reasoning about correctness in these circumstances may not be trivial. Furthermore, programmers using an event API generally have limited knowledge about internals. In contrast, with initial events, the responsibility rests on the API designer to deal with such complexity.

Finally, the costs of implementing initial events for different event sources is greately reduced by isolating and reusing the logic. In the timinsrc library event sources share and specialize a single implementation of the initial event semantics: [eventify.js](https://github.com/webtiming/timingsrc/blob/gh-pages/v2/util/eventify.js).



<a name="timingsrc"></a>

## Use of Initial Events in timingsrc

The timingsrc library employs the initial event semantics in its central concepts.

- TimingObject and TimingConverter: event types: "change" and "timeupdate"
- Sequencer and WindowSequencer: event types: "enter" and "events"

This is particularly attractive for the timingsrc library because the model encourages a reactive programming model with chained event sources. For instance, a timed UI component may depend on sequencer events, which in turn depends on timing converter events, which in turn depends on events from a root timing object. Initial event semantics also gives flexibility to safely make dynamic changes to this dependency chain. For instance, all components in this programming model supports dynamic replacement of timing object (i.e. setting the timingsrc property). 

```javascript
old_timingsrc.off("change", handler);
new_timingsrc.on("change", handler);
```
Due to initial event semantics, the component will take on the state of the new timingsrc. From the perspective of the component, switching timingsrc is no different from receiveing a new change event. Note that event consumers that cache state from their event source must empty this cache before connecting to a new event source. 

