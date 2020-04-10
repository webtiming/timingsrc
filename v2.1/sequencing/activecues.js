define(function(require) {

    const Interval = require("../util/interval");
    const util = require("../util/util");


    class ActiveCues {


        constructor (axis) {
            this.axis = axis;
            this.activeCues = new Map(); // (key -> cue)
        }

        /*
            This calculates the transition in activeCues caused by
            a jump on the timeline.
            interval may be point or range
        */

        jumpTo (interval) {

            let newActiveCues = new Map(this.axis.lookup(interval).map(cue => {
                return [cue.key, cue];
            }));

            /*
                find exit cues
                were in old active cues - but not in new
            */
            let exitCues = util.map_difference(this.activeCues, newActiveCues);
            /*
                find enter cues
                were not in old active cues - but are in new
            */
            let enterCues = util.map_difference(newActiveCues, this.activeCues);

            // update active cues
            this.activeCues = newActiveCues;

            return {
                exitCues: exitCues,
                enterCues: enterCues
            };

        }

    }

    return ActiveCues;

});

