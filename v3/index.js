
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

// utils
export * as utils from './util/utils.js';
export * as motionutils from './util/motionutils.js';
export {default as BinarySearch} from './util/binarysearch.js';
export {default as endpoint} from './util/endpoint.js';
export {default as eventify} from './util/eventify.js';
export {default as Interval} from './util/interval.js';
export {default as CueCollection} from './dataset/cuecollection.js';
export {default as Timeout} from './util/timeout.js';

// timing object
import {default as TimingObject} from './timingobject/timingobject.js';
export {TimingObject};
export {default as SkewConverter} from './timingobject/skewconverter.js';
export {default as DelayConverter} from './timingobject/delayconverter.js';
export {default as ScaleConverter} from './timingobject/scaleconverter.js';
export {default as LoopConverter} from './timingobject/loopconverter.js';
export {default as RangeConverter} from './timingobject/rangeconverter.js';
export {default as TimeshiftConverter} from './timingobject/timeshiftconverter.js';
export {default as TimingSampler} from './timingobject/timingsampler.js';
export {default as PositionCallback} from './timingobject/positioncallback.js';

// timed data
import {default as Dataset} from './dataset/dataset.js';
export {Dataset};
export {default as Subset} from './dataset/subset.js';
import {default as PointModeSequencer} from './sequencing/pointsequencer.js';
import {default as IntervalModeSequencer} from './sequencing/intervalsequencer.js';

// create single sequencer factory function
export function Sequencer() {
    // find datasets in arguments
    let ds_list = [...arguments].filter((e) => (e instanceof Dataset));
    let ds = (ds_list.length > 0) ? ds_list[0] : new Dataset();
    // find timing objects in arguments
    let to_list = [...arguments].filter((e) => (e instanceof TimingObject));
    // find options (plain objects) in arguments
    let obj_list = [...arguments].filter((e) => (Object.getPrototypeOf(e) === Object.prototype));
    let options = (obj_list.length > 0) ? obj_list[0] : {};
    if (to_list.length == 0) {
        throw new Error("no timingobject in arguments");
    } else if (to_list.length == 1) {
        return new PointModeSequencer(ds, to_list[0], options);
    } else {
        return new IntervalModeSequencer(ds, to_list[0], to_list[1], options);
    }
};

// Add clone functions for backwards compatibility
PointModeSequencer.prototype.clone = function () {
    let args = [this.dataset];
    args.push.apply(args, [...arguments]);
    return Sequencer(...args);
};

// Add clone functions for backwards compatibility
IntervalModeSequencer.prototype.clone = function () {
    let args = [this.dataset];
    args.push.apply(args, [...arguments]);
    return Sequencer(...args);
};

// ui
export {default as DatasetViewer} from './ui/datasetviewer.js';
export {default as TimingProgress} from './ui/timingprogress.js';

export const version = "v3.0";
