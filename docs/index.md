---
layout: default
title: Home
---

Timing has come to the Web.

> **Timingsrc** provides a new programming model for precisely timed Web applications, based on the [timing object](http://webtiming.github.io/timingobject/).

For **multi-device** timing support, simply plug a *timing provider* into your *timing object*. [Shared Motion](shared_motion.html) by [Motion Corporation](http://motioncorporation.com) provides millisecond precise timing **globally** for Web clients, and is open for non-commercial use.

- Want to provide echoless sync of HTML5 video, globally, in 3 lines of code? 
	- Check out the [MediaSync demo](doc/online_mediasync.html).
- Want to playback timed data simultaneously on devices across the world? 
	- Check out the [Sequencer demo](doc/online_sequencer.html).
- Want to make your own multi-device timing demo? 
	- Check out the [Shared Motion](doc/shared_motion.html) timing provider.




## Standardization

The [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/) advocates standardization of the timing object.
Agreement on a common API for timing resources would enable:

#### 1) temporal interoperability
very different timing sensitive components could easily be integrated into a single consistent presentation. This would allow the classical fruits of composition, i.e. mash-up, integration, code-reuse, flexibility and extensibility to be fully exploited by timing sensitive Web applications.

#### 2) multi-device timing
timing objects integrate with online timing providers allowing multi-device application to exploit temporal composition in the global scope.

#### 3) common programming concepts, tools and practices
timing challenges can be addressed using the same concepts and tools, across separate application domains (e.g. music, broadcast, Web-media). New concepts and tools building on a standard will apply to a much broader community.

#### 4) separation of concerns
online timing providers may focus on the challenges of distributed timing, while application developers may focus on exploiting timing for the purpose of creating great user experiences.     




## Relation to timing object specification

The timingsrc library serves as a reference implementation for the [Timing Object Draft Spec](http://webtiming.github.io/timingobject/) and will be maintained by the [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/).

## Authors

Ingar M. Arntzen 

- [ingar.arntzen@norut.no](mailto://ingar.arntzen@norut.no), [ingar.arntzen@motioncorporation.com](mailto://ingar.arntzen@motioncorporation.com)
- [github.com/ingararntzen](https://github.com/ingararntzen)
- [twitter.com/ingararntzen](https://twitter.com/ingararntzen)

Njål T. Borch

- [njaal.borch@norut.no](mailto://njaal.borch@norut.no), [njaal.borch@motioncorporation.com](mailto://njaal.borch@motioncorporation.com)
- [github.com/snarkdoof](https://github.com/snarkdoof)
- [twitter.com/njaalborch](https://twitter.com/njaalborch)


## Acknowledgements

The timingsrc library is developed at [Norut Northern Research Institute](http://norut.no/) and funded in part by the [EU FP7 MediaScape project](http://mediascapeproject.eu). Results are contributed from MediaScape as reference implementation to the [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/).


## License

Copyright 2015 Norut Northern Research Institute.

Authors : Ingar Mæhlum Arntzen, Njål Trygve Borch

Timingsrc is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Timingsrc is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with the timingsrc library.  If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).


