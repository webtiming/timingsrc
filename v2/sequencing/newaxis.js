define (['../util/interval', './sortedarraybinary', './multimap', '../util/eventify', '../util/cue'], 
	function (Interval, SortedArrayBinary, MultiMap, eventify, Cue) {

	'use strict';
	
	var Axis = function () {	
		this.map = new Map(); // key -> cue
		this.points = [];
	};

	Axis.prototype.addCues = function(cues) {
		let len_cues = cues.length;
		let points = [];
		let cue, len_points;
		let low, high;
		
		for (let i=0; i<len_cues; i++) {
			cue = cues[i];
			// Register cues
			this.map.set(cue.key, cue);
			// Collect points from cues
			low = cue.interval.low;
			high = cue.interval.high;
			len_points = points.length;
			points[len_points] = low;
			if (high > low) {
				points[len_points+1] = high;
			}
		}

		// Add new points and sort them
		this.points = this.points.concat(points);
		this.points = this.points.sort();
	};





	


	// module definition
	return {
		Axis: Axis
	};

});
