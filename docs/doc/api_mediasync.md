---
layout: default
title: MediaSync API
---

- [MediaSync Background](background_mediasync.html) 
- [MediaSync API](api_mediasync.html)
- [MediaSync Example (page-local)](exp_mediasync.html)
- [MediaSync Example (multi-device)](online_mediasync.html)

This describes the API of MediaSync.

#### Constructor
Returns a media sync object

```javascript
var sync = new timingsrc.MediaSync(htmlElement, timingObject, options);
```
- param: {HTMLMediaElement} [htmlElement] The HTMLMediaElement to synchronize  
- param: {Object} [timingObject] The timing object to synchronize after  
- param: {Object} [options]
- param: {float} [options.skew]  (default 0.0) How many seconds (float) should be added to the timingObject before synchronization.  Calculate by start point of element - start point of timing object  
- param: {boolean} [options.automute]  (default true) Mute the media element when playing too fast (or too slow)  
- param: {String} [options.mode]  (default "auto") 
  - "skip": Force "skip" mode - i.e. don't try using playbackRate.
  - "vpbr": Force variable playback rate.  Normally not a good idea
  - "auto" (default): try playbackRate. If it's not supported, it will struggle for a while before reverting.  If 'remember' is not set to false, this will only happen once after each browser update.  
- param: {Object} [options.debug]  (default null) If debug is true, log to console, if a function, the function will be called with debug info  
- param: {Float} [options.target]  (default 0.025 - 25ms ~ lipsync) What are we aiming for?  Default is likely OK, if we can do  better, we will.  If the target is too narrow, you'll end up with a more skippy experience.  When using variable playback rates, this parameter is ignored (target is always 0)  
- param: {Boolean} [options.remember]  (default true) Remember the last experience on this device - stores support or lack of support for variable playback rate.  Records in localStorage under key "mediascape_vpbr", clear it to re-learn  
returns: {Object} mediaSync object

---

#### .setSkew()
Update the skew

```javascript
sync.setSkew(0.4);
```
param: {double} skew : new skew

The same effect can be achieved by using a [SkewConverter](api_timingconverter.html).

---

#### .getSkew()
Get the current skew

```javascript
sync.getSkew();
```
returns: {double} The current skew

---

#### .setOption()
Set or update options

```javascript
sync.setOption("debug", false); // Disable debugging
sync.setOption("target", 0.1); // Change to coarser target
```
param: {string} key : The option to set  
param: {Object} value : The value

---

#### .getMethod()
Returns the currently used method for sychronization

```javascript
var method = sync.getMethod();
```
returns: {String} "skip" or "playbackrate"

---

#### .timingsrc
Get-set accessor for the timing object to synchronize after

```javascript
sync.timingsrc(timingObject);
```

---

#### .on()
Add an event handler to given events.  Valid events are:
   skip - called when the media element is made to skip
   mode_change - called when the playback mode switches between Variable Playback Rate and Skip mode
   muted - called when muting is toggled by automute
   target_change - called when the target is changed in Skip mode to handle trashing media elements.
   sync - called when sync is gained or lost, could be used for example to hide/show, mute/unmute or in other ways react to issues.

```javascript
sync.on("skip", function(e) { ... });
```

---

#### .off()
Remove an event handler

```javascript
sync.on("skip", function(e) { ... });
```


---

#### Example

```javascript
var video = document.getElementById('vid');
var sync = new timingsrc.MediaSync(video, timingObject);
```