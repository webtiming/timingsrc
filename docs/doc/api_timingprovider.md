---
layout: default
title: Timing Provider API
---

- [Timing Provider Background](background_timingprovider.html)
- [Timing Provider API](api_timingprovider.html)
- [Timing Provider Example](exp_timingprovider.html)

This describes the API of the Timing Provider, as required by the timingsrc library (i.e. Timing Object).

Timing Providers are implemented and instansiated by third party code.
Timing provider objects are given to the timing object as parameter in the constructor.


<a name="timingproviderstate"></a>

#### TimingProviderState

The following values are used as readystates for the timing provider. TimingProviderState is available in
timingsrc library. State *OPEN* indicates that properties *skew* and  *vector* are available.

```javascript
var TimingProviderState = Object.freeze({
    CONNECTING :"connecting",
    OPEN : "open",
    CLOSING : "closing",
	CLOSED : "closed"
});
```

<a name="statevector"></a>

#### StateVector

State vectors are communicated between timing provider and timing object.
Timestamp defines a point in time when values for position, velocity and acceleration were|are|will-be valid.
Timestamps (in seconds) are from the *timing provider clock*, i.e. <code>clock_timingprovider = clock_client + skew</code>.

```javascript
var vector = {
	position: 12.0,             // position (units)
	velocity: 1.0,              // velocity (units/second)
	acceleration : 0.0, 		// acceleration (units/second/second)
	timestamp : 123652365.234   // timestamp from timing provider clock (seconds)
};
```

<a name="readyState"></a>

#### .readyState
ReadyState property. Return current state of timing provider.

```javascript
var state = timingProvider.readyState;
```

- return: {[TimingProviderState](#timingproviderstate)} current state of timing provider


<a name="skew"></a>

#### .skew
Getter property for current skew estimate of the timing provider. The skew is defined as the difference between the clock used by the timing
provider and the clock used by the client. The time unit used for the skew  is *seconds*.

<code>clock_timingprovider = clock_client + skew</code>

```javascript
var skew = timingProvider.skew;
```

- return: {float} current skew estimat

<a name="vector"></a>

#### .vector
Getter property for current vector of the timing provider.

```javascript
var vector = timingProvider.vector;
```

- return: {[StateVector](#statevector)} current vector



#### .range
Getter property for range specified by timing provider

```javascript
var range = timingProvider.range;
```

---

#### .update()
Update is used by the timing object to request modification to the current vector.
For online timing providers, this request is likely forwarded to an online timing provider service for processing.


```javascript
timingProvider.update(vector);
```

- param:{[StateVector](#statevector)} [vector] request modification as specified by vector.

State vectors given to update operation may be only be partially complete. For instance, the below operation only requests
the position of the vector to be changed (leaving velocity and acceleration unchanged).

```javascript
timingProvider.update({position:14.0});
```


#### Event types
Timing provider objects supports three event types ["readystatechange", "skewchange", "vectorchange"].

- Event type "skewchange" is emitted whenever the [skew](#skew) property takes a new value.
- Event type "vectorchange" is emitted whenever the [vector](#vector) property takes a new value.
- Event type "readystatechange" is emmitted whenever the [readyState](#readystate) of the timing provider changes.

Event handlers do not provide event arguments.

Timing providers *do not* implement [initial events](background_eventing.html) semantics for any of its events.


#### .on()
Registers an event handler on the timing object.

```javascript
timingProvider.on(type, handler, ctx);
```

- param: {String} [type] event type ["vectorchange"|"skewchange"|"readystatechange"]
- param: {Function} [handler] event handler
- param: optional {Object} [ctx] context for handler callback invocation, default is timing provider


#### .off()
Un-registers an event handler from the timing provider.

```javascript
timingProvider.off(type, handler);
```

- param: {String} [type] event type ["vectorchange"|"skewchange"|"readystatechange"]
- param: {Function} [handler] event handler

