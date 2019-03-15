---
layout: default
title: Example Timing Converter (multi-device)
demojs : exp_timingconverter
appidmcorp: 8456579076771837888
---

<style type="text/css">
.pos {font-weight:bold}
</style>

- [Timing Converter Background](background_timingconverter.html)
- [Timing Converter API](api_timingconverter.html)

Timing Converters provide new representations of a timing object, by converting some aspect of its behavior. Timing converters slave after a timing object or another timing converter.

#### Demo Tips

- open this page on multiple devices (or at least multiple browser tabs) (simultaneously) to verify multi-device timing.
- the timing provider is shared globally, so others might be playing with demo too...
- try reloading the demo on one device/tab while the demo is running on others.

#### Demo

Controls for root timing object


<p>    
  <div class="pos"> Root Timing Object </div>
  <p>
    <!-- Timing Object Controls -->
    <button id="play">Play</button>
    <button id="pause">Pause</button>
    <button id="reset">Reset</button>
    <button id="backwards">Backwards</button>
  </p>
  <div class="pos" id="to"></div>        
</p>
<p>
  <div class="pos">Skew Converter </div>  
  Skews source timing object timeline with 2 units
  <div class="pos" id="toskew"></div>  
</p>
<p>
  <div class="pos"> Scale Converter </div>
  Scales source timing object timeline with factor 2
  <div class="pos" id="toscale"></div> 
</p>
<p>
  <div class="pos"> Delay Converter </div>
  Echo source timing object, delayed by 1 second.
  <div class="pos" id="todelay"></div>        
</p>
<p>
  <div class="pos"> Timeshift Converter </div> 
  Timeshifts source timing object by -1 second
  <div class="pos" id="totimeshift"></div> 
</p>
<p>
  <div class="pos"> Loop Converter </div>
  Loops source timing object in the interval [0,10]
  <div class="pos" id="toloop"></div> 
</p>
<p>
  <div class="pos"> Range Converter </div>
  Enforces range [10,15] on source timing object
  <div class="pos" id="torange"></div> 
</p>
<p>
  <div class="pos"> Derivative Converter </div>
  Derivative of source timing object.
  <div class="pos" id="toderivative"></div> 
</p>


#### JavaScript

```javascript
var to = new TIMINGSRC.TimingObject({provider:timingProvier});
var toSkew = new TIMINGSRC.SkewConverter(to, 2);
var toDelay = new TIMINGSRC.DelayConverter(to, 1.0);
var toTimeshift = new TIMINGSRC.TimeShiftConverter(to, -1.0);
var toScale = new TIMINGSRC.ScaleConverter(to, 2);
var toLoop = new TIMINGSRC.LoopConverter(to, [0, 10]);
var toRange = new TIMINGSRC.RangeConverter(to, [10,15]);
var toDerivative = new TIMINGSRC.DerivativeConverter(to);
```    
