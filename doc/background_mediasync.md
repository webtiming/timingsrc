---
layout: default
title: Background MediaSync
---

- [MediaSync Background](background_mediasync.html) 
- [MediaSync API](api_mediasync.html)
- [MediaSync Example (page-local)](exp_mediasync.html)
- [MediaSync Example (multi-device)](online_mediasync.html)

## Introduction

Ideally, we would like HTML5 Media Elements to implement [timed playback mode](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) and accept the timing object as timingsrc. However, until this becomes a reality we need to address media synchronization in JavaScript. The MediaSync library is made for this. It is based on a comprehensive study of the behavior of media elements in a variety of browsers. The MediaSync library is not optimised for a specific combinations of browser, media type and architecture, but aims to provide best effort synchronization in very different settings.


## HTML5 Media Sync Report

The MediaSync libray pushes on quite a few limits in regards to media elements and synchronization.  A report has been written with various analysis of both media elements and the effects of the MediaSync libray. Please have a look at the report if you have or wish to avoid issues.

[Preliminary report (GDoc)](https://docs.google.com/document/d/1d2P3o3RZmilBx1MzMFFDDj5JnF8Yoi-t9EkJKzV90Ak/edit?usp=sharing)


## MediaSync in a nutshell

Playback in HTML5 media elements is directed by end-user interaction through built-in media controls (e.g. play, pause, seek), as well as internal time-consumption related to network connections, buffering and decoding. As a result, media element do playback in their own time frame. In the context of media synchronization, this is problematic, as it makes it hard to achieve precisely coordinated playback of multiple media elements.

Ideally, we would like HTML5 media elements to be extended with support for *timed playback mode*, implying that media elements would internally align their playback presentation to an external timing source. If so, synchronization would only be a matter of supplying multiple media elements with a shared timing source. This idea is detailed further in the [timing object](http://webtiming.github.io/timingobject/#media-elements-and-the-timing-object) draft specification.

However, as *timed playback mode* is not yet a part of the HTML standard, the MediaSync library provides a temporary work around. MediaSync implements *timed playback* in JavaScript, by forcing a media element to align its playback to a [timing object](http://webtiming.github.io/timingobject/). It does this by means of seeking and adjustments to variable playbackrate during playback. 

MediaSync is a common purpose library, not optimised for any particular combination of OS, media codecs or browser implementation. Despite this, and despite a number weaknesses in HTML5 media elements with respect to precise timing, MediaSync has been demonstrated the feasibility of echoless synchronization in multi-device media playback, across the Internet. See for instance the [Carnival](https://www.youtube.com/watch?v=lfoUstnusIE) demonstration on YouTube. 


<a name="credits"></a>

## Credits

Njål T. Borch

- [njaal.borch@motioncorporation.com](mailto://njaal.borch@motioncorporation.com)
- [github.com/snarkdoof](https://github.com/snarkdoof)
- [twitter.com/njaalborch](https://twitter.com/njaalborch)

The development of the MediaSync library is funded in part by the [EU FP7 MediaScape project](http://mediascapeproject.eu), and results are contributed as reference implementation to the W3C Multi-device Timing Community Group.

MediaSync is joint work with Ingar M. Arntzen 

- [ingar.arntzen@motioncorporation.com](mailto://ingar.arntzen@motioncorporation.com)
- [github.com/ingararntzen](https://github.com/ingararntzen)
- [twitter.com/ingararntzen](https://twitter.com/ingararntzen)

<a name="licence"></a>

## License

Copyright 2015 Norut Northern Research Institute.

Author : Njål Trygve Borch

MediaSync is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

MediaSync is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with MediaSync.  If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).


