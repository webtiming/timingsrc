define(function(require) {

    return {
        util: require("../util/util"),
        motionutils: require("../util/motionutils"),
        eventify: require("../util/eventify"),
        Interval: require("../util/interval"),
        Axis: require("../sequencing/axis"),
        Schedule: require("../sequencing/schedule"),
        TimingObject: require("../timingobject/timingobject"),
        SkewConverter: require("../timingobject/skewconverter"),
        SingleSequencer: require("../sequencing/singlesequencer"),
        DoubleSequencer: require("../sequencing/doublesequencer"),


        SkewConverter : require('timingobject/skewconverter'),
        DelayConverter : require('timingobject/delayconverter'),
        ScaleConverter : require('timingobject/scaleconverter'),
        LoopConverter : require('timingobject/loopconverter'),
        RangeConverter : require('timingobject/rangeconverter'),
        TimeShiftConverter : require('timingobject/timeshiftconverter'),
        DerivativeConverter : require('timingobject/derivativeconverter'),

    };
});

