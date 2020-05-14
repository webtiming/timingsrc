define(['../util/eventify'], function (eventify) {

	/*
		Wrapping around a sequencer to safely present a single active cue as value

		implements same interface as an event variable - except variable may not be set
	*/

	var ActiveCue = function (seq) {
		this._seq = seq;
		this._stack = [];
		this._dirty = false;
		this._value = undefined;

		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true});

		var self = this;
		this._wrappedHandler = function (eList) {self._onSeqEvents(eList);}
		this._seq.on("events", this._wrappedHandler);
	};
	eventify.eventifyPrototype(ActiveCue.prototype);

	// ovverride to specify initialevents
	ActiveCue.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	ActiveCue.prototype._touch = function () {
		if (!this._dirty) {
			var self = this;
			Promise.resolve().then(function () {
				self._refresh()
			});
		}
		this._dirty = true;
	};

	ActiveCue.prototype._refresh = function () {
		var len = this._stack.length;
		// pick last item
		var value = (len > 0) ? this._stack[len-1][1] : undefined;
		if (value !== this._value) {
			this._value = value;
			this.eventifyTriggerEvent("change", value);
		}
		this._dirty = false;
	};

	ActiveCue.prototype._onSeqEvents = function (eList) {
		eList.forEach(function (eArg) {
			var seqCue = eArg.e;
			if (eArg.type === "change") {
				this._stack.push([seqCue.key, seqCue.data]);
				this._touch();
			} else if (eArg.type === "remove") {
				var i = this._stack.findIndex(function (element, index, array) {
					return (element[0] === seqCue.key); 
				});
				if (i > -1) {
					this._stack.splice(i, 1);
					this._touch();
				}
			}
		}, this);
	};

	Object.defineProperty(ActiveCue.prototype, "value", {
		get: function () {
			return this._value;
		}
	});
	ActiveCue.prototype.get = function () { return this._value;};


	ActiveCue.prototype.close = function () {
		this._seq.off("events", this._wrappedHandler);
	};


	return ActiveCue;
});

