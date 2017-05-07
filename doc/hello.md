---
layout: default
title: Hello World
---

The timingsrc scripts are available from GitHub.

- [timingsrc-v2.js](../lib/timingsrc-v2.js)
- [timingsrc-min-v2.js](../lib/timingsrc-min-v2.js)
- [timingsrc-require-v2.js](../lib/timingsrc-require-v2.js)
- [timingsrc-require-min-v2.js](../lib/timingsrc-require-min-v2.js)


### Single-page

- include timingsrc script
- create Timing Object in Web page.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://webtiming.github.io/timingsrc/lib/timingsrc-v2.js" text="javascript"></script>
  <script text="javascript">
    var to = new TIMINGSRC.TimingObject();
    console.log("hello world!", to.query())
  </script>
</head>
<body>
</body>
</html>
```


### Multi-device

- include script for online motion provided by [Motion Corporation](http://motioncorporation.com).  
- connect local timing object to online motion.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://webtiming.github.io/timingsrc/lib/timingsrc-v2.js" text="javascript"></script>
  <script src="https://www.mcorp.no/lib/mcorp-2.0.js" text="javascript"></script>
  <script text="javascript">
    // create local timing object 
    to = new TIMINGSRC.TimingObject();
    // connect timing object to online motion
    var mcorp_app = MCorp.app("..mcorp_app_id_goes_here..", {anon:true});
    mcorp_app.ready.then(function(){
    	to.timingsrc = mcorp_app.motions["..name_of_motion_goes_here.."];
    });
    console.log("Hello World!", to.query())
  </script>
</head>
<body>
</body>
</html>
```