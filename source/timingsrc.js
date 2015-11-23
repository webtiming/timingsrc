
/*
  Written by Ingar Arntzen, Norut
*/

define (['./timingobject/main'], function (timingobject) {
	return {
		motionutils : timingobject.motionutils,
		inherit : timingobject.inherit,
		ConverterBase : timingobject.ConverterBase,
		SkewConverter : timingobject.SkewConverter,
		DelayConverter : timingobject.DelayConverter,
		ScaleConverter : timingobject.ScaleConverter,
		LoopConverter : timingobject.LoopConverter,
		RangeConverter : timingobject.RangeConverter,
		TimeShiftConverter : timingobject.TimeShiftConverter,
		LocalConverter : timingobject.LocalConverter,
		DerivativeConverter : timingobject.DerivativeConverter,
		TimingObject : timingobject.TimingObject
	};
});
