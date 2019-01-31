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
			allow_duplicates:false,
			value: function (cue) {return cue.interval.low;},
			equals: function (cue1, cue2) {return cue1.key == cue2.key;}
		}
		this.points = new BinarySearch(options);
	};



	
	SingularCues.prototype.addCues = function(cues) {

     	if (cues.length == 0) {
        	return [];
        }
	
		/* 
			protect from cues with duplicate keys
			by putting them into a map
		*/
        cues = [...new Map(cues.map(cue => [cue.key, cue])).values()];

        /*
			update keymap and create event items 
        */
    	let cue, old_cue;
		let items = [];
		let to_remove = [];
		let to_add = [];
        if (this.keymap.size == 0) {
        	to_add = cues;
        	for (let i=0; i<cues.length; i++) {
        		cue = cues[i];
        		this.keymap.set(cue.key, cue);
				items.push({new:cue});
        	}
        } else {
        	// iterate keys in keymap
        	for (let i=0; i<cues.length; i++) {
				// check for cues to be replaced
				cue = cues[i];
				old_cue = this.keymap.get(cue.key);
				if (old_cue) {
					if (cue.interval) {
						// replace cue
						this.keymap.set(cue.key, cue);
						items.push({new:cue, old:old_cue});	
						to_remove.push(old_cue);
						to_add.push(cue);
					} else {
						// delete cue
						// cues without interval will be deleted 
						this.keymap.delete(old_cue.key);
						items.push({old:old_cue});
						to_remove.push(old_cue);
					}
				} else {
					// new cue
					this.keymap.set(cue.key, cue);
					items.push({new:cue});
					to_add.push(cue);
				}
			}
        }

		/*
			update point index
		*/
		// cleanup replaced cues
		console.log("remove ", to_remove.length);
		this.points.removeSingleValues(to_remove);
		
		// register new cues
		console.log("add ", to_add.length);
		this.points.insertObjects(to_add);

		return items;
	};






	


	// module definition
	return SingularCues;
});
