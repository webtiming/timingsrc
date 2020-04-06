define(function(require) {

    const motionutils = require("../util/motionutils");
    const Interval = require("../util/interval");


    class RangeSequencer {

        constructor(toA, toB, axis, options) {
            this.toA = toA;
            this.toB = toB;
            this.axis = axis;
        }
    }

    return RangeSequencer;
});

