define (['./eventify', './timeoututils', './motionutils', './binarysearch', './cue'],
	function (eventify, timeoututils, motionutils, BinarySearch, Cue) {
		return {
			eventify : eventify,
			timeoututils : timeoututils,
			motionutils : motionutils,
			BinarySearch : BinarySearch,
			Cue : Cue
		};
	}
);