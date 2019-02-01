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

		// Node operaration manager
		this.nodes = new NodeManager(this.index);

		// Items manager
		this.items = new ItemsManager();
	};

	SingularCues.prototype.addCues = function(cues) {

     	if (cues.length == 0) {
        	return [];
        }
	
    	let cue, old_cue;
        if (this.keymap.size == 0) {
        	for (let i=0; i<cues.length; i++) {
        		cue = cues[i];
        		this.keymap.set(cue.key, cue);
        		this.nodes.processCue("add", cue.interval.low, cue);
				this.items.setItem({new:cue});
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
						this.nodes.processCue("remove", old_cue.interval.low, old_cue);
						this.nodes.processCue("add", cue.interval.low, cue);
						this.items.setItem({new:cue, old:old_cue});
					} else {
						// delete cue
						// cues without interval signify deletion 
						this.keymap.delete(old_cue.key);
						this.nodes.processCue("remove", old_cue.interval.low, old_cue);
						this.items.setItem({old:old_cue});
					}
				} else {
					if (cue.interval) {
						// new cue
						this.keymap.set(cue.key, cue);
						this.nodes.processCue("add", cue.interval.low, cue);
						this.items.setItem({new:cue});
					} else {
						// attempt to dele cue that does not exist
						// console.log("warning: attempted delete of non-existent cue");
						continue;
					}
				}
			}
        }

        // update index
        this.nodes.flush();
		return this.items.getItems();
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

	var ItemsManager = function () {
		this.items = new Map();
	};

	ItemsManager.prototype.setItem = function (item) {
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

	ItemsManager.prototype.getItems = function () {
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
		NodeManager processes all cue operations
		to collect the minimum operations that need to be done
		on the binary index, expressed as two batches,
		one batch of insert operations and one batch of delete operations.

		On flush, the binary search index is synchronized by 
		applying the operations.
	*/

	var NodeManager = function (binarySearch) {
		this.nodes = new Map(); // value -> node
		this.index = binarySearch;
	};

	/* add cue to node of value */
	NodeManager.prototype.processCue = function (op, value, cue) {
		let node = this.nodes.get(value);
		if (node == undefined) {
			// node not found in cache
			// fetch node from index
			node = this.index.getByIndex(this.index.indexOf(value));
			if (node == undefined) {
				// node not found in index
				// create new node in cache with cues simulating result of operation
				let cues = (op == "add") ? [cue] : [];
				this.nodes.set(value, {value: value, cues:cues, created:true});
			} else {
				// node found in index
				// update and register in cache
				node.created = false;
				if (op == "add") {
					this.addCueToNode(node, cue);
				} else {
					this.removeCueFromNode(node, cue);
				}
				this.nodes.set(value, node);
			}
		} else {
			// node found in cache
			// update directly
			if (op == "add") {
				this.addCueToNode(node, cue);
			} else {
				this.removeCueFromNode(node, cue);
			}
		}
	};

	/*
		Flush updates in cache into binary search index

		iterate nodes
		- [created,empty] : noop (series of modifications amounts to no change)
		- [created,non-empty] : insert into index (these are new nodes)
		- [non-created, empty] : delete from index (these all exist)
		- [non-created, non-empty] : noop (modifications carried out on node.cues)
	*/
	NodeManager.prototype.flush = function () {
		// calculate operations
		let to_remove = [];
		let to_insert = [];
		for (let node of this.nodes.values()) {
			if (node.created && node.cues.length > 0) {
				to_insert.push(node);
			} else if (!node.created && node.cues.length == 0) {
				to_remove.push(node);
			}
		}
		this.nodes.clear();
		this.index.update(to_remove, to_insert);
	};

	NodeManager.prototype.addCueToNode = function (node, cue) {
		// console.log("add cue to node" , node.value, cue.interval.low, cue.key);
		// cue equality defined by key property
		let exp = function (_cue) { 
			return _cue.key == cue.key;
		};
		let idx = node.cues.findIndex(exp);
		if (idx == -1) {
			node.cues.push(cue);
		}		
	};

	NodeManager.prototype.removeCueFromNode = function (node, cue) {
		// console.log("remove cue from node" , node.value);
		// cue equality defined by key property
		let exp = function (_cue) { 
			return _cue.key == cue.key;
		};
		let idx = node.cues.findIndex(exp);
		if (idx > -1) {
			node.cues.splice(idx, 1);
		}
	};

	// module definition
	return SingularCues;
});
