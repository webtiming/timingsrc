---
layout: default
title: Sequencer Usage
---

- [Sequencer Background](background_sequencer.html)
- [Sequencer API](api_sequencer.html) 
- [Sequencer Usage](usage_sequencer.html) 
- [Sequencer Example (page-local)](exp_sequencer.html)
- [Sequencer Example (multi-device)](online_sequencer.html)
- [WindowSequencer Example (page-local)](exp_windowsequencer.html)
- [WindowSequencer Example (multi-device)](online_windowsequencer.html)


This describes usage of **Sequencer**.

## Introduction

Sequencers are useful for constructing timed presentations in a Web page. In particular, as Sequencers integrate with the [TimingObject](http://webtiming.github.io/timingobject), the resulting presentation may be synchronized precisely with other timed components in the same Web page, or anywhere in the world. Here we document the basic steps.

1. [Create a Sequencer](#create)
2. [Load timed data](#load)
3. [Develop UI](#ui)
4. [Start presentation](#control)


<a name="create"></a>

## Create Sequencer
Before a Sequencer may be created a [TimingObject](http://webtiming.github.io/timingobject) must be available. The TimingObject may become part of the future HTML standard, however, in the mean time a temporary implementation is provided by the timingsrc library.


Create index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <script text="javascript" src="http://github.com/webtiming/timingsrc/lib/timingsrc-v2.js"></script>
    <script text="javascript">
      var init = function () {
        // create timing object
        var to = new TIMINGSRC.TimingObject();
        // create sequencer
        var s = new TIMINGSRC.Sequencer(to);
      };
      if (document.readyState === "complete") init();
      else window.onload = init;
    </script>
  </head>
  <body>
  </body>
</html>
```


<a name="load"></a>

## Load Timed Data

Loading timed data into the Sequencer involves extracting the timing information from the data, and representing this as Intervals.

```javascript
// Timed data
var array = [
    { data: 'A', start: 0, end: 1 },
    { data: 'B', start: 2, end: 3 },
    { data: 'C', start: 4, end: 5 },
    { data: 'D', start: 6, end: 7 },
    { data: 'E', start: 8, end: 9 },
    { data: 'F', start: 10, end: 11 },
    { data: 'G', start: 12, end: 13 },
    { data: 'H', start: 14, end: 15 },
    { data: 'I', start: 16, end: 17 },
    { data: 'J', start: 18, end: 19 },
    { data: 'K', start: 20, end: 21 },
    { data: 'L', start: 22, end: 23 },
    { data: 'M', start: 24, end: 25 },
    { data: 'N', start: 26, end: 27 },
    { data: 'O', start: 28, end: 29 },
    { data: 'P', start: 30, end: 31 },
    { data: 'Q', start: 32, end: 33 },
    { data: 'R', start: 34, end: 35 },
    { data: 'S', start: 36, end: 37 },
    { data: 'T', start: 38, end: 39 },
    { data: 'U', start: 40, end: 41 },
    { data: 'V', start: 42, end: 43 },
    { data: 'W', start: 44, end: 45 },
    { data: 'X', start: 46, end: 47 },
    { data: 'Y', start: 48, end: 49 },
    { data: 'Z', start: 50, end: 51 } 
];

// Load timed data, use array indexes as keys into Sequencer
for (var i=0; i<array.length; i++) {
    var obj = array[i];
    s.addCue(i.toString(), new Interval(obj.start, obj.end), obj.data);
}
```

<a name="ui"></a>

## Develop UI

To implement a timed Web presentation using the Sequencer, simply translate "change" and "remove" events into approapriate effects in the DOM. The following example shows how a timing sensitive data viewer can easily be built by virtue of connecting a Sequencer to a DOM element. The Sequencer effectively takes care of adding active cues to the DOM, and removing inactive cues from the DOM, always at the correct time.

```javascript
/*
    Simple viewer limited to presenting only a single active cue at the time. 
    In the case of multiple concurrent active cues, 
    only the last one to become active will be presented.
*/
var viewer = function (sequencer, elem) {
    var key = undefined;
    var change = function (e) {
        key = e.key;
        elem.innerHTML = e.data;
        console.log(e.toString());
    };
    var remove = function (e) {
        if (e.key === key) {
            elem.innerHTML = "";
            key = undefined;
        }
        console.log(e.toString());
    };
    sequencer.on("change", change);
    sequencer.on("remove", remove);
};
viewer(s, document.getElementById("viewer"));
```


<a name="control"></a>

## Start presentation

Having loaded data into the Sequencer and defined the UI, the Sequencer is already operational. However, the Sequencer itself does not provide any playback controls. Instead it is simply a slave to the timing object. So, in order to start playback, pause the presentation, or control it in other ways, use the timing object. 

The timing object may be controlled manually from the developer console (assign it to a global variable). Alternatively, controls may be added to the Web page. Below is an example of how play and pause buttons may be connected to the timing object.

Finally, if the timing object is connected to an online timing resource, it may be controlled from other Web pages. It may be a good idea to make a new Web page as a dedicated control interface for the timing object, and control the timed Web presentation by implication.

```html
<body>
    <button id="play">Play/Resume</button>
    <button id="pause">Pause</button>
    <button id="reset">Reset</button>
</body>
```

```javascript
document.getElementById('play').onclick = function () {timingObject.update({velocity:1.0});};
document.getElementById('pause').onclick = function () {timingObject.update({velocity:0.0});};
document.getElementById('reset').onclick = function () {timingObject.update({position: 0.0});};
```

