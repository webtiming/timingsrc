/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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


define (['util/interval', './sortedarraybinary', './multimap'], 
	function (Interval, SortedArrayBinary, MultiMap) {

	'use strict';

	var AxisError = function (message) {
		this.name = "AxisError";
		this.message = (message || "");
	};
	AxisError.prototype = Error.prototype;


	// Operation Types
	var OpType = Object.freeze({
		NOOP : "noop",
		CREATE: "create",
		UPDATE: "update",
		REPEAT: "repeat",
		REMOVE: "remove"
	});

	// POINT TYPES
    var PointType = Object.freeze({
		LOW: "low",
		SINGULAR: "singular",
		HIGH: "high",
		INSIDE: "inside",
		OUTSIDE: "outside",
		toInteger: function (s) {
		    if (s === PointType.LOW) return -1;
		    if (s === PointType.HIGH) return 1;
		    if (s === PointType.INSIDE) return 2;
		    if (s === PointType.OUTSIDE) return 3;
		    if (s === PointType.SINGULAR) return 0;
		    throw new AxisError("illegal string value for point type");
		},
		fromInteger: function (i) {
			if (i === -1) return PointType.LOW;
			else if (i === 0) return PointType.SINGULAR;
			else if (i === 1) return PointType.HIGH;
			else if (i === 2) return PointType.INSIDE;
			else if (i === 3) return PointType.OUTSIDE;
			throw new AxisError("illegal integer value for point type");
		}
    });


	/*
		AXIS

		Manages a collection of Intervals.
		Each interval is identified by a key, and may be inserted or removed using the key, just like a map/dictionary.
		Interval objects represents an interval on the Axis or real floating point numbers.

		In addition to key access, the Axis provides efficient access to Intervals by search.
		- lookupByInterval (searchInterval) returns all Intervals whose endpoints are covered by given search Interval
		- lookupByPoint (x) returns all Intervals in the collection that covers given point.
	*/

	var Axis = function () {
		// Mapping key to Intervals
		this._map = {}; // key -> Interval(point,point)
		// Revers-mapping Interval points to Interval keys
		this._reverse = new MultiMap(); // point -> [key, ...]
		// Index for searching Intervals effectively by endpoints - used by lookupByInterval
		this._index = new SortedArrayBinary(); // [point, point, ...]
		// No index provided for lookupByPoint

		// Caching data for each key
		this._cache = {}; // key -> data
		// Callbacks - change event - list of axis operations
		this._callbacks = {'change': []};
	};


	// internal helper function to clean up map, index, reverse and cache during (key,interval) removal
	Axis.prototype._remove = function (key) {
		if (this._map.hasOwnProperty(key)) {
			var interval = this._map[key];
			// map
			delete this._map[key];
			// reverse
			this._reverse.remove(interval.low, key);
			this._reverse.remove(interval.high, key);
			// index remove from index if reverse is empty after remove
			if (!this._reverse.hasKey(interval.low)) {
				this._index.remove(interval.low);
			}
			if (!this._reverse.hasKey(interval.high)) {
				this._index.remove(interval.high);
			}
			// cache
			var data;
			if (this._cache.hasOwnProperty(key)) {
				data = this._cache[key];
				delete this._cache[key];
			}
			// return old
			return { type: OpType.REMOVE, key: key, interval: interval, data: data};		
		} else {
			return {type: OpType.NOOP, key: key, interval: undefined, data: undefined};
		}
	};

	// internal helper function to insert (key, interval, data) into map, index, reverse and cache
	Axis.prototype._insert = function (key, interval, data) {
		var res = {key: key, interval: interval, data: data};
		if (this._map.hasOwnProperty(key)) {
			// UPDATE
			res.old_interval = this._map[key];
			res.old_data = this._cache[key];
			// clear old values
			this._remove(key);
			/*
			indicate if interval was changed or remained the same
			UPDATE means that interval was updated - affecting the sequencer
			REPEAT means that interval was not changed but repeated. 
			This is typically the case if data was modified without affecting the timing aspects
			*/
			if (interval.equals(res.old_interval)) {
				res.type = OpType.REPEAT;
			} else {
				res.type = OpType.UPDATE;
			}
		} else {
			res.type = OpType.CREATE;
		}
		// map
		this._map[key] = interval;
		// index add to index if reverse is empty before insert
		if (!this._reverse.hasKey(interval.low)) {
			this._index.insert(interval.low);
		}
		if (!this._reverse.hasKey(interval.high)) {
			this._index.insert(interval.high);
		}
		// reverse index
		this._reverse.insert(interval.low, key);
		this._reverse.insert(interval.high, key);
		// cache
		this._cache[key] = data;

		return res;		
	};


	/*
		UPDATEALL
		- process a batch of operations
		- creates, replaces or removes args [{key:key, interval:interval},] 
	*/
	Axis.prototype.updateAll = function (args) {
		var e, elist = [], key, interval, data;
		args.forEach(function(arg){
			key = arg.key;
			interval = arg.interval;
			data = arg.data;
			if (typeof key !== 'string') throw new AxisError("key is " + typeof key + " - must be string");
			if (interval === undefined) {
				e = this._remove(key);
			} else {
				if (interval instanceof Interval === false) throw new AxisError("parameter must be instanceof Interval");
				e = this._insert(key, interval, data);
			}
			elist.push(e);
		}, this);
		// trigger events
		this._doCallbacks("change", elist);
		// return elist
		return elist;	
	};

	// shorthand for update single (key, interval) pair
	Axis.prototype.update = function (key, interval, data) {
		return this.updateAll([{key:key, interval:interval, data:data}]);
	};

	/*
		AXIS EVENTS
	*/

	// register callback
	Axis.prototype.on = function (what, handler, ctx) {
    	if (!handler || typeof handler !== "function") 
    		throw new AxisError("Illegal handler");
    	if (!this._callbacks.hasOwnProperty(what)) 
    		throw new AxisError("Unsupported event " + what);
    	var index = this._callbacks[what].indexOf(handler);
        if (index === -1) {
        	// register handler
        	handler["_ctx_"] = ctx || this;
        	this._callbacks[what].push(handler);
        }
        return this;
    };

	// unregister callback
    Axis.prototype.off = function (what, handler) {
    	if (this._callbacks[what] !== undefined) {
    		var index = this._callbacks[what].indexOf(handler);
        	if (index > -1) {
        		this._callbacks[what].splice(index, 1);
	  		}
    	}
    	return this;
    };

    // perform callback
    Axis.prototype._doCallbacks = function(what, e) {
	 	var err;
		// invoke callback handlers
		this._callbacks[what].forEach(function(h) {
			try {
	          h.call(h["_ctx_"], e);
	        } catch (err) {
	          console.log("Error in " + what + ": " + h + ": " + err);
	        }	    
		}, this);
    };


    /*
		AXIS SEARCH
    */

	/*
		Find (key,interval) pairs for intervals that cover x.
		Simply scan all intervals in collection - no index provided.
		x undefined means all (key, interval)
	*/
	Axis.prototype.lookupByPoint = function (x) {
		var interval, res = [];
		Object.keys(this._map).forEach(function(key){
			interval = this._map[key];
			if (x === undefined || interval.coversPoint(x)) {
				res.push({key:key, interval: interval, data: this._cache[key]});
			}
		}, this);
		return res;
	};

	/*
		Find all interval endpoints within given interval 
	*/
	Axis.prototype.lookupByInterval = function (interval) {
		// [point,]
		var points = this._index.lookup(interval);
		// [{key: key, point: point, interval:interval},]
		var res = [], items, point;
		this._index.lookup(interval).forEach(function (point) {
			this._reverse.getItemsByKey(point).forEach(function (item) {
				point = item.key;
				interval = this._map[item.value];
				res.push({
					key: item.value,
					interval: interval,
					data: this._cache[item.value],
					point: point,
					pointType: this.getPointType(point, interval)
				});
			}, this);
		}, this);
		return res;
	};

	Axis.prototype.items = function () {return this.lookupByPoint();};
	Axis.prototype.keys = function () {return Object.keys(this._map);};

	Axis.prototype.getItem = function (key) {
		if (this._map.hasOwnProperty(key)) {
			return {
				key: key, 
				interval: this._map[key],
				data: this._cache[key]
			};
		} 
		return null;
	};

	Axis.prototype.getInterval = function (key) {
		return (this._map.hasOwnProperty(key)) ? this._map[key] : null;
	};

	Axis.prototype.getPointType = function (point, interval) {
		if (interval.isSingular() && point === interval.low) return PointType.SINGULAR;
	    if (point === interval.low) return PointType.LOW;
	    if (point === interval.high) return PointType.HIGH;
	    if (interval.low < point && point < interval.high) return PointType.INSIDE;
	    else return PointType.OUTSIDE;
	};

	Axis.prototype.hasKey = function (key) {
		return this._map.hasOwnProperty(key);
	};

	// module definition
	return {
		Axis: Axis,
		OpType : OpType,
		PointType: PointType
	};
});

