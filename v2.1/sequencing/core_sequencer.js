define(function(require) {

    const motionutils = require("../util/motionutils");
    const eventify = require("../util/eventify");
    const Interval = require("../util/interval");
    const Axis = require("./axis");

    class CoreSequencer {

        constructor(to) {
            this.to = to;
        }
    }

    return CoreSequencer;
});

