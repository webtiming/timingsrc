var run = function (timingProvider) {

    // timing object
    var to = new TIMINGSRC.TimingObject({provider:timingProvider, range:[0,100]});

    // Hook up text UI
    var value = document.getElementById('position');
    to.on("timeupdate", function () {
      var v = to.query();
      value.innerHTML = "P: " + v.position.toFixed(2) + ", V: " + v.velocity.toFixed(2) + ", A: " + v.acceleration.toFixed(2);
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
};