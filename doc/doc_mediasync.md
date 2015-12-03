---
layout: default
title: Home
demoappid: 8456579076771837888
demojs: index
---

## MediaSync demo

Open this page on multiple (audio-capable) devices to appreciate live multi-device synchronization. If you've got video playback up and running on multiple devices, try reloading one of them to see how that works.

<div id="demo" style="height:50px"></div>
<video id="player" style="height:200px">
	<source src="http://mcorp.no/res/bigbuckbunny.webm" type="video/webm" />
	<source src="http://mcorp.no/res/bigbuckbunny.m4v" type="video/mp4" />
</video>

Also, check out more demos on YouTube - [Motion Corporation](https://www.youtube.com/channel/UCJ6nDda6IWhEAJ0TUTQ0P1w)

## MediaSync report

The MediaSync libray pushes on quite a few limits in regards to media elements and synchronization.  A report is being written with various analysis of both media elements and the results of the MediaSync libray.  Please have a look at the report if you have or wish to avoid issues.

[Preliminary report (GDoc)](https://docs.google.com/document/d/1d2P3o3RZmilBx1MzMFFDDj5JnF8Yoi-t9EkJKzV90Ak/edit?usp=sharing)


## MediaSync in a nutshell

Playback in HTML5 media elements is directed by end-user interaction through built-in media controls (e.g. play, pause, seek), as well as internal time-consumption related to network connections, buffering and decoding. As a result, media element do playback in their own time frame. In the context of media synchronization, this is problematic, as it makes it hard to achieve precisely coordinated playback of multiple media elements.

Ideally, we would like HTML5 media elements to be extended with support for *timed playback mode*, implying that media elements would internally align their playback presentation to an external timing source. If so, synchronization would only be a matter of supplying multiple media elements with a shared timing source. This idea is detailed further in the [timing object](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) draft specification.

However, as *timed playback mode* is not yet a part of the HTML standard, the MediaSync library provides a temporary work around. MediaSync implements *timed playback* in JavaScript, by forcing a media element to align its playback to a [timing object](http://webtiming.github.io/timingobject/). It does this by means of seeking and adjustments to variable playbackrate during playback. 

MediaSync is a common purpose library, not optimised for any particular combination of OS, media codecs or browser implementation. Despite this, and despite a number weaknesses in HTML5 media elements with respect to precise timing, MediaSync has been demonstrated the feasibility of echoless synchronization in multi-device media playback, across the Internet. See for instance the [Carnival](https://www.youtube.com/watch?v=lfoUstnusIE) demonstration on YouTube. 


## Relation to timing object specification

The draft specification for the [timing object](http://webtiming.github.io/timingobject) specifies [timed playback mode](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) as an extension for HTML media elements. While the JavaScript MediaSync library may provide a good user experience for timed media media, given certain assumptions, standardization is assumed to bring further improvement with respect to precision, time-to-sync, effectiveness, reliability and interoperability. This is particularly important for a successful experience on mobile. 


## Dependencies

The MediaSync implementation currently depends on [Shared Motion](http://motioncorporation.com), a JavaScript implementation of the [TimingObject](http://webtiming.github.io/timingobject), provided by the [Motion Corporation](http://motioncorporation.com). Shared Motion comes with built-in support for online synchronization. MediaSync will be updated to interface with implementation of TimingObject API. Both MediaSync and Shared Motion are vanilla JavaScript and should run in every modern Web browser.

## Authors

Njål T. Borch

- [njaal.borch@motioncorporation.com](mailto://njaal.borch@motioncorporation.com)
- [github.com/snarkdoof](https://github.com/snarkdoof)
- [twitter.com/njaalborch](https://twitter.com/njaalborch)

## Acknowledgements

The development of the MediaSync library is funded in part by the [EU FP7 MediaScape project](http://mediascapeproject.eu), and results are contributed as reference implementation to the W3C Multi-device Timing Community Group.

MediaSync is joint work with Ingar M. Arntzen 

- [ingar.arntzen@motioncorporation.com](mailto://ingar.arntzen@motioncorporation.com)
- [github.com/ingararntzen](https://github.com/ingararntzen)
- [twitter.com/ingararntzen](https://twitter.com/ingararntzen)

## License

Copyright 2015 Norut Northern Research Institute.

Author : Njål Trygve Borch

MediaSync is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

MediaSync is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with MediaSync.  If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).


