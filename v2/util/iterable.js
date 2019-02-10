
define(function () {

	'use strict';

	/* 
		empty iterator
	*/ 
	var makeEmptyIterator = function () {
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
		may instead expose its contents through an interable
	*/
	var makeArrayIterable = function (array, start, stop) {
		start = (start == undefined) ? 0 : start;
		stop = (stop == undefine) ? array.length : stop;
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



	return {
		makeEmptyIterator: makeEmptyIterator,
		makeArrayIterable: makeArrayIterable
	};
});