
/*
  Written by Ingar Arntzen, Norut
*/

define(function(require, exports, module) {

	const SingleSequencer = require('sequencing/singlesequencer');
	const DoubleSequencer = require('sequencing/doublesequencer');
	const timingobject = require('timingobject/timingobject');
    const timingcallbacks = require('sequencing/timingcallbacks');

    /*
	    Common constructor DefaultSequencer and WindowSequencer
    */
    const Sequencer = function (_axis, toA, toB) {
    	if (toB === undefined) {
        	return new SingleSequencer(_axis, toA);
      	} else {
        	return new DoubleSequencer(_axis, toA, toB);
      	}
    };

	return {
		version : "v3.0",

		// util
		Interval: require('util/interval'),
		eventify: require('util/eventify'),

		// Timing Object
		TimingObject : timingobject.TimingObject,

		// Timing Converters
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
		setIntervalCallback : timingcallbacks.setIntervalCallback
	};
});
