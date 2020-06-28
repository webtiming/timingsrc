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


/* Set Comparison */
export function eqSet(as, bs) {
    return as.size === bs.size && all(isIn(bs), as);
}

export function all(pred, as) {
    for (var a of as) if (!pred(a)) return false;
    return true;
}

export function isIn(as) {
    return function (a) {
        return as.has(a);
    };
}

/*
    get the difference of two Maps
    key in a but not in b
*/
export const map_difference = function (a, b) {
    if (a.size == 0) {
        return new Map();
    } else if (b.size == 0) {
        return a;
    } else {
        return new Map([...a].filter(function ([key, value]) {
            return !b.has(key)
        }));
    }
};

/*
    get the intersection of two Maps
    key in a and b
*/
export const map_intersect = function (a, b) {
    [a, b] = (a.size <= b.size) ? [a,b] : [b,a];
    if (a.size == 0) {
        // No intersect
        return new Map();
    }
    return new Map([...a].filter(function ([key, value]) {
        return b.has(key)
    }));
};

export function divmod (n, d) {
    let r = n % d;
    let q = (n-r)/d;
    return [q, r];
}


export function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

/*
    effective concatenation of multiple arrays
    - order - if true preserves ordering of input arrays
            - else sorts input arrays (longest first)
            - default false is more effective
    - copy  - if true leaves input arrays unchanged, copy
              values into new array
            - if false copies remainder arrays into the first
              array
            - default false is more effective
*/
export function array_concat(arrays, options = {}) {
    let {copy=false, order=false} = options;
    if (arrays.length == 0) {
        return [];
    }
    if (arrays.length == 1) {
        return arrays[0];
    }
    let total_len = arrays.reduce((acc, cur) => acc + cur.length, 0);
    // order
    if (!order) {
        // sort arrays according to length - longest first
        arrays.sort((a, b) => b.length - a.length);
    }
    // copy
    let first = (copy) ? [] : arrays.shift();
    let start = first.length;
    // reserve memory total length
    first.length = total_len;
    // fill up first with entries from other arrays
    let end, len;
    for (let arr of arrays) {
        len = arr.length;
        end = start + len;
        for (let i=0; i<len; i++) {
            first[start + i] = arr[i]
        }
        start = end;
    }
    return first;
};

/*
    default object equals
*/
export function object_equals(a, b) {
    // Create arrays of property names
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);
    let len = aProps.length;
    let propName;
    // If properties lenght is different => not equal
    if (aProps.length != bProps.length) {
        return false;
    }
    for (let i=0; i<len; i++) {
        propName = aProps[i];
        // If property values are not equal => not equal
        if (a[propName] !== b[propName]) {
            return false;
        }
    }
    // equal
    return true;
}


/* document readypromise */
export const docready = new Promise(function(resolve) {
    if (document.readyState === 'complete') {
        resolve();
    } else {
        let onReady = function () {
            resolve();
            document.removeEventListener('DOMContentLoaded', onReady, true);
            window.removeEventListener('load', onReady, true);
        };
        document.addEventListener('DOMContentLoaded', onReady, true);
        window.addEventListener('load', onReady, true);
    }
});

