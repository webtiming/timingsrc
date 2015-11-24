
/*
  Written by Ingar Arntzen, Norut
*/

define (['./timingobject/main', './sequencing/main'], function (timingobject, sequencing) {
	return {
		
		// Utils
		inherit : timingobject.inherit,


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
		Sequencer : sequencing.Sequencer,
		Interval : sequencing.Interval
	
	};
});
