var TM = function(_TMC_) {

  var toSlider = function($root, to, options) {

    var user_is_active = false;
    var options = options || {};
    options.update = options.update || function(pos) {
      return pos;
    };
    var within_range = false;
    var $handle;

    var is_number = function(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    };
    // On slider start
    // Invoked when users manually starts sliding
    var on_slider_start = function(e, ui) {
      user_is_active = true;
    };

    // On slider change
    // Invoked when the slider is manually updated
    var on_slider_change = function(e, ui) {
      var pos;
      if (e.originalEvent !== undefined) {
        // Change caused by manual user interaction
        user_is_active = true;
        // read value from slider and request timing object update
        pos = position_from_progress(ui.value);
        pos = options.update(pos);
        to.update({position:pos});
        user_is_active = false;
        // refresh slider from to ?
        //slider_refresh({type:"update"});
      }
      // else slider updated programmatically
    };

    var refresh_range = function() {
      // Set up range in options
      if (!options['range']) {
        var range = to.range;
        var x = (is_number(range[0])) ? range[0] : 0.0;
        var y = (is_number(range[1])) ? range[1] : 10.0;
        options['range'] = [x,y];
      }
    };

    var update_range = function (range) {
      options['range'] = range;
      slider_refresh();
    };


    var initialise = function() {
      refresh_range();
      // Set up slider in DOM
      $root.slider({
        min: 0,
        max: 100,
        step: 0.05,
        change: on_slider_change,
        start: on_slider_start
      });
      $handle = $root.find('.ui-slider-handle');
      $handle.hide();
    };


    // Slider refresh
    var first_refresh = false;
    var slider_refresh = function(event) {
      if (first_refresh === false) {
        first_refresh = true;
        if (options.disable) {
          $root.slider("disable");
        }
      }
      refresh_range();
      var position, progress;
      if (user_is_active === false) {
        position = to.query().position;
        progress = position_to_progress(position);
        var new_within_range = is_within_range(position);
        if (!within_range && !new_within_range) {
          return;
        }
        if (!within_range && new_within_range) {
          $handle.show();
        } else if (within_range && !new_within_range) {
          $handle.hide();
        }
        within_range = new_within_range;
        $root.slider("option", "value", progress);
      }
    };

    // Check if position is within range
    var is_within_range = function(position) {
      if (position < options['range'][0]) return false;
      if (position > options['range'][1]) return false;
      return true;
    }

    // Convert position from progress
    var position_from_progress = function(progress) {
      var start = options['range'][0];
      var end = options['range'][1];
      return start + progress * (end - start) / 100.0;
    };

    // Convert position to progress
    var position_to_progress = function(position) {
      var start = options['range'][0];
      var end = options['range'][1];
      if (position <= start) return 0;
      else if (position >= end) return 100;
      else {
        return (position - start) * 100.0 / (end - start);
      }
    };

    initialise();
    to.on("timeupdate", slider_refresh);
    return {
      setRange: update_range
    };
  };

  _TMC_.toSlider = toSlider;
  return _TMC_;

}(TM || {});