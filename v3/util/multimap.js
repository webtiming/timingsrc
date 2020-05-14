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
	  	associated with multiple keys.
	  
		MultiMap supports setting and removing of (key,value) bindings.  

		- set (key, value) 
		- delete (key, value)

		Could have used Set instead of Array for values, 
		but the assumption is that there will be a big key set
		(implying many Set objects), with few values in each.
		Sets would have provided protection for duplicates, and 
		would likely also be faster on remove.

		Equality of values is regular object equality by default,
		but may be relaxed to mean equality of object property by specifying a 
		propertyname. 

	*/

	var MultiMap = function (options) {
		this.options = options || {};
		// value
        if (typeof this.options.value === "string") {
            let propertyName = this.options.value;

            this.value = function (obj) {return obj[propertyName]};
        } else {
            this.value = function (x) {return x;};
        }    
		this.map = new Map(); // key -> [obj0, obj1,...]
	};

	MultiMap.prototype.setAll = function (items) {
		let len_items = items.length;
		let values, key, value;
		for (let i=0; i<len_items; i++) {
			[key, value] = items[i];
			values = this.map.get(key);
			if (values == undefined) {
				this.map.set(key, [value])
			} else {
				// protect against duplicate (key,value) bindings
				idx = values.findIndex(function (obj) {
					return this.value(obj) == key;
				});
				if (idx === -1) {
			    	values.push(item);
				}
			}
		}
	};

	MultiMap.prototype.set = function (key, value) {
	    return this.setAll([[key, value]]);
	};

	MultiMap.prototype.deleteAll = function (items) {
		let len_items = items.length;
		let values, key, value, idx;
		for (let i=0; i<len_items; i++) {
			[key, value] = items[i];
			values = this.map.get(key)
			if (values != undefined) {
				idx = values.findIndex(function (obj) {
					return this.value(obj) == key;
				});
			    if (idx > -1) {
					values.splice(idx, 1);
					// remove key if values is left empty
					if (values.length === 0) {
						this.map.delete(key);
					}
			    }
			} 
		}
	};

	MultiMap.prototype.delete = function (key, value) {
	    return this.deletAll([[key, value]]);
	};

	MultiMap.prototype.has = function (key) {
		return this._map.has(key);
	};

	MultiMap.prototype.keys = function () {
		return this._map.keys();
	};

	MultiMap.prototype.get = function (key) {
		return this._map.get(key);
	};

	return MultiMap;
});


