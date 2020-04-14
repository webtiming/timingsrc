define(function(require) {

    const Interval = require("../util/interval");
    const util = require("../util/util");
    const eventify = require("../util/eventify");

    class ActiveCues {



        constructor (axis, toA, toB) {
            this._axis = axis;
            this._toA = toA;
            this._toB = toB;
            this._activeCues = new Map(); // (key -> cue)

            // Add Axis callback
            this._handle = this._axis.add_callback(this._onAxisUpdate.bind(this));

            // Handler for timing object A
            this._onTimingA = function (ev) {
                if (this._toA.isReady() && this._toB.isReady()) {
                    this._onTimingUpdate(this._toA, ev);
                }
            };
            this._toA.on("change", this._onTimingA, this);
            // Handler for timing object B
            this._onTimingB = function (ev) {
                if (this._toA.isReady() && this._toB.isReady()) {
                    this._onTimingUpdate(this._toB, ev);
                }
            };
            this._toB.on("change", this._onTimingB, this);
        }

        get ready () {
            return Promise.all([this._toA.ready, this._toB.ready]);
        };


        _onAxisUpdate(batchMap) {
            // Do something
            console.log("onAxisUpdate");
        }

        _onTimingUpdate (src, eArg) {
            if (src == this._toA) {
                console.log("onTimingUpdateA");
            } else if (src == this._toB) {
                console.log("onTimingUpdateB");
            }
        };



        /*
            This calculates the transition in activeCues caused by
            a jump on the timeline.
            interval may be point or range
        */

        jumpTo (interval) {

            let newActiveCues = new Map(this._axis.lookup(interval).map(cue => {
                return [cue.key, cue];
            }));

            /*
                find exit cues
                were in old active cues - but not in new
            */
            let exitCues = util.map_difference(this._activeCues, newActiveCues);
            /*
                find enter cues
                were not in old active cues - but are in new
            */
            let enterCues = util.map_difference(newActiveCues, this._activeCues);

            // update active cues
            this._activeCues = newActiveCues;

            return {
                exitCues: exitCues,
                enterCues: enterCues
            };

        }

    }

    return ActiveCues;

});

