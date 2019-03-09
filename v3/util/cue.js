define (['./interval'], function (Interval) {

	'use strict';
	
	var Cue = function (key, interval, data) {
		if (!(interval instanceof Interval)) {
			throw new Error("Cue constructor: interval must be of type Interval");
		}
		this.key = key;
		this.interval = interval;
		this.data = data;
	};

	return Cue;
});
