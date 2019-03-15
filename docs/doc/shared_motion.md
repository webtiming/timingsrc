---
layout: default
title: Shared Motion
---


> Timing Objects may become **online timing objects** if they are connected to an **online timing provider**.

Shared Motion is provided by [Motion Corporation](http://motioncorporation.com) through *InMotion*, a generic, online timing service for Web agents (i.e. IP-connected clients). Shared Motion by Motion Corporation implements the [Timing Provider API](api_timingprovider.html) and can therefore be used directly with the [TimingObject](http://webtiming.github.io/timingobject/).

> **Shared Motion** solves **multi-device timing** and turns **timing** into a **local** challenge.


#### Timing Provider by Motion Corporation

If your application already uses the timing object for single-device timing, turning it into a multi-device application is trivial. All you need to do is to plug an online timing provider into the timing object.


```javascript
var run = function (timingProvider) {
    var to = new TIMINGSRC.TimingObject({provider:timingProvider});
    ...
};
``` 

To test this with Shared Motions yourself, please follow these simple steps:


#### 1. Create MCorp App

- goto [http://dev.mcorp.no](http://dev.mcorp.no)
- create your app
- create a **named** motion inside your app
- copy the APPID of your app

#### 2. Include MCorp script in your web page

```html
<script type="text/javascript" src="http://www.mcorp.no/lib/mcorp-2.0.js"></script>
```

#### 3. Initialise MCorp App object in your web page 

```javascript
var MCORP_MOTION_NAME = "your_motion_name";
var MCORP_APPID = "your_appid";

var app = MCorp.app(MCORP_APPID, {anon:true});
app.run = function () {
  var timingProvider = app.motions[MCORP_MOTION_NAME];
  if (document.readyState === "complete") {run(timingProvider);}
  else {window.onload = function () {run(timingProvider);};}
};
app.init();
```

Further documentation for MCorp App initialisation available at [dev.mcorp.no](http://dev.mcorp.no).