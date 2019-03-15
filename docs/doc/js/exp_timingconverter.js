var run = function (timingProvider) {

    // Set up controls for timing object
    document.getElementById("pause").onclick = function () {to.update({velocity: 0.0});};
    document.getElementById("reset").onclick = function () {to.update({position:0.0, velocity: 0.0});};
    document.getElementById("play").onclick = function () {to.update({velocity:1.0});};
    document.getElementById("backwards").onclick = function () {to.update({velocity: -1.0});};

    var array = []; // timing object/converter -> dom element

    // Create timing objects and converters        
    var to = new TIMINGSRC.TimingObject({provider:timingProvider, range:[0,50]});
    array.push([to, document.getElementById("to")]);
    var toSkew = new TIMINGSRC.SkewConverter(to, 2);
    array.push([toSkew, document.getElementById("toskew")]);
    var toDelay = new TIMINGSRC.DelayConverter(to, 1.0);
    array.push([toDelay, document.getElementById("todelay")]);       
    var toTimeshift = new TIMINGSRC.TimeShiftConverter(to, -1.0);
    array.push([toTimeshift, document.getElementById("totimeshift")]);
    var toScale = new TIMINGSRC.ScaleConverter(to, 2);
    array.push([toScale, document.getElementById("toscale")]);
    var toLoop = new TIMINGSRC.LoopConverter(to, [0, 10]);
    array.push([toLoop, document.getElementById("toloop")]);
    var toRange = new TIMINGSRC.RangeConverter(to, [10,15]);
    array.push([toRange, document.getElementById("torange")]);
    var toDerivative = new TIMINGSRC.DerivativeConverter(to);
    array.push([toDerivative, document.getElementById("toderivative")]);

    // periodic refresh
    setInterval(function () {
      var elem, to, pos;
      array.forEach(function (item) {
        to = item[0];
        elem = item[1];
        pos = to.query();
        if (pos !== null) {
            if (to.isReady()) {
                elem.innerHTML = to.query().position.toFixed(2);
            }
        }
      });
    }, 200);                  
};