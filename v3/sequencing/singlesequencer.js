define(function(require) {

    const util = require("../util/util");
    const endpoint = require("../util/endpoint");
    const Interval = require("../util/interval");
    const motionutils = require("../util/motionutils");
    const eventify = require("../util/eventify");
    const Schedule = require("./schedule");

    const PosDelta = motionutils.MotionDelta.PosDelta;
    const MoveDelta = motionutils.MotionDelta.MoveDelta;


    class SingleSequencer {

        constructor (axis, to) {

            // axis
            this._axis = axis;

            // timing object
            this._to = to;

            // schedule
            this._sched = new Schedule(this._axis, to);

            // activeCues
            this._activeCues = new Map(); // (key -> cue)

            // Axis Callback
            let cb = this._onAxisCallback.bind(this)
            this._axis_cb = this._axis.add_callback(cb);

            // Schedule Callback
            cb = this._onScheduleCallback.bind(this);
            this._sched_cb = this._sched.add_callback(cb)


            /*

            Wrap onTimingChange

            To allow multiple instances of SingleSequencer to subscribe to
            the same event source, the handler must be different objects.
            If we use the class method directly as handler, it will
            be on the prototype and therefor be shared between instances.

            It is safe to use the same handler for multiple event sources.

            Additionally we specify a context for the handler simply to
            be able to use 'this' safely inside the wrapper implementation.

            */

            this._onTimingCallbackWrapper = function (eInfo) {
                this._onTimingCallback(eInfo);
            };
            this._to.on("change", this._onTimingCallbackWrapper.bind(this));

            // Change event
            eventify.eventifyInstance(this, {init:false}); // no events type
            this.eventifyDefineEvent("change", {init:true});
        }


        /***************************************************************
         EVENTS
        ***************************************************************/

        /*
            Eventify: callback formatter
        */
        eventifyCallbackFormatter = function (type, e, eInfo) {
            return [e, eInfo];
        };

        /*
            Eventify: immediate events
        */
        eventifyMakeInitEvents = function (type) {
            if (type === "change") {
                if (this.isReady()) {
                    let changeMap = [...this._activeCues.values()].map(cue => {
                        return [cue.key, {new:cue, old:undefined}];
                    });
                    return [changeMap];
                }
            }
            return [];
        };


        /***************************************************************
         READINESS
        ***************************************************************/

        /*
            Sequencer Ready Promise
        */
        get ready () {
            return this._to.ready;
        };

        /*
            Sequencer Read State
        */
        isReady() {
            return this._to.isReady();
        }


        /***************************************************************
         AXIS CALLBACK
        ***************************************************************/

        _onAxisCallback(batchMap) {
            // Do something
            console.log("onAxisCallback");
        }


        /***************************************************************
         TIMING OBJECT CALLBACK
        ***************************************************************/

        _onTimingCallback (eInfo) {
            console.log("onTimingCallback");
            const events = [];

            /*
                If update is the initial vector from the timing object,
                we set current time as the official time for the update.
                Else, the new vector is "live" and we use the timestamp
                when it was created as the official time for the update.
                This is represented by the new_vector.
            */
            let new_vector;
            if (eInfo.init) {
                new_vector = motionutils.calculateVector(to.vector, to.clock.now());
            } else {
                new_vector = to.vector;
            }

            /*
                The nature of the vector change
            */
            let delta = new motionutils.MotionDelta(to.old_vector, new_vector);

            /*
                Handle Timing Object Jump
            */
            if (delta.posDelta == PosDelta.CHANGE) {
                // make position interval
                let low = new_vector.position;
                let high = new_vector.position;
                let itv = new Interval(low, high, true, true);
                // new active cues
                let activeCues = new Map(this._axis.lookup(itv).map(cue => {
                    return [cue.key, cue];
                }));
                // exit cues - in old activeCues but not in new activeCues
                let exitCues = util.map_difference(this._activeCues, activeCues);
                // enter cues - not in old activeCues but in new activeCues
                let enterCues = util.map_difference(activeCues, this._activeCues);
                // update active cues
                this._activeCues = activeCues;
                // make events
                for (let cue of exitCues.values()) {
                    events.push({key:cue.key, new:undefined, old:cue});
                }
                for (let cue of enterCues.values()) {
                    events.push({key:cue.key, new:cue, old:undefined});
                }
                // event notification
                this.eventifyTriggerEvent("change", events);
            }

            /*
                Handle Timing Object Moving
            */
            this._sched.setVector(new_vector);
        };


        /***************************************************************
         SCHEDULE CALLBACK
        ***************************************************************/

        _onScheduleCallback = function(endpointItems) {
            const events = [];
            endpointItems.forEach(function (item) {
                let cue = item.cue;
                let has_cue = this._activeCues.has(cue.key);
                let [value, right, closed, singular] = item.endpoint;
                if (singular) {
                    if (has_cue) {
                        // exit
                        events.push({key:cue.key, new:undefined, old:cue});
                        this._activeCues.delete(cue.key);
                    } else {
                        // enter
                        events.push({key:cue.key, new:cue, old:undefined});
                        // exit
                        events.push({key:cue.key, new:undefined, old:cue});
                        // no need to both add and remove from activeCues
                    }
                } else {
                    // enter or exit
                    let right_value = (right) ? -1 : 1;
                    let enter = (item.direction * right_value) > 0;
                    if (enter) {
                        if (!has_cue) {
                            // enter
                            events.push({key:cue.key, new:cue, old:undefined});
                            this._activeCues.set(cue.key, cue);
                        } else {
                            console.log("already entered");
                        }
                    } else {
                        if (has_cue) {
                            // exit
                            events.push({key:cue.key, new:undefined, old:cue});
                            this._activeCues.delete(cue.key);
                        } else {
                            console.log("elready exited");
                        }
                    }
                }
            }, this);

            // event notification
            this.eventifyTriggerEvent("change", events);
        };



        /***************************************************************
         MAP LIKE ACCESSORS
        ***************************************************************/

        has(key) {
            return this._activeCues.has(key);
        };

        get(key) {
            return this._activeCues.get(key);
        };

        keys() {
            return this._activeCues.keys();
        };

        values() {
            return this._activeCues.values();
        };

        entries() {
            return this._activeCues.entries();
        }

    }

    function print_endpoints(endpointEvents) {
        let _ts = to.clock.now();
        let s = endpointEvents.map(function(item) {
            return endpoint.toString(item.endpoint);
        }).join(" ");
        console.log(s);
    }


    eventify.eventifyPrototype(SingleSequencer.prototype);

    return SingleSequencer;

});

