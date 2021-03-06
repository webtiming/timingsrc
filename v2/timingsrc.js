
/*
  Written by Ingar Arntzen, Norut
*/

define (['./timingobject/main', './sequencing/main', './mediasync/mediasync'], 
	function (timingobject, sequencing, mediasync) {
	return {
		version : "v2",
		
		// Timing Object
		TimingObject : timingobject.TimingObject,

		// Timing Converters
		ConverterBase : timingobject.ConverterBase,
		SkewConverter : timingobject.SkewConverter,
		DelayConverter : timingobject.DelayConverter,
		ScaleConverter : timingobject.ScaleConverter,
		LoopConverter : timingobject.LoopConverter,
		RangeConverter : timingobject.RangeConverter,
		TimeShiftConverter : timingobject.TimeShiftConverter,
		LocalConverter : timingobject.LocalConverter,
		DerivativeConverter : timingobject.DerivativeConverter,
		
		// Sequencing
		Interval : sequencing.Interval,
		Sequencer : sequencing.Sequencer,
		setPointCallback : sequencing.setPointCallback,
		setIntervalCallback : sequencing.setIntervalCallback,
		TimingInteger : sequencing.TimingInteger,
		ActiveCue : sequencing.ActiveCue,

		// MediaSync
		MediaSync: mediasync.MediaSync,
    	mediaNeedKick : mediasync.needKick
	};
});
