define (function () {

    'use strict';

    /*
        get the difference of two Maps
        key in a but not in b
    */
    const map_difference = function (a, b) {
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
    const map_intersect = function (a, b) {
        [a, b] = (a.size <= b.size) ? [a,b] : [b,a];
        if (a.size == 0) {
            // No intersect
            return new Map();
        }
        return new Map([...a].filter(function ([key, value]) {
            return b.has(key)
        }));
    };


    return {
        map_intersect: map_intersect,
        map_difference: map_difference
    };

});
