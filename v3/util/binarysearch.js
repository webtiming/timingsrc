/*
    Copyright 2020
    Author : Ingar Arntzen

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

import Interval from './interval.js';

// check if n is a number
function is_number(n) {
	var N = parseFloat(n);
    return (n==N && !isNaN(N));
};


/*
    utility function for protecting against duplicates
*/
function unique(A) {
    return [...new Set(A)];
};



/*
    batch inserts and removes have two strategies
    1) change-sort
    2) splice

    simple rule by measurement
    splice is better for batchlength <= 100 for both insert and remove
*/
function resolve_approach(arrayLength, batchLength) {
    if (arrayLength == 0) {
        return "sort";
    }
    return (batchLength <= 100) ? "splice" : "sort";
};


class BinarySearchError extends Error {

    constructor(message) {
        super(message);
        this.name = "BinarySearchError";
    }

}


/*

BINARY SEARCH

- based on sorted list of unique elements
- implements protection against duplicates


Public API
- update (remove_elements, insert_elements)
- lookup (interval) - returns list for all elements
- remove (interval) - removes elements within interval
- has (element)     - returns true if element exists with value == element, else false
- get (element)     - returns element with value if exists, else undefined
- values ()         - returns iterable for all elements
- indexOf(element)  - returns index of element
- indexOfElements(elements)
- getByIndex(index) - returns element at given index


*/

function cmp(a, b) {return a-b;};


class BinarySearch {

    constructor(options) {
        this.array = [];
        this.options = options || {};
    }


    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    binaryIndexOf(searchElement) {
        let minIndex = 0;
        let maxIndex = this.array.length - 1;
        let currentIndex;
        let currentElement;
        while (minIndex <= maxIndex) {
    		currentIndex = (minIndex + maxIndex) / 2 | 0;
    		currentElement = this.array[currentIndex];
            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            } else if (currentElement > searchElement) {
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
        search for an element that is less than array[0]
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
    isFound(index, x) {
        if (index > 0) {
            return true;
        }
        if (index == 0 && this.array.length > 0 && this.array[0] == x) {
            return true;
        }
        return false;
    };

    /*
        returns index of value or -1
    */
    indexOf(x) {
        var index = this.binaryIndexOf(x);
        return (this.isFound(index, x)) ? index : -1;
    };

    indexOfElements(elements) {
        let x, index;
        let indexes = [];
        for (let i=0; i<elements.length; i++) {
            x = elements[i];
            index = this.indexOf(x);
            if (index > -1) {
                indexes.push(index);
            }
        }
        return indexes;
    };

    /*
        element exists with value
    */
    has(x) {
        return (this.indexOf(x) > -1) ? true : false;
    };

    get(index) {
        return this.array[index];
    };



    /*
        REMOVE
        Removes all elements with given values
        search for each one and splice remove them individually
        (reverse order)

        INSERT
        binarysearch and splice
        insert - binarysearch and splice

        WARNING - there should be no need to insert elements that are already
        present in the array. This function drops such duplicates
    */
    _update_splice(to_remove, to_insert, options) {

        // REMOVE
        if (this.array.length > 0) {
            let indexes = this.indexOfElements(to_remove);
            /*
                sort indexes to make sure we are removing elements
                in backwards order
                optimization
                - if elements were sorted in the first place this should not be necessary
            */
            indexes.sort(function(a,b){return a-b;});
            for (let i=indexes.length-1; i > -1; i--) {
                this.array.splice(indexes[i], 1);
            }
        }

        // INSERT
        let x, index;
        let len = to_insert.length;
        for (let i=0; i<len; i++) {
            x = to_insert[i];
            index = this.binaryIndexOf(x);
            if (!this.isFound(index, x)) {
                // insert at correct place
                this.array.splice(Math.abs(index), 0, x);
            }
        }
    };


    /*
        remove - flag - sort to end and remove

        Removes all elements with given values
        - visit all elements - set their value to Infinite
        - sort O(N) - native
        - splice off Infinity values at end

        insert - concat and sort

        by doing both remove and insert in one operation,
        sorting can be done only once.
    */
    _update_sort(to_remove, to_insert, options) {
        // REMOVE
        if (this.array.length > 0 && to_remove.length > 0) {
            // visit all elements and set their value to undefined
            // undefined values will be sorted to the end of the array
            let indexes = this.indexOfElements(to_remove);
            for (let i=0; i<indexes.length;i++) {
                this.array[indexes[i]] = undefined;
            }
        }
        // INSERT
        // concat
        this.array = this.array.concat(to_insert);
        // sort
        this.array.sort(cmp);
        // remove undefined values at the end if any
        if (to_remove.length > 0) {
            let index = this.array.indexOf(undefined);
            if (index > -1) {
                this.array.splice(index, this.array.length-index);
            }
        }
        // remove duplicates
        this.array = unique(this.array);
    };


    /*
        Update - removing and inserting elements in one operation

        a single element should only be present once in the list, thus avoiding
        multiple operations to one element. This is presumed solved externally.
        - also objects must not be members of both lists.

        - internally selects the best method - searchsplice or concatsort
        - selection based on relative sizes of existing elements and new elements

    */
    update(to_remove, to_insert, options) {
        let size = to_remove.length + to_insert.length;
        if (size == 0) {
            return;
        }

        // regular case
        let approach = resolve_approach(this.array.length, size);
        if (approach == "splice") {
            this._update_splice(to_remove, to_insert, options);
        } else if (approach == "sort"){
            this._update_sort(to_remove, to_insert, options);
        }
    };


    /*
        Accessors
    */

    getMinimum() {
        return (this.array.length > 0) ? this.array[0] : undefined;
    };

    getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : undefined;
    };


    /*
        Internal search functions
    */

    /*
       Find index of largest value less than x
       Returns -1 if noe values exist that are less than x
     */
    ltIndexOf(x) {
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
    leIndexOf(x) {
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

    gtIndexOf(x) {
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

    geIndexOf(x) {
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

    /*
        lookup start and end indexes of elements within interval
        for use with slice operation
        returns undefined if no elements are found
    */
    lookupIndexes(interval) {
        if (interval === undefined)
            interval = new Interval(-Infinity, Infinity, true, true);
        if (interval instanceof Interval === false)
            throw new BinarySearchError("lookup requires Interval argument");

        // interval represents a single point
        if (interval.singular) {
            let index = this.indexOf(interval.low);
            if (index > -1) {
                return [index, index + 1];
            } else {
                return [undefined, undefined];
            }
        }

        // regular non-singular interval
        var start_index = -1, end_index = -1;
        if (interval.lowInclude) {
            start_index = this.geIndexOf(interval.low);
        } else {
            start_index = this.gtIndexOf(interval.low);
        }
        if (start_index === -1) {
            return [undefined, undefined];
        }
        if (interval.highInclude) {
            end_index = this.leIndexOf(interval.high);
        } else {
            end_index = this.ltIndexOf(interval.high);
        }
        if (end_index === -1) { // not reachable - I think
            return [undefined, undefined];
        }
        return [start_index, end_index + 1];
    };


    /*
        lookup by interval
    */
    lookup(interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.slice(start, end) : [];
    };

    /*
        remove by interval
    */
    remove(interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.splice(start, end-start) : [];
    };


    slice(start, end) {
        return this.array.slice(start, end);
    };

    splice(start, length) {
        return this.array.splice(start, length);
    };



    /*
        method for removing multiple closely placed elements in place
        - removeList is sorted
        - changes only affect the part of the index between first and last element
        - move remaining elements to the left, remove elements with a single splice
        - efficent if removelist references elements that are close to eachother
    */

    removeInSlice(removeList) {
        if (removeList.length == 0){
            return;
        }
        const low = removeList[0];
        const high = removeList[removeList.length-1];
        let [start, end] = this.lookupIndexes(new Interval(low, high, true, true));

        let rd_ptr = start;
        let wr_ptr = start;
        let rm_ptr = 0;

        while (rd_ptr < end) {
            let rd_elem = this.array[rd_ptr];
            let rm_elem = removeList[rm_ptr];
            if (rd_elem < rm_elem) {
                this.array[wr_ptr] = this.array[rd_ptr];
                wr_ptr++;
                rd_ptr++;
            } else if (rd_elem == rm_elem) {
                rd_ptr++;
                rm_ptr++;
            } else {
                // rd_elem > rm_elem
                rm_ptr++;
            }
            if (rm_ptr == removeList.length) {
                break
            }
        }
        this.array.splice(wr_ptr, rd_ptr-wr_ptr);
    };


    values() {
        return this.array.values();
    };

    clear() {
        this.array = [];
    };

    get length () {
        return this.array.length;
    }

}

export default BinarySearch;



