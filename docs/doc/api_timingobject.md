---
layout: default
title: Timing Object API
---

- [Timing Object Background](background_timingobject.html)
- [Timing Object API](api_timingobject.html)
- [Timing Object Example (page-local)](exp_timingobject.html)
- [Timing Object Example (multi-device)](online_timingobject.html)

This describes the API of the Timing Object, as implemented in the timingsrc library.

#### StateVector

State vectors are used in interactions with the timing object, as parameters and return values. 
Timestamp defines a point in time when values for position, velocity and acceleration were|are|will-be valid. 

```javascript
var vector = {
	position: 12.0,             // position (units) of timing object
	velocity: 1.0,              // velocity (units/second) of timing object
	acceleration : 0.0, 		// acceleration (units/second/second) of timing object
	timestamp : 123652365.234   // timestamp from clock used by timing object (seconds)
};
```


#### Constructor

```javascript
var timingObject = new timingsrc.TimingObject(options);
```
- param: optional {Object} [options] options given to timing object
- param: optional {[start,end]} [options.range] range restrictions on timeline, start and end are floats (may be Infinity)
- param: optional {StateVector} [options.vector] initial state of timing object
- param: optional {Object} [options.timingsrc] timingsrc
- return: {Object} timing object

Note that options *range* and *vector* are ignored if option *timingsrc* is supplied.

---


#### .isReady()
- returns : {boolean}

The timing object becomes ready when its internal vector and clock is defined.
Local timing objects are ready immediately after instantiation. 
However, timing objects depending on a parent timingsrc may not be ready immediately, so as a general rule timing objects should not be queried until after they are ready.

- if not ready, position, velocity and acceleration are undefined.
- event handlers may be registered before the timing object is ready.

---

#### .ready

The timing object also defines a *ready* promise.

```javascript
timingObject.ready.then(function(){
    // now the timing object is ready
});
```

---

#### .timingsrc
The timingsrc property, if defined, denotes a parent object, on which the timing object depends.

The timingsrc property points to one of the following

- [timing provider](api_timingprovider.html)
- [timing object](api_timingobject.html)
- [timing converter](api:timingconverter.html)

The timingsrc property is both a getter and setter. 

Local timing objects are defined without a timingsrc, so their
timingsrc property is undefined.

```javascript
// connecting timing object with external timing provider
timingObject.timingsrc = timingProvider;
// disconnecting timing object from external timing provider
timingObject.timingsrc = undefined;
// connecting timingobject to another timing object
timingObject.timingsrc = anotherTimingObject;
```

---

#### .query()
Returns a snapshot vector of the timing object

```javascript
var vector = timingObject.query();
```

- return: {StateVector} current state

---

#### .update(vector)
Update issues a request for modification to the timing object.


```javascript
timingObject.update(vector);
```
- param:{StateVector} [vector] update initial state of timing object. 

State vectors given to update may be only partially complete. For instance, the below operation changes
the position of the timing object, while velocity and acceleration remains unchanged.

```javascript
timingObject.update({position:14.0});
```

---

#### event types
Timing objects supports two event types ["change", "timeupdate"].

- Event type "change" is emitted after every update operation. 
- Event type "timeupdate" is emmitted at a fixed frequency (about 4Hz) as long as the the timing object is not paused.

Event handlers currently do not provide event arguments.

Timing Object implements initial events semantics for event types ["change", "timeupdate"].
Read more about initial events in [Initial Events Background](background_eventing.html).


---

#### .on()
Registers an event handler on the timing object.

```javascript
timingObject.on(type, handler, ctx);
```

- param: {String} [type] event type ["change","timeupdate"]
- param: {Function} [handler] event handler
- param: optional {Object} [ctx] context for handler callback invocation, default is timingObject

---

#### .off()
Un-registers an event handler from the timing object.

```javascript
timingObject.off(type, handler);
```

- param: {String} [type] event type ["change","timeupdate"]
- param: {Function} [handler] event handler


---


#### .range
Getter for range of timing object

```javascript
var range = timingObject.range;
```

---

#### .clock
Getter for internal clock used by timing object.

```javascript
var timestamp = timingObject.clock.now();
```
---

#### .vector
Getter for internal vector of timing object. The internal vector is changed by update() and used by query() to calculate snapshots. 

```javascript
var vector = timingObject.vector;
```

---

#### .version
Getter for version of Timing Object implementation.

```javascript
var version = timingObject.version;
```