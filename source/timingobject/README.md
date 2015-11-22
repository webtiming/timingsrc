
# Timing Object and Timing Wrappers

This implements the [Timing Object](https://github.com/webtiming/timingobject) as well as a set of TimingWrappers. 

A Timing Wrapper implements some transformation on a Timing Object. For instance, if you want to skew the values of a Timing object, use the SkewWrapper. Or, if you need the TimingObject to count beats per second instead of seconds per second, use the ScaleWrapper.

The *timingsrc* property of a Timing Wrapper references the source TimingObject. A TimingWrapper object always slaves to its *timingsrc*. By subscribing to change notifications on *timingsrc*, the Timing Wrapper will always be reflect the current state of its *timingsrc*.

By implementing the TimingObject API, the Timing Wrapper additionally presents itself as a new TimingObject (with transformed behavior). Timing Wrappers can slave to other Timing Wrappers. This way, complex behaviors may be built step by step.

It is always safe to add a Timing Wrapper, they never affect the behavior of the *timingsrc*. However, Timing Wrappers may forward update requests.
