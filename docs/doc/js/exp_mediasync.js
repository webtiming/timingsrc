var run = function (timingProvider) {

    // timing object
    var to = new TIMINGSRC.TimingObject({provider:timingProvider, range:[0,100]});
    
    // set up button click handlers
    var buttonsElem = document.getElementById("buttons");
    var self = this;
    buttonsElem.onclick = function (e) {
      var elem, evt = e ? e:event;
      if (evt.srcElement)  elem = evt.srcElement;
      else if (evt.target) elem = evt.target;
      if (elem.id === "pause") {
        to.update({velocity:0.0});
      }
      else if (elem.id === "tostart") { 
        to.update({position:0.0});
      } 
      else if (elem.id === "skipforward") {
        to.update({position: to.query().position + 5});
      } 
      else if (elem.id === "skipbackward") {
        to.update({position: to.query().position - 5});
      } 
      else if (elem.id === "forward") {
        var v = to.query();
        if (v.position === 100 && v.velocity === 0) {
          to.update({position:0.0, velocity: 1.0});
        } else to.update({velocity:1.0});
      }
      else if (elem.id === "toend") {
        to.update({position:100.0});
      }
    }          

    // set up refresh of timingobject position
    to.on("timeupdate", function () {
      document.getElementById("position").innerHTML = to.query().position.toFixed(2);
    });

    // set up video sync
    var sync1 = MCorp.mediaSync(document.getElementById('player1'), to);

    // set up video sync
    var sync2 = MCorp.mediaSync(document.getElementById('player2'), to);
};