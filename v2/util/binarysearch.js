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
    - remove (elements) - remove all elements
    - has (element)     - returns true if element exists with value == element, else false
    - get (element)     - returns element with value if exists, else undefined
    - items ()          - returns iterator for all elements
    - indexOf(element)  - returns index of element
    - getByIndex(index) - returns element given index

    There are also convenience wrappers for accessing functionality using object values as parameters
    - getByValues(values)
    - hasByValue(value)
    - removeByValues(values)
    In value mode these function are equivalent to above functions.

    */

    var BinarySearch = function (options) {
        this.array = [];
        this.options = options || {};
        /* 
            options.value : 
            optional propertyname for object values
            - in value mode the value of an element is the element itself
            - in object mode the value of an object is a named property
            e.g. if "value" is given then this["value"] is the value of the element
        */
        this.valueMode = (typeof this.options.value !== "string");
        this.objectMode = !this.valueMode;
        if (this.objectMode) {
            let propertyName = this.options.value;
            this.value = function (obj) {return obj[propertyName]};
            this.cmp = function (a, b) {return a[propertyName]-b[propertyName];};
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
    BinarySearch.prototype.indexOfByValue = function (x) {
        var index = this.binaryIndexOf(x);
        return (this.isFound(index, x)) ? index : -1;
    };
    BinarySearch.prototype.indexOfByValues = function (values) {
        let x, index;
        let indexes = [];
        for (let i=0; i<values.length; i++) {
            x = values[i];
            index = this.indexOfByValue(x);
            if (index > -1) {
                indexes.push(index);
            }
        }
        return indexes;
    };

    /*
        element exists with value
    */
    BinarySearch.prototype.hasByValue = function (x) {
        return (this.indexOfByValue(x) > -1) ? true : false; 
    };

    /*
        get objects with same value
    */
    BinarySearch.prototype.getByValues = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let x, index;
        let res = [];
        for (let i=0; i<values.length; i++) {
            x = values[i];
            index = this.indexOfByValue(x);
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
        utility function for protecting against duplicates

        removing duplicates using Set is natural,
        but in objectModes Set equality will not work with the value callback function.
        In this case use map instead - this is slower
        due to repeated use of the custom value() function

        Note. If duplicates exists, this function preserves the last duplicate given
        that both Map and Set replaces on insert, and that iteration is guaranteed to
        be insert ordered.
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

        WARNING - there should be no need to insert elements that are already
        present in the array. This function therefore assumes that this is 
        managed externally and that the element batch presented includes no 
        elements that are already in the array.

        Presence of such elements raises exception.
    */
    BinarySearch.prototype._insert_searchsplice = function (elements) {
        let element, x, index;
        let len = elements.length;
        let value = this.value;
        for (let i=0; i<len; i++) {
            element = elements[i];
            x = value(element);
            index = this.binaryIndexOfByValue(x);
            if (!this.isFound(index)) {
                // insert at correct place
                this.array.splice(Math.abs(index), 0, element);
            } else {
                throw new Error("insert element that is already present", element);
            }
        }
    };

    /*
        insert - concat and sort

        WARNING - there should be no need to insert elements that are already
        present in the array. This function therefore assumes that this is 
        managed externally and that the element batch presented includes no 
        elements that are already in the array.

        Duplicate protection ensures that such repeated elements do not lead
        to duplicate elements in the array, however, it does not guarantee that
        the new element replaces the old.  
    */
    BinarySearch.prototype._insert_concatsort = function (elements) {
        // concat
        this.array = this.array.concat(elements)
        // sort
        this.array.sort(this.cmp);
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
        Removes all elements with given values
        search for each one and splice remove them individually
        (reverse order)

        Approprieate for small size batches.
    */
    BinarySearch.prototype._remove_searchsplice = function (values) {
        if (this.array.length == 0) {
            return [];
        }
        let indexes = this.indexOfByValues(values);
        indexes.sort(function(a,b){return a-b;});
        let removed = [];
        for (let i=indexes.length-1; i > -1; i--) {
            let index = indexes[i];
            removed.push(...this.array.splice(index, 1));
        }
        return removed.reverse();
    };

    /*
        Removes all elements with given values
        - visit all elements - set their value to Infinite
        - sort O(N) - native
        - splice off end

        Appropriate when removing a medium size batch?
    */

    BinarySearch.prototype._remove_sortsplice = function (values) {
        // visit all elements
        let indexes = this.indexOfByValues(values);
        let removed = [];
        let index;
        let obj;
        if (this.objectMode) {            
            let propertyName = this.options.value;
            for (let i=0; i<indexes.length;i++) {
                index = indexes[i];
                obj = this.array[index];
                // switch values
                obj.__oldvalue = obj.value;
                obj.value = Infinity;
                removed.push(obj);
            }
        } else {
            for (let i=0; i<indexes.length;i++) {
                index = indexes[i];
                obj = {__oldvalue:this.array[index]};
                this.array[index] = Infinity;
                removed.push(obj);
            }
        }
        // sort
        this.array.sort(this.cmp);
        // find index of first element with Infinity value
        if (this.objectMode) {
            index = this.array.findIndex(function (o) {return o.value == Infinity});
        } else {
            index = this.array.indexOf(Infinity);
        } 
        // splice
        this.array.splice(index, this.array.length);
        // switch values back
        if (this.objectMode) {
            return removed.map(function (obj) {
                obj.value = obj.__oldvalue;
                delete obj.__oldvalue;
                return obj;
            });
        } else {
            return removed.map(function (obj) {
                return obj.__oldvalue;
            });
        }
    };


    BinarySearch.prototype.removeByValues = function (values) {
        return this._remove_sortsplice(values);
        //return this._remove_searchsplice(values);
    };


    /*
        Update BinarySearch by items

        a single element should only be present once in the list, thus avoiding 
        multiple operations to one element. This is presumed solved externally. 
        - also objects should not be members of both lists.

    */

    BinarySearch.prototype.update = function (objs_to_remove, objs_to_insert) {
        console.log("remove " + objs_to_remove.length, " insert " + objs_to_insert.length);

        this.remove(objs_to_remove);
        this.insert(objs_to_insert);
    };



    /*
        utility function to allow functions that are defined for values
        to be called with objects.
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
        utility wrappers for accessing elements
        using objects as parameters as opposed to their values
    */
    BinarySearch.prototype.get = function (objects) {
        return this._callByObjects(this.getByValues, objects);
    };
    BinarySearch.prototype.remove = function (objects) {
        return this._callByObjects(this.removeByValues, objects);
    };
    BinarySearch.prototype.indexOf = function (object) {
        return this._callByObjects(this.indexOfByValue, [object]);
    };
    BinarySearch.prototype.has = function (object) {
        return this._callByObjects(this.hasByValue, [object]);
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



