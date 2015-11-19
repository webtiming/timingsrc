
/*
  Written by Ingar Arntzen, Norut
*/

define (['./timingobject/main'], function (timingobject) {
	return {
		motionutils : timingobject.motionutils,
		inherit : timingobject.inherit,
		WrapperBase : timingobject.WrapperBase,
		PositionShiftWrapper : timingobject.PositionShiftWrapper,
		DelayWrapper : timingobject.DelayWrapper,
		ScaleWrapper : timingobject.ScaleWrapper,
		LoopWrapper : timingobject.LoopWrapper,
		RangeWrapper : timingobject.RangeWrapper,
		TimeShiftWrapper : timingobject.TimeShiftWrapper,
		LocalWrapper : timingobject.LocalWrapper,
		DerivativeWrapper : timingobject.DerivativeWrapper,
		TimingObject : timingobject.TimingObject
	};
});
