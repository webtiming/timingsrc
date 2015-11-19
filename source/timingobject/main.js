define([
	'./timingbase', 
	'./positionshiftwrapper', 
	'./delaywrapper', 
	'./scalewrapper', 
	'./loopwrapper', 
	'./rangewrapper', 
	'./timeshiftwrapper', 
	'./localwrapper', 
	'./derivativewrapper',
	'./timingobject'], 
	function (timingbase, PositionShiftWrapper, DelayWrapper, ScaleWrapper, LoopWrapper, RangeWrapper, TimeShiftWrapper, LocalWrapper, DerivativeWrapper, TimingObject) {		
		'use strict';
		return {
			motionutils : timingbase.motionutils,
			inherit : timingbase.inherit,
			WrapperBase : timingbase.WrapperBase,
			PositionShiftWrapper : PositionShiftWrapper,
			DelayWrapper : DelayWrapper,
			ScaleWrapper : ScaleWrapper,
			LoopWrapper : LoopWrapper,
			RangeWrapper : RangeWrapper,
			TimeShiftWrapper : TimeShiftWrapper,
			LocalWrapper : LocalWrapper,
			DerivativeWrapper : DerivativeWrapper,
			TimingObject : TimingObject
		};
	}
);