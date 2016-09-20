
var TM = function(_TMC_) {



  var parseNumber = function(n) {
    var f = parseFloat(n);
    if (!isNaN(f) && isFinite(n)) {
      return f;
    };
    return null;
  };

  var toInput = function (elemId, to) {
      var rootElem = document.getElementById(elemId);

      var html = "";
      html += '<div class="toinput">'
      html += 'Update&nbsp;(&nbsp;<input id="p" type="text" name="p" value="" size="4">,';
      html += '&nbsp;<input id="v" type="text" name="v" value="" size="4">,';
      html += '&nbsp;<input id="a" type="text" name="a" value="" size="4">&nbsp;)';
      html += '&nbsp;<input id="submit" type="submit" value="Update">';
      html += '</div>'
      rootElem.innerHTML = html;

      // find elements
      var pElem = rootElem.querySelector("#p");
      var vElem = rootElem.querySelector("#v");
      var aElem = rootElem.querySelector("#a");
      var btnElem = rootElem.querySelector("#submit");

      btnElem.onclick = function (e) {
        e.preventDefault();

        // Check input values
        var p = parseNumber(pElem.value);
        var v = parseNumber(vElem.value);
        var a = parseNumber(aElem.value);

        var vector = {};
        if (p !== null) vector.position = p;
        if (v !== null) vector.velocity = v;
        if (a !== null) vector.acceleration = a;

        // Clear input values
        pElem.value = "";
        vElem.value = "";
        aElem.value = "";

        // Update
        if (p !== null || v !== null || a !== null) {
          to.update(vector);
        }
       
        return false;
      };
  };



  var toValue = function(elemId, to) {
    var rootElem = document.getElementById(elemId);
    rootElem.innerHTML = '<div id="tovalue" class="tovalue"></div>';
    var valueElem = rootElem.querySelector("#tovalue");

    var refresh = function (e) {
      var p, v, a;
      var vector = to.query();
      p = vector.position.toFixed(1),
      v = vector.velocity.toFixed(1);
      a = vector.acceleration.toFixed(1);
      valueElem.innerHTML = "P:" + p + "  V:" + v + "  A:" + a;
    };
    // initialise
    to.on("timeupdate", refresh);
  };

 var toStepControl = function (elemId, to) {
    var rootElem = document.getElementById(elemId);

    var html = '<div class="tocontrol">';
    html += '<button id="reset">Reset</button>';
    html += '<button id="next">Next</button>';
    html += '<button id="prev">Prev</button>';
    html += '</div>';
    rootElem.innerHTML = html;

    // Hook up buttons UI
    rootElem.onclick = function (e) {  
      var vector = to.query();
      var p = vector.position;
      var v = vector.velocity;
      var a = vector.acceleration;
      switch (e.target.id) {
        case "reset":
          p = 0;
          v = 0;
          a = 0;
          break;
        case  "next":
          p = p + 1;
          break;
        case "prev":
          v = v -1 ;
          break;
      }
      to.update({position:p, velocity:v, acceleration:a});
    };
  };


  var toMediaControl = function (elemId, to) {
    var rootElem = document.getElementById(elemId);

    var html = '<div class="tocontrol">';
    html += '<button id="reset">Reset</button>';
    html += '<button id="play">Play</button>';
    html += '<button id="pause">Pause</button>';
    html += '<button id="reverse">Reverse</button>';
    html += '<button id="fastreverse">FastReverse</button>';
    html += '<button id="fastforward">FastForward</button>';
    html += '</div>';
    rootElem.innerHTML = html;

    // Hook up buttons UI
    rootElem.onclick = function (e) {  
      var vector = to.query();
      var p = vector.position;
      var v = vector.velocity;
      var a = vector.acceleration;
      switch (e.target.id) {
        case "reset":
          p = 0;
          v = 0;
          a = 0;
          break;
        case  "play":
          v = 1;
          break;
        case "pause":
          v = 0;
          break;
        case "reverse":
          v = -1.0;
          break;
        case  "fastforward":
          v = 2;
          break;
        case "fastreverse":
          v = -2;
          break;
      }
      to.update({position:p, velocity:v, acceleration:a});
    };
  };

  var toControl = function (elemId, to) {
    var rootElem = document.getElementById(elemId);

    var html = '<div class="tocontrol">';
    html += '<button id="p_down">P--</button>';
    html += '<button id="p_zero">P=0</button>';
    html += '<button id="p_up">P++</button>';
    html += '<button id="v_down">V--</button>';
    html += '<button id="v_zero">V=0</button>';
    html += '<button id="v_up">V++</button>';
    html += '<button id="a_down">A--</button>';
    html += '<button id="a_zero">A=0</button>';
    html += '<button id="a_up">A++</button>';
    html += '</div>';
    rootElem.innerHTML = html;

    // Hook up buttons UI
    rootElem.onclick = function (e) {  
      var vector = to.query();
      var p = vector.position;
      var v = vector.velocity;
      var a = vector.acceleration;
      switch (e.target.id) {
        case "p_down":
          p = p-1.0;
          break;
        case  "p_up":
          p = p+1.0;
          break;
        case "p_zero":
          p = 0.0;
          break;
        case "v_down":
          v = v-1.0;
          break;
        case  "v_up":
          v = v+1.0;
          break;
        case "v_zero":
          v = 0.0;
          break;
        case "a_down":
          a = a-1.0;
          break;
        case  "a_up":
          a = a+1.0;
          break;
        case "a_zero":
          a = 0.0;
          break;
      }
      to.update({position:p, velocity:v, acceleration:a});
    };
  };

  _TMC_.toControl = toControl;
  _TMC_.toMediaControl = toMediaControl;
  _TMC_.toStepControl = toStepControl;
  _TMC_.toValue = toValue;
  _TMC_.toInput = toInput;
  return _TMC_;

}(TM || {});