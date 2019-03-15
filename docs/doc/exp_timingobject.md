---
layout: default
title: Example Timing Object (page-local)
demojs : exp_timingobject
---

- [Timing Object Background](background_timingobject.html)
- [Timing Object API](api_timingobject.html)

#### Demo

<p id="buttons">
  <!-- absolute -->
  <button id='reset'>Reset</button>
  <button id='pause'>Pause</button>
  <button id='play'>Play</button>
  <button id='end'>End</button>
  <!-- relative-->
  <button id='p-'>Pos-1</button>
  <button id='p+'>Pos+1</button>
  <button id='v-'>Vel-1</button>
  <button id='v+'>Vel+1</button>
  <button id='a-'>Acc-1</button>
  <button id='a+'>Acc+1</button>
</p>
<p>
  <!-- position -->
  <div id='position' style="font-weight:bold"></div>
</p>


#### HTML

```html
<p id="buttons">
  <!-- absolute -->
  <button id='reset'>Reset</button>
  <button id='pause'>Pause</button>
  <button id='play'>Play</button>
  <button id='end'>End</button>
  <!-- relative-->
  <button id='p-'>Pos-1</button>
  <button id='p+'>Pos+1</button>
  <button id='v-'>Vel-1</button>
  <button id='v+'>Vel+1</button>
  <button id='a-'>Acc-1</button>
  <button id='a+'>Acc+1</button>
</p>
<p>
  <!-- position -->
  <div id='position' style="font-weight:bold"></div>
</p>
```


#### JavaScript

```javascript
// timing object
var to = new TIMINGSRC.TimingObject({range:[0,100]});

// Hook up text UI
var value = document.getElementById('position');
to.on("timeupdate", function () {
  var v = to.query();
  var html = "P: " + v.position.toFixed(2);
  html += ", V: " + v.velocity.toFixed(2);
  html += ", A: " + v.acceleration.toFixed(2);
  value.innerHTML =  html; 
});

// Hook up buttons UI
var buttonsEl = document.getElementById("buttons");
buttonsEl.onclick = function (e) {
  	var elem, evt = e ? e:event;
  	if (evt.srcElement)  elem = evt.srcElement;
    else if (evt.target) elem = evt.target;
    if (elem.id === "reset") to.update({position:0.0});
    else if (elem.id === "pause") to.update({velocity:0.0, acceleration:0.0});
    else if (elem.id === "play") to.update({velocity:1.0, acceleration:0.0});
    else if (elem.id === "end") to.update({position:100.0});
    else { // relative
        var v = to.query();
        if (elem.id === "p-") to.update({position:v.position - 1});
        else if (elem.id === "p+") to.update({position: v.position + 1});
        else if (elem.id === "v-") to.update({velocity: v.velocity - 1});
        else if (elem.id === "v+") to.update({velocity: v.velocity + 1});
        else if (elem.id === "a-") to.update({acceleration: v.acceleration - 1});
        else if (elem.id === "a+") to.update({acceleration: v.acceleration + 1});
    }
}
```    
