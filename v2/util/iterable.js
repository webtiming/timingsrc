
define(function () {

	'use strict';

	/* 
		empty iterable
	*/ 
	var emptyIterable = function () {
		// return iterable
		return {
			next: function () {return {done:true};},
			[Symbol.iterator]: function () {return this;}
		};
	};

	/*
		make iterable for array or slice of array

		array is an iterable, but if one does not
		want to expose the array object itself, one
		may instead expose its contents through an iterable
	*/
	var arrayIterable = function (array, start, stop) {
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
	var chainIterable = function (iterables) {

	};

	/*
		map iterable
	*/
	var mapIterable = function (iterable, mapFunc) {
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
	var filterIterable = function (iterable, predFunc) {
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




	return {
		emptyIterable: emptyIterable,
		arrayIterable: arrayIterable,
		filterIterable: filterIterable,
		chainIterable: chainIterable,
		mapIterable: mapIterable
	};
});