/*
    Copyright 2020
    Author : Ingar Arntzen

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

import {random_string} from '../util/utils.js';

class DatasetViewer {

    constructor(ds, elem) {
        this.ds = ds;
        this.elem = elem;
        this.nonce = random_string(4);
        this.ds.on("change", this.onchange.bind(this));
        this.ds.on("remove", this.onremove.bind(this));
    }

    cue2string(cue) {
        let itv = (cue.interval) ? cue.interval.toString() : "undefined";
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