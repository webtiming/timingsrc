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


		This implementation works directly on items which include
		a key.
		
		item = {
			key: "key"
		}

		- set (item) 
		- delete (item)

		Could have used Set instead of Array for values, 
		but the assumption is that there will be a big key set
		(implying many Set objects), with few values in each.
		Sets would have provided protection for duplicates, and 
		would likely also be faster on remove.
	*/

	var MultiMap = function () {
		this._map = new Map(); // key -> [obj0, obj1,...]
	};

	MultiMap.prototype.setAll = function (items) {
		let len_items = items.length;
		let values, item;
		for (let i=0; i<len_items, i++) {
			item = items[i];
			// protect against duplicate (key,value) bindings
			values = this._map.get(item.key) || [];
			if (values.indexOf(item) === -1) {
			    values[values.length] = item;
			}
			this._map.set(item.key, values);
		}
	};

	MultiMap.prototype.set = function (item) {
	    return this.setAll([item]);
	};

	MultiMap.prototype.deleteAll = function (items) {
		let len_items = items.length;
		let values, item, idx;
		for (let i=0; i<len_items, i++) {
			item = items[i];
			values = this._map.get(item.key)
			if values != undefined {
				idx = values.indexOf(item);
			    if (idx > -1) {
					values.splice(idx, 1);
					// remove key if values is left empty
					if (values.length === 0) {
						this._map.delete(item.key);
					}
			    }
			} 
		}
	};

	MultiMap.prototype.delete = function (item) {
	    return this.deletAll([item]);
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


