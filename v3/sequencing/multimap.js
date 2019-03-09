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

define (function () {

	'use strict';

	/*
		MULTI MAP

	  	MultiMap stores (key,value) tuples  
	  	- one key may be bound to multiple values  
		- protection from duplicate (key, value) bindings.
		- values are not assumed to be unique, i.e., the same value may be
	  	associated with multiple points.
	  
		MultiMap supports addition and removal of (key,value) bindings.  
		- insert (key, value) 
		- remove (key, value)
	*/

	var MultiMap = function () {
		this._map = {}; // key -> [value,]
	};

	MultiMap.prototype.insert = function (key, value) {
	    return this.insertAll([{key:key, value:value}]);
	};

	MultiMap.prototype.insertAll = function (tuples) {
	    var values, added = [];
	    tuples.forEach(function (tuple){
	    	if (!this._map.hasOwnProperty(tuple.key)) {
			    this._map[tuple.key] = [];
			}
			// protect against duplicate (key,value) bindings
			values = this._map[tuple.key];
			if (values.indexOf(tuple.value) === -1) {
			    values.push(tuple.value);
			    added.push(tuple);
			}
	    }, this);
	    return added;
	};

	MultiMap.prototype.remove = function (key, value) {
	    return this.removeAll([{key:key, value:value}]);
	};

	MultiMap.prototype.removeAll = function (tuples) {
		var index, values, removed = [];
		tuples.forEach(function (tuple) {
			if (this._map.hasOwnProperty(tuple.key)) {
			    values = this._map[tuple.key];
			    index = values.indexOf(tuple.value);
			    if (index > -1) {
					values.splice(index, 1);
					removed.push(tuple);
					// clean up if empty
					if (values.length === 0) {
					    delete this._map[tuple.key];
					}
			    }
			}
		}, this);
	    return removed;
	};

	MultiMap.prototype.hasKey = function (key) {
		return this._map.hasOwnProperty(key);
	};

	MultiMap.prototype.keys = function () {
		return Object.keys(this._map);
	};

	MultiMap.prototype.getItemsByKey = function (key) {
		var res = [];
		if (this.hasKey(key)) {
			this._map[key].forEach(function (value) {
				res.push({key: key, value: value});
			});	
		}
		return res;
	};

	MultiMap.prototype.getItemsByKeys = function (_keys) {
		if (_keys === undefined) _keys = this.keys();
		var res = [];
		_keys.forEach(function (key) {
			res = res.concat(this.getItemsByKey(key));	
		}, this);
		return res;
	};
	MultiMap.prototype.list = MultiMap.prototype.getItemsByKeys;

	return MultiMap;
});


