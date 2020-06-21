/*
    Copyright 2020
    Author : Ingar Arntzen

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

define(function(require) {

    const util = require("../util/util");
    const Interval = require("../util/interval");
    const Axis = require("./axis");

    /*******************************************************************
     ENTER EXIT
    *******************************************************************/

    /*

        This table describes cue changes to/from active state
        based on

        - to_role - the role of the timing object

          in the case of the double sequencer a timing object
          may be *LEFT* (L), *RIGHT* (R) or, in the corner case that
          the two timing objects are at the same position,
          *SINGULAR* (S)

          in the case of the single sequencer, the role is
          always *SINGULAR* (S)


        - to_direction - the direction of the movement of the
          timing object, either *RIGHT* (R) or *LEFT* (L)

          This map is only used when timing object is in a
          moving state, so *PAUSED* (P) is not needed.

        - endpoint_type - the type of endpoint which is
          passed by the timing object during motion, either
          *LEFT* (R) endpoint or *RIGHT* (R) endpoint, or
          *SINGULAR* (S) endpoint.

        - cue_change
          *ENTER* : cue changes from not active to active
          *EXIT*: cue changes from active to not active
          *STAY*: cue stays active
          *ENTER-EXIT*: cue changes from not active to active,
                        and immediately back agoind to not active
                        This only occurs when a *SINGULAR*
                        timing object passed a *SINGULAR* cue.


        Table columns are:

        | to_role | to_direction | endpoint_type | cue change |

        left, right, left -> stay
        left, right, right -> exit
        left, right, singular -> exit

        left, left, left -> stay
        left, left, right -> enter
        left, left, singular -> enter

        right, right, left -> enter
        right, right, right -> stay
        right, right, singular -> enter

        right, left, left -> exit
        right, left, right -> stay
        right, left, singular -> exit

        // cornercase - timing objects are the same

        singular, right, left -> enter
        singular, right, right -> exit
        singular, right, singular -> enter, exit

        singular, left, left -> exit
        singular, left, right -> enter
        singular, left, singular -> enter, exit

    */

    const Active = Object.freeze({
        ENTER: 1,
        STAY: 0,
        EXIT: -1,
        ENTER_EXIT: 2
    });

    const ACTIVE_MAP = new Map([
        ["LRL", Active.STAY],
        ["LRR", Active.EXIT],
        ["LRS", Active.EXIT],
        ["LLL", Active.STAY],
        ["LLR", Active.ENTER],
        ["LLS", Active.ENTER],
        ["RRL", Active.ENTER],
        ["RRR", Active.STAY],
        ["RRS", Active.ENTER],
        ["RLL", Active.EXIT],
        ["RLR", Active.STAY],
        ["RLS", Active.EXIT],
        ["SRL", Active.ENTER],
        ["SRR", Active.EXIT],
        ["SRS", Active.ENTER_EXIT],
        ["SLL", Active.EXIT],
        ["SLR", Active.ENTER],
        ["SLS", Active.ENTER_EXIT]
    ]);


    /*******************************************************************
     AXIS CALLBACK
    *******************************************************************/

    function isNoop(delta) {
        return (delta.interval == Axis.Delta.NOOP && delta.data == Axis.Delta.NOOP);
    }

    const Match = [
        Interval.Relation.OVERLAP_LEFT,
        Interval.Relation.COVERED,
        Interval.Relation.EQUALS,
        Interval.Relation.COVERS,
        Interval.Relation.OVERLAP_RIGHT
    ];

    /*
        make exit, change and enter events
        - based on eventMap
    */
    function events_from_axis_events(axis, activeCues, eventMap, interval) {
        const enterEvents = [];
        const changeEvents = [];
        const exitEvents = [];
        const first = activeCues.size == 0;
        let is_active, should_be_active, _item;
        for (let item of eventMap.values()) {
            if (isNoop(item.delta)) {
                continue;
            }
            // exit, change, enter events
            is_active = (first) ? false : activeCues.has(item.key);
            should_be_active = false;
            if (item.new != undefined) {
                let relation = item.new.interval.compare(interval);
                if (Match.includes(relation)) {
                    should_be_active = true;
                }
            }
            if (is_active && !should_be_active) {
                // exit
                _item = {key:item.key, new:undefined, old:item.old};
                exitEvents.push(_item);
            } else if (!is_active && should_be_active) {
                // enter
                _item = {key:item.key, new:item.new, old:undefined};
                enterEvents.push(_item);
            } else if (is_active && should_be_active) {
                // change
                _item = {key:item.key, new:item.new, old:item.old};
                changeEvents.push(_item);
            }
        };
        return [exitEvents, changeEvents, enterEvents];
    }

    /*
        make exit, change and enter events
        - based on axis.lookup
    */
    function events_from_axis_lookup(axis, activeCues, eventMap, interval) {

        /*
            Active cues

            find new set of active cues by querying the axis
        */
        const _activeCues = new Map(axis.lookup(interval).map(function(cue) {
            return [cue.key, cue];
        }));

        let changeEvents = [];
        let exitEvents = [];
        let first = (activeCues.size == 0);
        if (!first){

            /*
                Change Events

                change cues - cues which are modified, yet remain active cues
            */
            let remainCues = util.map_intersect(activeCues, _activeCues);
            if (remainCues.size > 0) {
                /*
                    Two approaches

                    1) large eventMap
                    eventMap larger than remainCues
                    - iterate remainCues
                    - keep those that are found in eventMap

                    2) large remainCues
                    remainCues larger than eventMap
                    - iterate eventMap
                    - keep those that are found in remainCues

                    measurement shows that 2) is better
                */
                let cue, _item;
                for (let item of eventMap.values()) {
                    cue = remainCues.get(item.key);
                    if (cue != undefined && !isNoop(item.delta)) {
                        _item = {key:item.key, new:item.new, old:item.old};
                        changeEvents.push(_item);
                    }
                }
            }

            /*
                Exit Events
                exit cues were in old active cues - but not in new
            */
            let exitCues = util.map_difference(activeCues, _activeCues);
            exitEvents = [...exitCues.values()]
                .map(cue => {
                    return {key:cue.key, new:undefined, old:cue};
                });
        }

        /*
            Enter Events
            enter cues were not in old active cues - but are in new
        */
        let enterCues;
        if (first) {
            enterCues = _activeCues
        } else {
            enterCues = util.map_difference(_activeCues, activeCues);
        }
        let enterEvents = [...enterCues.values()]
            .map(cue => {
                return {key:cue.key, new:cue, old:undefined};
            });

        return [exitEvents, changeEvents, enterEvents];
    }



    return {
        Active,
        ACTIVE_MAP,
        events_from_axis_events,
        events_from_axis_lookup
    };
});

