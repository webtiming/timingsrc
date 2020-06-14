define(function(require) {

    return {
        util: require("../util/util"),
        motionutils: require("../util/motionutils"),
        eventify: require("../util/eventify"),

        TimingObject: require("../timingobject/timingobject"),
        SkewConverter : require('timingobject/skewconverter'),
        DelayConverter : require('timingobject/delayconverter'),
        ScaleConverter : require('timingobject/scaleconverter'),
        LoopConverter : require('timingobject/loopconverter'),
        TimeshiftConverter : require('timingobject/timeshiftconverter'),
        RangeConverter : require('timingobject/rangeconverter'),


        Interval: require("../util/interval"),
        Axis: require("../sequencing/axis"),
        Schedule: require("../sequencing/schedule"),
        SingleSequencer: require("../sequencing/singlesequencer"),
        DoubleSequencer: require("../sequencing/doublesequencer"),

    };
});

