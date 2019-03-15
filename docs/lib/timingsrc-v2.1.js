(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.TIMINGSRC = factory();
    }
}(this, function () {
    //almond, and your modules will be inlined here
    /**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../build/almond", function(){});

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


define('util/motionutils',[],function () {

	'use strict';



	// Closure
	(function() {
	  /**
	   * Decimal adjustment of a number.
	   *
	   * @param {String}  type  The type of adjustment.
	   * @param {Number}  value The number.
	   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
	   * @returns {Number} The adjusted value.
	   */
	  function decimalAdjust(type, value, exp) {
	    // If the exp is undefined or zero...
	    if (typeof exp === 'undefined' || +exp === 0) {
	      return Math[type](value);
	    }
	    value = +value;
	    exp = +exp;
	    // If the value is not a number or the exp is not an integer...
	    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
	      return NaN;
	    }
	    // Shift
	    value = value.toString().split('e');
	    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
	    // Shift back
	    value = value.toString().split('e');
	    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
	  }

	  // Decimal round
	  if (!Math.round10) {
	    Math.round10 = function(value, exp) {
	      return decimalAdjust('round', value, exp);
	    };
	  }
	  // Decimal floor
	  if (!Math.floor10) {
	    Math.floor10 = function(value, exp) {
	      return decimalAdjust('floor', value, exp);
	    };
	  }
	  // Decimal ceil
	  if (!Math.ceil10) {
	    Math.ceil10 = function(value, exp) {
	      return decimalAdjust('ceil', value, exp);
	    };
	  }
	})();

	
    // Calculate a snapshot of the motion vector,
    // given initials conditions vector: [p0,v0,a0,t0] and t (absolute - not relative to t0) 
    // if t is undefined - t is set to now
    var calculateVector = function(vector, tsSec) {
		if (tsSec === undefined) {
		    throw new Error ("no ts provided for calculateVector");
		}
		var deltaSec = tsSec - vector.timestamp;	
		return {
			position : vector.position + vector.velocity*deltaSec + 0.5*vector.acceleration*deltaSec*deltaSec,
			velocity : vector.velocity + vector.acceleration*deltaSec,
			acceleration : vector.acceleration, 
			timestamp : tsSec
		};
    };


    //	RANGE STATE is used for managing/detecting range violations.
	var RangeState = Object.freeze({
	    INIT : "init",
	    INSIDE: "inside",
	    OUTSIDE_LOW: "outsidelow",
	    OUTSIDE_HIGH: "outsidehigh"
	});

	/*
		A snapshot vector is checked with respect to range,
		calclulates correct RangeState (i.e. INSIDE|OUTSIDE)
	*/
	var getCorrectRangeState = function (vector, range) {
		var p = vector.position,
			v = vector.velocity,
			a = vector.acceleration;
		if (p > range[1]) return RangeState.OUTSIDE_HIGH;
		if (p < range[0]) return RangeState.OUTSIDE_LOW;
		// corner cases
		if (p === range[1]) {
			if (v > 0.0) return RangeState.OUTSIDE_HIGH;
			if (v === 0.0 && a > 0.0) return RangeState.OUTSIDE_HIGH;
		} else if (p === range[0]) {
		    if (v < 0.0) return RangeState.OUTSIDE_LOW;
		    if (v == 0.0 && a < 0.0) return RangeState.OUTSIDE_HIGH;
		}
		return RangeState.INSIDE;
	};

	/*

		A snapshot vector is checked with respect to range.
		Returns vector corrected for range violations, or input vector unchanged.
	*/
	var checkRange = function (vector, range) {
		var state = getCorrectRangeState(vector, range);
		if (state !== RangeState.INSIDE) {
			// protect from range violation
			vector.velocity = 0.0;
			vector.acceleration = 0.0;
			if (state === RangeState.OUTSIDE_HIGH) {
				vector.position = range[1];
			} else vector.position = range[0];
		}
		return vector;
	};


    
    // Compare values
    var cmp = function (a, b) {
		if (a > b) {return 1;}
		if (a === b) {return 0;}
		if (a < b) {return -1;}
    };

	// Calculate direction of movement at time t.
	// 1 : forwards, -1 : backwards: 0, no movement
    var calculateDirection = function (vector, tsSec) {
		/*
		  Given initial vector calculate direction of motion at time t 
		  (Result is valid only if (t > vector[T]))
		  Return Forwards:1, Backwards -1 or No-direction (i.e. no-motion) 0.
		  If t is undefined - t is assumed to be now.
		*/
		var freshVector = calculateVector(vector, tsSec);
		// check velocity
		var direction = cmp(freshVector.velocity, 0.0);
		if (direction === 0) {
		    // check acceleration
	        direction = cmp(vector.acceleration, 0.0);
		}
		return direction;
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    var hasRealSolution = function (p,v,a,x) {
		if ((Math.pow(v,2) - 2*a*(p-x)) >= 0.0) return true;
		else return false;
    };
    
    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return real solutions, in ascending order.
    var calculateRealSolutions = function (p,v,a,x) {
		// Constant Position
		if (a === 0.0 && v === 0.0) {
		    if (p != x) return [];
		    else return [0.0];
		}
		// Constant non-zero Velocity
		if (a === 0.0) return [(x-p)/v];
		// Constant Acceleration
		if (hasRealSolution(p,v,a,x) === false) return [];
		// Exactly one solution
		var discriminant = v*v - 2*a*(p-x);
		if (discriminant === 0.0) {
		    return [-v/a];
		}
		var sqrt = Math.sqrt(Math.pow(v,2) - 2*a*(p-x));
		var d1 = (-v + sqrt)/a;
		var d2 = (-v - sqrt)/a;
		return [Math.min(d1,d2),Math.max(d1,d2)];
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return positive real solutions, in ascending order.
    var calculatePositiveRealSolutions = function (p,v,a,x) {
		var res = calculateRealSolutions(p,v,a,x);
		if (res.length === 0) return [];
		else if (res.length == 1) {
		    if (res[0] > 0.0) { 
				return [res[0]];
		    }
		    else return []; 
		}
		else if (res.length == 2) {
		    if (res[1] < 0.0) return [];
		    if (res[0] > 0.0) return [res[0], res[1]];
		    if (res[1] > 0.0) return [res[1]];
		    return [];
		}
		else return [];
    };

    // Given motion determined from p,v,a,t. 
    // Determine if equation p(t) = p + vt + 0.5at^2 = x 
    // has solutions for some real number t.
    // Calculate and return the least positive real solution.
    var calculateMinPositiveRealSolution = function (vector,x) {
		var p = vector.position;
		var v = vector.velocity;
		var a = vector.acceleration;
		var res = calculatePositiveRealSolutions(p,v,a,x);
		if (res.length === 0) return null;
		else return res[0];
    };
    
    // Given motion determined from p0,v0,a0
    // (initial conditions or snapshot)
    // Supply two posisions, posBefore < p0 < posAfter.
    // Calculate which of these positions will be reached first,
    // if any, by the movement described by the vector.
    // In addition, calculate when this position will be reached.
    // Result will be expressed as time delta relative to t0, 
    // if solution exists,
    // and a flag to indicate Before (false) or After (true)
    // Note t1 == (delta + t0) is only guaranteed to be in the 
    // future as long as the function
    // is evaluated at time t0 or immediately after.
    var calculateDelta = function (vector, range) {
		// Time delta to hit posBefore
		var deltaBeforeSec = calculateMinPositiveRealSolution(vector, range[0]);
		// Time delta to hit posAfter
		var deltaAfterSec = calculateMinPositiveRealSolution(vector, range[1]);
		// Pick the appropriate solution
		if (deltaBeforeSec !== null && deltaAfterSec !== null) {
		    if (deltaBeforeSec < deltaAfterSec)
				return [deltaBeforeSec, range[0]];
		    else 
				return [deltaAfterSec, range[1]];
		}
		else if (deltaBeforeSec !== null)
		    return [deltaBeforeSec, range[0]];
		else if (deltaAfterSec !== null)
		    return [deltaAfterSec, range[1]];
		else return [null,null];
    };
  

    /*
      calculate_solutions_in_interval (vector, d, plist)
      
      Find all intersects in time between a motion and a the
      positions given in plist, within a given time-interval d. A
      single position may be intersected at 0,1 or 2 two different
      times during the interval.
      
      - vector = (p0,v0,a0) describes the initial conditions of
      (an ongoing) motion
      
      - relative time interval d is used rather than a tuple of
      absolute values (t_start, t_stop). This essentially means
      that (t_start, t_stop) === (now, now + d). As a consequence,
      the result is independent of vector[T]. So, if the goal is
      to find the intersects of an ongoing motion during the next
      d seconds, be sure to give a fresh vector from msv.query()
      (so that vector[T] actually corresponds to now).
      
      
      - plist is an array of objects with .point property
      returning a floating point. plist represents the points
      where we investigate intersects in time.
      
      The following equation describes how position varies with time
      p(t) = 0.5*a0*t*t + v0*t + p0
      
      We solve this equation with respect to t, for all position
      values given in plist.  Only real solutions within the
      considered interval 0<=t<=d are returned.  Solutions are
      returned sorted by time, thus in the order intersects will
      occur.

    */
    var sortFunc = function (a,b){return a[0]-b[0];};
    var calculateSolutionsInInterval2 = function(vector, deltaSec, plist) {
		var solutions = [];
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		for (var i=0; i<plist.length; i++) {
		    var o = plist[i];
		    if (!hasRealSolution(p0, v0, a0, o.point)) continue;
		    var intersects = calculateRealSolutions(p0,v0,a0, o.point);
		    for (var j=0; j<intersects.length; j++) {
				var t = intersects[j];
				if (0.0 <= t && t <= deltaSec) {
				    solutions.push([t,o]);
				}
		    }
		}
		// sort solutions
		solutions.sort(sortFunc);
		return solutions;
    };




    var calculateSolutionsInInterval = function(vector, deltaSec, plist) {
    	// protect from tiny errors introduced by calculations
    	// round to 10'th decimal
		deltaSec = Math.round10(deltaSec, -10);
		var solutions = [];
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		for (var i=0; i<plist.length; i++) {
		    var o = plist[i];
		    if (!hasRealSolution(p0, v0, a0, o.point)) continue;
		    var intersects = calculateRealSolutions(p0,v0,a0, o.point);
		    for (var j=0; j<intersects.length; j++) {
				var t = intersects[j];
				// protect from tiny errors introduced by calculations
    			// round to 10'th decimal
    			t = Math.round10(t, -10);
				if (0.0 <= t && t <= deltaSec) {
				    solutions.push([t,o]);
				} else {	
					console.log("dropping event : 0<t<deltaSec is not true", t, deltaSec);	
				}
		    }
		}
		// sort solutions
		solutions.sort(sortFunc);
		return solutions;
    };


    /*
      Within a definite time interval, a motion will "cover" a
      definite interval on the dimension. Calculate the min, max
      positions of this interval, essentially the smallest
      position-interval that contains the entire motion during the
      time-interval of length d seconds.
      
      relative time interval d is used rather than a tuple of absolute values
      (t_start, t_stop). This essentially means that (t_start, t_stop) ===
      (now, now + d). As a consequence, the result
      is independent of vector[T]. So, if the goal is to
      find the interval covered by an ongoing motion during the
      next d seconds, be sure to give a fresh vector from
      msv.query() (so that vector[T] actually corresponds to
      now).
      
      The calculation takes into consideration that acceleration
      might turn the direction of motion during the time interval.
    */



    var calculateInterval = function (vector, deltaSec) {
		var p0 = vector.position;
		var v0 = vector.velocity;
		var a0 = vector.acceleration;
		var p1 = p0 + v0*deltaSec + 0.5*a0*deltaSec*deltaSec;
		
		/*
		  general parabola
		  y = ax*x + bx + c
		  turning point (x,y) : x = - b/2a, y = -b*b/4a + c
		  
		  p_turning = 0.5*a0*d_turning*d_turning + v0*d_turning + p0
		  a = a0/2, b=v0, c=p0
		  turning point (d_turning, p_turning):
		  d_turning = -v0/a0
		  p_turning = p0 - v0*v0/(2*a0)
		*/
		
		if (a0 !== 0.0) {
		    var d_turning = -v0/a0;
		    if (0.0 <= d_turning && d_turning <= d) {
				// turning point was reached p_turning is an extremal value            
				var p_turning = p0 - 0.5*v0*v0/a0;
				// a0 > 0 => p_turning minimum
				// a0 < 0 => p_turning maximum
				if (a0 > 0.0) {
					return [p_turning, Math.max(p0, p1)];
				}
				else {
				    return [Math.min(p0,p1), p_turning];
				}
		    }
		}
		// no turning point or turning point was not reached
		return [Math.min(p0,p1), Math.max(p0,p1)];
    };
    

	// return module object
	return {
		calculateVector : calculateVector,
		calculateDirection : calculateDirection,
		calculateMinPositiveRealSolution : calculateMinPositiveRealSolution,
		calculateDelta : calculateDelta,
		calculateInterval : calculateInterval,
		calculateSolutionsInInterval : calculateSolutionsInInterval,
		calculateSolutionsInInterval2 : calculateSolutionsInInterval2,
		getCorrectRangeState : getCorrectRangeState,
		checkRange : checkRange,
		RangeState : RangeState
	};
});



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


define('util/eventify',[],function () {

	'use strict';

	/*
		UTILITY
	*/

	// unique ID generator 
	var id = (function(length) {
	 	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	    return function (len) { // key length
	    	len = len || length; 
	    	var text = "";
		    for( var i=0; i < len; i++ )
	    	    text += possible.charAt(Math.floor(Math.random() * possible.length));
	    	return text;
		};
	})(10); // default key length


	// concatMap
	var concatMap = function (array, projectionFunctionThatReturnsArray, ctx) {
		var results = [];
		array.forEach(function (item) {
			results.push.apply(results, projectionFunctionThatReturnsArray.call(ctx, item));
		}, ctx);
		return results;
	};

	// standard inheritance function
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};

	// equality function for object values
	function areEqual(a, b) {
		if (a === b) return true;
		if (typeof a !== typeof b) return false;

		// disallow array comparison
		if (Array.isArray(a)) throw new Error("illegal parameter a, array not supported", a);
		if (Array.isArray(b)) throw new Error("illegal parameter b, array not supported", b);
	    
		if (typeof a === 'object' && typeof b === 'object') {
			// Create arrays of property names
		    var aProps = Object.getOwnPropertyNames(a);
		    var bProps = Object.getOwnPropertyNames(b);

		    // If number of properties is different,
		    // objects are not equivalent
		    if (aProps.length != bProps.length) {
		        return false;
		    }

		    for (var i = 0; i < aProps.length; i++) {
		        var propName = aProps[i];

		        // If values of same property are not equal,
		        // objects are not equivalent
		        if (a[propName] !== b[propName]) {
		            return false;
		        }
		    }
		    // If we made it this far, objects
		    // are considered equivalent
		    return true;
		} else {
			return false;
		}
	};



	/*
		HANDLER MAP
	*/


	// handler bookkeeping for one event type
	var HandlerMap = function () {
		this._id = 0;
		this._map = {}; // ID -> {handler:, ctx:, pending:, count: }
	};

	HandlerMap.prototype._newID = function () {
		this._id += 1;
		return this._id;
	};

	HandlerMap.prototype._getID = function (handler) {
		var item;
		var res = Object.keys(this._map).filter(function (id) {
			item = this._map[id];
			return (item.handler === handler);
		}, this);
		return (res.length > 0) ? res[0] : -1;
	};

	HandlerMap.prototype.getItem = function (id) {
		return this._map[id];
	};

	HandlerMap.prototype.register = function (handler, ctx) {
		var ID = this._getID(handler);
		if (ID > -1) {
			throw new Error("handler already registered");
		}
		ID = this._newID();
		this._map[ID] = {
			ID : ID,
			handler: handler,
			ctx : ctx,
			count : 0,
			pending : false
		};
		return ID;
	};

	HandlerMap.prototype.unregister = function (handler) {
		var ID = this._getID(handler);
		if (ID !== -1) {
			delete this._map[ID];
		}
	};

	HandlerMap.prototype.getItems = function () {
		return Object.keys(this._map).map(function (id) {
			return this.getItem(id);
		}, this);
	};





	/*

		EVENTIFY

		Eventify brings eventing capabilities to any object.

		In particular, eventify supports the initial-event pattern.
		Opt-in for initial events per event type.

		A protected event type "events" provides a callback with a batch of events in a list,
		instead as individual callbacks.

		if initial-events are used
		eventified object must implement this._makeInitEvents(type)
		- expect [{type:type, e:eArg}]

	*/

	var eventifyInstance = function (object, options) {
		/*
			Default event name "events" will fire a list of events
		*/
		object._ID = id(4);
		object._callbacks = {}; // type -> HandlerMap
		object._immediateCallbacks = [];
		object._eBuffer = []; // buffering events before dispatch

		options = options || {}
		// special event "events"
		// init flag for builtin event type "events"
		// default true
		if (options.init == undefined) {
			options.init = true;
		} 
		object._callbacks["events"] = new HandlerMap();
		object._callbacks["events"]._options = {init:options.init};

		return object;
	};


	var eventifyPrototype = function (_prototype) {
		/*
			DEFINE EVENT TYPE
			type is event type (string)
			{init:true} specifies init-event semantics for this event type
		*/
		_prototype.eventifyDefineEvent = function (type, options) {
			if (type === "events") throw new Error("Illegal event type : 'events' is protected");
			options = options || {};
			options.init = (options.init === undefined) ? false : options.init;
			this._callbacks[type] = new HandlerMap();
			this._callbacks[type]._options = options;
		};

		/*
			MAKE INIT EVENTS

			Produce init events for a specific callback handler - right after on("type", callback)
			Return list consistent with input .eventifyTriggerEvents
			[{type: "type", e: e}]
			If [] list is returned there will be no init events.

			Protected event type 'events' is handled automatically

			Implement
			.eventifyMakeInitEvents(type)

		*/

		_prototype._eventifyMakeEItemList = function (type) {
			var makeInitEvents = this.eventifyMakeInitEvents || function (type) {return [];};
			return makeInitEvents.call(this, type)
				.map(function(e){
					return {type:type, e:e};
				});
		};

		_prototype._eventifyMakeInitEvents = function (type) {
			if (type !== "events") {
				return this._eventifyMakeEItemList(type);
			} else {
				// type === 'events'
				var typeList = Object.keys(this._callbacks).filter(function (key) {
					return (key !== "events" && this._callbacks[key]._options.init === true);
				}, this);
				return concatMap(typeList, function(_type){
					return this._eventifyMakeEItemList(_type);
				}, this);
			}	
		};

		/*
			EVENT FORMATTER

			Format the structure of EventArgs. 
			Parameter e is the object that was supplied to triggerEvent
			Parameter type is the event type that was supplied to triggerEvent
			Default is to use 'e' given in triggerEvent unchanged.

			Note, for protected event type 'events', eventFormatter is also applied recursively
			within the list of events
			ex: { type: "events", e: [{type:"change",e:e1},])  

			Implement
			.eventifyEventFormatter(type, e) to override default
		*/
		_prototype._eventifyEventFormatter = function (type, e) {
			var eventFormatter = this.eventifyEventFormatter || function (type, e) {return e;};
			if (type === "events") {
				// e is really eList - eventformatter on every e in list
				e = e.map(function(eItem){
					return {type: eItem.type, e: eventFormatter(eItem.type, eItem.e)};
				});
			}			
			return eventFormatter(type,e);
		};

		/*
			CALLBACK FORMATTER

			Format which parameters are included in event callback.
			Returns a list of parameters. 
			Default is to exclude type and eInfo and just deliver the event supplied to triggerEvent

			Implement
			.eventifyCallbackForamtter(type, e, eInfo) to override default
		*/
		_prototype._eventifyCallbackFormatter = function (type, e, eInfo) {
			var callbackFormatter = this.eventifyCallbackFormatter || function (type, e, eInfo) { return [e];};
			return callbackFormatter.call(this, type, e, eInfo);
		};

		/* 
			TRIGGER EVENTS

			This is the hub - all events go through here
			Control flow is broken using Promise.resolve().then(...);
			Parameter is a list of objects where 'type' specifies the event type and 'e' specifies the event object.
			'e' may be undefined
			- [{type: "type", e: e}]
		*/
		_prototype.eventifyTriggerEvents = function (eItemList) {
			// check list for illegal events
			eItemList.forEach(function (eItem) {
				if (eItem.type === undefined) throw new Error("Illegal event type; undefined");
				if (eItem.type === "events") throw new Error("Illegal event type; triggering of events on protocted event type 'events'" );
			}, this);
			if (eItemList.length === 0) return this;
			/* 
				Buffer list of eItems so that iterative calls to eventifyTriggerEvents 
				will be emitted in one batch
			*/
			this._eBuffer.push.apply(this._eBuffer, eItemList);
			if (this._eBuffer.length === eItemList.length) {
				// eBuffer just became non-empty - initiate triggering of events
				var self = this;
				Promise.resolve().then(function () {
					// trigger events from eBuffer
					self._eventifyTriggerProtectedEvents(self._eBuffer);
					self._eventifyTriggerRegularEvents(self._eBuffer);
					// empty eBuffer
					self._eBuffer = [];
					// flush immediate callbacks
					self._eventifyFlushImmediateCallbacks();			
				});
			}
			return this;
	    };

	    /*
	     	TRIGGER EVENT
	     	Shorthand for triggering a single event
	    */
	    _prototype.eventifyTriggerEvent = function (type, e) {
	    	return this.eventifyTriggerEvents([{type:type, e:e}]);
	    };

		/*
			Internal method for triggering events
			- distinguish "events" from other event names
		*/
	  	_prototype._eventifyTriggerProtectedEvents = function (eItemList, handlerID) {
	  		// trigger event list on protected event type "events"      		
	  		this._eventifyTriggerEvent("events", eItemList, handlerID);
	  	};

	  	_prototype._eventifyTriggerRegularEvents = function (eItemList, handlerID) {
	  		// trigger events on individual event types
	  		eItemList.forEach(function (eItem) {
	  			this._eventifyTriggerEvent(eItem.type, eItem.e, handlerID);
	      	}, this);
	  	};

		/*
			Internal method for triggering a single event.
			- if handler specificed - trigger only on given handler (for internal use only)
			- awareness of init-events	
	    */
	    _prototype._eventifyTriggerEvent = function (type, e, handlerID) {	
			var argList, e, eInfo = {};
			if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type); 
			var handlerMap = this._callbacks[type];
			var init = handlerMap._options.init;
			handlerMap.getItems().forEach(function (handlerItem) {
				if (handlerID === undefined) {
	       			// all handlers to be invoked, except those with initial pending
	        		if (handlerItem.pending) { 
	          			return false;
	        		}
	      		} else {
	        		// only given handler to be called - ensuring that it is not removed
	        		if (handlerItem.ID === handlerID) {
	        			eInfo.init = true;
	        			handlerItem.pending = false;
	        		} else {
	          			return false;
	        		}
	      		}
	      		// eInfo
	      		if (init) {
	      			eInfo.init = (handlerItem.ID === handlerID) ? true : false;
	      		}
	      		eInfo.count = handlerItem.count;
	      		eInfo.src = this;
	      		// formatters
	      		e = this._eventifyEventFormatter(type, e);
	      		argList = this._eventifyCallbackFormatter(type, e, eInfo);
	      		try {
	        		handlerItem.handler.apply(handlerItem.ctx, argList);
	        		handlerItem.count += 1;
	      			return true;
	          	} catch (err) {
		        	console.log("Error in " + type + ": " + handlerItem.handler + " " + handlerItem.ctx + ": ", err);
	      		}
			}, this);
			return false;
		};

		/*
			ON

			register callback on event type. Available directly on object
			optionally supply context object (this) used on callback invokation.
		*/
		_prototype.on = function (type, handler, ctx) {
			if (!handler || typeof handler !== "function") throw new Error("Illegal handler");
		    if (!this._callbacks.hasOwnProperty(type)) throw new Error("Unsupported event type " + type);
			var handlerMap = this._callbacks[type];
				// register handler
				ctx = ctx || this;
				var handlerID = handlerMap.register(handler, ctx);
		    // do initial callback - if supported by source
		    if (handlerMap._options.init) {
		    	// flag handler
		    	var handlerItem = handlerMap.getItem(handlerID);
		    	handlerItem.pending = true;
		    	var self = this;
	    	   	var immediateCallback = function () {
	    	    	var eItemList = self._eventifyMakeInitEvents(type);
		    		if (eItemList.length > 0) {
		    			if (type === "events") {
		    				self._eventifyTriggerProtectedEvents(eItemList, handlerID);
		    			} else {
		    				self._eventifyTriggerRegularEvents(eItemList, handlerID);
		    			}
		    		} else {
		    			// initial callback is noop
		    			handlerItem.pending = false;
		    		}
	    	    };
 				this._immediateCallbacks.push(immediateCallback);
 				Promise.resolve().then(function () {
 					self._eventifyFlushImmediateCallbacks();
 				});
		    }
	      	return this;
		};

		_prototype._eventifyFlushImmediateCallbacks = function () {
			if (this._eBuffer.length === 0) {
				var callbacks = this._immediateCallbacks;
				this._immediateCallbacks = [];
				callbacks.forEach(function (callback) {
					callback();
				});
			} 
			// if buffer is non-empty, immediate callbacks will be flushed after
			// buffer is emptied
		};


		/*
			OFF
			Available directly on object
			Un-register a handler from a specfic event type
		*/

		_prototype.off = function (type, handler) {
			if (this._callbacks[type] !== undefined) {
				var handlerMap = this._callbacks[type];
				handlerMap.unregister(handler);
				
	  		}
	  		return this;
		};


	};

	/*
		BASE EVENT OBJECT

		Convenience base class allowing eventified classes to be derived using (prototypal) inheritance.
		This is alternative approach, hiding the use of eventifyInstance and eventifyPrototype.
		
	*/
	var BaseEventObject = function () {
		eventifyInstance(this);
	};
	eventifyPrototype(BaseEventObject.prototype);

	// make standard inheritance function available as static method on constructor.
	BaseEventObject.inherit = inherit;


	/* 
		EVENT BOOLEAN

		Single boolean variable, its value accessible through get and toggle methods. 
		Defines an event 'change' whenever the value of the variable is changed. 

		initialised to false if initValue is not specified
		
		Note : implementation uses falsiness of input parameter to constructor and set() operation,
		so eventBoolean(-1) will actually set it to true because
		(-1) ? true : false -> true !  
	*/

	var EventBoolean = function (initValue, options) {
		if (!(this instanceof EventBoolean)) {
			throw new Error("Contructor function called without new operation");
		}
		BaseEventObject.call(this);
		this._value = (initValue) ? true : false;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", options); 
	};
	BaseEventObject.inherit(EventBoolean, BaseEventObject);

	// ovverride to specify initialevents
	EventBoolean.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	/* ACCESSOR PROPERTIES */
	Object.defineProperty(EventBoolean.prototype, "value", {
		get: function () {
			return this._value;
		},
		set: function (newValue) {
			return this.set(newValue);
		}
	});

	EventBoolean.prototype.get = function () { return this._value;};
	EventBoolean.prototype.set = function (newValue) {
		newValue = (newValue) ? true : false;
		if (newValue !== this._value) {
			this._value = newValue;
			this.eventifyTriggerEvent("change", newValue);
			return true;
		}
		return false;	
	};

	EventBoolean.prototype.toggle = function () {
		var newValue = !this._value;
		this._value = newValue;
		this.eventifyTriggerEvent("change", newValue);
		return true;
	};






	/* 
		EVENT VARIABLE

		Single variable, its value accessible through get and set methods. 
		Defines an event 'change' whenever the value of the variable is changed. 

		Event variable may alternatively have a src eventVariable.
		If it does, setting values will simply be forwarded to the source,
		and value changes in src will be reflected.
		This may be used to switch between event variables, simply by setting the 
		src property.
	*/


	var EventVariable = function (initValue, options) {
		options = options || {};
		options.eqFunc = options.eqFunc || areEqual;
		this._options = options;
		
		BaseEventObject.call(this);
		this._value = initValue;
		this._src;
		// define change event (supporting init-event)
		this.eventifyDefineEvent("change", options); 

		// onSrcChange
		var self = this;
		this._onSrcChange = function (value) {
			self.set(value);
		};
	};
	BaseEventObject.inherit(EventVariable, BaseEventObject);

	// ovverride to specify initialevents
	EventVariable.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	Object.defineProperty(EventVariable.prototype, "value", {
		get: function () {
			return this._value;
		},
		set: function (newValue) {
			// only if src is not set
			if (this._src === undefined) {
				this.set(newValue);
			} else {
				this._src.value = newValue;
			}
		}
	});

	Object.defineProperty(EventVariable.prototype, "src", {
		get : function () {
			return this._src;
		},
		set: function (newSrc) {
			if (this._src) {
				// disconnect from old src
				this._src.off("change", this._onSrcChange);
			}
			// connect to new src
			this._src = newSrc;
			this._src.on("change", this._onSrcChange);
		}
	});

	EventVariable.prototype.get = function () { return this._value;};

	EventVariable.prototype.set = function (newValue) {
		var eqFunc = this._options.eqFunc;
		if (!eqFunc(newValue,this._value)) {
			this._value = newValue;
			this.eventifyTriggerEvent("change", newValue);
			return true;
		}
		return false;
	};


	// utility function to make promise out of event variable
	var makeEventPromise = function (ev, target) {
		target = (target !== undefined) ? target : true;
		return new Promise (function (resolve, reject) {
			var callback = function (value) {
				if (value === target) {
					resolve();
					ev.off("change", callback);
				}
			};
			ev.on("change", callback);	
		});
	};


	



	// module api
	return {
		eventifyPrototype : eventifyPrototype,
		eventifyInstance : eventifyInstance,
		BaseEventObject : BaseEventObject,
		EventVariable : EventVariable,
		EventBoolean : EventBoolean,
		makeEventPromise : makeEventPromise
	};
});

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

define('util/interval',[],function () {

	'use strict';

	/*
		INTERVAL
	*/

	var isNumber = function(n) {
		var N = parseFloat(n);
	    return (n===N && !isNaN(N));
	};

	var IntervalError = function (message) {
		this.name = "IntervalError";
		this.message = (message||"");
	};
	IntervalError.prototype = Error.prototype;


	var Interval = function (low, high, lowInclude, highInclude) {
		if (!(this instanceof Interval)) {
			throw new Error("Contructor function called without new operation");
		}
		var lowIsNumber = isNumber(low);
		var highIsNumber = isNumber(high);
		// new Interval(3.0) defines singular - low === high
		if (lowIsNumber && high === undefined) high = low; 
		if (!isNumber(low)) throw new IntervalError("low not a number");
		if (!isNumber(high)) throw new IntervalError("high not a number");	
		if (low > high) throw new IntervalError("low > high");
		if (low === high) {
			lowInclude = true;
			highInclude = true;
		}
		if (low === -Infinity) lowInclude = true;
		if (high === Infinity) highInclude = true;
		if (lowInclude === undefined) lowInclude = true;
		if (highInclude === undefined) highInclude = false;
		if (typeof lowInclude !== "boolean") throw new IntervalError("lowInclude not boolean");
		if (typeof highInclude !== "boolean") throw new IntervalError("highInclude not boolean");
		this.low = low;
		this.high = high;
		this.lowInclude = lowInclude;
		this.highInclude = highInclude;
		this.length = this.high - this.low;
		this.singular = (this.low === this.high);
		this.finite = (isFinite(this.low) && isFinite(this.high));
	};


	Interval.prototype.toString = function () {
		var lowBracket = (this.lowInclude) ? "[" : "<";
		var highBracket = (this.highInclude) ? "]" : ">";
		var low = (this.low === -Infinity) ? "<--" : this.low; //.toFixed(2);
		var high = (this.high === Infinity) ? "-->" : this.high; //.toFixed(2);
		if (this.singular)
			return lowBracket + low + highBracket;
		return lowBracket + low + ',' + high + highBracket;
	};

	Interval.prototype.coversPoint = function (x) {
		if (this.low < x && x < this.high) return true;
		if (this.lowInclude && x === this.low) return true;
		if (this.highInclude && x === this.high) return true;
		return false;
	};

	// overlap : it exists at least one point x covered by both interval 
	Interval.prototype.overlapsInterval = function (other) {
		if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");	
		// singularities
		if (this.singular && other.singular) 
			return (this.low === other.low);
		if (this.singular)
			return other.coversPoint(this.low);
		if (other.singular)
			return this.coversPoint(other.low); 
		// not overlap right
		if (this.high < other.low) return false;
		if (this.high === other.low) {
			return this.coversPoint(other.low) && other.coversPoint(this.high);
		}
		// not overlap left
		if (this.low > other.high) return false;
		if (this.low === other.high) {
			return (this.coversPoint(other.high) && other.coversPoint(this.low));
		}
		return true;
	};
	Interval.prototype.coversInterval = function (other) {
		if (other instanceof Interval === false) throw new IntervalError("paramenter not instance of Interval");
		if (other.low < this.low || this.high < other.high) return false;
		if (this.low < other.low && other.high < this.high) return true;
		// corner case - one or both endpoints are the same (the other endpoint is covered)
		if (this.low === other.low && this.lowInclude === false && other.lowInclude === true)
			return false;
		if (this.high === other.high && this.highInclude === false && other.highInclude === true)
			return false;
		return true;
	};
	Interval.prototype.equals = function (other) {
		if (this.low !== other.low) return false;
		if (this.high !== other.high) return false;
		if (this.lowInclude !== other.lowInclude) return false;
		if (this.highInclude !== other.highInclude) return false;
		return true;
	};

	/* 
		Possibility for more interval methods such as union, intersection, 
	*/

	return Interval;
});


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


define ('util/binarysearch',['./interval'], function (Interval) {

    'use strict';

    // check if n is a number
    var is_number = function(n) {
    	var N = parseFloat(n);
        return (n==N && !isNaN(N));
    };


    /* 
        batch inserts and removes have two strategies
        1) change-sort
        2) splice 
    
        simple rule by measurement
        splice is better for batchlength <= 100 for both insert and remove
    */
    var resolve_approach = function (arrayLength, batchLength) {
        if (arrayLength == 0) {
            return "sort";
        }
        return (batchLength <= 100) ? "splice" : "sort"; 
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

    var cmp = function (a, b) {return a-b;};
    

    var BinarySearch = function (options) {
        this.array = [];
        this.options = options || {};
    };

    /**
     * Binary search on sorted array
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    BinarySearch.prototype.binaryIndexOf = function (searchElement) {
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
        } 
        if (index == 0 && this.array.length > 0 && this.array[0] == x) {
            return true;
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

    BinarySearch.prototype.indexOfElements = function (elements) {
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
    BinarySearch.prototype.has = function (x) {
        return (this.indexOf(x) > -1) ? true : false; 
    };

    BinarySearch.prototype.get = function (index) {
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
        return [...new Set(A)];
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
    BinarySearch.prototype._update_splice = function (to_remove, to_insert, options) {

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
    BinarySearch.prototype._update_sort = function (to_remove, to_insert, options) {
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
        this.array = this._unique(this.array);
    };


    /*
        Update - removing and inserting elements in one operation

        a single element should only be present once in the list, thus avoiding 
        multiple operations to one element. This is presumed solved externally. 
        - also objects must not be members of both lists.

        - internally selects the best method - searchsplice or concatsort
        - selection based on relative sizes of existing elements and new elements

    */
    BinarySearch.prototype.update = function (to_remove, to_insert, options) {
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

    BinarySearch.prototype.getMinimum = function () {
        return (this.array.length > 0) ? this.array[0] : undefined;
    };

    BinarySearch.prototype.getMaximum = function () {
        return (this.array.length > 0) ? this.array[this.array.length - 1] : undefined;
    };


    /*
        Internal search functions
    */

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

    /*
        lookup start and end indexes of elements within interval
        for use with slice operation
        returns undefined if no elements are found
    */
    BinarySearch.prototype.lookupIndexes = function (interval) {
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
    BinarySearch.prototype.lookup = function (interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.slice(start, end) : [];       
    };

    /*
        remove by interval
    */
    BinarySearch.prototype.remove = function (interval) {
        let [start, end] = this.lookupIndexes(interval);
        return (start != undefined) ? this.array.splice(start, end-start) : [];     
    };


    BinarySearch.prototype.slice = function (start, end) {
        return this.array.slice(start, end);
    };

    BinarySearch.prototype.splice = function (start, length) {
        return this.array.splice(start, length);
    };



    /*
        method for removing multiple closely placed elements in place
        - removeList is sorted
        - changes only affect the part of the index between first and last element
        - move remaining elements to the left, remove elements with a single splice
        - efficent if removelist references elements that are close to eachother  
    */

    BinarySearch.prototype.removeInSlice = function (removeList) {
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



    BinarySearch.prototype.values = function () {
        return this.array.values();
    };

    BinarySearch.prototype.clear = function () {
        this.array = [];
    };

    Object.defineProperty(BinarySearch.prototype, "length", {
        get: function () {
            return this.array.length;
        }
    });

    return BinarySearch;
});




define ('sequencing/axis',['../util/binarysearch', '../util/interval', '../util/eventify'], 
	function (BinarySearch, Interval, eventify) {

	'use strict';

	/*
		UTILITY
	*/


	/* 
		concat two arrays without creating a copy
		push elements from the shortest into the longest
		return the longest
	*/
	const mergeArrays = function(arr1, arr2) {
		const [shortest, longest] = (arr1.length <= arr2.length) ? [arr1, arr2] : [arr2, arr1];
		let len = shortest.length;
		for (let i=0; i<len; i++) {
			longest.push(shortest[i]);
		}
		return longest;
	};


	/*
		Add cue to array
	*/
	var addCueToArray = function (arr, cue) {
		// cue equality defined by key property
		if (arr.length == 0) {
			arr.push(cue);
		} else {		
			let idx = arr.findIndex(function (_cue) { 
				return _cue.key == cue.key;
			});
			if (idx == -1) {
				arr.push(cue);
			}
		}
		return arr.length;
	};

	/*
		Remove cue from array
	*/
	var removeCueFromArray = function (arr, cue) {
		// cue equality defined by key property 
		if (arr.length == 0) {
			return true;
		} else {		
			let idx = arr.findIndex(function (_cue) { 
				return _cue.key == cue.key;
			});
			if (idx > -1) {
				arr.splice(idx, 1);
			}
			return arr.length == 0;
		}
	};


	/*
		returns true if interval b has at least one endpoint inside interval a
	
		There are some subtleties if interval B shares one or two endpoints with A

		4 ways for intervals to share an endpoint
		- a.high == b.low : 
			><  (b.low outside a) 
			>[  (b.low outside a)
			]<  (b.low outside a)
			][  (b.low inside a)
		- b.high == a.low : 
			><  (b.high outside a) 
			>[  (b.high outside a)
			]<  (b.high outside a )
			][  (b.high inside a)
		- a.high == b.high: 
			>>  (b.high inside a)
			>]  (b.high outside a)
			]>  (b.high inside a)
			]]  (b.high inside a)
		- a.low == b.low : 
			<<  (b.low inside a)
			<[  (b.low outside a)
			[<  (b.low inside a)
			[[  (b.low inside a)
	*/

	var endpointInside = function (a, b) {
		// check if b is to the right of a
		if (a.high < b.low) return false;
		// check if b is to the left of a
		if (b.high < a.low) return false;
		// check if b.low is inside a
		if (a.low < b.low && b.low < a.high) return true;
		// check if b.high is inside a
		if (a.low < b.high && b.high < a.high) return true;
		// special consideration if a and b happens to share one or two endpoints
		if (a.high == b.low) {
			if (a.highInclude && b.lowInclude) return true;
		} 
		if (b.high == a.low) {
			if (b.highInclude && a.lowInclude) return true;
		}
		if (a.high == b.high) {
			if (!(!a.highInclude && b.highInclude)) return true;
		}
		if (a.low == b.low) {
			if (!(!a.lowInclude && b.lowInclude)) return true;
		}
		return false;
	};

	
    /*
		Setup for cue buckets.
    */
    const CueBucketIds = [0,10,100,1000,10000,100000, Infinity];
    var getCueBucketId = function (length) {
    	for (let i=0; i<CueBucketIds.length; i++) {
    		if (length <= CueBucketIds[i]) {
    			return CueBucketIds[i];
    		}
    	}
    };


    /*
		Semantic

		Specifies the semantic for cue operations

		INSIDE  - all cues with both endpoints INSIDE the search interval
		PARTIAL - all INSIDE cues, plus cues that PARTIALL overlap search interval, i.e. have only one endpoint INSIDE search interval
		OVERLAP - all PARTIAL cues, plus cues that fully OVERLAP search interval, but have no endpoints INSIDE search interval 

    */
    const Semantic = Object.freeze({
    	INSIDE: "inside",
    	PARTIAL: "partial",
    	OVERLAP: "overlap"
    });


    /*
		Method

		Specifies various methods on CueBuckets

		LOOKUP_CUEPOINTS - look up all (point, cue) tuples in search interval
		LOOKUP_CUES - lookup all cues in interval
		REMOVE_CUES - remove all cues in interval 

    */
    const Method = Object.freeze({
    	LOOKUP_CUES: "lookup-cues",
    	LOOKUP_CUEPOINTS: "lookup-cuepoints",
    	REMOVE_CUES: "remove-cues",
    	INTEGRITY: "integrity"
    });

	
	/*
		this implements Axis, a datastructure for efficient lookup of cues on a timeline
		- cues may be tied to one or two points on the timeline, this
		is expressed by an Interval.
		- cues are indexed both by key and by cuepoint values
		- cues are maintained in buckets, based on their interval length, for efficient lookup
	*/

	var Axis = function () {

		/*
			efficient lookup of cues by key	
			key -> cue
		*/
		this._cueMap = new Map();

		/*
			Initialise set of CueBuckets
			Each CueBucket is responsible for cues of a certain length
		*/
		this._cueBuckets = new Map();  // CueBucketId -> CueBucket
		for (let i=0; i<CueBucketIds.length; i++) {
			let cueBucketId = CueBucketIds[i];
			this._cueBuckets.set(cueBucketId, new CueBucket(cueBucketId));
		}

		// buffer for addCue, removeCue requests
		this._updateBuffer = [];

		// Change event
		eventify.eventifyInstance(this, {init:false});
		this.eventifyDefineEvent("change", {init:false});
	};
	eventify.eventifyPrototype(Axis.prototype);


	/*
		UPDATE

		update adds a batch of cues to the update buffer
		the batch will be delivered to _update in later microtask.

		This allows repeated calls to update to be
		collected into one batch.
	*/
	Axis.prototype.update = function (cues) {
		this._updateBuffer.push(cues);
		if (this._updateBuffer.length === 1) {
			/*
				updateBuffer just became non-empty
				initiate triggering of real update
			*/
			var self = this;
			Promise.resolve().then(function () {
				self._update([].concat(...self._updateBuffer));
				// empty updateBuffer
				self._updateBuffer = [];			
			});
		}
	};


	/*
		ADD CUE / REMOVE CUE

		addCue and removeCue are convenience functions
		for requesting cue operations to the axis.

		They may be invoked multiple times in say a for-loop,
		but all cues will still be delivered in one batch to 
		the internal update operation.

		Actual cue processing happens on the later microtasks, 
		so one cannot expect to see the effect of these operations 
		directly after the function call.
	*/

	Axis.prototype.addCue = function(key, interval, data) {
		this.update([{key:key, interval:interval, data:data}]);
	};

	Axis.prototype.removeCue = function(key) {
		this.update([{key:key}]);
	};


	/*
		INTERNAL UPDATE

		- add, modify or delete cues

		takes a list of cues
		
		cue = {
			key:key,
			interval: Interval,
			data: data
		}

		if cues do not have an interval property, this means to
		delete the cue. If not, the cue is added - or modified if 
		a cue with the same key already exists

		remove_cue = {key:key}

		batchMap key -> {new: new_cue, old: old_cue}

		BatchMap is generated during initial batch processing, 
		representing the effects of the entire cue batch, 
		thus making cue batch processing into an atomic operation.

		- If operation applies to cue that already exists, the old cue
		  will be included. 

		- If multiple operations in a batch apply to the same 
		cue, items will effectively be collapsed into one operation. 
	
		- If a cue was available before cue processing started,
		this will be reported as old value (if this cue has been modified
		in any way), even if the cue has been modified multiple times
		during the batch. The last cue modification on a given key defines the new
		cue. 

		- If a cue is both added and removed in the same batch,
		it will not be included in items.
	*/

	
	Axis.prototype._update = function(cues) {

		/*
			process cue batch to make batchMap 
			- distinguish add from modify by including old values from cueMap
			- collapse if same cue is mentioned multiple times
		*/
		let batchMap = new Map(); // key -> {new:new_cue, old:old_cue}
		let len = cues.length;
		let init = this._cueMap.size == 0;
		for (let i=0; i<len; i++) {
    		let cue = cues[i];
    		// check cue
    		if (cue == undefined || cue.key == undefined) {
    			throw new Error("illegal cue", cue);
    		}
    		// update batchMap
    		let old_cue = (init) ? undefined : this._cueMap.get(cue.key);
    		let new_cue = (cue.interval == undefined ) ? undefined : cue;
    		if (new_cue == undefined && old_cue == undefined) {
	    		// attempt at remove cue which did not exist before update
    			// noop - remove from batchMap
    			batchMap.delete(cue.key);
  			} else {
	    		batchMap.set(cue.key, {new:new_cue, old:old_cue});
  			}
		}

        /*
			cue processing based on batchMap
        */
        this._processCues(batchMap);
		this.eventifyTriggerEvent("change", batchMap);
		return batchMap;
	};


	/*
		internal function: process batchMap,
		dispatch cue operations to appropriate cue bucket
	*/
	Axis.prototype._processCues = function (batchMap) {
		for (let item of batchMap.values()) {
			// update cue buckets
			if (item.old) {
				let cueBucketId = getCueBucketId(item.old.interval.length);
				this._cueBuckets.get(cueBucketId).processCue("remove", item.old);
			}
			if (item.new) {
				let cueBucketId = getCueBucketId(item.new.interval.length);
				let cueBucket = this._cueBuckets.get(cueBucketId);
				cueBucket.processCue("add", item.new);
			}
			// update cueMap
			if (item.new) {
				this._cueMap.set(item.new.key, item.new);
			} else {
				this._cueMap.delete(item.old.key);
			}
		}
		// flush all buckets so updates take effect
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.flush();
		}
	};

	/*
		internal function: execute method across all cue buckets
		and aggregate results
	*/
	Axis.prototype._execute = function (method, interval, semantic) {
		const res = [];
		for (let cueBucket of this._cueBuckets.values()) {
			let cues = cueBucket.execute(method, interval, semantic);
			if (cues.length > 0) {
				res.push(cues);
			}
		}
		return [].concat(...res);
	};

	/*
		GET CUEPOINTS BY INTERVAL

		returns (point, cue) for all points covered by given interval

		returns: 
			- list of cuepoints, from cue endpoints within interval
			- [{point: point, cue:cue}]		
	*/
	Axis.prototype.getCuePointsByInterval = function (interval) {
		return this._execute(Method.LOOKUP_CUEPOINTS, interval);
	};

	/*
		GET CUES BY INTERVAL
		
		semantic - "inside" | "partial" | "overlap"

	*/
	Axis.prototype.getCuesByInterval = function (interval, semantic=Semantic.OVERLAP) {
		return this._execute(Method.LOOKUP_CUES, interval, semantic);
	};


	/*
		REMOVE CUES BY INTERVAL
	*/
	Axis.prototype.removeCuesByInterval = function (interval, semantic=Semantic.INSIDE) {
		const cues = this._execute(Method.REMOVE_CUES, interval, semantic);
		// remove from cueMap and make events
		const eventMap = new Map();
		for (let i=0; i<cues.length; i++) {
			let cue = cues[i];
			this._cueMap.delete(cue.key);
			eventMap.set(cue.key, {'old': cue});
		}
		this.eventifyTriggerEvent("change", eventMap);
		return eventMap;
	};

	/*
		CLEAR ALL CUES
	*/
	Axis.prototype.clear = function () {
		// clear cue Buckets
		for (let cueBucket of this._cueBuckets.values()) {
			cueBucket.clear();
		}
		// clear cueMap
		let cueMap = this._cueMap;
		this._cueMap = new Map();
		// create change events for all cues
		let e = [];
		for (let cue of cueMap.values()) {
			e.push({'old': cue});
		}
		this.eventifyTriggerEvent("change", e);
		return cueMap;
	};


	/*
		Accessors
	*/

	Axis.prototype.has = function (key) {
		return this._cueMap.has(key);
	};

	Axis.prototype.get = function (key) {
		return this._cueMap.get(key);
	};

	Axis.prototype.keys = function () {
		return [...this._cueMap.keys()];
	};

	Axis.prototype.cues = function () {
		return [...this._cueMap.values()];
	};


	/*
		utility
	*/
	Axis.prototype._integrity = function () {
		const res = this._execute(Method.INTEGRITY);
	
		// sum up cues and points
		let cues = [];
		let points = [];
		for (let bucketInfo of res.values()) {
			cues.push(bucketInfo.cues);
			points.push(bucketInfo.points);
		}
		cues = [].concat(...cues);
		points = [].concat(...points);
		// remove point duplicates if any
		points = [...new Set(points)];
		
		if (cues.length != this._cueMap.size) {
			throw new Error("inconsistent cue count cueMap and aggregate cueBuckets " + cues-this._cueMap.size);
		}

		// check that cues are the same
		for (let cue of cues.values()) {
			if (!this._cueMap.has(cue.key)) {
				throw new Error("inconsistent cues cueMap and aggregate cueBuckets");
			}
		}

		return {
			cues: cues.length,
			points: points.length
		};
	};



	/*
		CueBucket is a bucket of cues limited to specific length
	*/


	var CueBucket = function (maxLength) {
		
		// max length of cues in this bucket
		this._maxLength = maxLength;

		/*
			pointMap maintains the associations between values (points on 
			the timeline) and cues that reference such points. A single point value may be 
			referenced by multiple cues, so one point value maps to a list of cues.
	
			value -> [cue, ....]
		*/ 
		this._pointMap = new Map();


		/*
			pointIndex maintains a sorted list of numbers for efficient lookup.
			A large volume of insert and remove operations may be problematic
			with respect to performance, so the implementation seeks to
			do a single bulk update on this structure, for each batch of cue
			operations (i.e. each invocations of addCues). In order to do this 
			all cue operations are processed to calculate a single batch 
			of deletes and a single batch of inserts which then will be applied to 
			the pointIndex in one atomic operation.

			[1.2, 3, 4, 8.1, ....]
		*/
		this._pointIndex = new BinarySearch();

		// bookeeping during batch processing
		this._created = new Set(); // point
		this._dirty = new Set(); // point
	};


	/* 

		CUE BATCH PROCESSING

		Needs to translates cue operations into a minimum set of 
		operations on the pointIndex.

		To do this, we need to record points that are created and
		points which are modified.
		
		The total difference that the batch of cue operations
		amounts to is expressed as one list of values to be 
		deleted, and and one list of values to be inserted. 
		The update operation of the pointIndex will process both 
		in one atomic operation.

		On flush both the pointMap and the pointIndex will brought
		up to speed

		created and dirty are used for bookeeping during 
		processing of a cue batch. They are needed to 
		create the correct diff operation to be applied on pointIndex.

		created : includes values that were not in pointMap 
		before current batch was processed

		dirty : includes values that were in pointMap
		before curent batch was processed, and that
		have been become empty at least at one point during cue 
		processing. 

		created and dirty are used as temporary alternatives to pointMap.
		after the cue processing, pointmap will updated based on the
		contents of these two.

		operation add or remove for given cue
		
		this method may be invoked at most two times for the same key.
		- first "remove" on the old cue
		- second "add" on the new cue 


		"add" means point to be added to point
		"remove" means cue to be removed from point

		process buffers operations for pointMap and index so that 
		all operations may be applied in one batch. This happens in flush 
	*/

	CueBucket.prototype.processCue = function (op, cue) {

		let points, point, cues;
		if (cue.singular) {
			points = [cue.interval.low]
		} else {
			points = [cue.interval.low, cue.interval.high];
		}

		let init = (this._pointMap.size == 0);

		for (let i=0; i<points.length; i++) {
			point = points[i];
			cues = (init) ? undefined : this._pointMap.get(point);
			if (cues == undefined) {	
				cues = [];
				this._pointMap.set(point, cues);
				this._created.add(point);
			}
			if (op == "add") {
				addCueToArray(cues, cue);
			} else {
				let empty = removeCueFromArray(cues, cue);
				if (empty) {
					this._dirty.add(point);
				}
			}
		}
	};

	/*
		Batch processing is completed
		Commit changes to pointIndex and pointMap.

		pointMap
		- update with contents of created

		pointIndex
		- points to delete - dirty and empty
		- points to insert - created and non-empty
	*/
	CueBucket.prototype.flush = function () {
		if (this._created.size == 0 && this._dirty.size == 0) {
			return;
		}

		// update pointIndex
		let to_remove = [];
		let to_insert = [];
		for (let point of this._created.values()) {
			let cues = this._pointMap.get(point);
			if (cues.length > 0) {
				to_insert.push(point);
			} else {
				this._pointMap.delete(point);
			}
		}
		for (let point of this._dirty.values()) {
			let cues = this._pointMap.get(point);
			if (cues.length == 0) {
				to_remove.push(point);
				this._pointMap.delete(point);
			}
		}
		this._pointIndex.update(to_remove, to_insert);
		// cleanup
		this._created.clear();
		this._dirty.clear();
	};

	

	/*
		_getCuesFromInterval

		internal utility function to find cues from endpoints in interval

		getCuesByInterval will find points in interval in pointIndex and 
		find the associated cues from pointMap. 

		Cues may be reported more than once
		Any specific order of cues is not defined.

		(at least one cue endpoint will be equal to point)

		Note: This function returns only cues with endpoints covered by the interval.
		It does not return cues that cover the interval (i.e. one endpoint at each
		side of the interval).

		option cuepoint signals to include both the cue and its point
		{point:point, cue:cue}
		if not - a list of cues is returned

		the order is defined by point values (ascending), whether points are included or not.
		each point value is reported once, yet one cue
		may be reference by 1 or 2 points.

		returns list of cues, or list of cuepoints, based on options
	*/
	CueBucket.prototype._lookupCuesFromInterval = function(interval, options={}) {
		const cuepoint = (options.cuepoint != undefined) ? options.cuepoint : false;
		/* 
			search for points in pointIndex using interval
			if search interval is <a,b> endpoints a and b will not be included
			this means that at cue [a,b] will not be picked up - as its enpoints are outside the search interval
			however, this also means that a cue <a,b> will not be picked up - which is not correct - as these endpoints are inside the search interval
			solution is to broaden the search and filter away 
		*/
		const broadInterval = new Interval(interval.low, interval.high, true, true);
		const points = this._pointIndex.lookup(broadInterval);
		const res = [];
		const len = points.length;
		const cueSet = new Set();
		for (let i=0; i<len; i++) {
			let point = points[i];
			let cues = this._pointMap.get(point);
			for (let j=0; j<cues.length; j++) {
				let cue = cues[j];

				/*
					avoid duplicate cues 
					(not for cuepoints, where cues may be associated with two points)
				*/
				if (!cuepoint) {
					if (cueSet.has(cue.key)) {
						continue;
					} else {
						cueSet.add(cue.key);
					}
				}

				/* filter out cues that have both endpoints outside the original search interval */				
				if (endpointInside(interval, cue.interval)) {
					let item = (cuepoint) ? {point:point, cue:cue} : cue;
					res.push(item);
				}
			}
		}
		return res;
	};

	/*
		Find cues that are overlapping search interval, with one endpoint
		at each side.

		define left and right intervals that cover areas on the timeline to
		the left and right of search interval. 
		These intervals are limited by the interval maxLength of cues in this bucket,
		so that:
		 - left interval [interval.high-maxLengt, interval.low]
		 - right interval [interval.high, interval.low+maxlength]

		Only need to search one of them. Preferably the one with the fewest cues.
		However, doing two searches to figure out which is shortest is quite possibly more expensive than choosing the longest,
		so no point really

		Choice - always search left.

		If interval.length > maxLength, then there can be no overlapping intervals in this bucket

		Endpoints must not overlap with endpoints of <interval>
		- if interval.lowInclude, then leftInterval.highInclude must be false,
		  and vice versa. 
		- the same consideration applies to interval.highInclude
	*/
	CueBucket.prototype._lookupOutsideCuesFromInterval = function(interval){
		if (interval.length > this._maxLength) {
			return [];
		}

		const highIncludeOfLeftInterval = !interval.lowInclude;
		const leftInterval = new Interval(interval.high - this._maxLength, interval.low, true, highIncludeOfLeftInterval);

		const lowIncludeOfRightInterval = !interval.highInclude;		
		const rightInterval = new Interval(interval.high, interval.low + this._maxLength, lowIncludeOfRightInterval, true);
		
		//	iterate leftInterval to find cues that have endpoints covered by rightInterval		
		return this._lookupCuesFromInterval(leftInterval)
			.filter(function (cue) {
				// fast test
				if (interval.high < cue.interval.low) {
					return true;
				}
				// more expensive test that will pick up cornercase
				// where [a,b] will actually be an outside covering interval for <a,b>
				return rightInterval.coversPoint(cue.interval.high);
			});
	};


	/*
		execute dispatches request to given method.

		CUEPOINTS - look up all (point, cue) tuples in search interval

		INSIDE - look up all cues with both endpoints INSIDE the search interval
		PARTIAL - look up all INSIDE cues, plus cues with one endpoint inside the search interval
		ALL - look up all PARTIAL cues, plus cues with one cue at each side of search interval 

	*/
	CueBucket.prototype.execute = function (method, interval, semantic) {
		if (this._pointIndex.length == 0) {
			return [];
		}
		if (method == Method.LOOKUP_CUEPOINTS) {
			return this.lookupCuePoints(interval);
		} else if (method == Method.LOOKUP_CUES) {
			return this.lookupCues(interval, semantic);
		} else if (method == Method.REMOVE_CUES) {
			return this.removeCues(interval, semantic);
		} else if (method == Method.INTEGRITY) {
			return this._integrity();
		} else {
			throw new Error("method or semantic not supported " + method + " " + semantic);
		}
	};


	/*
		LOOKUP CUEPOINTS - look up all (point, cue) tuples in search interval
	*/
	CueBucket.prototype.lookupCuePoints = function (interval) {
		return this._lookupCuesFromInterval(interval, {cuepoint:true});
	};


	/*
		LOOKUP CUES
	*/
	CueBucket.prototype.lookupCues = function (interval, semantic=Semantic.OVERLAP) {
		const partial_cues = this._lookupCuesFromInterval(interval, {cuepoint:false});
		if (semantic == Semantic.PARTIAL) {
			return partial_cues;
		} else if (semantic == Semantic.INSIDE) {
			return partial_cues.filter(function (cue) {
				return interval.coversInterval(cue.interval);
			});
		} else if (semantic == Semantic.OVERLAP) {
			const outside_cues = this._lookupOutsideCuesFromInterval(interval);
			return mergeArrays(partial_cues, outside_cues);
		} else {
			throw new Error("illegal semantic " + semantic);
		}
	}


	/*
		REMOVE CUES
	*/
	CueBucket.prototype.removeCues = function (interval, semantic) {
		/*
			update pointMap
			- remove all cues from pointMap
			- remove empty entries in pointMap
			- record points that became empty, as these need to be deleted in pointIndex
			- separate into two bucketes, inside and outside
		*/
		const cues = this.execute(Method.LOOKUP_CUES, interval, semantic);
		const to_remove = [];
		let cue, point, points;
		for (let i=0; i<cues.length; i++) {
			cue = cues[i];
			// points of cue
			if (cue.interval.singular) {
				points = [cue.interval.low];
			} else {
				points = [cue.interval.low, cue.interval.high];
			}
			for (let j=0; j<points.length; j++) {
				point = points[j];	
				// remove cue from pointMap
				// delete pointMap entry only if empty
				let empty = removeCueFromArray(this._pointMap.get(point), cue);
				if (empty) {
					this._pointMap.delete(point);
					to_remove.push(point);
				}
			}
		}

		/*
			update pointIndex

			- remove all points within pointIndex
			- exploit locality, the operation is limited to a segment of the index, so 
			  the basic idea is to take out a copy of segment (slice), do modifications, and then reinsert (splice)
			- the segment to modify is limited by [interval.low - maxLength, interval.high + maxLenght] as this will cover
			  both cues inside, partial and overlapping.
		
			# Possible - optimization 
			alternative approach using regular update could be more efficient for very samll batches
			this._pointIndex.update(to_remove, []);
			it could also be comparable for huge loads (250.000 cues)
		*/
		
		to_remove.sort(function(a,b){return a-b});
		this._pointIndex.removeInSlice(to_remove);

		/*
			alternative solution
			this._pointIndex.update(to_remove, []);
		*/

		return cues;
	};


	/*
		Possible optimization. Implement a removecues method that
		exploits locality by removing an entire slice of pointIndex.
		- this can safely be done for LookupMethod.OVERLAP and PARTIAL.
		- however, for LookupMethod.INSIDE, which is likely the most useful
		  only some of the points in pointIndex shall be removed
		  solution could be to remove entire slice, construct a new slice 
		  with those points that should not be deleted, and set it back in.
	*/
	CueBucket.prototype.clear = function () { 
		this._pointMap = new Map();
		this._pointIndex = new BinarySearch();
	};		


	/*
		Integrity test for cue bucket datastructures
		pointMap and pointIndex
	*/
	CueBucket.prototype._integrity = function () {

		if (this._pointMap.size !== this._pointIndex.length) {
			throw new Error("unequal number of points " + (this._pointMap.size - this._pointIndex.length));
		}

		// check that the same cues are present in both pointMap and pointIndex
		const missing = new Set();
		for (let point of this._pointIndex.values()) {
			if (!this._pointMap.has(point)){
				missing.add(point);
			}
		}
		if (missing.size > 0) {
			throw new Error("differences in points " + [...missing]);
		}

		// collect all cues
		let cues = [];
		for (let _cues of this._pointMap.values()) {
			for (let cue of _cues.values()) {
				cues.push(cue);
			}
		}
		// remove duplicates
		cues = [...new Map(cues.map(function(cue){
			return [cue.key, cue];
		})).values()];

		// check all cues
		for (let cue of cues.values()) {
			if (cue.interval.length > this._maxLength) {
				throw new Error("cue interval violates maxLength ",  cue);
			}
			let points;
			if (cue.singular) {
				points = [cue.interval.low];
			} else {
				points = [cue.interval.low, cue.interval.high];
			}
			for (let point of points.values()) {
				if (!this._pointIndex.has(point)) {
					throw new Error("point from pointMap cue not found in pointIndex ", point);
				}
			}
		}

		return [{
			maxLength: this._maxLength,
			points: [...this._pointMap.keys()],
			cues: cues
		}];
	};




	// module definition
	return Axis;
});

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

define('sequencing/sequencer',['../util/motionutils', '../util/eventify', '../util/interval', './axis'], 
	function (motionutils, eventify, Interval, Axis)  {

	'use strict';

	// UTILITY

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

	var isMoving = function (vector) {
		return (vector.velocity !== 0.0 || vector.acceleration !== 0.0);
	};

    // VERBS
    var VerbType = Object.freeze({
		ENTER: "enter",
		EXIT: "exit",
		NONE: "none",
		toInteger: function (s) {
		    if (s === VerbType.ENTER) return 1;
		    if (s === VerbType.EXIT) return -1;
		    if (s === VerbType.NONE) return 0;
		    throw new SequencerError("illegal string value verb type " + s);
		},
		fromInteger : function (i) {
			if (i === -1) return VerbType.EXIT;
			else if (i === 1) return VerbType.ENTER;
			else if (i === 0) return VerbType.NONE;
			throw new SequencerError("illegal integer value for direction type " + i);
		}
    });

    // DIRECTIONS
    var DirectionType = Object.freeze({
		BACKWARDS: "backwards",
		FORWARDS: "forwards",
		NODIRECTION : "nodirection",
		toInteger : function (s) {
		    if (s === DirectionType.BACKWARDS) return -1;
		    if (s === DirectionType.FORWARDS) return 1;
		    if (s === DirectionType.NODIRECTION) return 0;
		    throw new SequencerError("illegal string value direction type " + string);
		},
		fromInteger : function (i) {
			if (i === 0) return DirectionType.NODIRECTION;
			else if (i === -1) return DirectionType.BACKWARDS;
			else if (i === 1) return DirectionType.FORWARDS;
			throw new SequencerError("illegal integer value for direction type " + i + " " + typeof(i));
		}
    });


    // Event cause
    const Cause = Object.freeze({
    	INIT: "init",
    	TIMINGCHANGE: "timing-change",
    	CUECHANGE: "cue-change",
    	PLAYBACK: "playback"
    });


	// POINT TYPES
    var PointType = Object.freeze({
		LOW: "low",
		SINGULAR: "singular",
		HIGH: "high",
		INSIDE: "inside",
		OUTSIDE: "outside",
		toInteger: function (s) {
		    if (s === PointType.LOW) return -1;
		    if (s === PointType.HIGH) return 1;
		    if (s === PointType.INSIDE) return 2;
		    if (s === PointType.OUTSIDE) return 3;
		    if (s === PointType.SINGULAR) return 0;
		    throw new AxisError("illegal string value for point type");
		},
		fromInteger: function (i) {
			if (i === -1) return PointType.LOW;
			else if (i === 0) return PointType.SINGULAR;
			else if (i === 1) return PointType.HIGH;
			else if (i === 2) return PointType.INSIDE;
			else if (i === 3) return PointType.OUTSIDE;
			throw new AxisError("illegal integer value for point type");
		}
    });

    /*
		get point type of point with respect to interval
    */
	var getPointType = function (point, interval) {
		if (interval.singular && point === interval.low) return PointType.SINGULAR;
	    if (point === interval.low) return PointType.LOW;
	    if (point === interval.high) return PointType.HIGH;
	    if (interval.low < point && point < interval.high) return PointType.INSIDE;
	    else return PointType.OUTSIDE;
	};


	/*
		Sequencer Error
	*/
	var SequencerError = function (message) {
		this.name = "SequencerError";
		this.message = (message || "");
	};
	SequencerError.prototype = Error.prototype;


	/*
		Sequencer EArg
	*/
	var makeEArg = function (now, point, cue, directionInt, cause, verb, dueTs) {
		return {
			key: cue.key,
			interval: cue.interval,
			data: cue.data,
			point: point,
			pointType: getPointType(point, cue.interval),
			dueTs: dueTs || now,
			delay: now - dueTs,
			directionType : DirectionType.fromInteger(directionInt),
			type: (verb === VerbType.EXIT) ? "remove" : "change",
			cause: cause,
			enter: (verb === VerbType.ENTER),
			exit: (verb === VerbType.EXIT)
		};
	};


	/*

      SCHEDULE

      The purpose of schedule is to keep tasks planned for execution
      in the near future.
      
      <start> and <end> timestamps defines the time
      interval covered by the schedule - the <covering interval>. The
      idea is to move this interval stepwise, to eventually cover the
      entire time-line. The length of this interval is defined by the
      option <lookahead>. The default value is 5 seconds.

      The <advance> operation moves the interval so that the next
      interval <start> matches the previous interval <end>. If
      lookahead is 5 seconds, the general idea is to advance the
      covering interval every 5 seconds.  However, it is safe to
      advance it more often. It is also safe to advance it less
      often. In this case the covering interval will grow in length to
      cover otherwise lost parts of the timeline - but events will be 
      delivered too late.

      The push(ts,task) operation allows tasks to be added to the
      schedule, provided their due-times fall within the covering
      interval. The push_immediate(task) will assign <ts> === now.
      Push maintains time ordering.
      
      The pop() operation is used to get all tasks that are due for
      execution. The schedule should be popped regularly/frequently to
      keep tasks from being delayed in execution. The delay_next()
      operation returns the time (milliseconds) until the next task is
      due. This can be used with setTimeout() to arrange timely
      popping. However, note that this timeout may have to be
      re-evealuated as new tasks are pushed onto the schedule.

      Associated with the <covering interval> (time), there is also a
      "covering interval" with respect to timing object(position). Eg. In real-time
      (epoch) interval [1434891233.407, 1434891235.407] movement of timing object covers
      positions [23.0, 25.0].  All tasks are associated with a position on a
      dimension. This is set by the advance() operation.  The position
      interval is used (externally) to quickly evaluate relevance of tasks, essentially to
      avoid calculating the due-times of a task only to find that it falls
      outside the time convering interval. Position interval is only managed
      externally.

     */

    var Schedule = function (now, options) {
		this.queue = [];
		// options
		this.options = options || {};	
		this.options.lookahead = this.options.lookahead || 5.0;
		// time-interval
		var start = now;
		var end = now + this.options.lookahead;

		this.timeInterval = new Interval(start, end, true, true);
		// position-interval
		this.posInterval = null;
	};

	Schedule.prototype.getTimeInterval = function (){return this.timeInterval;};
	Schedule.prototype.getPosInterval = function (){return this.posInterval;};
	Schedule.prototype.setPosInterval = function (interval) {this.posInterval = interval;};
	Schedule.prototype.sortFunc = function(a,b) {return a.ts - b.ts;};

	// push
	// task assumed to have a key -- se usage by Sequencer
	Schedule.prototype.push = function (now, ts, task) {
		if (this.timeInterval.coversPoint(ts)) {
			var entry = {
			    ts: ts,
			    task: task,
		    	push_ts: now
			};
			if (ts >= now) {
			    this.queue.push(entry);
			    this.queue.sort(this.sortFunc); // maintain ordering
			    return true;
			} else {
				console.log("Schedule : task pushed a bit too late, ts < now ", (ts-now));
			}
	    }
	    return false;
	};

		// pop
	Schedule.prototype.pop = function (now) {
	    var res = [];
	    while (this.queue.length > 0 && this.queue[0].ts <= now) {
			var entry = this.queue.shift();
			var info = {
			    task: entry.task,
			    pop_ts: now, // fresh timestamp?
			    push_ts: entry.push_ts,
			    ts: entry.ts
			};
			res.push(info);
	    }
	    return res;
	};
		

	/* Invalidate task with given key */
	Schedule.prototype.invalidate = function (key) {
	    var i, index, entry, remove = [];
	    // Find
	    for (i=0; i<this.queue.length; i++) {
			entry = this.queue[i];
			if (entry.task.key === key) {
			    remove.push(entry);
			}
	    }
	    // Remove
	    for (i=0; i<remove.length; i++) {
			entry = remove[i];
			index = this.queue.indexOf(entry);
			if (index > -1) {
			    this.queue.splice(index, 1);
			}
		}
    };


    /*

  		ADVANCE

      The covering time interval is defined by [start,end>
      The covering interval should be advanced so that it always
      contains real-time, e.g., now.

      Advancing the covering interval assumes task queues to be empty.
      Therefore, make sure to pop all task before calling advance.

      Also, the time-sequence of covering intervals should ideally
      lay back-to-back on the time-line. To achive this the end of
      one interval becomes the start of the next. The end of the interval is 
      now + lookahead.
  
      If advance is called before the current interval is expired,
      the current interval is cut short.
  
      If advance is not called for an extended time, the next
      invocation will cause the covering interval to stretch long
      into the past.
    
      If parameter start is supplied, this is used as starting point
      for covering interval.

	*/

	Schedule.prototype.advance = function(now) {
	    if (now < this.timeInterval.low) {
			console.log("Schedule : Advancing backwards " + (now - this.timeInterval.low));
	    }
	    var start = now;
		var end = now + this.options.lookahead;
	    this.queue = []; // drop tasks (time interval cut off)
	    this.timeInterval = new Interval(start, end, false, true);
	    this.posInterval = null; // reset
	};
	
	/* 
		Current schedule is expired (at given time)
	*/	
	Schedule.prototype.isExpired = function(now) {
		return (now > this.timeInterval.high);
	};

	/* 
		delay until the next due task in schedule, or until the
		current time_interval expires 
	*/
	Schedule.prototype.getDelayNextTs = function (ts) {
	    // ts should be fresh timestamp in seconds
	    if (this.queue.length > 0) {
			return Math.max(0.0, this.queue[0].ts - ts);
	    }
	    return Math.max(0.0, this.timeInterval.high - ts);
	};
	
	Schedule.prototype.getNextTaskPoint = function () {
		return (this.queue.length > 0) ? this.queue[0].task.point : null;
	};


	
	/*
	
		SEQUENCER

	*/
	var Sequencer = function (timingObject, _axis) {
		if (!(this instanceof Sequencer)) {
			throw new Error("Contructor function called without new operation");
		}

		// core resources
		this._to = timingObject;
		this._axis = _axis || new Axis();

		// timeout stuff
		this._schedule = null;
		this._timeout = null; // timeout
		this._currentTimeoutPoint = null; // point associated with current timeout

		// ready
		this._ready = new eventify.EventBoolean(false, {init:true});

		// active cues
		this._activeCues = new Map(); // (key -> cue)
		this._activeCuesList = [];

		// event stuff
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define enter event (supporting init-event)
		this.eventifyDefineEvent("remove");

		// wrap prototype handlers and store ref on instance
		this._wrappedOnTimingChange = function (eArg) {
			this._onTimingChange();
			// ready after processing the first onTimingChange
			if (this._ready.value == false) {
				this._ready.value = true;
			}
		};
		this._wrappedOnAxisChange = function (eArg) {
			if (this._ready.value == true) {
				this._onAxisChange(eArg);
			}
		};

		// connect to timing object and axis
		this._to.on("change", this._wrappedOnTimingChange, this);
		this._axis.on("change", this._wrappedOnAxisChange, this);
	};
	eventify.eventifyPrototype(Sequencer.prototype);



	Sequencer.prototype.isReady = function () {
		return this._ready.value;
	};

	// ready promise
	Object.defineProperty(Sequencer.prototype, 'ready', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready.value === true) {
					resolve();
				} else {
					var onReady = function () {
						if (self._ready.value === true) {
							self._ready.off("change", onReady);
							resolve();
						}
					};
					self._ready.on("change", onReady);
				}
			});
		}
	});

	/*
	  	overrides how immediate events are constructed 
	*/
	Sequencer.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			if (this._ready.value == false) {
				return [];
			} else {
				// prepare initial events based on active cues
				const nowVector = this._to.query();
				const directionInt = motionutils.calculateDirection(this._to.vector, nowVector.timestamp);
				const eArgList = [];
				for (let cue of this._activeCues.values()) {
					eArgList.push(makeEArg(nowVector.timestamp, nowVector.position, cue, directionInt, Cause.INIT, VerbType.ENTER));	
				}
				return eArgList;
			}
		}
		return [];
	};

	/* 
	
		ON TIMING OBJECT CHANGE

		Whenever the timingobject position changes abruptly we need to
	        re-evaluate intervals. 

		A) Abrupt changes in position occur 
		   1) after certain timing object changes or 
		   2) when the timing object is initially loaded.

		B) Non-abrupts changes occur when velocity or acceleration is
		changed without immediately affecting the position

		In all cases - the schedule and timeout need to be re-evaluated.

        In case A. 1) the timing object change is possibly late due to network
        latency. To include effects of singulars/intervals from the small "lost"
        time interval, make sure to advance according to the timestamp of the
		timing object vector.  2) is not delayed.
     

        Furthermore in a small time-interval just before timing object updates
        the previous vector incorrectly drove the sequencer instead of the new
        updated vector.  This may have caused the sequencer to falsely
        report some events, and to not report other events.  This time
        interval is (initVector[T], now). For non-singular Intervals this will be
        corrected by the general re-evalution of Intervals. For singular Intervals
        explicit action is required to signal incorrect events. This implementation
        does not support this.

	*/

	Sequencer.prototype._onTimingChange = function (eArg) {
		const nowVector = this._to.query();
		this._reevaluate(nowVector, Cause.TIMINGCHANGE);
	};

	Sequencer.prototype._onAxisChange = function (eventMap) {
		const nowVector = this._to.query();
		this._reevaluate(nowVector, Cause.CUECHANGE, eventMap);
	};

	/*
		Reevaluate active cues on a given point in time
		modifiedCues are given from onAxisChange

		could have used modifiedCues from axis change to change activeCues 
		instead, simply reevaluate active cues with axis. This is likely 
		more effective for large batches.

		Possible optimization:
		Consider the size of eventMap. If the eventMap is quite small,
		it may be quicker adjust activeCues by iterating eventMap and
		considering if each cue interval is covering the timing object position.

		For larger event batch, calls to getCuesByInterval will
		be quicker.

	*/
	Sequencer.prototype._reevaluate = function (nowVector, cause, eventMap) {	   
	    const now = nowVector.timestamp;
	    const pos = nowVector.position;

		/*
			find new active cues
		*/
		const activeCues = new Map(this._axis.getCuesByInterval(new Interval(pos)).map(function(cue) {
			return [cue.key, cue];
		}));
		/*
			find exit cues
			were in old active cues - but not in new
		*/
		let exitCues = map_difference(this._activeCues, activeCues);
		/* 
			find enter cues
			were not in old active cues - but are in new
		*/
		let enterCues = map_difference(activeCues, this._activeCues);
		/* 
			find change cues
			those cues that were modified and also remain within the set of active cues
		*/
		let changeCues = new Map();
		if (cause == Cause.CUECHANGE) {		
			const modifiedCues = new Map([...eventMap].filter(function ([key, eItem]) {
				return eItem.new && eItem.old;
			}).map(function([key, eItem]) {
				return [key, eItem.new];
			}));
			changeCues = map_intersect(modifiedCues, activeCues);
		}

		// update active cues
		this._activeCues = activeCues;

		// make events
		const eList = this._makeChangeEvents(now, nowVector.position, cause, exitCues, enterCues, changeCues);
		this.eventifyTriggerEvents(eList);
		
		/*
			Crazy Corner Case

			If reevaluate is executed with the timing object at position P and there is a cue C which has P as closed endpoint.
			For instance:

			C.interval : [P] | <low,P] | [P, high> 

			Since timing object position P is covered by cue C, an enter event will be generated by the code above.

			However, if the timing object additionally has velocity in the direction away from cue C, a playback exit event will
			immediately be needed. However, this will not be picked up by load/schedule, as this will only consider cue endpoints
			within the next segment on the timeline, which does not include point P, i.e. <P, P+delta] or [P-delta, P>, depending 
			on direction.

			Entering open intervals should be covered by schedule/load on next timeline segment.

			To solve this we will generate the needed playback events here. Active cues will be adjusted as part of that process.

			This issue is not likely to be easily reproducible, because for instance setting the timing object to 
			{position:0, velocity:1} with yield a nowVector sampled a little bit later, which gives a position which is 0+delta, which
			means that cues that are tied to endpoint 0 will be detected by code above. So one really needs to be precise to a large 
			number of decimal places for a cueendpoint to match the position exactly.

	    */
	    const directionInt = motionutils.calculateDirection(nowVector, now);

	    if (isMoving(nowVector)) {
		    const cuepoints = this._axis.getCuePointsByInterval(new Interval(pos));
		    const direction = DirectionType.fromInteger(directionInt);
		    exitCues = new Map();
			for (let cp of cuepoints.values()) {
				if (cp.cue.interval.singular) {
					exitCues.set(cp.cue.key, cp.cue);
				} else {
					// closed interval ?
					const interval = cp.cue.interval;
					const pointType = getPointType(pos, interval);
					let closed = false;
					if (pointType === PointType.LOW && interval.lowInclude) {
						closed = true;
					} else if (pointType === PointType.HIGH && interval.highInclude) {
						closed = true;
					}
					// exiting or entering interval?
					var entering = true;						
					if (pointType === PointType.LOW && direction === DirectionType.BACKWARDS) {
						entering = false;
					} else if (pointType === PointType.HIGH && direction === DirectionType.FORWARDS) {
						entering = false;
					}
					// exiting closed interval
					if (!entering && closed) {
						exitCues.set(cp.cue.key, cp.cue);
					}
				}
			}
			// make events
			const _now = this._to.clock.now();
			const eList = [];
			for (let cue of exitCues.values()) {
				let eArg = makeEArg(_now, pos, cue, directionInt, Cause.PLAYBACK, VerbType.EXIT, now);
				eList.push({type: eArg.type, e:eArg});
				this._activeCues.delete(cue.key);
			}
			this.eventifyTriggerEvents(eList);
	    }

	    // update list version of activeCues
		this._activeCuesList = [...this._activeCues.values()];

	    // clear schedule
		if (this._schedule == undefined) {
			this._schedule = new Schedule(now);
		} else {
			this._schedule.advance(now);
		}

		// kick off main loop
		if (isMoving(nowVector)) {
			this._load(now);
    		this._main(now);
		} else {
			// stop main loop
			this._clearTimeout();
		}
	};


	/*
		Make events triggered by changes, either timing object changes or cue changes
	*/
	Sequencer.prototype._makeChangeEvents = function (now, point, cause, exitCues, enterCues, changeCues) {
		const directionInt = motionutils.calculateDirection(this._to.vector, now);
		let eArgList = [];
		for (let cue of exitCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.EXIT));	
		}
		for (let cue of enterCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.ENTER));	
		}

		for (let cue of changeCues.values()) {
			eArgList.push(makeEArg(now, point, cue, directionInt, cause, VerbType.UPDATE))	
		}
		// make sure events are correctly ordered
		eArgList = this._reorderEventList(eArgList, directionInt);
		return eArgList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
	};


	/*
		Make events during playback, from schedule task list
	*/
	Sequencer.prototype._makePlaybackEvents = function (now, scheduleEntries) {
   		const directionInt = motionutils.calculateDirection(this._to.vector, now);
   		let eArgList = [];
   		let entry, task;
   		let dirty = false;
   		for (let i=0; i<scheduleEntries.length; i++) {
   			entry = scheduleEntries[i];
   			task = entry.task;
   			if (task.cue.interval.singular) {
				// make two events for singular
				eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.ENTER, entry.ts));
				eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, VerbType.EXIT, entry.ts));
				// no need to update active Cues
			} else {
				// figure out if it is enter or exit 
				const directionType = DirectionType.fromInteger(directionInt);
				const pointType = getPointType(task.point, task.cue.interval);
				const pointInt = PointType.toInteger(pointType);
				const verbInt = pointInt * directionInt * -1;
				const verbType = VerbType.fromInteger(verbInt);
		    	eArgList.push(makeEArg(now, task.point, task.cue, directionInt, Cause.PLAYBACK, verbType, entry.ts));
		    	// update activeCues
		    	if (verbType == VerbType.ENTER) {
		    		this._activeCues.set(task.cue.key, task.cue);
		    		dirty = true;
		    	} else if (verbType == VerbType.EXIT) {
		    		this._activeCues.delete(task.cue.key);
		    		dirty = true;
		    	}
			}
   		}
   		if (dirty) {
   			// regenerate list from ActiveCues
			this._activeCuesList = [...this._activeCues.values()];
   		}
		// make sure events are correctly ordered
		eArgList = this._reorderEventList(eArgList, directionInt);		
   		return eArgList.map(function (eArg) {
			return {type: eArg.type, e:eArg};
		});
	};


	/*
        Sequencer core loop, loops via the timeout mechanism as long
        as the timing object is moving.
	*/
	Sequencer.prototype._main = function (now, isTimeout) {
		now = now || this._to.query().timestamp;

    	// empty remaining due tasks, if any
    	let tasks = this._schedule.pop(now);
    	if (tasks.length > 0) {
    		let eList = this._makePlaybackEvents(now, tasks);   
	        this.eventifyTriggerEvents(eList);
    	}

        // advance schedule window if end is reached
        var _isMoving = isMoving(this._to.vector);
        if (_isMoving && this._schedule.isExpired(now)) {		
        	// advance schedule to end of current window
			now = this._schedule.getTimeInterval().high;
            this._schedule.advance(now);
            this._load(now);
            // process tasks again in case some are due immediately
            let tasks = this._schedule.pop(now);
			if (tasks.length > 0) {
				let eList = this._makePlaybackEvents(now, tasks);
		        this.eventifyTriggerEvents(eList);
			}
	    }
        // adjust timeout if needed
        if (_isMoving) {
        	let newTimeoutRequired = (this._timeout === null);
			if (!newTimeoutRequired) {
				// timeout exist - modify?
				// avoid modifying timeout if new timeout is equal to existing timeout
				// i.e. if task point is the same as last time
				var nextTimeoutPoint = this._schedule.getNextTaskPoint();
				if (nextTimeoutPoint === null) {
					// timeout is set for schedule window - no tasks in schedule 
					// do not modify timeout			
				} else {
					// nextTimeoutPoint defined - tasks in the schedule
					if (nextTimeoutPoint === this._currentTimeoutPoint) {
						// do not modify timeout
					} else {
						// modify timeout
						newTimeoutRequired = true
					}
				}
			}
			if (newTimeoutRequired) {
				// clear timeout
				this._clearTimeout();
				// update timeout 
	        	var secAnchor = this._to.clock.now();	
				var secDelay = this._schedule.getDelayNextTs(secAnchor); // seconds
				this._currentTimeoutPoint = nextTimeoutPoint;
				var self = this;
				this._timeout = this._to.clock.setTimeout(function () {
					self._clearTimeout();
					self._main(undefined, true);
				}, secDelay, {anchor: secAnchor, early: 0.005});
			}
	    }
	};


	Sequencer.prototype._clearTimeout = function () {
    	this._currentTimeoutPoint = null;
    	if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
    	}
	};

	/* 
	   LOAD

       Sequencer loads a new batch of points from axis into
       the schedule

       If given_points is specified, this implies that the
       points to load are known in advance. This is the case when
       axis is being updated dynamically during execution. If
       points are not known the load function fetches points from
       the axis by means of the time cover of the schedule.

	   load only makes sense when timing object is moving
	*/

	Sequencer.prototype._load = function (now, givenPoints) {
	   
	    /* 
	       MOVING
	       Load events from time interval
	    */
	    var timeInterval = this._schedule.getTimeInterval();
	    var tStart = timeInterval.low;
	    var tEnd = timeInterval.high;
	    var tDelta = timeInterval.length;
	    // range
		var range = this._to.range;
	    var vectorStart = motionutils.calculateVector(this._to.vector, tStart);
	    var points = givenPoints;
	
	    // Calculate points if not provided
	    if (!points) {

			// 1) find the interval covered by the movement of timing object during the time delta
			var posRange = motionutils.calculateInterval(vectorStart, tDelta);
			var pStart = Math.round10(Math.max(posRange[0], range[0]), -10);
			var pEnd = Math.round10(Math.min(posRange[1], range[1]), -10);

			/*
				posInterval always <,]
			*/
			const posInterval = new Interval(pStart, pEnd, false, true);
			this._schedule.setPosInterval(posInterval);

			// 2) find all points in this interval
			points = this._axis.getCuePointsByInterval(posInterval);
	    }
	    
	    // create ordered list of all events for time interval t_delta 
	    var eventList = motionutils.calculateSolutionsInInterval(vectorStart, tDelta, points);
	    if (points.length !== eventList.length) {
	    	console.log("warning : mismatch points and events", points.length, eventList.length);
	    }

	    /* 
	       SUBTLE 1 : adjust for range restrictions within
	       time-interval tasks with larger delta will not be
	       pushed to schedule it is not necessary to truncate the
	       time interval of schedule similarly - just drop all
	       events after prospective range violations. <rDelta> is
	       time to (first) range violation
	    */	    
	    var rDelta = motionutils.calculateDelta(vectorStart, range)[0];
	  
 	    /* 
	       SUBTLE 2: avoid tasks exactly at start of time-interval
	       assume that this point should already be processed by the
	       previous covering interval.
	    */
	    
	    // filter and push events on sched
	    eventList.forEach(function (e)  {

	    	var d = e[0];
			var task = e[1];
			const pointType = getPointType(task.point, task.cue.interval);
			var push = true;

			/*
				events from within the time interval may still be too late,
				if they are before now <now>.
				this may happen when new items are added dynamically
				even though we drop them here, they already had their
				effect in calculation of enter/exit events.
			*/
			if (tStart + d < now) {
				push = false;
			}
						
			/* 
			   drop events exactly at the start of the time covering
			   interval.
			   likely obsolete since we are fetching points [low, high] 
			*/
			if (d === 0) {
				console.log("drop - exactly at start of time covering");
			    push = false; 
			}
			/* 
			   drop all events scheduled after (in time) range
			   violation should occur
			*/
			if (d > rDelta) {
				console.log("drop - events after range violations");
				push = false;  
			}
			/*
			  event scheduled exactly at range point.
			  - interval : 
			  Exiting/entering a interval should not happen at range point - drop
			*/
			if (d === rDelta) {
				console.log("drop - events exactly at range point")
			    push = false;
			}
			
			/* 
			   check if we are touching an interval without
			   entering or exiting. Note that direction will
			   not be zero at this point, because direction
			   includes acceleration, which is not zero in
			   this case.
			   drop all interval events that have zero velocity
			   at the time it is supposed to fire
			*/
			if (pointType === PointType.LOW || pointType === PointType.HIGH) {
			    var v = motionutils.calculateVector(this._to.vector, tStart + d);
			    if (v.velocity === 0){
			    	console.log("drop - touch endpoint during acceleration");
					push = false;
			    }
			}
			// push
			if (push) {	   
			    this._schedule.push(now, tStart + d, task);
			} 
	    }, this); 
	};


	/*
		Event list is sorted by time. 
		There can be multiple events on the same time.
		Events with the same point (thus time) need to be sorted according to the following precedence
		a. exit interval > (interval does not include exit-point)
		x. enter interval [ (interval includes enter-point)
		b. enter singular
		c. exit singular			
		y. exit intervals ] (interval includes exit-point)
		d. enter intervals < (interval does not include enter-point)
	*/
	Sequencer.prototype._reorderEventList = function (eArgList, directionInt) {
		if (eArgList.length < 2) return eArgList;
		// stack events per point
		var point, dueTs, newList = [];
		var s = {"a": [], "x": [], "b": [], "c": [], "y": [], "d": []};
		eArgList.sort(function (a, b) {
			return a.interval.low - b.interval.low;
		}).forEach(function(eArg) {
			// new point - pop from stack
			if (eArg.point !== point || eArg.dueTs !== dueTs) {
				// pop last from stack
				if (directionInt >= 0) {
					newList = newList.concat(s["a"], s["x"], s["b"], s["c"], s["y"], s["d"]);
				} else {
					newList = newList.concat(s["d"], s["y"], s["c"], s["b"], s["x"], s["a"]);
				}
				s = {"a": [], "x": [], "b": [], "c": [], "y": [], "d": []};
				point = eArg.point;
				dueTs = eArg.dueTs;
			}
			// push on stack
			if (eArg.pointType === PointType.SINGULAR) {
				if (eArg.type === VerbType.ENTER) {
					// enter singular
					s["b"].push(eArg);
				} else {
					// exit singular
					s["c"].push(eArg);
				}
			} else {
				/* 
					Interval
					special ordering when we enter or exit interval
					through endpoint (low or high) and this endpoint is CLOSED ] as opposed to OPEN >
				*/
				var closed = false;
				if ((eArg.pointType === PointType.LOW) && eArg.interval.lowInclude) {
					closed = true;
				} else if ((eArg.pointType === PointType.HIGH) && eArg.interval.highInclude) {
					closed = true;
				}
				if (eArg.type === VerbType.ENTER) {
					// enter interval
					if (closed) s["x"].push(eArg);
					else s["d"].push(eArg);
				} else {
					// exit interval
					if (closed) s["y"].push(eArg);
					else s["a"].push(eArg);
				}
			}
		}, this);

		// pop last from stack
		if (directionInt >= 0) {
			return newList.concat(s["a"], s["x"], s["b"], s["c"], s["y"], s["d"]);
		} else {
			return newList.concat(s["d"], s["y"], s["c"], s["b"], s["x"], s["a"]);
		}
	};

	
	/*
		Active Cues API
	*/

	// return true if cue of given key is currently active
	Sequencer.prototype.isActive = function (key) {
	    return (this._activeCues.has(key));
	};

	// Get keys of active cues
	Sequencer.prototype.getActiveKeys = function () {
		return [...this._activeCues.keys()];
	};

	Sequencer.prototype.getActiveCues = function () {
		return this._activeCuesList;
	};

	/*
		Export Axis API

		Alternative - expose Axis object itself with .getAxis()
	*/

	Sequencer.prototype.update = function (cues) {
		return this._axis.update(cues);
	};

	Sequencer.prototype.addCue = function (key, interval, data) {
		return this._axis.addCue(key, interval, data)
	};

	Sequencer.prototype.removeCue = function (key) {
		return this._axis.removeCue(key);
	};

	// true if cues exists with given key
	Sequencer.prototype.hasCue = function (key) {
		return this._axis.has(key);
	};

	// get specific cue {key: key, interval:interva} given key
	Sequencer.prototype.getCue = function (key) {
		return this._axis.get(key);
	};

	// get all keys
	Sequencer.prototype.keys = function () {
		return this._axis.keys();
	};
	
	// get all cues
	Sequencer.prototype.getCues = function () {
		return this._axis.cues();	
	};

	Sequencer.prototype.getCuesByInterval = function (interval, semantic) {
		return this._axis.getCuesByInterval(interval, semantic);
	};

	Sequencer.prototype.removeCuesByInterval = function (interval, semantic) {
		return this._axis.removeCuesByInterval(interval, semantic);
	};


	// shutdown
	Sequencer.prototype.close = function () {
	    this._to.off("change", this._wrappedOnTimingChange, this);
	    this._axis.off("change", this._wrappedOnAxisChange, this);
	    if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;		
	    }
	};

    /*
		utility - print event
    */
	Sequencer.prototype.eventToString = function (e) {
		var s = "[" +  e.point.toFixed(2) + "]";
        s += " " + e.key;
        s += " " + e.interval.toString();
        s += " " + e.type;
        var verb = "none";
        if (e.enter) verb = "enter";
        else if (e.exit) verb = "exit";
        s += " (" + e.cause + "," + verb + ")";
        s += " " + e.directionType;
        s += " " + e.pointType;
        s += " delay:" + e.delay.toFixed(4);
        if (e.data) s += " " + JSON.stringify(e.data);
        return s;
	};;

	return Sequencer;
});




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


/* 
	WINDOW SEQUENCER

	- a collection of Intervals are defined on an axis
	- a searchInterval is defined by two endpoints.
	- we are interested in all Intervals on the axis that are partially/fully covered by searchInterval
	- we then want to move the searchInterval along the axis
	- trigger onenter/onexit events as Intervals go from being not covered to partialy/fully covered and vica versa
	- define searchInterval endpoints by two motions that may or may not be dependent
	- use pointsequencer on each motion to generate events.	



	EVENT PROCESSING FROM TIMING OBJECTS AND SEQUENCERS
	
	Timing Object events
	
    - Jumps (setting the position on the timing object) may cause some
	  intervals to be covered or cease to be covered.
	  Some of these intervals may remain active of inactive with respect to the point-
		  sequencer, implying that there will be no events from the sequencer

	- Velocity adjustments (without position changs) can not cause changes to the WindowSequencer
	without also causing changes to the sequencers
	
	Sequencer events
	
	- required during playback to trigger timed refresh
	- sequencer provides events on both jumps and non-jumps

	There is possible event redundancy for events caused by jumps and non-jumps of the timing object.
	I.e. we receive an event from both timing object as well as
	events from the sequencer that were caused by the same event from the timing object. 

	Fortunately, the overhead of this event duplication is small, 
	since it only involves an extra reevaluate(), and if we are lucky the to events may be collapsed
	with the request_reevaluate mechanism. If not, the second invokation will cause some redundant processing 
	but will ultimately have no effect.'


	Possible optimization 1)
	ignore non-jumps from timing object and depend on the sequencer for this
	- requires cashing the vector from the timing object, so that the new vector can be compared
	to the old one. This is necessary for discriminating between jumps and non-jumps.
	- not implemented

	Possible optimization 2)
	ignore sequencer events for jumps.
	- difficult because the sequencer at present does not distinguish event causes 
	{jump|non-jump|playback}
	- not implemented

	Possible optimization 3)
	It is also possible to filter out updates from axis that are not relevant, in order to not invoke 
	re-evaluate when it is not needed.
	- easy, but basically just saves a lookup on the axis, and only if all updates are non relevant.
	- not implemented
*/

define('sequencing/windowsequencer',['require','exports','module','util/eventify','util/motionutils','util/interval','./axis','./sequencer'],function(require, exports, module) {

	'use strict';

	const eventify = require('util/eventify');
	const motionutils = require('util/motionutils');
	const Interval = require('util/interval');
	const Axis = require('./axis');
	const Sequencer = require('./sequencer');

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


    // Event cause
    const Cause = Object.freeze({
    	INIT: "init",
    	TIMINGCHANGE: "timing-change",
    	CUECHANGE: "cue-change",
    	PLAYBACK: "playback"
    });


	var WindowSequencer = function (timingObjectA, timingObjectB, _axis) {
		if (!(this instanceof WindowSequencer)) {
			throw new Error("Contructor function called without new operation");
		}
		this._axis = _axis || new Axis();
		this._toA = timingObjectA;
		this._toB = timingObjectB;

		this._seqA = new Sequencer(this._toA, this._axis);
		this._seqB = new Sequencer(this._toB, this._axis);

		// ready
		this._ready = new eventify.EventBoolean(false, {init:true});

		// true if re_evalute has been requested but not performed yet
		this._pending_reevaluate = false;

		// active cues
		this._activeCues = new Map(); // key -> cue
		this._activeCuesList = [];

		// Define Events API
		// event type "events" defined by default
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("remove");


		var self = this;

		// Store references to handler on instance
		this._onAxisChange = function (eventMap) {
			// console.log("on Axis Change");
			self._reevaluate(eventMap);
		};
		this._onToAChange = function () {
			// console.log("on ToA Change");
			self._request_reevaluate();
		};
		this._onToBChange = function () {
			// console.log("on ToB Change");
			self._request_reevaluate();
		};
		this._onSeqAChange = function (e) {
			// console.log("on SeqA Change");
			self._request_reevaluate();
		};
		this._onSeqBChange = function (e) {
			// console.log("on SeqB Change");
			self._request_reevaluate();
		};
		this._toA.on("change", this._onToAChange, this);
		this._toB.on("change", this._onToBChange, this);
		this._seqA.on("events", this._onSeqAChange, this);
		this._seqB.on("events", this._onSeqBChange, this);

		
		Promise.all([this._seqA.ready, this._seqB.ready]).then(function (values) {
			// both sequencers are ready
			// by implication - both timing objects are ready too
			self._axis.on("change", self._onAxisChange, self);
			self._ready.value = true;
			self._request_reevaluate();
		});
		
	};
	eventify.eventifyPrototype(WindowSequencer.prototype);


	/*
		READY STATE

		The interval sequencer is ready when both timing objects are ready
	*/
	WindowSequencer.prototype.isReady = function () {
		return (this._ready.value === true);
	};

	// ready promise
	Object.defineProperty(WindowSequencer.prototype, 'ready', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready.value === true) {
					resolve();
				} else {
					var onReady = function () {
						if (self._ready.value === true) {
							self._ready.off("change", onReady);
							resolve();
						}
					};
					self._ready.on("change", onReady);
				}
			});
		}
	});


	/*

		EVENT HANDLERS

	*/

	/*
	  	overrides how immediate events are constructed
	*/
	WindowSequencer.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			// make event items from active keys
			let eArgList = []
			for (let cue of this._activeCues.values()) {
				eArgList.push({
					cue: cue,
	    			type : "change",
	    			cause: Cause.INIT,
	    			enter : true,
	    			exit : false
				});
			}
			return eArgList;
		}
		return [];
	};

	/*
		figure out the current active interval
	*/
	WindowSequencer.prototype._getActiveInterval = function () {
		var vectorA = this._toA.query();
		var vectorB = this._toB.query();
		var start = Math.min(vectorA.position, vectorB.position);
		var end = Math.max(vectorA.position, vectorB.position);
		return new Interval(start, end, true, true);
	};


	/* 
		Request reevaluate 
		Buffering and collapsing requests to reevaluate
		noop if reevaluate has already been requested, but not performed
		else - append reevaluate to the task queue
	*/
	WindowSequencer.prototype._request_reevaluate = function () {
		if (this._pending_reevaluate == false) {
			this._pending_reevaluate = true;
			var self = this;
			setTimeout(function() {
				self._pending_reevaluate = false;
				self._reevaluate()
			}, 0)
		}
	};

	/*
		RE-EVALUATE

		Figure out what kind of events need to be triggered (if any)
		in order to bring the WindowSequencer to the correct state.
	*/

	WindowSequencer.prototype._reevaluate = function (eventMap) {
		if (this._ready.value === false) {
			return [];
		}

		const activeInterval = this._getActiveInterval();

		/*
			find new active cues
		*/
		const activeCues = new Map(this._axis.getCuesByInterval(activeInterval).map(function(cue) {
			return [cue.key, cue];
		}));

		/*
			find exit cues
			were in old active cues - but not in new
		*/
		let exitCues = map_difference(this._activeCues, activeCues);
		/* 
			find enter cues
			were not in old active cues - but are in new
		*/
		let enterCues = map_difference(activeCues, this._activeCues);

		/* 
			find change cues
			those cues that were modified and also remain within the set of active cues
		*/
		let changeCues = new Map();
		if (eventMap) {
			const modifiedCues = new Map([...eventMap].filter(function ([key, eItem]) {
				return eItem.new && eItem.old;
			}).map(function([key, eItem]) {
				return [key, eItem.new];
			}));
			changeCues = map_intersect(modifiedCues, activeCues);
		}

		// update active cues
		this._activeCues = activeCues; 
		this._activeCuesList = [...this._activeCues.values()];

	    // make event items from enter/exit keys
	    const eList = [];
	    const cause = (eventMap) ? Cause.CUECHANGE : Cause.PLAYBACK;
		for (let cue of exitCues.values()) {
			eList.push({
				type: "remove", 
	    		e: {
	    			key: cue.key,
	    			interval: cue.interval,
	    			data: cue.data,
	    			type : "remove",
	    			cause : cause,
	    			enter: false,
	    			exit : true
	    		}
			});	
		}
		for (let cue of enterCues.values()) {
			eList.push({
	    		type: "change", 
	    		e: {
	    			key: cue.key,
	    			interval: cue.interval,
	    			data: cue.data,
	    			type: "change",
	    			cause : cause,
	    			enter : true,
	    			exit : false
	    		}
	    	});
		}
		for (let cue of changeCues.values()) {
			eList.push({
	    		type: "change", 
	    		e: {
	    			cue: cue,
	    			key: cue.key,
	    			interval: cue.interval,
	    			data: cue.data,
	    			type: "change",
	    			cause : cause,
	    			enter : false,
	    			exit : false
	    		}
	    	});
		}

	    this.eventifyTriggerEvents(eList);	  
	};

	/*
		Active Cues API
	*/

	// return true if cue of given key is currently active
	WindowSequencer.prototype.isActive = function (key) {
	    return this._activeCues.has(key);
	};

	// Get keys of active cues
	WindowSequencer.prototype.getActiveKeys = function () {
		return [...this._activeCues.keys()];
	};

	WindowSequencer.prototype.getActiveCues = function () {
		return this._activeCuesList;
	};

	/*
		Export Axis API

		Alternative - expose Axis object itself with .getAxis()
	*/

	WindowSequencer.prototype.update = function (cues) {
		return this._axis.update(cues);
	};

	WindowSequencer.prototype.addCue = function (key, interval, data) {
		return this._axis.addCue(key, interval, data)
	};

	WindowSequencer.prototype.removeCue = function (key) {
		return this._axis.removeCue(key);
	};

	// true if cues exists with given key
	WindowSequencer.prototype.hasCue = function (key) {
		return this._axis.has(key);
	};

	// get specific cue {key: key, interval:interva} given key
	WindowSequencer.prototype.getCue = function (key) {
		return this._axis.get(key);
	};

	// get all keys
	WindowSequencer.prototype.keys = function () {
		return this._axis.keys();
	};
	
	// get all cues
	WindowSequencer.prototype.getCues = function () {
		return this._axis.cues();	
	};

	WindowSequencer.prototype.getCuesByInterval = function (interval) {
		return this._axis.getCuesByInterval(interval);
	};

	WindowSequencer.prototype.removeCuesByInterval = function (interval) {
		return this._axis.removeCuesByInterval(interval);
	};

	// shutdown
	WindowSequencer.prototype.close = function () {
		this._axis.off("change", this._onAxisChange);
		this._toA.off("change", this._onToAChange);
		this._toB.off("change", this._onToBChange);
		this._seqA.off("events", this._onSeqAChange);
		this._seqB.off("events", this._onSeqBChange);
		this._seqA.close();
		this._seqB.close();
	};

	return WindowSequencer;
});
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


define('util/timeoututils',[],function () {

	'use strict';

	/*
	  TIMEOUT

	  Wraps setTimeout() to implement improved version
	  - guarantee that timeout does not wake up too early
	  - offers precise timeout by "busy"-looping just before timeout 
	  - wraps a single timeout
	  - clock operates in seconds
	  - parameters expected in seconds - breaking conformance with setTimeout
	  - wakes up 3 seconds before on long timeouts to readjust
	*/

	var Timeout = function (clock, callback, delay, options) {	
		// clock
		this._clock = clock; // seconds
		var now = this._clock.now(); // seconds
		// timeout
		this._tid = null;
		this._callback = callback;
		this._delay_counter = 0;
		this._options = options || {};

		// options
		this._options.anchor = this._options.anchor || now; // seconds
		this._options.early = Math.abs(this._options.early) || 0; // seconds
		this._target = this._options.anchor + delay; // seconds

		// Initialise
		var self = this;
		window.addEventListener("message", this, true); // this.handleEvent
		var time_left = this._target - this._clock.now(); // seconds
		if (time_left > 10) {
			// long timeout > 10s - wakeup 3 seconds earlier to readdjust
			this._tid = setTimeout(function () {self._ontimeout();}, time_left - 3000);
		} else {
			// wake up just before
			this._tid = setTimeout(function () {self._ontimeout();}, (time_left - self._options.early)*1000);
		}
	};

	Object.defineProperty(Timeout.prototype, 'target', {
		get : function () { 
			return this._target;
		}
	});

	// Internal function
	Timeout.prototype._ontimeout = function () {
	    if (this._tid !== null) {
	    	var time_left = this._target - this._clock.now(); // seconds
			if (time_left <= 0) {
			    // callback due
			    this.cancel();
			    this._callback();
			} else if (time_left > this._options.early) {
				// wakeup before target - options early sleep more
				var self = this;
				this._tid = setTimeout(function () {self._ontimeout();}, (time_left - this._options.early)*1000);
			} else {
				// wake up just before (options early) - event loop
			    this._smalldelay();
			}
	    }
	};
	
	// Internal function - handler for small delays
	Timeout.prototype.handleEvent = function (event) {
	    if (event.source === window && event.data.indexOf("smalldelaymsg_") === 0) {
			event.stopPropagation();
			// ignore if timeout has been canceled
			var the_tid = parseInt(event.data.split("_")[1]);
			if (this._tid !== null && this._tid === the_tid) {
			    this._ontimeout();
			}
	    }
	};

	Timeout.prototype._smalldelay = function () {
	    this._delay_counter ++;
	    var self = this;
	    window.postMessage("smalldelaymsg_" + self._tid, "*");
	};

	Timeout.prototype.cancel = function () {
	    if (this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
			var self = this;
			window.removeEventListener("message", this, true);
	    }
	};
	
	// return module object
	return {
		setTimeout: function (clock, callback, delay, options) {
			return new Timeout(clock, callback, delay, options);
		}
	};
});


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


/*
	MASTER CLOCK


	MasterClock is the reference clock used by TimingObjects.
	
	It is implemented using performance.now,
	but is skewed and rate-adjusted relative to this local clock.

	This allows it to be used as a master clock in a distributed system,
	where synchronization is generally relative to some other clock than the local clock. 

	The master clock may need to be adjusted in time, for instance as a response to 
	varying estimation of clock skew or drift. The master clock supports an adjust primitive for this purpose.
 
	What policy is used for adjusting the master clock may depend on the circumstances
	and is out of scope for the implementation of the MasterClock.
	This policy is implemented by the timing object. This policy may or may not
	provide monotonicity.

	A change event is emitted every time the masterclock is adjusted.
	
	Vector values define 
	- position : absolute value of the clock in seconds
	- velocity : how many seconds added per second (1.0 exactly - or very close)
	- timestamp : timstamp from local system clock (performance) in seconds. Defines point in time where position and velocity are valid.

	If initial vector is not provided, default value is 
	{position: now, velocity: 1.0, timestamp: now};
	implying that master clock is equal to local clock.
*/

define('util/masterclock',['./eventify', './timeoututils'], function (eventify, timeoututils) {

	'use strict';

	// Need a polyfill for performance,now as Safari on ios doesn't have it...
	(function(){
	    if ("performance" in window === false) {
	        window.performance = {};
	        window.performance.offset = new Date().getTime();
	    }
	    if ("now" in window.performance === false){
	      window.performance.now = function now(){
	        return new Date().getTime() - window.performance.offset;
	      };
	    }
 	})();

	// local clock in seconds
	var localClock = {
		now : function () {return performance.now()/1000.0;}
	}; 

	var calculateVector = function (vector, tsSec) {
		if (tsSec === undefined) tsSec = localClock.now();
		var deltaSec = tsSec - vector.timestamp;	
		return {
			position : vector.position + vector.velocity*deltaSec,
			velocity : vector.velocity, 
			timestamp : tsSec
		};
	};

	var MasterClock = function (options) {
		var now = localClock.now();
		options = options || {};
		this._vector  = {position: now, velocity: 1.0, timestamp: now};	
		// event support
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change"); // define change event (no init-event)
		// adjust
		this.adjust(options);
	};
	eventify.eventifyPrototype(MasterClock.prototype);


	/*
		ADJUST
		- could also accept timestamp for velocity if needed?
		- given skew is relative to local clock 
		- given rate is relative to local clock
	*/
	MasterClock.prototype.adjust = function (options) {
		options = options || {};
		var now = localClock.now();
		var nowVector = this.query(now);
		if (options.skew === undefined && options.rate === undefined) {
			return;
		}
		this._vector = {
			position : (options.skew !== undefined) ? now + options.skew : nowVector.position,
			velocity : (options.rate !== undefined) ? options.rate : nowVector.velocity,
			timestamp : nowVector.timestamp
		}
		this.eventifyTriggerEvent("change");
	};

	/*
		NOW
		- calculates the value of the clock right now
		- shorthand for query
	*/
	MasterClock.prototype.now = function () {
		return calculateVector(this._vector, localClock.now()).position;
	};

	/* 
		QUERY 
		- calculates the state of the clock right now
		- result vector includes position and velocity		
	*/
	MasterClock.prototype.query = function (now) {
		return calculateVector(this._vector, now);
	};

	/*
		Timeout support
	*/
	MasterClock.prototype.setTimeout = function (callback, delay, options) {
		return timeoututils.setTimeout(this, callback, delay, options);
	};

	return MasterClock;
});
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



define('timingobject/timingobject',['../util/eventify', '../util/motionutils', '../util/masterclock'], function (eventify, motionutils, MasterClock) {

	'use strict';

	// Utility inheritance function.
	var inherit = function (Child, Parent) {
		var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
		F.prototype = Parent.prototype;
		Child.prototype = new F(); // child gets parents prototypes via F
		Child.uber = Parent.prototype; // reference in parent to superclass
		Child.prototype.constructor = Child; // resetting constructor pointer 
	};


	// Polyfill for performance.now as Safari on ios doesn't have it...
	(function(){
	    if ("performance" in window === false) {
	        window.performance = {};
	        window.performance.offset = new Date().getTime();
	    }
	    if ("now" in window.performance === false){
	      window.performance.now = function now(){
	        return new Date().getTime() - window.performance.offset;
	      };
	    }
 	})();

	
	/*
		TIMING BASE

		abstract base class for objects that may be used as timingsrc

		essential internal state
		- range, vector
	
		external methods
		query, update

		events
		on/off "change", "timeupdate"
		
		internal methods for range timeouts
		
		defines internal processing steps
		- preProcess(vector) <- from external timingobject
			- vector = onChange(vector)
			- process(vector) <- from timeout or preProcess
		- process (vector) 
			- set internal vector
			- postProcess(vector)
			- renew range timeout
		- postprocess (vector)
			- emit change event and timeupdate event
			- turn periodic timeupdate on or off
	
		individual steps in this structure may be specialized
		by subclasses (i.e. timing converters)
	*/


	var TimingBase = function (options) {

		this._options = options || {};

		// cached vector
		this._vector = {
			position : undefined,
			velocity : undefined,
			acceleration : undefined,
			timestamp : undefined
		};
		
		// cached range
		this._range = [undefined,undefined];

		// readiness
		this._ready = new eventify.EventBoolean(false, {init:true});
		
		// exported events
		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true}); // define change event (supporting init-event)
		this.eventifyDefineEvent("timeupdate", {init:true}); // define timeupdate event (supporting init-event)

		// timeout support
		this._timeout = null; // timeoutid for range violation etc.
		this._tid = null; // timeoutid for timeupdate
		if (!this._options.hasOwnProperty("timeout")) {
			// range timeouts off by default
			this._options.timeout = false;
		}
	};
	eventify.eventifyPrototype(TimingBase.prototype);


	/*

		EVENTS

	*/

	/*
	  	overrides how immediate events are constructed
	  	specific to eventutils
	  	- overrides to add support for timeupdate events
	*/
	TimingBase.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return (this._ready.value === true) ? [undefined] : []; 
		} else if (type === "timeupdate") {
			return (this._ready.value === true) ? [undefined] : []; 
		} 
		return [];
	};


	/*

		API

	*/

	// version
	Object.defineProperty(TimingBase.prototype, 'version', {
		get : function () { return this._version; }
	});

	// ready or not
	TimingBase.prototype.isReady = function () {
		return this._ready.value;
	};

	// ready promise
	Object.defineProperty(TimingBase.prototype, 'ready', {
		get : function () {
			var self = this;
			return new Promise (function (resolve, reject) {
				if (self._ready.value === true) {
					resolve();
				} else {
					var onReady = function () {
						if (self._ready.value === true) {
							self._ready.off("change", onReady);
							resolve();
						}
					};
					self._ready.on("change", onReady);
				}
			});
		}
	});

	// range
	
	Object.defineProperty(TimingBase.prototype, 'range', {
		get : function () { 
			// copy range
			return [this._range[0], this._range[1]]; 
		}
	});
	

	// internal vector
	Object.defineProperty(TimingBase.prototype, 'vector', {
		get : function () {
			// copy vector
			return {
				position : this._vector.position,
				velocity : this._vector.velocity,
				acceleration : this._vector.acceleration,
				timestamp : this._vector.timestamp
			};
		}
	});

	// internal clock
	Object.defineProperty(TimingBase.prototype, 'clock', {
		get : function () {	throw new Error ("not implemented") }	
	});

	// query
	TimingBase.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};

	// update - to be ovverridden
	TimingBase.prototype.update = function (vector) {
		throw new Error ("not implemented");
	};

	TimingBase.prototype.checkUpdateVector = function(vector) {
		if (vector == undefined) {
			throw new Error ("drop update, illegal updatevector");
		}

		// todo - check that vector properties are numbers
		var pos = vector.position;
		var vel = vector.velocity;
		var acc = vector.acceleration;

		if (pos == undefined && vel == undefined && acc == undefined) {
			throw new Error ("drop update, noop");
		}

		// default values
		var p = 0, v = 0, a = 0;
		var now = vector.timestamp || this.clock.now();
		if (this.isReady()) {
			var nowVector = motionutils.calculateVector(this._vector, now);
			nowVector = motionutils.checkRange(nowVector, this._range);
			p = nowVector.position;
			v = nowVector.velocity;
			a = nowVector.acceleration;
		} 

		pos = (pos != undefined) ? pos : p;
		vel = (vel != undefined) ? vel : v;
		acc = (acc != undefined) ? acc : a;
		return {
			position : pos,
			velocity : vel,
			acceleration : acc,
			timestamp : now
		};
	} 


	// shorthand accessors
	Object.defineProperty(TimingBase.prototype, 'pos', {
		get : function () {
			return this.query().position;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'vel', {
		get : function () {
			return this.query().velocity;
		}
	});

	Object.defineProperty(TimingBase.prototype, 'acc', {
		get : function () {
			return this.query().acceleration;
		}
	});


	/*

		INTERNAL METHODS

	*/


	/*
		do not override
		Handle incoming vector, from "change" from external object
		or from an internal timeout.
		
		onVectorChange is invoked allowing subclasses to specify transformation
		on the incoming vector before processing.
	*/
	TimingBase.prototype._preProcess = function (vector) {
		vector = this.onVectorChange(vector);
		this._process(vector);
	};


	// may be overridden by subclsaa
	TimingBase.prototype.onRangeChange = function (range) {
		return range;
	};

	/*
		specify transformation
		on the incoming vector before processing.
		useful for Converters that do mathematical transformations,
		or as a way to enforse range restrictions.
		invoming vectors from external change events or internal
		timeout events

		returning null stops further processing, exept renewtimeout 
	*/
	TimingBase.prototype.onVectorChange = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};

	/*
		core processing step after change event or timeout
		assignes the internal vector
	*/
	TimingBase.prototype._process = function (vector) {
		if (vector !== null) {
			var old_vector = this._vector;
			// update internal vector
			this._vector = vector;
			// trigger events
			this._ready.value = true;
			this._postProcess(this._vector);
		}
		// renew timeout
		this._renewTimeout();
	};

	/*
		process a new vector applied in order to trigger events
		overriding this is only necessary if external change events 
		need to be suppressed,
	*/
	TimingBase.prototype._postProcess = function (vector) {
		// trigger change events
		this.eventifyTriggerEvent("change");
		// trigger timeupdate events
		this.eventifyTriggerEvent("timeupdate");
		var moving = vector.velocity !== 0.0 || vector.acceleration !== 0.0;
		if (moving && this._tid === null) {
			var self = this;
			this._tid = setInterval(function () {
				self.eventifyTriggerEvent("timeupdate");
			}, 200);
		} else if (!moving && this._tid !== null) {
			clearTimeout(this._tid);
			this._tid = null;
		}
	};


	/*

		TIMEOUTS
	
	*/

	/*
		do not override
		renew timeout is called during evenry processing step
		in order to recalculate timeouts.
		the calculation may be specialized in
		_calculateTimeoutVector
	*/
	TimingBase.prototype._renewTimeout = function () {
		if (this._options.timeout === true) {
			this._clearTimeout();
			var vector = this._calculateTimeoutVector();
			if (vector === null) {return;}
			var now = this.clock.now();
	 		var secDelay = vector.timestamp - now;
	 		var self = this;
	 		this._timeout = this.clock.setTimeout(function () {
				self._process(self.onTimeout(vector));
	      	}, secDelay, {anchor: now, early: 0.005}); 
		}
	};

	/*
		to be overridden
		must be implemented by subclass if range timeouts are required
		calculate a vector that will be delivered to _process().
		the timestamp in the vector determines when it is delivered.
	*/
	TimingBase.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this._range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		if (deltaSec === Infinity) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	/*
		do not override
		internal utility function for clearing vector timeout
	*/
	TimingBase.prototype._clearTimeout = function () {
		if (this._timeout !== null) {
			this._timeout.cancel();
			this._timeout = null;
		}
	};

	/*
		to be overridden
		subclass may implement transformation on timeout vector
		before it is given to process.
		returning null stops further processing, except renewtimeout 
	*/
	TimingBase.prototype.onTimeout = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};




	/*
		INTERNAL PROVIDER
	
		Timing provider internal to the browser context

		Used by timing objects as timingsrc if no timingsrc is specified.
	*/

	var InternalProvider = function (options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this, options);

		// initialise internal state
		this._clock = new MasterClock({skew:0});
		// range
		this._range = this._options.range || [-Infinity, Infinity];
		// vector
		var vector = this._options.vector || {
			position : 0,
			velocity : 0,
			acceleration : 0
		};
		this.update(vector);
	};
	inherit(InternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(InternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// update
	InternalProvider.prototype.update = function (vector) {
		var newVector = this.checkUpdateVector(vector);
		this._preProcess(newVector);
		return newVector;
	};
	

	/*
		EXTERNAL PROVIDER

		External Provider bridges the gap between the PROVIDER API (implemented by external timing providers)
		and the TIMINGSRC API

		Objects implementing the TIMINGSRC API may be used as timingsrc (parent) for another timing object.

		- wraps a timing provider external 
		- handles some complexity that arises due to the very simple API of providers
		- implements a clock for the provider
	*/


	// Need a polyfill for performance,now as Safari on ios doesn't have it...

	// local clock in seconds
	var local_clock = {
		now : function () {return performance.now()/1000.0;}
	}; 

	var ExternalProvider = function (provider, options) {
		options = options || {};
		options.timeout = true;
		TimingBase.call(this);

		this._provider = provider;
		
		this._provider_clock; // provider clock (may fluctuate based on live skew estimates)
		/* 
			local clock
			provider clock normalised to values of performance now
			normalisation based on first skew measurement, so 
		*/
		this._clock; 


		// register event handlers
		var self = this;
		this._provider.on("vectorchange", function () {self._onVectorChange();});
		this._provider.on("skewchange", function () {self._onSkewChange();});

		// check if provider is ready
		if (this._provider.skew != undefined) {
			var self = this;
			Promise.resolve(function () {
				self._onSkewChange();
			});
		}
	};
	inherit(ExternalProvider, TimingBase);

	// internal clock
	Object.defineProperty(ExternalProvider.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});

	// internal provider object
	Object.defineProperty(ExternalProvider.prototype, 'provider', {
		get : function () {	return this._provider; }	
	});

	ExternalProvider.prototype._onSkewChange = function () {
		if (!this._clock) {
			this._provider_clock = new MasterClock({skew: this._provider.skew});
			this._clock = new MasterClock({skew:0});
		} else {			
			this._provider_clock.adjust({skew: this._provider.skew});
			// provider clock adjusted with new skew - correct local clock similarly
			// current_skew = clock_provider - clock_local
			var current_skew = this._provider_clock.now() - this._clock.now();
			// skew delta = new_skew - current_skew
			var skew_delta = this._provider.skew - current_skew;
			this._clock.adjust({skew: skew_delta});
		}
		if (!this.isReady() && this._provider.vector != undefined) {
			// just became ready (onVectorChange has fired earlier)
			this._range = this._provider.range;
			this._preProcess(this._provider.vector);
		}		
	};

	ExternalProvider.prototype._onVectorChange = function () {
		if (this._clock) {
			// is ready (onSkewChange has fired earlier)
			if (!this._range) {
				this._range = this._provider.range;
			}
			this._preProcess(this._provider.vector);
		}
	};


	/*
		- local timestamp of vector is set for each new vector, using the skew available at that time
		- the vector then remains unchanged
		- skew changes affect local clock, thereby affecting the result of query operations

		- one could imagine reevaluating the vector as well when the skew changes, 
			but then this should be done without triggering change events

		- ideally the vector timestamp should be a function of the provider clock  

	*/



	// 	override timing base to recalculate timestamp
	ExternalProvider.prototype.onVectorChange = function (provider_vector) {
		// local_ts = provider_ts - skew
		var local_ts = provider_vector.timestamp - this._provider.skew;
		return {
			position : provider_vector.position,
			velocity : provider_vector.velocity,
			acceleration : provider_vector.acceleration,
			timestamp : local_ts
		}
	};


	// update
	ExternalProvider.prototype.update = function (vector) {
		return this._provider.update(vector);
	};



	/*

		TIMING OBJECT BASE

	*/

	var TimingObjectBase = function (timingsrc, options) {
		TimingBase.call(this, options);
		this._version = 4;
		/*
			store a wrapper function used as a callback handler from timingsrc
			(if this was a prototype function - it would be shared by multiple objects thus
			prohibiting them from subscribing to the same timingsrc)
		*/
		var self = this;
		this._internalOnChange = function () {
			var vector = self._timingsrc.vector;
			self._preProcess(vector);
		};
		this._timingsrc = undefined;
		this.timingsrc = timingsrc;
	};
	inherit(TimingObjectBase, TimingBase);


	// attach inheritance function on base constructor for convenience
	TimingObjectBase.inherit = inherit;

	// internal clock
	Object.defineProperty(TimingObjectBase.prototype, 'clock', {
		get : function () {	return this._timingsrc.clock; }	
	});

	TimingObjectBase.prototype.onRangeChange = function (range) {
		return range;
	};

	// invoked just after timingsrc switch 
	TimingObjectBase.prototype.onSwitch = function () {
	};


	/*

		timingsrc property and switching on assignment

	*/
	Object.defineProperty(TimingObjectBase.prototype, 'timingsrc', {
		get : function () {
			if (this._timingsrc instanceof InternalProvider) {
				return undefined
			} else if (this._timingsrc instanceof ExternalProvider) {
				return this._timingsrc.provider;
			} else {
				return this._timingsrc;
			}
		},
		set : function (timingsrc) {
			// new timingsrc undefined		
			if (!timingsrc) {
				var options;
				if (!this._timingsrc) {
					// first time - use options
					options = {
						vector : this._options.vector,
						range : this._options.range
					}
				} else {
					// not first time - use current state
					options = {
						vector : this._vector,
						range : this._range
					} 
				}
				timingsrc = new InternalProvider(options);
			}
			else if ((timingsrc instanceof TimingObjectBase) === false) {
				// external provider - try to wrap it
				try {
					timingsrc = new ExternalProvider(timingsrc); 
				} catch (e) {
					console.log(timingsrc);
					throw new Error ("illegal timingsrc - not instance of timing object base and not timing provider");
				}
			}
			// transformation when new timingsrc is ready
			var self = this;
			var doSwitch = function () {
				// disconnect and clean up timingsrc
				if (self._timingsrc) {
					self._timingsrc.off("change", self._internalOnChange);
				}
				self._timingsrc = timingsrc;
				if (self._timingsrc.range !== self._range) {
					self._range = self.onRangeChange(self._timingsrc.range);
				}
				self.onSwitch();
				self._timingsrc.on("change", self._internalOnChange);	
			};
			if (timingsrc.isReady()) {
				doSwitch();
			} else {
				timingsrc.ready.then(function (){
					doSwitch();
				});
			}
		}
	});

	// update
	TimingObjectBase.prototype.update = function (vector) {
		return this._timingsrc.update(vector);
	};
	

	/*
		Timing Object
	*/
	var TimingObject = function (options) {
		options = options || {};
		var timingsrc = options.timingsrc || options.provider;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(TimingObject, TimingObjectBase);

	// module
	return {
		InternalProvider : InternalProvider,
		ExternalProvider : ExternalProvider,
		TimingObjectBase : TimingObjectBase,
		TimingObject : TimingObject
	};
});



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

define ('sequencing/timingcallbacks',['../util/motionutils'], function (motionutils) {

  'use strict';

    // Utility inheritance function.
  var inherit = function (Child, Parent) {
    var F = function () {}; // empty object to break prototype chain - hinder child prototype changes to affect parent
    F.prototype = Parent.prototype;
    Child.prototype = new F(); // child gets parents prototypes via F
    Child.uber = Parent.prototype; // reference in parent to superclass
    Child.prototype.constructor = Child; // resetting constructor pointer 
  };

  var TimingCallbackBase = function (timingObject, handler) {
    this._timingsrc = timingObject;
    this._handler = handler;
    this._timeout = null;
    this._wrappedOnChange = function () {this._onChange();};
    // initialise
    this.timingsrc = timingObject;
  }; 

  TimingCallbackBase.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
  };

  // update event from timing object
  TimingCallbackBase.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timing object
  TimingCallbackBase.prototype.cancel = function () {
    // cleanup
    this._clearTimeout();
    this._timingsrc.off("change", this._wrappedOnChange, this);  
  };

  /*
    Accessor for timingsrc.
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingCallbackBase.prototype, 'timingsrc', {
    get : function () {return this._timingsrc;},
    set : function (timingObject) {
      if (this._timingsrc) {
        this._timingsrc.off("change", this._wrappedOnChange, this);
      }
      clearTimeout(this._tid);
      this._timingsrc = timingObject;
      this._timingsrc.on("change", this._wrappedOnChange, this);
    }
  });


  /*
      SET POINT CALLBACK
      callback when timing object position is equal to point
      options {repeat:true} implies that callback will occur repeatedly
      every time timing object passes point.
      Default is to fire only once, similar to setTimeout
  */

  var SetPointCallback = function (timingObject, handler, point, options) {
    if (!(this instanceof SetPointCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.repeat = (this._options.repeat !== undefined) ? this._options.repeat : false;
    this._point = point;
  };
  inherit(SetPointCallback, TimingCallbackBase);


  // update event from timing object
  SetPointCallback.prototype._onChange = function () {
    if (this._timingsrc.query().position === this._point) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetPointCallback.prototype._onTimeout = function () {
    if (!this._options.repeat) {
      this.cancel();
    };
    this._handler();
    this._renewTimeout();
  };

  SetPointCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var delay = motionutils.calculateMinPositiveRealSolution(vector, this._point);
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };

  
  /*
    
    SET INTERVAL CALLBACK

    callback callback for every point x, where (x - offset) % length === 0
    options : {offset:offset}
    Default is offset 0
  */

  var SetIntervalCallback = function (timingObject, handler, length, options) {
    if (!(this instanceof SetIntervalCallback)) {
      throw new Error("Contructor function called without new operation");
    }
    TimingCallbackBase.call(this, timingObject, handler);
    this._options = options || {}; 
    this._options.offset = (this._options.offset !== undefined) ? this._options.offset : 0;
    this._length = length;
  };
  inherit(SetIntervalCallback, TimingCallbackBase);

  // ovverride modulo to behave better for negative numbers 
  SetIntervalCallback.prototype._mod = function (n, m) {
    return ((n % m) + m) % m;
  };

  // get point representation from float
  SetIntervalCallback.prototype._getPoint = function (x) {
    var skew = this._options.offset;
    return {
      n : Math.floor((x-skew)/this._length),
      offset : this._mod(x-skew, this._length)
    };
  };

    // get float value from point representation
  SetIntervalCallback.prototype._getFloat = function (p) {
    var skew = this._options.offset;
    return skew + (p.n * this._length) + p.offset;
  };

  // update event from timing object
  SetIntervalCallback.prototype._onChange = function () {
    var points = this._calculatePoints(this._timingsrc.query().position);
    if (points.isTarget) {
      this._handler();
    }
    this._renewTimeout();
  };

  // update event from timing object
  SetIntervalCallback.prototype._onTimeout = function () {
    this._handler();
    this._renewTimeout();
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  SetIntervalCallback.prototype._calculatePoints = function (position) {
    var beforePoint = {}, afterPoint = {};
    var target;
    var point = this._getPoint(position);
    if (point.offset === 0) {
      target = true;
      beforePoint.n = point.n - 1;
      beforePoint.offset = point.offset;
      afterPoint.n = point.n + 1;
      afterPoint.offset = point.offset;
    } else {
      target = false;
      beforePoint.n = point.n;
      beforePoint.offset = 0;
      afterPoint.n = point.n + 1;
      afterPoint.offset = 0;
    }
    return {
      isTarget : target,
      before : this._getFloat(beforePoint),
      after : this._getFloat(afterPoint)
    }
  };

  SetIntervalCallback.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  // module definition
  return {
    setPointCallback: function (timingObject, handler, point, options) { return new SetPointCallback(timingObject, handler, point, options);},
    setIntervalCallback : function (timingObject, handler, length, options) { return new SetIntervalCallback(timingObject, handler, length, options);}
  };
}); 
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


/*
	SKEW CONVERTER

	Skewing the timeline by 2 means that the timeline position 0 of the timingsrc becomes position 2 of Converter.

*/

define('timingobject/skewconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;
	var inherit = TimingObjectBase.inherit;

	var SkewConverter = function (timingsrc, skew, options) {
		if (!(this instanceof SkewConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._skew = skew;
		TimingObjectBase.call(this, timingsrc, options);
	};
	inherit(SkewConverter, TimingObjectBase);

	// overrides
	SkewConverter.prototype.onRangeChange = function (range) {
		range[0] = (range[0] === -Infinity) ? range[0] : range[0] + this._skew;
		range[1] = (range[1] === Infinity) ? range[1] : range[1] + this._skew;
		return range;
	};
	
	// overrides
	SkewConverter.prototype.onVectorChange = function (vector) {
		vector.position += this._skew;	
		return vector;
	};

	SkewConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = vector.position - this._skew;
		}
		return this.timingsrc.update(vector);
	};


	Object.defineProperty(SkewConverter.prototype, 'skew', {
		get : function () {
			return this._skew;
		},
		set : function (skew) {
			this._skew = skew;
			// pick up vector from timingsrc
			var src_vector = this.timingsrc.vector;
			// use this vector to emulate new event from timingsrc
			this._preProcess(src_vector);
		}
	});


	return SkewConverter;
});
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


/*
	DELAY CONVERTER

	Delay Converter introduces a positive time delay on a source timing object.

	Generally - if the source timing object has some value at time t, 
	then the delayConverter will provide the same value at time t + delay.

	Since the delay Converter is effectively replaying past events after the fact,
	it is not LIVE and not open to interactivity (i.e. update)
	
*/


define('timingobject/delayconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var DelayConverter = function (timingObject, delay) {
		if (!(this instanceof DelayConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		if (delay < 0) {throw new Error ("negative delay not supported");}
		if (delay === 0) {throw new Error ("zero delay makes delayconverter pointless");}
		TimingObjectBase.call(this, timingObject);
		// fixed delay
		this._delay = delay;
	};
	inherit(DelayConverter, TimingObjectBase);

	// overrides
	DelayConverter.prototype.onVectorChange = function (vector) {
		/* 			
			Vector's timestamp always time-shifted (back-dated) by delay

			Normal operation is to delay every incoming vector update.
			This implies returning null to abort further processing at this time,
			and instead trigger a later continuation.

			However, delay is calculated based on the timestamp of the vector (age), not when the vector is 
			processed in this method. So, for small small delays the age of the vector could already be
			greater than delay, indicating that the vector is immediately valid and do not require delayed processing.

			This is particularly true for the first vector, which may be old. 

			So we generally check the age to figure out whether to apply the vector immediately or to delay it.
		*/

		// age of incoming vector
		var age = this.clock.now() - vector.timestamp;
		
		// time-shift vector timestamp
		vector.timestamp += this._delay;

		if (age < this._delay) {
			// apply vector later - abort processing now
			var self = this;
			var delayMillis = (this._delay - age) * 1000;
			setTimeout(function () {
				self._process(vector);
			}, delayMillis);	
			return null;
		}
		// apply vector immediately - continue processing
		return vector;
	};

	DelayConverter.prototype.update = function (vector) {
		// Updates are prohibited on delayed timingobjects
		throw new Error ("update is not legal on delayed (non-live) timingobject");
	};

	return DelayConverter;
});
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

/*
	SCALE CONVERTER

	Scaling by a factor 2 means that values of the timing object (position, velocity and acceleration) are multiplied by two.
	For example, if the timing object represents a media offset in seconds, scaling it to milliseconds implies a scaling factor of 1000.

*/


define('timingobject/scaleconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var ScaleConverter = function (timingsrc, factor) {
		if (!(this instanceof ScaleConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		this._factor = factor;
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(ScaleConverter, TimingObjectBase);

	// overrides
	ScaleConverter.prototype.onRangeChange = function (range) {
		return [range[0]*this._factor, range[1]*this._factor];
	};

	// overrides
	ScaleConverter.prototype.onVectorChange = function (vector) {
		vector.position = vector.position * this._factor;
		vector.velocity = vector.velocity * this._factor;
		vector.acceleration = vector.acceleration * this._factor;
		return vector;
	};
	
	ScaleConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) vector.position = vector.position / this._factor;
		if (vector.velocity !== undefined && vector.velocity !== null) vector.velocity = vector.velocity / this._factor;
		if (vector.acceleration !== undefined && vector.acceleration !== null) vector.acceleration = vector.acceleration / this._factor;
		return this.timingsrc.update(vector);
	};

	return ScaleConverter;
});
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


/*
	LOOP CONVERTER

	This is a modulo type transformation where the converter will be looping within
	a given range. Potentially one could create an associated timing object keeping track of the 
	loop number.
*/


define('timingobject/loopconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	/* 
		Coordinate system based on counting segments
		skew + n*length + offset === x
		skew : coordinate system is shifted by skew, so that segment 0 starts at offset.
		n : segment counter
		length : segment length
		offset : offset of value x into the segment where it lies
		x: float point value
	*/
	var SegmentCoords = function (skew, length) {
		this.skew = skew;
		this.length = length;
	};

	/* 
		Static method
		ovverride modulo to behave better for negative numbers 
	*/
	SegmentCoords.mod = function (n, m) {
		return ((n % m) + m) % m;
	};
	
	// get point representation from float
	SegmentCoords.prototype.getPoint = function (x) {
		return {
			n : Math.floor((x-this.skew)/this.length),
			offset : SegmentCoords.mod(x-this.skew,this.length)
		};
	};
	
	// get float value from point representation
	SegmentCoords.prototype.getFloat = function (p) {
		return this.skew + (p.n * this.length) + p.offset;
	};

	// transform float x into segment defined by other float y 
	// if y isnt specified - transform into segment [skew, skew + length]
	SegmentCoords.prototype.transformFloat = function (x, y) {
		y = (y === undefined) ? this.skew : y;
		var xPoint = this.getPoint(x);
		var yPoint = this.getPoint(y);
		return this.getFloat({n:yPoint.n, offset:xPoint.offset});
	};


	/*
		LOOP CONVERTER
	*/

	var LoopConverter = function (timingsrc, range) {
		if (!(this instanceof LoopConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc, {timeout:true});
		/*
			note :
			if a range point of the loop converter is the same as a range point of timingsrc,
			then there will be duplicate events
		*/
		this._range = range;
		this._coords = new SegmentCoords(range[0], range[1]-range[0]);
	};
	inherit(LoopConverter, TimingObjectBase);

	// transform value from coordiantes X of timing source
	// to looper coordinates Y
	LoopConverter.prototype._transform = function (x) {
		return this._coords.transformFloat(x);
	};

	// transform value from looper coordinates Y into 
	// coordinates X of timing object - maintain relative diff 
	LoopConverter.prototype._inverse = function (y) {
		var current_y = this.query().position;
		var current_x = this.timingsrc.query().position;
		var diff = y - current_y;
		var x = diff + current_x;
		// verify that x is witin range
		return x;
	};

	// overrides
	LoopConverter.prototype.query = function () {
		if (this.vector === null) return {position:undefined, velocity:undefined, acceleration:undefined};
		var vector = motionutils.calculateVector(this.vector, this.clock.now());
		// trigger state transition if range violation is detected
		if (vector.position > this._range[1]) {
			this._process(this._calculateInitialVector());
		} else if (vector.position < this._range[0]) {
			this._process(this._calculateInitialVector());
		} else {
			// no range violation
			return vector;
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};

	// overrides
	LoopConverter.prototype.update = function (vector) {
		if (vector.position !== undefined && vector.position !== null) {
			vector.position = this._inverse(vector.position);
		}
		return this.timingsrc.update(vector);
	};

	// overrides
	LoopConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	LoopConverter.prototype.onRangeChange = function(range) {
		return this._range;
	};

	// overrides
	LoopConverter.prototype.onTimeout = function (vector) {
		return this._calculateInitialVector();
	};

	// overrides
	LoopConverter.prototype.onVectorChange = function (vector) {
		return this._calculateInitialVector();
	};

	LoopConverter.prototype._calculateInitialVector = function () {
		// parent snapshot 
		var parentVector = this.timingsrc.query();
		// find correct position for looper
		var position = this._transform(parentVector.position);
		// find looper vector
		return {
			position: position,
			velocity: parentVector.velocity,
			acceleration: parentVector.acceleration,
			timestamp: parentVector.timestamp
		};
	};

	return LoopConverter;
});
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

/*

	RANGE CONVERTER

	The converter enforce a range on position.

	It only has effect if given range is a restriction on the range of the timingsrc.
	Range converter will pause on range endpoints if timingsrc leaves the range. 
	Range converters will continue mirroring timingsrc once it comes into the range.
*/

define('timingobject/rangeconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;
	var RangeState = motionutils.RangeState;


	var state = function () {
		var _state = RangeState.INIT;
		var _range = null;
		var is_special_state_change = function (old_state, new_state) {
			// only state changes between INSIDE and OUTSIDE* are special state changes.
			if (old_state === RangeState.OUTSIDE_HIGH && new_state === RangeState.OUTSIDE_LOW) return false;
			if (old_state === RangeState.OUTSIDE_LOW && new_state === RangeState.OUTSIDE_HIGH) return false;
			if (old_state === RangeState.INIT) return false;
			return true;
		}
		var get = function () {return _state;};
		var set = function (new_state, new_range) {
	
			var absolute = false; // absolute change
			var special = false;  // special change

			// check absolute change
			if (new_state !== _state || new_range !== _range) {
				absolute = true;
			}
			// check special change
			if (new_state !== _state) {
				special = is_special_state_change(_state, new_state);			
			}			
			// range change
			if (new_range !== _range) {
				_range = new_range;
			}
			// state change
			if (new_state !== _state) {
				_state = new_state;
			}
			return {special:special, absolute:absolute};

		}
		return {get: get, set:set};
	};


	/*
		Range converter allows a new (smaller) range to be specified.
	*/

	var RangeConverter = function (timingObject, range) {
		if (!(this instanceof RangeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingObject, {timeout:true});
		/*
			note :
			if a range point of the loop converter is the same as a range point of timingsrc,
			then there will be duplicate events
		*/
		this._state = state();
		// todo - check range
		this._range = range;
	};
	inherit(RangeConverter, TimingObjectBase);

	// overrides
	RangeConverter.prototype.query = function () {
		if (this._ready.value === false)  {
			return {position:undefined, velocity:undefined, acceleration:undefined, timestamp:undefined};
		}
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this._timingsrc.vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		// detect range violation - only if timeout is set
		if (state !== motionutils.RangeState.INSIDE && this._timeout !== null) {
			this._preProcess(vector);
		}
		// re-evaluate query after state transition
		return motionutils.calculateVector(this._vector, this.clock.now());
	};
	
	// overridden
	RangeConverter.prototype._calculateTimeoutVector = function () {
		var freshVector = this._timingsrc.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// override range
	Object.defineProperty(RangeConverter.prototype, 'range', {
		get : function () {
			return [this._range[0], this._range[1]];
		},
		set : function (range) {
			this._range = range;
			// use vector from timingsrc to emulate new event from timingsrc
			this._preProcess(this.timingsrc.vector);
		}
	});

	// overrides
	RangeConverter.prototype.onRangeChange = function(range) {
		return this._range;
	};

	// overrides
	RangeConverter.prototype.onTimeout = function (vector) {	
		return this.onVectorChange(vector);
	};

	// overrides
	RangeConverter.prototype.onVectorChange = function (vector) {
		// console.log("onVectorChange vector", vector);
		// console.log("onVectorChange range", this._range);
		var new_state = motionutils.getCorrectRangeState(vector, this._range);
		// console.log("onVectorChange state", new_state);
		var state_changed = this._state.set(new_state, this._range);
		if (state_changed.special) {
			// state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// OUTSIDE -> INSIDE, generate fake start event
				// vector delivered by timeout 
				// forward event unchanged
			} else {
				// INSIDE -> OUTSIDE, generate fake stop event
				vector = motionutils.checkRange(vector, this._range);
			}
		}
		else {
			// no state transition between INSIDE and OUTSIDE
			if (this._state.get() === RangeState.INSIDE) {
				// stay inside or first event inside
				// forward event unchanged
			} else {
				// stay outside or first event outside 
				// forward if
				// - first event outside
				// - skip from outside-high to outside-low
				// - skip from outside-low to outside-high
				// - range change
				// else drop
				// - outside-high to outside-high (no range change)
				// - outside-low to outside-low (no range change)
				if (state_changed.absolute) {
					vector = motionutils.checkRange(vector, this._range);
				} else {
					// drop event
					return null;
				}
			}
		}
		return vector;
	};

	return RangeConverter;
});
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

/*
	TIMESHIFT CONVERTER

	Timeshift Converter timeshifts a timing object by timeoffset.
	Positive timeoffset means that the timeshift Converter will run ahead of the source timing object.
	Negative timeoffset means that the timeshift Converter will run behind the source timing object.
	
	Updates affect the converter immediately. This means that update vector must be re-calculated
	to the value it would have at time-shifted time. Timestamps are not time-shifted, since the motion is still live.
	For instance, (0, 1, ts) becomes (0+(1*timeshift), 1, ts) 

	However, this transformation may cause range violation 
		- this happens only when timing object is moving.
		- implementation requires range converter logic

	- range is infinite
*/


define('timingobject/timeshiftconverter',['../util/motionutils', './timingobject'], function (motionutils, timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;


	var TimeShiftConverter = function (timingsrc, timeOffset) {
		if (!(this instanceof TimeShiftConverter)) {
			throw new Error("Contructor function called without new operation");
		}

		TimingObjectBase.call(this, timingsrc);
		this._timeOffset = timeOffset;
	};
	inherit(TimeShiftConverter, TimingObjectBase);

	// overrides
	TimeShiftConverter.prototype.onRangeChange = function (range) {
		return [-Infinity, Infinity];
	};


	// overrides
	TimeShiftConverter.prototype.onVectorChange = function (vector) {
		// calculate timeshifted vector
		var newVector = motionutils.calculateVector(vector, vector.timestamp + this._timeOffset);
		newVector.timestamp = vector.timestamp;
		return newVector;
	};

	return TimeShiftConverter;
});
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

/*
	DERIVATIVE CONVERTER

	this Converter implements the derivative of it source timing object.
	
	The velocity of timingsrc becomes the position of the Converter.

	This means that the derivative Converter allows sequencing on velocity of a timing object, 
	by attatching a sequencer on the derivative Converter.
*/

define('timingobject/derivativeconverter',['./timingobject'], function (timingobject) {

	'use strict';

	var TimingObjectBase = timingobject.TimingObjectBase;	
	var inherit = TimingObjectBase.inherit;

	var DerivativeConverter = function (timingsrc) {
		if (!(this instanceof DerivativeConverter)) {
			throw new Error("Contructor function called without new operation");
		}
		TimingObjectBase.call(this, timingsrc);
	};
	inherit(DerivativeConverter, TimingObjectBase);

	// overrides
	DerivativeConverter.prototype.onRangeChange = function (range) { 
		return [-Infinity, Infinity];
	};

	// overrides
	DerivativeConverter.prototype.onVectorChange = function (vector) {
		var newVector = {
			position : vector.velocity,
			velocity : vector.acceleration,
			acceleration : 0,
			timestamp : vector.timestamp
		};
		return newVector;
	};
	
	DerivativeConverter.prototype.update = function (vector) {
		throw new Error("updates illegal on derivative of timingobject");
	};

	return DerivativeConverter;
});
/*
    Copyright 2017 Norut Northern Research Institute
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

define ('sequencing/timinginteger',['../util/motionutils', '../util/eventify'], function (motionutils, eventify) {

  /*
    Integer value that is controlled by a timing object.
    implemented as a tiny wrapper around a timing object.
    Change event emitted whenever the integer value changes.
  */
  var isNumeric = function(obj){
    return !Array.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
  };


  var TimingInteger = function (timingObject, options) {
    // timingsrc
    this._timingsrc;

    options = options || {};
  
    // option value
    if (options.value === undefined) {
      options.value = 0;
    }
    if (!isNumeric(options.value)) {
      throw new Error ("value not nummeric", options.value);
    }
    this._value = options.value;
  
    // option - min - max
    if (options.min !== undefined) {
      if (!isNumeric(options.min)) {
        throw new Error ("option.min not nummeric", options.min);
      }
    }
    if (options.max !== undefined) {
      if (!isNumeric(options.max)) {
        throw new Error ("option.min not nummeric", options.max);
      }
    }
    this._options = options;


    // events
    eventify.eventifyInstance(this);
    this.eventifyDefineEvent("change", {init:true});

    // timeout
    this._timeout = null;

    // timing object
    var self = this;
    this._wrappedOnChange = function () {self._onChange();};
    this.timingsrc = timingObject;
  }
  eventify.eventifyPrototype(TimingInteger.prototype);

  
  /*
    events
  */

  TimingInteger.prototype.eventifyMakeInitEvents = function (type) {
    if (type === "change") {
      return [this.value];
    }
    return [];
  };

  /*
    readiness
  */

  Object.defineProperty(TimingInteger.prototype, "ready", {
    get: function () {return this._timingsrc.ready;}
  });

  TimingInteger.prototype.isReady = function () {
    return this._timingsrc.isReady();
  };

  /*
    public api - integer value
    forwards to timing object position
  */

  Object.defineProperty(TimingInteger.prototype, "value", {
    get : function () {
      return this._value;
    },
    set : function (value) {
      // set will fail if to is not ready
      this._timingsrc.update({position:value});
    }
  });


  /*
    timingsrc
    Supports dynamic switching of timing source by assignment.
  */
  Object.defineProperty(TimingInteger.prototype, 'timingsrc', {
    get : function () {return this._timingsrc;},
    set : function (timingObject) {
      if (this._timingsrc) {
        this._timingsrc.off("change", this._wrappedOnChange, this);
      }
      clearTimeout(this._tid);
      this._timingsrc = timingObject;
      this._timingsrc.on("change", this._wrappedOnChange, this);
    }
  });

  /*
    Timeouts
  */

  TimingInteger.prototype._renewTimeout = function () {
    this._clearTimeout();
    var res = this._calculateTimeout();
    if (res.delay === null) return null;
    var self = this;
    this._timeout = this._timingsrc.clock.setTimeout(function () {
      self._onTimeout();
    }, res.delay, {anchor: res.anchor, early: 0.005});    
  };

  // update event from timing object
  TimingInteger.prototype._clearTimeout = function () {
    // cleanup
    if (this._timeout !== null) {
      this._timeout.cancel();
      this._timeout = null;
    }
  };

  // update event from timingsrc
  TimingInteger.prototype._onChange = function () {
    this._refresh();
    this._renewTimeout();
  };

  // update event from timing object
  TimingInteger.prototype._onTimeout = function () {
    this._refresh();
    this._renewTimeout();
  };

  TimingInteger.prototype._refresh = function () {
    var value = Math.floor(this._timingsrc.query().position);
    if (this._options.max !== undefined && value > this._options.max) {
      value = this._options.max;
    }
    if (this._options.min !== undefined && value < this._options.min) {
      value = this._options.min;
    }
    if (value !== this._value) {
      this._value = value;
      this.eventifyTriggerEvent("change", this.value);
    }
  };

  /*
    Calculate target points before and after a given position.
    If the given position is itself a target point, this will
    be reported as isTarget===true.
  */

  TimingInteger.prototype._calculatePoints = function (position) {
    var before, after;
    var isTarget = Number.isInteger(position);
    if (isTarget === true) {
      before = position - 1;
      after = position + 1;
    } else {
      before = Math.floor(position);
      after = before + 1;
    }
    return {
      isTarget : isTarget,
      before : before,
      after : after
    };
  };


  TimingInteger.prototype._calculateTimeout = function () {
    var vector = this._timingsrc.query();
    var points = this._calculatePoints(vector.position);
    var delay = motionutils.calculateDelta(vector, [points.before, points.after])[0];
    return {
      anchor: vector.timestamp,
      delay: delay
    };
  };


  TimingInteger.prototype.close = function () {
    this._clearTimeout();
    if (this._timingsrc) {
      this._timingsrc.off("change", this._wrappedOnChange, this);
      this._timingsrc = undefined;
    }
  };

  return TimingInteger;
}); 
define('sequencing/activecue',['../util/eventify'], function (eventify) {

	/*
		Wrapping around a sequencer to safely present a single active cue as value

		implements same interface as an event variable - except variable may not be set
	*/

	var ActiveCue = function (seq) {
		this._seq = seq;
		this._stack = [];
		this._dirty = false;
		this._value = undefined;

		eventify.eventifyInstance(this);
		this.eventifyDefineEvent("change", {init:true});

		var self = this;
		this._wrappedHandler = function (eList) {self._onSeqEvents(eList);}
		this._seq.on("events", this._wrappedHandler);
	};
	eventify.eventifyPrototype(ActiveCue.prototype);

	// ovverride to specify initialevents
	ActiveCue.prototype.eventifyMakeInitEvents = function (type) {
		if (type === "change") {
			return [this._value];
		}
		return [];
	};

	ActiveCue.prototype._touch = function () {
		if (!this._dirty) {
			var self = this;
			Promise.resolve().then(function () {
				self._refresh()
			});
		}
		this._dirty = true;
	};

	ActiveCue.prototype._refresh = function () {
		var len = this._stack.length;
		// pick last item
		var value = (len > 0) ? this._stack[len-1][1] : undefined;
		if (value !== this._value) {
			this._value = value;
			this.eventifyTriggerEvent("change", value);
		}
		this._dirty = false;
	};

	ActiveCue.prototype._onSeqEvents = function (eList) {
		eList.forEach(function (eArg) {
			var seqCue = eArg.e;
			if (eArg.type === "change") {
				this._stack.push([seqCue.key, seqCue.data]);
				this._touch();
			} else if (eArg.type === "remove") {
				var i = this._stack.findIndex(function (element, index, array) {
					return (element[0] === seqCue.key); 
				});
				if (i > -1) {
					this._stack.splice(i, 1);
					this._touch();
				}
			}
		}, this);
	};

	Object.defineProperty(ActiveCue.prototype, "value", {
		get: function () {
			return this._value;
		}
	});
	ActiveCue.prototype.get = function () { return this._value;};


	ActiveCue.prototype.close = function () {
		this._seq.off("events", this._wrappedHandler);
	};


	return ActiveCue;
});



/*
  Written by Ingar Arntzen, Norut
*/

define('timingsrc',['require','exports','module','sequencing/sequencer','sequencing/windowsequencer','timingobject/timingobject','sequencing/timingcallbacks','util/interval','util/eventify','timingobject/skewconverter','timingobject/delayconverter','timingobject/scaleconverter','timingobject/loopconverter','timingobject/rangeconverter','timingobject/timeshiftconverter','timingobject/derivativeconverter','sequencing/axis','sequencing/timinginteger','sequencing/activecue'],function(require, exports, module) {

	const DefaultSequencer = require('sequencing/sequencer');
	const WindowSequencer = require('sequencing/windowsequencer');
	const timingobject = require('timingobject/timingobject');
    const timingcallbacks = require('sequencing/timingcallbacks');

    /* 
	    Common constructor DefaultSequencer and WindowSequencer
    */
    const Sequencer = function (toA, toB, _axis) {
    	if (toB === undefined) {
        	return new DefaultSequencer(toA, _axis);
      	} else {
        	return new WindowSequencer(toA, toB, _axis); 
      	}
    };

    // Add clone prototype to both Sequencer and WindowSequencer
    DefaultSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
    WindowSequencer.prototype.clone = function (toA, toB) {
      return Sequencer(toA, toB, this._axis);
    };
   
	return {
		version : "v2.1",
		
		// util
		Interval: require('util/interval'),	
		eventify: require('util/eventify'),

		// Timing Object
		TimingObject : timingobject.TimingObject,

		// Timing Converters
		ConverterBase : timingobject.ConverterBase,
		SkewConverter : require('timingobject/skewconverter'),
		DelayConverter : require('timingobject/delayconverter'),
		ScaleConverter : require('timingobject/scaleconverter'),
		LoopConverter : require('timingobject/loopconverter'),
		RangeConverter : require('timingobject/rangeconverter'),
		TimeShiftConverter : require('timingobject/timeshiftconverter'),
		DerivativeConverter : require('timingobject/derivativeconverter'),
		
		// Sequencing

		Axis: require('sequencing/axis'),
		Sequencer : Sequencer,
		setPointCallback : timingcallbacks.setPointCallback,
		setIntervalCallback : timingcallbacks.setIntervalCallback,
		TimingInteger : require('sequencing/timinginteger'),
		ActiveCue : require('sequencing/activecue')
	};
});

    //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    return require('timingsrc');
}));