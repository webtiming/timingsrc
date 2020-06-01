/*
	Copyright 2020
	Author : Ingar Arntzen

	This file is part of the Timingsrc module.

	Timingsrc is free software: you can redistribute it and/or modify
	it under the terms of the GNU Lesser General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Timingsrc is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Lesser General Public License for more details.

	You should have received a copy of the GNU Lesser General Public License
	along with Timingsrc.  If not, see <http://www.gnu.org/licenses/>.
*/


define(function () {

	'use strict';

	/*
		Event
		- name: event name
		- publisher: the object which defined the event
		- init: true if the event suppports init events
		- subscriptions: subscriptins to this event

	*/

	class Event {

		constructor (publisher, name, options) {
			options = options || {}
			this.publisher = publisher;
			this.name = name;
			this.init = (options.init === undefined) ? false : options.init;
			this.subscriptions = [];
		}


		/*
			internal function

			call eventifyInitEventArg of publisher
			support result
			- eArg or [ok, eArg]
			- if eArg is undefined - there will be no event
			- use [true, undefined] to force event event if
			  eArg is undefined
		*/
		_initEventArg(name) {
			const method = this.publisher.eventifyInitEventArg;
			if (method != undefined) {
				let res = method.call(this.publisher, name);
				if (res != undefined) {
					return res;
				}
			}
			return [false, undefined];
		}


		/*
			subscribe to event
			- subscriber: subscribing object
			- callback: callback function to invoke
			- options:
				init: if true subscriber wants init events
		*/
		subscribe (callback, options) {
			if (!callback || typeof callback !== "function") {
				throw new Error("Callback not a function", callback);
			}
			const sub = new Subscription(this, callback, options);
			this.subscriptions.push(sub);
		    // Initiate init callback for this subscription
		    if (this.init && sub.init) {
		    	sub.init_pending = true;
		    	let self = this;
		    	Promise.resolve().then(function () {
		    		const [ok, eArg] = self._initEventArg(self.name);
		    		if (ok) {
		    			self._trigger(eArg, [sub], true);
		    		}
		    		sub.init_pending = false;
		    	});
		    }
			return sub
		}

		/*
			trigger event
		*/
		trigger (eArg) {
			if (this.subscriptions.length > 0) {
				const subs = this.subscriptions.filter(sub => sub.init_pending == false);
				const self = this;
				Promise.resolve().then(function () {
					self._trigger(eArg, subs, false);
				});
			}
		}

		/*
			internal function
			trigger single event
			- if sub is undefined - publish to all subscriptions
			- if sub is defined - publish only to given subscription
		*/
		_trigger (eArg, subs, init) {
			let eInfo, ctx;
			for (const sub of subs) {
				// ignore terminated subscriptions
				if (sub.terminated) {
					continue;
				}
				eInfo = {
					src: this.publisher,
					name: this.name,
					sub: sub,
					init: init
				}
				ctx = sub.ctx || this.publisher;
				try {
					sub.callback.call(ctx, eArg, eInfo);
				} catch (err) {
					console.log(`Error in ${this.name}: ${sub.callback} ${err}`);
				}
			}
		}

		/*
		unsubscribe from event
		- use subscription returned by previous subscribe
		*/
		unsubscribe(sub) {
			let idx = this.subscriptions.indexOf(sub);
			if (idx > -1) {
				this.subscriptions.splice(idx, 1);
				sub.terminate();
			}
		}
	}


	/*
		Subscription class
	*/

	class Subscription {

		constructor(event, callback, options) {
			options = options || {}
			this.event = event;
			this.name = event.name;
			this.callback = callback
			this.init = (options.init === undefined) ? this.event.init : options.init;
			this.init_pending = false;
			this.terminated = false;
			this.ctx = options.ctx;
		}

		terminate() {
			this.terminated = true;
			this.callback = undefined;
			this.event.unsubscribe(this);
		}
	}


	/*

		EVENTIFY INSTANCE

		Eventify brings eventing capabilities to any object.

		In particular, eventify supports the initial-event pattern.
		Opt-in for initial events per event type.

		eventifyInitEventArg(name) {
			if (name == "change") {
				return this._value;
			}
		}

	*/

	function eventifyInstance (object) {
		object.__eventify_eventMap = new Map();
		return object;
	};


	/*
		EVENTIFY PROTOTYPE

		Add eventify functionality to prototype object
	*/

	function eventifyPrototype(_prototype) {

		function eventifyGetEvent(object, name) {
			const event = object.__eventify_eventMap.get(name);
			if (event == undefined) {
				throw new Error("Event undefined", name);
			}
			return event;
		}

		/*
			DEFINE EVENT
			- used only by event source
			- name: name of event
			- options: {init:true} specifies init-event semantics for event
		*/
		function eventifyDefineEvent(name, options) {
			// check that event does not already exist
			if (this.__eventify_eventMap.has(name)) {
				throw new Error("Event already defined", name);
			}
			this.__eventify_eventMap.set(name, new Event(this, name, options));
		};

		/*
			ON
			- used by subscriber
			register callback on event.
		*/
		function on(name, callback, options) {
			return eventifyGetEvent(this, name).subscribe(callback, options);
		};

		/*
			OFF
			- used by subscriber
			Un-register a handler from a specfic event type
		*/
		function off(sub) {
			return eventifyGetEvent(this, sub.name).unsubscribe(sub);
		};

		/*
			Trigger event
			- used only by event source
		*/
		function eventifyTriggerEvent(name, eArg) {
			return eventifyGetEvent(this, name).trigger(eArg);
		}


		_prototype.eventifyDefineEvent = eventifyDefineEvent;
		_prototype.eventifyTriggerEvent = eventifyTriggerEvent;
		_prototype.on = on;
		_prototype.off = off;
	};


	/*
		Event Variable

		Objects with a single "change" event
	*/

	class EventVariable {

		constructor (value) {
			eventifyInstance(this);
			this._value = value;
			this.eventifyDefineEvent("change", {init:true});
		}

		eventifyInitEventArg(name) {
			if (name == "change") {
				return [true, this._value];
			}
		}

		get value () {return this._value};
		set value (value) {
			if (value != this._value) {
				this._value = value;
				this.eventifyTriggerEvent("change", value);
			}
		}
	}
	eventifyPrototype(EventVariable.prototype);

	/*
		Event Boolean


		Note : implementation uses falsiness of input parameter to constructor and set() operation,
		so eventBoolean(-1) will actually set it to true because
		(-1) ? true : false -> true !
	*/

	class EventBoolean extends EventVariable {
		constructor(value) {
			super(Boolean(value));
		}

		set value (value) {
			super.value = Boolean(value);
		}
		get value () {return super.value};
	}


	/*
		make a promise which is resolved when EventBoolean changes
		value.
	*/
	function makePromise(eventObject, conditionFunc) {
		conditionFunc = conditionFunc || function(val) {return val == true};
		return new Promise (function (resolve, reject) {
			let sub = eventObject.on("change", function (value) {
				if (conditionFunc(value)) {
					resolve(value);
					eventObject.off(sub);
				}
			});
		});
	};

	// module api
	return {
		eventifyPrototype : eventifyPrototype,
		eventifyInstance : eventifyInstance,
		EventVariable: EventVariable,
		EventBoolean: EventBoolean,
		makePromise: makePromise
	};
});
