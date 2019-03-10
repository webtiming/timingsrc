# Sequencing with the Timing Object

Sequencing broadly refers to the process of translating a timed script or timed data into timed execution. 
The sequencing module provides general purpose sequencing tools for the Timing Object. 

API documentation and introduction to sequencing is available at  [Sequencer](http://webtiming.github.io/sequencer/).


### Sequencer (Point Sequencer)

Sequencing cues (key, interval) based on a Timing Object. 

- the current position of the Timing Object defines a moving point. 
- a cue is *active* whenever its interval covers this moving point. 
- *enter* and *exit* events are emmitted at the precise momement when a cue becomes *active* or ceases to be *active*.


### Interval Sequencer

Sequencing cues (key, interval) based on two Timing Objects. 

- the current positions of the two Timing Objects define a moving interval.
- a cue is *active* whenever its interval is partially covered by this moving interval.
- *enter* and *exit* events are emmitted at the precise momement when a cue becomes *active* or ceases to be *active*.


### SetCallback (point)

SetCallback provides a callback when the current position Timing Object is equal to given *point*. 


### SetPeriodicCallback (period, offset)

SetPeriodicCallback provides a callback every time current position of Timing Object advances by *period*.
The set of points defined by *period* are calculated from *offset*, which is 0 by default.


