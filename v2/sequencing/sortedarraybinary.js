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


    var SortedArrayError = function (message) {
        this.name = "SortedArrayError";
        this.message = (message||"");
    };
    SortedArrayError.prototype = Error.prototype;

    /*

    SORTED ARRAY BINARY

    */

    var SortedArrayBinary = function () {
    	/*
    	  use binary search to implement sorted insert
    	  guard against duplicates
    	 */
    	this.array = [];
    };
    	
    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    SortedArrayBinary.prototype.binaryIndexOf = function (searchElement) {
        var minIndex = 0;
        var maxIndex = this.array.length - 1;
        var currentIndex;
        var currentElement;
        while (minIndex <= maxIndex) {
    		currentIndex = (minIndex + maxIndex) / 2 | 0;
    		currentElement = this.array[currentIndex];
    		if (currentElement < searchElement) {
    		    minIndex = currentIndex + 1;
    		}
    		else if (currentElement > searchElement) {
    		    maxIndex = currentIndex - 1;
    		}
    		else {
    		    return currentIndex;
    		}
        }
    	return ~maxIndex;
    	
        // NOTE : ambiguity?
        // search for minimum element returns 0 if it exists, and 0 if it does not exists
    };
    	
    SortedArrayBinary.prototype.insert = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		this.array.splice(Math.abs(index), 0, element);
        }
    };

    SortedArrayBinary.prototype.indexOf = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return -1;
        } else {
    		return index;
        }
    };

    SortedArrayBinary.prototype.hasElement = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return false;
        } else {
    		return true;
        }
    };

    SortedArrayBinary.prototype.remove = function (element) {
        var index = this.binaryIndexOf(element);
        if (index < 0 || (index === 0 && this.array[0] !== element)) { 
    		return;
        } else {
    		this.array.splice(index, 1);
        }
    };

    SortedArrayBinary.prototype.getMinimum = function () {
        return (this.array.length > 0) ? this.array[0] : null;
    };

    SortedArrayBinary.prototype.getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : null;
    };

    /* 
       Find index of largest value less than x
       Returns -1 if noe values exist that are less than x
     */
    SortedArrayBinary.prototype.ltIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // consider element to the left
        i = (i < 0) ? Math.abs(i) - 1 : i - 1;
        return (i >= 0) ? i : -1;
    };

    /* 
       Find index of largest value less than x or equal to x 
       Returns -1 if noe values exist that are less than x or equal to x
     */
    SortedArrayBinary.prototype.leIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // equal
        if (i > 0 || (i === 0 && this.array[0] === x)) {
    		return i;
        }
        // consider element to the left
        i = Math.abs(i) - 1;
        return (i >= 0) ? i : -1;
    };

    /* 
       	Find index of smallest value greater than x
       	Returns -1 if noe values exist that are greater than x

    	note ambiguity :
    	
    	search for for an element that is less than array[0]
    	should return a negative value indicating that the element 
    	was not found. Furthermore, as it escapes the while loop
    	the returned value should indicate the index that this element 
    	would have had - had it been there - as is the idea of this bitwise 
    	or trick
    	
    	it should return a negative value x so that
    	Math.abs(x) - 1 gives the correct index which is 0
    	thus, x needs to be -1

    	instead it returns 0 - indicating that the non-existing value
    	was found!
    	
    	I think this bug is specific to breaking out on (minIndex,maxIndex) === (0,-1)



    */

    SortedArrayBinary.prototype.gtIndexOf = function (x) {
        var i = this.binaryIndexOf(x);
        
    	// ambiguity if i === 0
    	if (i === 0) {
    		if (this.array[0] === x) {
    			// found element - need to exclude it
    			// since this is gt it is element to the right
    			i = 1;
    		} else {
    			// did not find element 
    			// - the first element is the correct
    			// i === 0
    		}
    	}
    	else {		
    		i = (i < 0) ? Math.abs(i): i + 1;
    	}
        return (i < this.array.length) ? i : -1;
    };


    /* 
       Find index of smallest value greater than x or equal to x 
       Returns -1 if noe values exist that are greater than x or equal to x
     */

     SortedArrayBinary.prototype.geIndexOf = function(x) {
        var i = this.binaryIndexOf(x);
        // equal
        if (i > 0 || (i === 0 && this.array[0] === x)) {
    		return i;
        }
    	/*		    
    	if (i === 0) {
        	// ambiguity - either there is no element > x or array[0] is the smallest value > x
        	if (array.length >= 0 && array[0] > x) {
        		return 0;
        	} else return -1;
        } else {
        	// consider element to the right
        	i = Math.abs(i);
    	}
    	*/
    	i = Math.abs(i);	
        return (i < this.array.length) ? i : -1;
    };

    SortedArrayBinary.prototype.lookup = function (interval) {
    	if (interval === undefined) 
    		interval = new Interval(-Infinity, Infinity, true, true);
    	if (interval instanceof Interval === false) 
            throw new SortedArrayError("lookup requires Interval argument");
        var start_index = -1, end_index = -1;
        if (interval.lowInclude) {
    		start_index = this.geIndexOf(interval.low);
        } else {
    		start_index = this.gtIndexOf(interval.low);
        }
        if (start_index === -1) {
    		return [];
        }
        if (interval.highInclude) {
    		end_index = this.leIndexOf(interval.high);
        } else {
    		end_index = this.ltIndexOf(interval.high);
        }
        if (end_index === -1) { // not reachable - I think
    		return [];
        }
        return this.array.slice(start_index, end_index + 1);
    };

    SortedArrayBinary.prototype.get = function (i) {return this.array[i];};
    SortedArrayBinary.prototype.list = function () {return this.array;};

    return SortedArrayBinary;
});



