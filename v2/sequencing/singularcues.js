define (['../util/binarysearch'], 
	function (BinarySearch) {

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

		/*
		nodemap maintains the associations between points on the timeline
		and cues that reference such points. A single point value may be 
		referenced by multiple cues, so one point maps to a list of cues.
		a node object holds the list of cues
		node = {cues:[]}
		*/ 
		this.nodemap = new Map(); 

		/*
		index maintains a sorted list of numbers for efficient lookup
		a large volume of insert and remove operations may be problematic
		with respect to performance, so the implementation seeks to
		do a single bulk update of this structure, for each batch of cue
		operations (i.e. each invocations of addCues). In order to do this 
		NodeManager processes all cue operations to calculate a single batch 
		of deletes and a single batch of insert which then will be applied to 
		the index, to make it consistent. 
		*/
		this.index = new BinarySearch();

		// Node operation manager
		this.node_manager = new NodeManager(this.nodemap, this.index);

		// Items manager
		this.item_manager = new ItemManager();
	};

	SingularCues.prototype.addCues = function(cues) {
     	if (cues.length == 0) { return [];}
	
    	let cue, old_cue;
        if (this.keymap.size == 0) {
        	// initialization - first invocation of addCues
        	for (let i=0; i<cues.length; i++) {
        		cue = cues[i];
        		this.keymap.set(cue.key, cue);
        		this.node_manager.processCue("add", cue.interval.low, cue);
				this.item_manager.setItem({new:cue});
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
						this.node_manager.processCue("remove", old_cue.interval.low, old_cue);
						this.node_manager.processCue("add", cue.interval.low, cue);
						this.item_manager.setItem({new:cue, old:old_cue});
					} else {
						// delete cue
						// cues without interval signify deletion 
						this.keymap.delete(old_cue.key);
						this.node_manager.processCue("remove", old_cue.interval.low, old_cue);
						this.item_manager.setItem({old:old_cue});
					}
				} else {
					if (cue.interval) {
						// new cue
						this.keymap.set(cue.key, cue);
						this.node_manager.processCue("add", cue.interval.low, cue);
						this.item_manager.setItem({new:cue});
					} else {
						// attempt to dele cue that does not exist
						continue;
					}
				}
			}
        }

        // submit changes to nodemap and  index
        this.node_manager.submit();
		return this.item_manager.getItems();
	};


	/*
		Items Manager manages event items from cue processing.
		If multiple operations in a batch apply to the same 
		cue, items will effectively be collapsed into one operation. 
		If an old value was available before cue processing started,
		this will be reported as old value, even if the cue has been
		updated multiple times. The last update defines the new
		cue. If a cue is both added and remove in the same batch,
		it will not be included in items.
	*/

	var ItemManager = function () {
		this.items = new Map();
	};

	ItemManager.prototype.setItem = function (item) {
		let key = (item.new) ? item.new.key : item.old.key;
		let oldItem = this.items.get(key);
		if (oldItem == undefined) {
			this.items.set(key, item);
		} else {
			// update new item
			if (item.new) {
				oldItem.new = item.new;
			}
		}
	};

	ItemManager.prototype.getItems = function () {
		let res = [];
		for (let item of this.items.values()) {
			if (item.new || item.old) {
				res.push(item);
			}
		}
		this.items.clear();
		return res;
	};


	/*
		NodeManager processes translates cue operations
		into a minimum set of operations on the point index.

		To do this, it needs to build up a representation of
		the total difference that the batch of cue operations
		amounts to. This is expressed as two batch operations,
		a set of values to be deleted, and a set of values to
		be inserted.

		On submit both the nodemap and the index will brought
		up to speed
	*/

	var NodeManager = function (nodemap, index) {
		this.nodemap = nodemap;
		this.index = index;
		/* 
			created includes nodes that were not in nodemap 
			before this batch was processed
			dirty includes nodes that were in nodemap
			before this batch was processed, and that
			have been modified in some way. 
		*/
		this.created = new Map(); // value -> node
		this.dirty = new Map(); // value -> node
	};

	/* add cue to node of value */
	NodeManager.prototype.processCue = function (op, value, cue) {
		let node = this.created.get(value);
		if (node == undefined) {
			// node not found in created
			node = this.nodemap.get(value);
			if (node == undefined) {
				// node not found in keymap
				// create new node
				node = (op == "add") ? {cues:[cue]} : {cues:[]};
				this.created.set(value, node);
			} else {
				// node found in keymap - update
				if (op == "add") {
					this.addCueToNode(node, cue);
				} else {
					this.removeCueFromNode(node, cue);
				}
				this.dirty.set(value, node);
			}	
		} else {
			// node found in created - update
			if (op == "add") {
				this.addCueToNode(node, cue);
			} else {
				this.removeCueFromNode(node, cue);
			}
			// created nodes do not enter the set of dirty nodes
		}
	};

	/*
		Submit changes to nodemap and index

		Nodemap
		- update with contents of created

		Index
		- points to delete - dirty and empty
		- points to insert - created and non-empty
	*/
	NodeManager.prototype.submit = function () {
		// update nodemap
		let value, node;
		for ([value, node] of this.created.entries()) {
			this.nodemap.set(value, node);
		}
		// update index
		let to_remove = [];
		let to_insert = [];
		for ([value, node] of this.created.entries()) {
			if (node.cues.length > 0) {
				to_insert.push(value);
			} 
		}
		for ([value, node] of this.dirty.entries()) {
			if (node.cues.length == 0) {
				to_remove.push(value);
			}
		}
		this.index.update(to_remove, to_insert);
		// cleanup
		this.created.clear();
		this.dirty.clear();
	};

	NodeManager.prototype.addCueToNode = function (node, cue) {
		// cue equality defined by key property
		let idx = node.cues.findIndex(function (_cue) { 
			return _cue.key == cue.key;
		});
		if (idx == -1) {
			node.cues.push(cue);
		}		
	};

	NodeManager.prototype.removeCueFromNode = function (node, cue) {
		// cue equality defined by key property 
		let idx = node.cues.findIndex(function (_cue) { 
			return _cue.key == cue.key;
		});
		if (idx > -1) {
			node.cues.splice(idx, 1);
		}
	};

	// module definition
	return SingularCues;
});
