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

		// efficient lookup of points from the timeline
		let options = {
			value: function (o) {return o.value;}
		}
		this.index = new BinarySearch(options);
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
		let mod_cues = [];
		let del_cues = [];
		let add_cues = [];
		let old_cues = [];
        if (this.keymap.size == 0) {
        	add_cues = cues;
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
						mod_cues.push(cue);
						old_cues.push(old_cue);	
					} else {
						// delete cue
						// cues without interval will be deleted 
						this.keymap.delete(old_cue.key);
						items.push({old:old_cue});
						del_cues.push(old_cue);
					}
				} else {
					// new cue
					this.keymap.set(cue.key, cue);
					items.push({new:cue});
					add_cues.push(cue);
				}
			}
        }

		/*
			update point index
		*/

		/*
			point index must contains object with ptr to [cues] 

			- update operation 
			  - get point objects for the add, mod, del collections
			  - do appropriate operations on the list of each point object per cue
			 
			   - those objects that did not exist create a new point object
			   - those point objects that did exist - modify in place

			   - construct del points from 
			     - del requests and replaced cues
			   - construct add points from 
			     - add requests and replacing cues

			- list of points to be removed or inserted

		*/


		let node_ops = []; // [["del"|"add", node]] 
		
		let item;
        for (let i=0; i<items.length; i++) {
            item = items[i];
            if (item.new && item.old) {
				        
            	// PROCESS REPLACED CUE
            	// remove cue from node
            	cue = item.old;
            	let val = cue.interval.low;
				let node = this.index.getByIndex(this.index.indexOf(val));
				if (node !== undefined) {
					let cue_count = removeCueFromNode(node, cue);	
					node_ops.push(val, ["del", node]);
				}

				// PROCESS REPLACING CUE
				cue = item.new;
        
            } else if (item.new) {
        		// PROCESS NEW CUE
				// create new node
				cue = item.new;
				let val = cue.interval.low;	
				node_ops.push(["add", {value:val}]);
				
			

            } else {
        		// PROCESS DELETED CUE
        		cue = item.old;

            }
        }




		return items;
	};


	/*
		Remove cues from existing nodes 
	*/
	SingularCues.prototype.removeExisting = function (cues) {
		let values = [];
		let index, cue, node;
		let not_found = [];
		for (var i=0; i<cues.length; i++) {
			cue = cues[i];
			index = this.index.indexOf(cue);
			if (index > -1) {
				node = this.index.getByIndex(index);
				// remove existing cue
				let idx = node.cues.indexOf(cue)
			} else {
				not_found.push(cue);
			}

			values.push(cues[i].integer.low);
		}
		let nodes = this.index.get(values);

	};





	var addCueToNode = function (node, cue) {
		let exp = function (_cue) { 
			return _cue.interval.key == cue.key;
		};
		node.cues = node.cues || [];
		let idx = node.cues.findIndex(exp);
		if (idx == -1) {
			node.cues.push(cue);
		}
		return node.cues.length;		
	};

	var removeCueFromNode = function (node, cue) {
		let exp = function (_cue) { 
			return _cue.interval.key == cue.key;
		};
		let idx = node.cues.findIndex(exp);
		if (idx > -1) {
			node.cues.splice(idx, 1);
		}
		return node.cues.length;
	};


	// module definition
	return SingularCues;
});
