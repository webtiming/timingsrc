/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

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

define([
	'./timingbase', 
	'./skewwrapper', 
	'./delaywrapper', 
	'./scalewrapper', 
	'./loopwrapper', 
	'./rangewrapper', 
	'./timeshiftwrapper', 
	'./localwrapper', 
	'./derivativewrapper',
	'./timingobject'], 
	function (timingbase, SkewWrapper, DelayWrapper, ScaleWrapper, LoopWrapper, RangeWrapper, TimeShiftWrapper, LocalWrapper, DerivativeWrapper, TimingObject) {		
		'use strict';
		return {
			motionutils : timingbase.motionutils,
			inherit : timingbase.inherit,
			WrapperBase : timingbase.WrapperBase,
			SkewWrapper : SkewWrapper,
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