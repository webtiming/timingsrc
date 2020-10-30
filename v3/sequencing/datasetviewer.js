function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


class DatasetViewer {

    constructor(ds, elem) {
        this.ds = ds;
        this.elem = elem;
        this.nonce = randomString(4);
        this.ds.on("change", this.onchange.bind(this));
        this.ds.on("remove", this.onremove.bind(this));
    }

    cue2string(cue) {
        let itv = (cue.inteval) ? cue.interval.toString() : "undefined";
        let data = JSON.stringify(cue.data); 
        return `${cue.key}, ${itv}, ${data}`;
    }

    onchange(eItem) {
        let _id = `${this.nonce}-${eItem.key}`;
        let node = this.elem.querySelector(`#${_id}`);
        if (node) {
            // update existing node
            node.textContent = this.cue2string(eItem.new);
        } else {
            // create new node
            let node = document.createElement("div");
            node.textContent = this.cue2string(eItem.new);
            node.setAttribute("id", _id);
            this.elem.appendChild(node);
        }
    }

    onremove(eItem) {
        // remove node
        let _id = `${this.nonce}-${eItem.key}`;
        let node = this.elem.querySelector(`#${_id}`);
        if (node) {
            node.parentNode.removeChild(node);
        }
    }
}

export default DatasetViewer;