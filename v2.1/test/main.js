define(function(require) {

    return {
        motionutils: require("../util/motionutils"),
        eventify: require("../util/eventify"),
        Interval: require("../util/interval"),
        Axis: require("../sequencing/axis"),
        Schedule: require("../sequencing/schedule"),
        TimingObject: require("../timingobject/timingobject").TimingObject,
        ActiveCues: require("../sequencing/activecues")
    };
});

