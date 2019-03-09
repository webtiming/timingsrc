
define(function () {

	'use strict';

	/* 
		empty iterable
	*/ 
	var empty = function () {
		// return iterable
		return [].values();
	};
	

	/*
		make iterable for array or slice of array

		array is an iterable, but if one does not
		want to expose the array object itself, one
		may instead expose its contents through an iterable
	*/
	var slice = function (array, start, stop) {
		start = (start == undefined) ? 0 : start;
		stop = (stop == undefined) ? array.length : stop;
		// check start and stop values
		start = Math.max(start, 0);
		start = Math.min(start, array.length);
		stop = Math.max(start, stop);
		stop = Math.min(stop, array.length);
		let i = start;
		let next = function next() {
			if (i < stop) {
				return {done:false, value: array[i++]};
			} 
			return {done:true};	
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
	};


	/*
		chain multiple iterable into one iterable
	*/
	var chain = function (...iterables) {
		// get iterators
		const iterators = iterables.map(function (iterable) {
			return iterable[Symbol.iterator]();
		});
		let i = 0;
		const next = function () {
			let item = iterators[i].next();
			while (item.done) {
				// current iterator exhausted
				// go to next iterator if any
				if (i < iterators.length-1) {
					i++;
					item = iterators[i].next();

					continue;
				} else {
					// all iterators exhausted
					return {done:true};
				}
			}
			// item ready
			return item;
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
	};

	/*
		map iterable
	*/
	var map = function (iterable, mapFunc) {
		let it = iterable[Symbol.iterator]();
		let next = function () {
			let item = it.next();
			if (!item.done) {
				return {done:false, value: mapFunc(item.value)}
			}
			return {done:true};
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
	};

	/*
		filter iterable
	*/
	var filter = function (iterable, predFunc) {
		let it = iterable[Symbol.iterator]();
		let next = function () {
			let item = it.next();
			while (!item.done) {
				if (predFunc(item.value)) {
					return item;
				}
				item = it.next();
			}
			return {done:true};
		}
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};
	};


	/*
		unique iterable
	*/
	var unique = function (iterable, valueFunc) {
		if (valueFunc == undefined) {
			valueFunc = function (value) {return value;};
		}
		const s = new Set();
		let it = iterable[Symbol.iterator]();
		let next = function () {
			let item = it.next();
			while (!item.done) {
				let value = valueFunc(item.value);
				if (!s.has(value)) {
					s.add(value);
					return item;
				}
				item = it.next();
			}
			return {done:true};
		}
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};		
	};


	/*
		concatMap
		mapFunc returns an iterable
	*/
	var concatMap = function (iterable, mapFunc) {
		let mainIterator = iterable[Symbol.iterator]();
		let subIterator = [].values();
		let mainItem, subItem;
		let next = function () {
			subItem = subIterator.next();
			while (subItem.done) {
				// move main iterator
				mainItem = mainIterator.next();
				if (mainItem.done) {
					// main iterator exhausted
					return {done:true};
				} else {
					// fetch new subIterator
					subIterator = mapFunc(mainItem.value)[Symbol.iterator]();
					subItem = subIterator.next();
					// continue while loop to check subItem
				}
			}
			// sub item ok
			return subItem;
		};
		// return iterable
		return {
			next: next,
			[Symbol.iterator]: function () {return this;}
		};	
	};


	var Iter = function (iterable) {
		this.iterable = iterable;
		/*
			for conveinience
		 	make Iter objects into real iterables
		 	by exposing the iterable it wraps
		 	so that we dont have to access the
		 	wrapped iterable
		*/
		this.iterator = iterable[Symbol.iterator]();
		this[Symbol.iterator] = function () {
			return this;
		}
		
	};

	Iter.prototype.next = function () {
		return this.iterator.next();
	};

	Iter.prototype.concatMap = function (mapFunc) {
		return new Iter(concatMap(this.iterable, mapFunc));
	};

	Iter.prototype.unique = function (valueFunc) {
		return new Iter(unique(this.iterable, valueFunc));
	};

	Iter.prototype.filter = function (predFunc) {
		return new Iter(filter(this.iterable, predFunc));
	};

	Iter.prototype.map = function (mapFunc) {
		return new Iter(map(this.iterable, mapFunc));
	};


	var I = function (iterable) {
		return new Iter(iterable);
	};


	return {
		empty: empty,
		slice: slice,
		filter: filter,
		chain: chain,
		map: map,
		unique: unique,
		concatMap: concatMap,
		I: I
	};
});