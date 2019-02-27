define (function () {

	'use strict';
	
	/*
		problem:

		merge arrays A and B into a new array C
		- A - sorted with no duplicates
		- B - no assumptions
		- C - sorted with no duplicates
	*/


	/*
		use Set for uniqeness - or filter?
		use concat for merge - or zip 2 sorted arrays?
	*/

	var unique_sort = function(array) {
		// remove duplicates - then sort
		return [...new Set(array)].sort(); 
	};


	var unique_sort_map = function (array, getValue, cmp) {
		// remove duplicates
		let m = new Map(array.map(i => [getValue(i), i]));
		return [...m.values()].sort(cmp);
	};


	var sort_unique = function(arr) {
		// sort first and then remove duplicates
  		if (arr.length === 0) return arr;
  		arr = arr.sort(function (a, b) { return a-b; });
  		var ret = [arr[0]];
  		let len = arr.length;
  		for (var i = 1; i < len; i++) { //Start loop at 1: arr[0] can never be a duplicate
    		if (arr[i-1] !== arr[i]) {
      			ret.push(arr[i]);
    		}
  		}
	  	return ret;
	};

	var merge = function (arr1, arr2) {
		let merged = [];
	 	let current = 0;

		let a1 = {
			index: 0,
			arr: arr1
		};
		let a2 = {
			index:0,
			arr: arr2
		};

	 	let len = a1.arr.length + a2.arr.length;
	 	let isArr1Ready;
	    let isArr2Ready;
	    let value = undefined, ptr;

	 	while (current < len) {

			isArr1Ready = a1.index < a1.arr.length;
		    isArr2Ready = a2.index < a2.arr.length;
 
		    if (isArr1Ready && isArr2Ready) {
		    	ptr = (a1.arr[a1.index] < a2.arr[a2.index]) ? a1 : a2;
		    } else if (isArr1Ready) {
		    	ptr = a1;
		    } else if (isArr2Ready) {
		    	ptr = a2;
		    } else {
		    	return merged;
		    }

			// drop values that are not larger than last value
			if (value !== undefined && ptr.arr[ptr.index] == value) {
				// remove duplicates
	      		while (ptr.index < ptr.arr.length && ptr.arr[ptr.index] == value) {
	      			ptr.index++;
	      		}
	      		continue;
			} 
			// update merged with next value
	    	value = ptr.arr[ptr.index];
	    	merged[current] = value;
	      	ptr.index++;
	      	// remove further duplicates
	      	while (ptr.index < ptr.arr.length && ptr.arr[ptr.index] == value) {
	      		ptr.index++;
	      	}
	    	current++;
		}
	};



	var mergeunique = function (A, B) {
		// concat + unique_sort
		return unique_sort(A.concat(B));
	};

	var mergeunique2 = function (A, B) {
		// unique_sort B first
		// then concat and unique_sort again
		B = unique_sort(B);
		return unique_sort(A.concat(B));
	};

	var mergeunique3 = function (A, B) {
		// sort B, merge-unique 
		B.sort();
		return merge(A, B);
	};



	return {
		unique_sort: unique_sort,
		unique_sort_map: unique_sort_map, 
		sort_unique: sort_unique,
		mergeunique: mergeunique,
		mergeunique2: mergeunique2,
		mergeunique3: mergeunique3
	};
});
