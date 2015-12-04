---
layout: default
title: Home
---

## Timing Object

The timingsrc library is a JavaScript implementation of the timing object programming model, introduced in the [Timing Object Draft Spec](http://webtiming.github.io/timingobject/). Here are some key points:

- timing object defines a common API for timing resources
- timing sensitive components take direction from (slave to) timing objects
- timing and synchronization
	- multiple timing sensitive components connected to the same timing object implies correctly timed and synchronized behavior
- symmetric timing control
	- timing sensitive components may request a timing object to change (i.e. time-shift, pause, speed-up), thereby equally affecting all connected components
- timing providers
	- different timing resources from different origins can be made available as timing objects
	- distributed timing, synchronization and control available through online timing providers

An introduction to the timing object programming model is available in [Doc](doc/).

## Standardization

The [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/) advocates standardization of the timing object. Agreement on a common API for timing resources would enable:

- temporal composition
	- very different timing sensitive components could easily be integrated into a single consitent presentation. This would allow the classical fruits of composition, i.e. mash-up, integration, code-reuse, flexibility and extensibility, to be fully exploited by timing sensitive Web applications.
- common concepts and tools
	- timing challenges can be addressed using the same concepts and tools, across separate application domains (e.g. music, broadcast, Web-media). New concepts and tools building on a standard will also apply to a much broader community.  
- separation of concernes
	- online timing providers may focus on the challenges of distributed timing, while application developers may focus on exploiting timing for the purpose of creating great user experiences.     

There is a strong analogy to the introduction of *sockets* in the 80'ies. Sockets provided a unified API to different types of communication. Now we similarly wish to provide a unified API for different types of timing resources. It's about time!


## Relation to timing object specification

The timinsrc library serves a reference implementation for the [Timing Object Draft Spec](http://webtiming.github.io/timingobject/) and will be maintained by the [W3C Multi-device Timing Community Group](https://www.w3.org/community/webtiming/).

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


