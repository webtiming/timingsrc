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


define (['../util/interval'], function (Interval) {

    'use strict';

    // check if n is a number
    var is_number = function(n) {
    	var N = parseFloat(n);
        return (n==N && !isNaN(N));
    };




    /* 
        batch inserts have two strategies
        1) CONCATSORT - concat arrays and sort
        2) SEARCHSPLICE - binary search to the right location and splice the array
    
        Searchsplice is preferable only when very small batches (<40) are inserted into
        an array. For small arrays (<100) concatsort is still preferable, even for small batches.  
    */


    /*
        dataset limit
        dataset must be larger than this for searchsplice to be considered
    */
    const DATASET_LIMIT = 500;

    /*
        magic table to set appropriate batch limit where
        batch must be smaller than this for for searchsplice to be considered
    */
    var get_batch_limit = function (size) {
        if (size < 50) return 5;
        if (size < 500) return 10;
        if (size < 5000) return 30;
        if (size < 50000) return 40;
        return 50;
    };

    /*
        empty iterator
    */
    var emptyIterator = function () {
        let it = {};
        it[Symbol.iterator] = function () {
            return {
                next() {
                    return {done:true};
                }
            };
        };
        return it;
    };


    /*
        iterator for array slice
    */
    var sliceIterator = function (array, start, stop) {
        let slice = {
            array: array,
            start: start,
            stop: stop
        };
        slice[Symbol.iterator] = function () {
            return {
                array: this.array,
                current: this.start,
                stop: this.stop,
                next() {
                    if (this.current < this.stop) {
                        return { done: false, value: this.array[this.current++]};
                    } else {
                        return { done: true };
                    }
                }
            };
        };
        return slice;
    };


    var BinarySearchError = function (message) {
        this.name = "BinarySearchError";
        this.message = (message||"");
    };
    BinarySearchError.prototype = Error.prototype;

    /*

    BINARY SEARCH

    The implementation supports duplicate elements.
    - elements must support Javascript comparison operators
    
    If duplicates are present

    - insert - insert along with equal values, no particular order is maintained between duplicates
    - lookup - returns all duplicates or none
    - remove - removing all duplicates of a given value
    - indexOf - returns one index, also in case of duplicates - not defined which

    */

    var BinarySearch = function (options) {
        this.array = [];
        this.options = options || {};
        this.options.allow_duplicates = this.options.allow_duplicates || false;
        // optional getter for object values
        if (this.options.value) {
            let value = this.options.value;
            this.value = value;
            this.cmp = function (a, b) {return value(a)-value(b);}
        } else {
            this.value = function (x) {return x;};
            this.cmp = function (a, b) {return a-b;};
        }
    };
    	
    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    BinarySearch.prototype.binaryIndexOf = function (value_searchElement) {
        let minIndex = 0;
        let maxIndex = this.array.length - 1;
        let currentIndex;
        let value_currentElement;
        while (minIndex <= maxIndex) {
    		currentIndex = (minIndex + maxIndex) / 2 | 0;
    		value_currentElement = this.value(this.array[currentIndex]);
            if (value_currentElement < value_searchElement) {
                minIndex = currentIndex + 1;
            } else if (value_currentElement > value_searchElement) {
                maxIndex = currentIndex - 1;
            } else {
                // found - duplicates may exist on both sides
    		    return currentIndex;
    		}
        }
        // not found - indicate at what index the element should be inserted
    	return ~maxIndex;
    	
        // NOTE : ambiguity

        /*
        search for for an element that is less than array[0]
        should return a negative value indicating that the element 
        was not found. Furthermore, as it escapes the while loop
        the returned value should indicate the index that this element 
        would have had - had it been there - as is the idea of this bitwise 
        operator trick

        so, it follows that search for value of minimum element returns 0 if it exists, and 0 if it does not exists
        this ambiguity is compensated for in relevant methods
        */
    };
    

    // utility function for resolving ambiguity
    BinarySearch.prototype._isFound = function(index, x) {
        return (index > 0 || (index == 0 && this.value(this.array[0]) == x)) ? true : false;
    };

    BinarySearch.prototype.indexOf = function (x) {
        var index = this.binaryIndexOf(x);
        return (this._isFound(index, x)) ? index : -1;
    };

    BinarySearch.prototype.has = function (x) {
        var index = this.binaryIndexOf(x);
        return (this._isFound(index, x)) ? true : false;
    };


    /*
        remove duplicates from array

        removing duplicates using Set is natural, 
        but if objects and a value function is provided, 
        but Set equality will not work if the array containes objects and not values.
        in this case use map instead - this is slower by a factor 2
        due to repeated use of the custom value() function
    */
    BinarySearch.prototype.unique = function (A) {
        if (this.value) {
            let m = new Map(A.map(i => [this.value(i), i]));
            return [...m.values()];
        } else {
            return [...new Set(A)];
        }
    };


    /*
        insert - binarysearch and splice
    */
    BinarySearch.prototype.insert_searchsplice = function (batch) {
        let len_batch = batch.length;
        let x, index;
        let allow_duplicates = this.options.allow_duplicates;
        for (let i=0; i<len_batch; i++) {
            x = this.value(batch[i]);
            index = this.binaryIndexOf(x);
            // protect agaist duplicate entries
            if (!this._isFound(index) || allow_duplicates) {
                this.array.splice(Math.abs(index), 0, x);
            }
        }
    };

    /*
        insert - concat and sort
    */
    BinarySearch.prototype.insert_concatsort = function (batch) {
        // concat
        this.array = this.array.concat(batch)
        // sort 
        this.array.sort(this.cmp);
        // remove duplicates
        if (!this.options.allow_duplicates) {
            this.array = this.unique(this.array);
        }
    };


    /*
        insert - select appropriate method
    */
    BinarySearch.prototype.insert = function (batch) {
        if (batch.length == 0) {
            return;
        }
        let len_ds = this.array.length;
        let batch_limit = get_batch_limit(len_ds);
        if (this.array.length == 0) {
            this.insert_concatsort(batch);
        } else if (batch.length < batch_limit && this.array.length > DATASET_LIMIT) {
            this.insert_searchsplice(batch)
        } else {
            this.insert_concatsort(batch);
        }
    };

    /*
        removes x, also duplicates

        - works by finding lefmost occurence of x and scanning to rightmost occurence
        - alternative method might be to use lookup()
        - scanning is preferable under the assumption that the number of duplicates is not very large.
    */
    BinarySearch.prototype.remove = function (x) {
        // find leftmost value greater than x or equal to x
        let left_index = this.geIndexOf(x);
        if (left_index == -1 || this.value(this.array[x]) > x) {
            // x not found, or only values greater than x found 
            return;
        }
        // scan right to find the rightmost value with value == x
        let last_idx = this.array.length-1;
        let i = left_index;
        while (i<last_idx) {
            if (this.value(this.array[i+1]) > x) {
                break;
            } else {
                i++;
            }     
        }
        let right_index = i+1;
        return this.array.splice(left_index, right_index-left_index);
    };

    BinarySearch.prototype.getMinimum = function () {
        return (this.array.length > 0) ? this.array[0] : undefined;
    };

    BinarySearch.prototype.getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : undefined;
    };

    /* 
       Find index of largest value less than x
       Returns -1 if noe values exist that are less than x
     */
    BinarySearch.prototype.ltIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        if (this._isFound(i, x)) {
            /* 
                found - x is found on index i
                make sure there are no duplicates by scanning to the left
                if scanning reaches the left end of the array nothing is found 
                return -1
            */ 
            while (i > 0) {
                if (this.value(this.array[i-1]) < x) {
                    return i-1;
                } else {
                    i--;
                }
            }
            return -1;
        } else {
            /* 
                not found - Math.abs(i) is index where x should be inserted
                => Math.abs(i) - 1 is the largest value less than x
            */
            return Math.abs(i)-1;
        } 
    };

    /* 
       Find index of rightmost value less than x or equal to x 
       Returns -1 if noe values exist that are less than x or equal to x
     */
    BinarySearch.prototype.leIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        if (this._isFound(i, x)) {
            /* 
                element found
                check for duplicates towards the right
            */
            let last_idx = this.array.length-1;
            while (i<last_idx) {
                if (this.value(this.array[i+1]) > x) {
                    return i;
                } else {
                    i++;
                }     
            }
            return last_idx;
        } else {
            // not found - consider element to the left
            i = Math.abs(i) - 1;
            return (i >= 0) ? i : -1;
        }
    };

    /* 
       	Find index of leftmost value greater than x
       	Returns -1 if no values exist that are greater than x
    */

    BinarySearch.prototype.gtIndexOf = function (x) {
        var i = this.binaryIndexOf(x);
        if (this._isFound(i, x)) {
            /*
                found - x is found on index i
                make sure there are no duplicates by scanning to the right
                if scanning reaches the right end of the array this is the greates value 
                return -1
            */ 
            let last_idx = this.array.length-1;
            while (i < last_idx) {
                if (this.value(this.array[i+1]) > x) {
                    return i+1;
                } else {
                    i++;
                }
            }
            return -1;
        } else {
            /* 
                not found - Math.abs(i) is index where x should be inserted
                => Math.abs(i) is the smallest value greater than x
                unless we hit the end of the array, in which cas no smalles value
                exist which is greater than x
            */
            let idx = Math.abs(i);
            return (idx < this.array.length) ? idx : -1;
        }
    };


    /* 
       Find index of leftmost value which is greater than x or equal to x 
       Returns -1 if noe values exist that are greater than x or equal to x
     */

     BinarySearch.prototype.geIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        if (this._isFound(i, x)) {
            /* 
                found
                check for duplicates towards the left
                if there are duplicates all the way - return the one at the beginning of the array
            */
            while (i>0) {
                if (this.value(this.array[i-1]) < x) {
                    return i;
                } else {
                    i--;
                }     
            }
            return 0;
        } else {
            // not found - consider the element where x would be inserted
            i = Math.abs(i);
            return (i<this.array.length) ? i : -1;
        }
    };

    BinarySearch.prototype.lookup = function (interval) {
    	if (interval === undefined) 
    		interval = new Interval(-Infinity, Infinity, true, true);
    	if (interval instanceof Interval === false) 
            throw new BinarySearchError("lookup requires Interval argument");
        var start_index = -1, end_index = -1;
        if (interval.lowInclude) {
    		start_index = this.geIndexOf(interval.low);
        } else {
    		start_index = this.gtIndexOf(interval.low);
        }
        if (start_index === -1) {
    		return emptyIterator();
        }
        if (interval.highInclude) {
    		end_index = this.leIndexOf(interval.high);
        } else {
    		end_index = this.ltIndexOf(interval.high);
        }
        if (end_index === -1) { // not reachable - I think
    		return emptyIterator();
        }
        return sliceIterator(this.array, start_index, end_index +1);
    };

    BinarySearch.prototype.get = function (i) {return this.array[i];};
    BinarySearch.prototype.items = function () {
        return sliceIterator(this.array, 0, this.array.length);
    };

    return BinarySearch;
});



