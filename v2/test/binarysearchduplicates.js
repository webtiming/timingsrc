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
            this.objectMode = true;
        } else {
            this.value = function (x) {return x;};
            this.objectMode = false;
        }
        // optional func for object equality
        if (this.options.equals) {
            this.equals = this.options.equals;
        } else {
            this.equals = function (o1, o2) { return o1 === o2;};
        }
        this.valueMode = !this.objectMode;       
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
    BinarySearch.prototype.isFound = function(index, x) {
        if (index > 0) {
            return true;
        } else if (index == 0 && this.array.length > 0 && this.value(this.array[0]) == x) {
            return true;
        }
        return false;
    };


    /*
     Index of value.
     If duplicates are allowed, the index of one of the duplicates will be returned.

    */

    BinarySearch.prototype.indexOf = function (x) {
        var index = this.binaryIndexOf(x);
        return (this.isFound(index, x)) ? index : -1;
    };

    /*
        Find start index and length of array slice containing all duplicates of given value x.
        returns [start, end] or [array.length, array.length] if no value x exists.
        return values may be used directly with Array.slice

        - works by finding lefmost occurence of x and scanning to rightmost occurence
        - alternative method might be to use lookup()
        - scanning is preferable under the assumption that the sequences of duplicates are not very long.
    */
    BinarySearch.prototype.indexOfDuplicates = function (x) {
        // find leftmost value greater than x or equal to x
        let left_index = this.geIndexOf(x);
        if (left_index == -1 || this.value(this.array[left_index]) > x) {
            // x not found, or only values greater than x found 
            return [this.array.length, this.array.length];
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
        return [left_index, right_index];
    };

    /* 
        Find the index of a single object.
        This should work with duplicates or without.
        This should work with object mode and value mode.
    */
    BinarySearch.prototype.indexOfObject = function (obj) {
        // find all duplicates
        let start, end;
        [start, end] = this.indexOfDuplicates(this.value(obj));
        // find the one duplicate which is object
        let i = start;
        while (i < end) {
            if (this.equals(obj, this.array[i])) {
                return i;
            } else {
                i++;
            }
        }
        return -1;
    };

    BinarySearch.prototype.has = function (x) {
        return (this.indexOf(x) > -1) ? true : false; 
    };

    BinarySearch.prototype.hasObject = function (obj) {
        return (this.indexOfObject(obj) > -1) ? true : false;
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
        return replaced objects
    */
    BinarySearch.prototype.insert_searchsplice = function (objs) {
        let obj, index;
        let allow_duplicates = this.options.allow_duplicates;
        let len = objs.length;
        let replaced = [];
        for (let i=0; i<len; i++) {
            obj = objs[i];
            /*
                TODO
                protect against duplicate entries
                - this refers to value equality
                - in addition, even if duplicates are allowed
                  duplication is not allowed wrt object equality
            */
            x = this.value(objs[i]);
            index = this.binaryIndexOf(x);
            // protect agaist duplicate entries
            if (!this.isFound(index) || allow_duplicates) {
                this.array.splice(Math.abs(index), 0, x);
            }
        }
    };

    /*
        insert - concat and sort
    */
    BinarySearch.prototype.insert_concatsort = function (objs) {
        // concat
        this.array = this.array.concat(objs)
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
    BinarySearch.prototype.insertObjects = function (objs) {
        if (objs.length == 0) {
            return;
        }
        let len_ds = this.array.length;
        let batch_limit = get_batch_limit(len_ds);
        if (this.array.length == 0) {
            this.insert_concatsort(objs);
        } else if (objs.length < batch_limit && this.array.length > DATASET_LIMIT) {
            this.insert_searchsplice(objs)
        } else {
            this.insert_concatsort(objs);
        }
    };


    /*
        fetch objects with same value
    */
    BinarySearch.prototype.getObjects = function (objs) {
        if (this.array.length == 0) {
            return [];
        }
        let obj, index;
        let res = [];
        for (let i = objs.length-1; i > -1; i--) {
            obj = objs[i];
            index = this.indexOfObject(obj);
            if (index > -1) {
                res.push(this.array[index]);
            }
        }
        return res;
    };


    /*
        in object mode
        - removes a list of objects
    */
    BinarySearch.prototype.removeObjects = function (objs) {
        if (this.array.length == 0) {
            return [];
        }
        let obj, index;
        let to_remove = [];
        let removed = []
        for (let i=0; i<objs.length; i++) {
            obj = objs[i];
            index = this.indexOfObject(obj);
            if (index > -1) {
                to_remove.push(index);
            }
        }
        to_remove.sort();
        console.log(to_remove);
        //...this.array.splice(index, 1)
        return removed;
    };


    /*
        Removes all values
        If duplicates are allowed - only a singe instance of value is removed.
    */
    BinarySearch.prototype.removeSingleValues = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let x, index;
        let to_remove = [];
        let removed = [];
        for (let i=0; i<values.length; i++) {
            // remove a single value (any if duplicates)
            x = this.value(values[i]);
            index = this.binaryIndexOf(x);
            if (this.isFound(index, x)) {
                to_remove.push(index);
            }
        }
        to_remove.sort((a,b) => a-b);
        //...this.array.splice(index, 1)
        return removed;
    };


    /*
        Removes each duplicate of each value
    */
    BinarySearch.prototype.removeValues = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let start, end;
        let x;
        let removed = [];
        for (let i = values.length-1; i > -1; i--) {
            // remove all duplicates
            x = values[i];
            [start, end] = this.indexOfDuplicates(x);
            removed.push(...this.array.splice(start, end-start));
        }
        return removed;
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
        if (this.isFound(i, x)) {
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
        if (this.isFound(i, x)) {
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
        if (this.isFound(i, x)) {
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
        if (this.isFound(i, x)) {
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



