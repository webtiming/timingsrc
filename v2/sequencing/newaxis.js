define (['../util/interval', './sortedarraybinary', './newmultimap', '../util/eventify', '../util/cue'], 
	function (Interval, SortedArrayBinary, MultiMap, eventify, Cue) {

	'use strict';

	var Point = function (value, cue) {
		this.value = value;
		this.cue = cue;
	};

	var Cue = function (key, interval, data) {
		if (!(interval instanceof Interval)) {
			throw new Error("Cue constructor: interval must be of type Interval");
		}
		this.key = key;
		this.low = Point(interval.low, this);
		this.high = Point(interval.high, this);
		this.interval = interval;
		this.data = data;
	};


	
	var Axis = function () {

		// efficient lookup of cues by key	
		// key -> cue
		this.keymap = new Map();

		// efficient lookup of points on part of the timeline
		// sorted array of points
		this.points = [];

		// efficient lookup of cues by point on the timeline
		// point -> [cue0, cue1, cue3]
		this.pointmap = new MultiMap();
	};


	var point_cmp = function (point_a, point_b) {
		return point_a.value - point_b.value;
	} 

	Axis.prototype.addCues = function(cues) {

		let points = [];
		let cue;




		/* 
			optimization for quick initialization of large cue sets
			for improved performance, make sure cues are sorted
		*/
		if (self.keymap.size == 0) {
			let len_cues = cues.length;
			let low, high;
			for (let i=0; i<len_cues; i++) {
				cue = cues[i];

				// create and collect point objects
				if (cue.interval.singular) {
					cue.points = [Point(cue.interval.low, cue)];
				} else {
					cue.points = [
						Point(cue.interval.low, cue),
						Point(cue.interval.high, cue)
					];
				}
				points.push.apply(...cue.points);

				// initialize keymap
				self.keymap.set(cue.key, cue); 
			}

			// sort new points
			points.sort(point_cmp);

			// initialise points
			self.points = points;
		}

		/*
			regular operation
		*/
		else {

			let old_cues = [], old_cue, len_old_cues;
			for (let i=0; i<len_cues; i++) {
				cue = cues[i];

				// collect old cue
				old_cue = self.keymap.get(cue.key);
				if (old_cue != undefined) {
					old_cues[old_cues.length] = old_cue;
				}
			
				// update keymap with new cue
				self.keymap.set(cue.key, cue);

				// create and collect new point objects
				if (cue.interval.singular) {
					cue.points = [Point(cue.interval.low, cue)];
				} else {
					cue.points = [
						Point(cue.interval.low, cue),
						Point(cue.interval.high, cue)
					];
				}
				points.push.apply(...cue.points);
			}

			// remove old points


			// add new points


		}

	};





	


	// module definition
	return {
		Axis: Axis
	};

});
