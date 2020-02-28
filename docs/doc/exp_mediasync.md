---
layout: default
title: Example MediaSync (page-local)
demojs : exp_mediasync
mediasync: 1
---

- [MediaSync Background](background_mediasync.html) 
- [MediaSync API](api_mediasync.html)

Synchronization and control of two video elements using timing object. Both videos produce audio independently. Listening to the audio is likely the best way to detect synchronization errors.

#### Demo

<div id="demo" style="height:50px">
  <p id='buttons'>
    <button id='tostart'>Reset</button>
    <button id='pause'>Pause</button>
    <b><button id='forward'>Play</button></b>
    <button id='skipbackward'>Skip 5 Back </button>   
    <button id='skipforward'>Skip 5 Ahead</button>
  </p>
 
</div>
<p>
  <b><span id='position'></span></b>
</p>


**Player 1**
<p>
  <video id="player1" style="height:200px" autoplay>
      <source src="https://mcorp.no/res/bigbuckbunny.webm" type="video/webm" />
      <source src="https://mcorp.no/res/bigbuckbunny.m4v" type="video/mp4" />
  </video>
</p>
**Player 2**
<p>
  <video id="player2" style="height:200px" autoplay>
      <source src="https://mcorp.no/res/bigbuckbunny.webm" type="video/webm" />
      <source src="https://mcorp.no/res/bigbuckbunny.m4v" type="video/mp4" />
  </video>
</p>


#### HTML

```html
<script text="javascript" src="https://mcorp.no/lib/mediasync.js"></script>
```

#### JavaScript

```javascript
// timing object
var to = new TIMINGSRC.TimingObject({range:[0,100]});

// set up video sync
var sync1 = MCorp.mediaSync(document.getElementById('player1'), to);

// set up video sync
var sync2 = MCorp.mediaSync(document.getElementById('player2'), to);
```    
