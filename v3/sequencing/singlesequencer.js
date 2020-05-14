define(function(require) {

    const Interval = require("../util/interval");
    const util = require("../util/util");
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

            // readiness
            this._ready = new eventify.EventBoolean(false, {init:true});

            // schedule
            this._schedule;

            // activeCues
            this._activeCues = new Map(); // (key -> cue)

            // Axis Callback
            let handle = this._axis.add_callback(this._onAxisCallback.bind(this));
            this._axis_callback_hangle = handle;

            // Schedule Callback
            this._schedule = new Schedule(to.clock, to.range,
                                          this._axis,
                                          this._onScheduleCallback.bind(this));


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
            this._to.on("change", this._onTimingCallbackWrapper, this);

            // Change event
            eventify.eventifyInstance(this, {init:false}); // no events type
            this.eventifyDefineEvent("change", {init:true});
        }

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


        /*
            Sequencer Ready Promise
        */
        get ready () {
            return eventify.makeEventPromise(this._ready, true);
        };

        /*
            Sequencer Read State
        */
        isReady() {
            return this._ready.value;
        }


        /*
            Handle callback from axis
        */
        _onAxisCallback(batchMap) {
            // Do something
            console.log("onAxisCallback");
        }

        /*
            Handle callback from timingobject
        */
        _onTimingCallback (eInfo) {
            let new_vector;
            let activeCues, enterCues, exitCues;

            console.log("onTimingCallback");

            // check and set sequencer readiness
            if (!this._ready.value) {
                this._ready.value = true;
            }

            /*
                If update is the initial vector from the timing object,
                we set current time as the official time for the update.
                Else, the new vector is "live" and we use the timestamp
                when it was created as the official time for the update.
                This is represented by the new_vector.
            */
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
                console.log("jump");
                // make position interval
                let low = new_vector.position;
                let high = new_vector.position;
                let itv = new Interval(low, high, true, true);


                // new active cues
                activeCues = new Map(this._axis.lookup(itv).map(cue => {
                    return [cue.key, cue];
                }));
                // exit cues - in old activeCues but not in new activeCues
                exitCues = util.map_difference(this._activeCues, activeCues);
                // enter cues - not in old activeCues but in new activeCues
                enterCues = util.map_difference(activeCues, this._activeCues);
            }

            /*
                Handle Timing Object Moving
            */

            // kick off schedule
            this._schedule.setVector(new_vector);


            // update active cues
            this._activeCues = activeCues;

            // make change Map
            let changeMap = new Map();
            for (let cue of exitCues.values()) {
                changeMap.set(cue.key, {new:undefined, old:cue});
            }
            for (let cue of enterCues.values()) {
                changeMap.set(cue.key, {new:cue, old:undefined});
            }

            // event notification
            this.eventifyTriggerEvent("change", changeMap);
        };



        /*
            Handle callback from Schedule
        */
        _onScheduleCallback = function(dueEvents, schedule) {
            console.log("onScheduleCallback");
        }


        /*
            Map accessors
        */

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

    eventify.eventifyPrototype(SingleSequencer.prototype);

    return SingleSequencer;

});

