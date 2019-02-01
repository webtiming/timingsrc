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

    - based on sorted list of unique elements
    - implements protection against duplicates

    - value mode : (default) elements support direct Javascrip comparison
    - object mode : (options.value) defines callback function value <- f(element) which is used for element comparison
  

    - In value mode, the <element> and its <value> is the same thing.
    - In object mode, the <element> is an <object>, and <value> is derived from the callback

    Public API
    - insert (elements) - insert all elements - replace if exists
    - lookup (interval) - returns iterator for all elements for element  
    - remove (values) - remove all elements
    - has (value)       - true if element exists with value == element, else false
    - get (value)       - return element with value if exists, else undefined
    - items ()          - returns iterator for elements

    There are also convenience wrappers for accessing functionality using objects as parameters
    - getByObjects(objects)
    - hasByObjects(object)
    - removeByObject(objects)
    In value mode these function are equivalent to above functions.

    */

    var BinarySearch = function (options) {
        this.array = [];
        this.options = options || {};
        /* 
            options.value : 
            optional getter for object values
            this.value() returns the value of the element
            - in value mode this is the element itself
            - in object mode this define by callback function 
        */
        this.valueMode = (typeof this.options.value !== "function");
        this.objectMode = !this.valueMode;
        if (this.objectMode) {
            this.value = this.options.value;
        } else {
            this.value = function (x) {return x;};
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
                // found
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
    

    /*
        utility function for resolving ambiguity
    */
    BinarySearch.prototype.isFound = function(index, x) {
        if (index > 0) {
            return true;
        } else {
            // optimization - avoids calling this this.value in valueMode
            if (self.valueMode) {
                if (index == 0 && this.array.length > 0 && this.array[0] == x) {
                    return true;
                }
            } else {
                if (index == 0 && this.array.length > 0 && this.value(this.array[0]) == x) {
                    return true;
                }
            }
        }
        return false;
    };


    /*
        returns index of value or -1
    */

    BinarySearch.prototype.indexOf = function (x) {
        var index = this.binaryIndexOf(x);
        return (this.isFound(index, x)) ? index : -1;
    };


    BinarySearch.prototype.has = function (x) {
        return (this.indexOf(x) > -1) ? true : false; 
    };


    /*
        utility function for protecting against duplicates

        removing duplicates using Set is natural,
        but in objectModes Set equality will not work with the value callback function.
        In this case use map instead - this is slower
        due to repeated use of the custom value() function
    */
    BinarySearch.prototype._unique = function (A) {
        if (this.objectMode) {
            let m = new Map(A.map(function (i) {
                return [this.value(i), i];
            }, this));
            return [...m.values()];
        } else {
            return [...new Set(A)];
        }
    };




    /*
        insert - binarysearch and splice
        return replaced objects
    */
    BinarySearch.prototype._insert_searchsplice = function (elements) {
        let element, x, index;
        let len = elements.length;
        let value = this.value;
        for (let i=0; i<len; i++) {
            element = elements[i];
            x = value(element);
            index = this.binaryIndexOf(x);
            // protects agaist duplicate entries
            if (!this.isFound(index)) {
                this.array.splice(Math.abs(index), 0, element);
            }
        }
    };

    /*
        insert - concat and sort
    */
    BinarySearch.prototype._insert_concatsort = function (elements) {
        // concat
        this.array = this.array.concat(elements)
        // sort
        let value = this.value;
        let cmp = function (a, b) {return value(a)-value(b);}
        this.array.sort(cmp);
        // remove duplicates
        this.array = this._unique(this.array);
    };


    /*
        insert 
        - internally selects the best method - searchsplice or concatsort
        - selection based on relative sizes of existing elements and new elements
    */
    BinarySearch.prototype.insert = function (elements) {
        if (elements.length == 0) {
            return;
        }
        let len_ds = this.array.length;
        let batch_limit = get_batch_limit(len_ds);
        if (this.array.length == 0) {
            this._insert_concatsort(elements);
        } else if (elements.length < batch_limit && this.array.length > DATASET_LIMIT) {
            this._insert_searchsplice(elements)
        } else {
            this._insert_concatsort(elements);
        }
    };

    /*
        get objects with same value
    */
    BinarySearch.prototype.get = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let x, index;
        let res = [];
        for (let i=0; i<values.length; i++) {
            x = values[i];
            index = this.indexOf(x);
            if (index > -1) {
                res.push(this.array[index]);
            }
        }
        return res;
    };


    BinarySearch.prototype.getByIndex = function (index) {
        return this.array[index];
    };


    /*
        utility function to allow functions that are defined for values
        be called with objects.
        - in valueMode this makes no differnce
    */
    BinarySearch.prototype._callByObjects = function(func, args) {
        if (this.valueMode) {
            return func.call(this, args);
        } else {
            let values = args.map(function (arg) {
                return this.value(arg);
            }, this);    
            return func.call(this, values);
        } 
    };


    /*
        Update BinarySearch by items

        items = [
            {new: element, old: element}, // replace old element with new element
            {new: element},               // add new element
            {old: element}                // delete element
        ]

        a single element may only be present mentioned once in the list, thus avoiding 
        multiple operations to one element 

    */

    BinarySearch.prototype.update = function (objs_to_remove, objs_to_insert) {
        console.log("remove " + objs_to_remove.length, " insert " + objs_to_insert.length);

        this.removeByObjects(objs_to_remove);
        this.insert(objs_to_insert);
    };







    /*
        Removes all elements with given values
        search for each one and splice remove them individually
        only approprieate for very small batches.
    */
    BinarySearch.prototype._remove_searchsplice = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let x, index;
        let to_remove = [];
        for (let i=0; i<values.length; i++) {
            x = values[i];
            index = this.indexOf(x);
            if (index > -1) {
                to_remove.push(index);
            }
        }
        to_remove.sort(function(a,b){return a-b;});
        // naive solution
        let removed = [];
        for (let i=to_remove.length-1; i > -1; i--) {
            let index = to_remove[i];
            removed.push(...this.array.splice(index, 1));
        }
        return removed.reverse();
    };


    BinarySearch.prototype.remove = function (values) {
        return this._remove_searchsplice(values);
    };


    /*
        utility wrappers for accessing elements
        using objects as parameters as opposed to their values
    */
    BinarySearch.prototype.getByObjects = function (objects) {
        return this._callByObjects(this.get, objects);
    };
    BinarySearch.prototype.removeByObjects = function (objects) {
        return this._callByObjects(this.remove, objects);
    };
    BinarySearch.prototype.indexOfByObject = function (object) {
        return this._callByObjects(this.indexOf, [object]);
    };
    BinarySearch.prototype.hasByObject = function (object) {
        return this._callByObjects(this.has, [object]);
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
                consider element to the left
                if we are at the left end of the array nothing is found 
                return -1
            */ 
            if (i > 0) {
                return i-1;
            } else {
                return -1;
            }
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
            */
            return i;
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
                if there are no elements to the right return -1
            */ 
            if (i < this.array.length -1) {
                return i+1;
            } else {
                return -1;
            }
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
                found element
            */
            return i;
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


    BinarySearch.prototype.items = function () {
        return sliceIterator(this.array, 0, this.array.length);
    };

    return BinarySearch;
});



