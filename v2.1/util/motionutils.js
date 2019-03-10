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


define(function () {

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

