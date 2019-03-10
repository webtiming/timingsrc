
/*
  Written by Ingar Arntzen, Norut
*/

define(function(require, exports, module) {

	const DefaultSequencer = require('sequencing/sequencer');
	const WindowSequencer = require('sequencing/windowsequencer');
	const timingobject = require('timingobject/timingobject');
    const timingcallbacks = require('sequencing/timingcallbacks');

    /* 
	    Common constructor DefaultSequencer and WindowSequencer
    */
    const Sequencer = function (toA, toB, _axis) {
    	if (toB === undefined) {
        	return new DefaultSequencer(toA, _axis);
      	} else {
        	return new WindowSequencer(toA, toB, _axis); 
      	}
    };

    // Add clone prototype to both Sequencer and WindowSequencer
    DefaultSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
    WindowSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
   
	return {
		version : "v2.1",
		
		// util
		Interval: require('util/interval'),	
		eventify: require('util/eventify'),

		// Timing Object
		TimingObject : timingobject.TimingObject,

		// Timing Converters
		ConverterBase : timingobject.ConverterBase,
		SkewConverter : require('timingobject/skewconverter'),
		DelayConverter : require('timingobject/delayconverter'),
		ScaleConverter : require('timingobject/scaleconverter'),
		LoopConverter : require('timingobject/loopconverter'),
		RangeConverter : require('timingobject/rangeconverter'),
		TimeShiftConverter : require('timingobject/timeshiftconverter'),
		DerivativeConverter : require('timingobject/derivativeconverter'),
		
		// Sequencing

		Axis: require('sequencing/axis'),
		Sequencer : Sequencer,
		setPointCallback : timingcallbacks.setPointCallback,
		setIntervalCallback : timingcallbacks.setIntervalCallback,
		TimingInteger : require('sequencing/timinginteger'),
		ActiveCue : require('sequencing/activecue')
	};
});
