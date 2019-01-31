define (['../util/interval', '../util/binarysearch', '../util/eventify', '../util/cue'], 
	function (Interval, BinarySearch, eventify, Cue) {

	'use strict';


	/*
		this implements a collection for efficient lookup of cues on a timeline
		- cues are singular, meaning that they are tied to a single value, not an interval
		- cues are indexed both by key and by value
	*/


	var SingularCues = function () {

		// efficient lookup of cues by key	
		// key -> cue
		this.keymap = new Map();

		// efficient lookup of cues on the timeline
		let options = {
			allow_duplicates:true,
			value: function (cue) {return cue.interval.low;},
			equals: function (cue1, cue2) {return cue1.key == cue2.key;}
		}
		this.points = new BinarySearch(options);
	};



	
	SingularCues.prototype.addCues = function(cues) {

		/*
			update cues map
			- if it is not empty, record cues that are being replaced, if any 
		*/
		let len = cues.length;
		let cue, old_cue;
		let old_cues = [];
		let empty = this.keymap.size == 0;
		for (let i=0; i<len; i++) {
			cue = cues[i];
			// record replaced cues
			if (!empty) {
				old_cue = this.keymap.get(cue.key);
				if (old_cue != undefined) {
					old_cues[old_cues.length] = old_cue;
				}
			}
			// update cues
			this.keymap.set(cue.key, cue);
		}

		/*
			update point index
		*/
		// cleanup replaced cues
		this.points.removeObjects(old_cues);
		// register new cues
		this.points.insertObjects(cues);

		return old_cues;
	};






	


	// module definition
	return SingularCues;
});
