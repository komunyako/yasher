/*!
 * Event Burrito is a touch / mouse / pointer event unifier
 * https://github.com/wilddeer/Event-Burrito
 * Copyright Oleg Korsunsky | http://wd.dizaina.net/
 *
 * MIT License
 */
function EventBurrito(_this, options) {

    var noop = function() {},
        o = {
            preventDefault: false,
            clickTolerance: 0,
            preventScroll: false,
            mouse: false,
            start: noop,
            move: noop,
            end: noop,
            click: noop
        };

    //merge user options into defaults
    options && mergeObjects(o, options);

    var support = {
            pointerEvents: !!window.navigator.pointerEnabled,
            msPointerEvents: !!window.navigator.msPointerEnabled
        },
        start = {},
        diff = {},
        speed = {},
        stack = [],
        listeners = [],
        isScrolling,
        eventType,
        clicksAllowed = true, //flag allowing default click actions (e.g. links)
        eventModel = (support.pointerEvents? 1 : (support.msPointerEvents? 2 : 0)),
        events = [
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'], //touch events
            ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'], //pointer events
            ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel'], //IE10 pointer events
            ['mousedown', 'mousemove', 'mouseup', false] //mouse events
        ],
        //some checks for different event types
        checks = [
            //touch events
            function(e) {
                //skip the event if it's multitouch or pinch move
                return (e.touches && e.touches.length > 1) || (e.scale && e.scale !== 1);
            },
            //pointer events
            function(e) {
                //Skip it, if:
                //1. event is not primary (other pointers during multitouch),
                //2. left mouse button is not pressed,
                //3. mouse drag is disabled and event is not touch
                return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== 'touch' && e.pointerType !== 'pen');
            },
            //IE10 pointer events
            function(e) {
                //same checks as in pointer events
                return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== e.MSPOINTER_TYPE_TOUCH && e.pointerType !== e.MSPOINTER_TYPE_PEN);
            },
            //mouse events
            function(e) {
                //skip the event if left mouse button is not pressed
                //in IE7-8 `buttons` is not defined, in IE9 LMB is 0
                return (e.buttons && e.buttons !== 1);
            }
        ];

    function mergeObjects(targetObj, sourceObject) {
        for (var key in sourceObject) {
            if (sourceObject.hasOwnProperty(key)) {
                targetObj[key] = sourceObject[key];
            }
        }
    }

    function addEvent(el, event, func, bool) {
        if (!event) return;

        el.addEventListener? el.addEventListener(event, func, !!bool): el.attachEvent('on'+event, func);

        //return event remover to easily remove anonymous functions later
        return {
            remove: function() {
                removeEvent(el, event, func, bool);
            }
        };
    }

    function removeEvent(el, event, func, bool) {
        if (!event) return;

        el.removeEventListener? el.removeEventListener(event, func, !!bool): el.detachEvent('on'+event, func);
    }

    function preventDefault(event) {
        event.preventDefault? event.preventDefault() : event.returnValue = false;
    }

    function getDiff(event) {
        diff = {
            x: (eventType? event.clientX : event.touches[0].clientX) - start.x,
            y: (eventType? event.clientY : event.touches[0].clientY) - start.y,

            time: Number(new Date) - start.time
        };

        if (diff.time - stack[stack.length - 1].time) {
            for (var i = 0; i < stack.length - 1 && diff.time - stack[i].time > 80; i++);

            speed = {
                x: (diff.x - stack[i].x) / (diff.time - stack[i].time),
                y: (diff.y - stack[i].y) / (diff.time - stack[i].time)
            };

            if (stack.length >= 5) stack.shift();
            stack.push({x: diff.x, y: diff.y, time: diff.time});
        }
    }

    function tStart(event, eType) {
        clicksAllowed = true;
        eventType = eType; //leak event type

        if (checks[eventType](event)) return;

        //attach event listeners to the document, so that the slider
        //will continue to recieve events wherever the pointer is
        addEvent(document, events[eventType][1], tMove);
        addEvent(document, events[eventType][2], tEnd);
        addEvent(document, events[eventType][3], tEnd);

        //fixes WebKit's cursor while dragging
        if (o.preventDefault && eventType) preventDefault(event);

        //remember starting time and position
        start = {
            x: eventType? event.clientX : event.touches[0].clientX,
            y: eventType? event.clientY : event.touches[0].clientY,

            time: Number(new Date)
        };

        //reset
        isScrolling = undefined;
        diff = {x:0, y:0, time: 0};
        speed = {x:0, y:0};
        stack = [{x:0, y:0, time: 0}];

        o.start(event, start);
    }

    function tMove(event) {
        //if user is trying to scroll vertically -- do nothing
        if ((!o.preventScroll && isScrolling) || checks[eventType](event)) return;

        getDiff(event);

        if (Math.abs(diff.x) > o.clickTolerance || Math.abs(diff.y) > o.clickTolerance) clicksAllowed = false; //if there was a move -- deny all the clicks before the next touchstart

        //check whether the user is trying to scroll vertically
        if (isScrolling === undefined && eventType !== 3) {
            //assign and check `isScrolling` at the same time
            if (isScrolling = (Math.abs(diff.x) < Math.abs(diff.y)) && !o.preventScroll) return;
        }

        if (o.preventDefault) preventDefault(event); //Prevent scrolling

        o.move(event, start, diff, speed);
    }

    function tEnd(event) {
        eventType && getDiff(event);

        //IE likes to focus links after touchend.
        //Since we don't want to disable link outlines completely for accessibility reasons,
        //we just defocus it after touch and disable the outline for `:active` links in css.
        //This way the outline will remain visible when using keyboard.
        !clicksAllowed && event.target && event.target.blur && event.target.blur();

        //detach event listeners from the document
        removeEvent(document, events[eventType][1], tMove);
        removeEvent(document, events[eventType][2], tEnd);
        removeEvent(document, events[eventType][3], tEnd);

        o.end(event, start, diff, speed);
    }

    function init() {
        //bind touchstart
        listeners.push(addEvent(_this, events[eventModel][0], function(e) {tStart(e, eventModel);}));
        //prevent stuff from dragging when using mouse
        listeners.push(addEvent(_this, 'dragstart', preventDefault));

        //bind mousedown if necessary
        if (o.mouse && !eventModel) {
            listeners.push(addEvent(_this, events[3][0], function(e) {tStart(e, 3);}));
        }

        //No clicking during touch
        listeners.push(addEvent(_this, 'click', function(event) {
            clicksAllowed? o.click(event): preventDefault(event);
        }));
    }

    init();

    //expose the API
    return {
        getClicksAllowed: function() {
            return clicksAllowed;
        },
        kill: function() {
            for (var i = listeners.length - 1; i >= 0; i--) {
                listeners[i].remove();
            }
        }
    }
}

(function($){
    var yasherID = 1;
    var $W = $(window);
    $.fn.yasher = function () {
        return $(this).each(function (i, yasher) {
            var $yasher = $(yasher);

            var data = $yasher.data('yasher') ? $yasher.data('yasher')() : {};
            var ID = data.id ? data.id : yasherID++;
            var nameSpace = '.yasher-'+ ID;

            var $main = $yasher.find('.yasher-list');
            var $mainIn = $main.find('.yasher-list-items');
            var $mainItems = $main.find('.yasher-item');
            var $nav = $yasher.find('.yasher-nav');
            var vars = {
                burrito: data.burrito ? data.burrito : null,
                timerUpdate: null,
                shiftToChange: 20,
                diffW: 0,
                mainWidth: 0,
                mainItemsWidth: 0,
                mainItemsMargin: 0,
                mainItemsWidths: [],
                mainItemsLength: 0,
                mainItemsPositions: [],
                currentPos: 0,
                currentIndex: !isNaN(data.currentIndex) ? data.currentIndex : 0
            };
            var methods = {};

            methods.update = function (time) {
                vars.timerUpdate && clearTimeout(vars.timerUpdate);
                vars.timerUpdate = setTimeout(function(){
                    methods.dimensions();
                    methods.reposition(vars.currentPos);
                }, isNaN(time) ? 400 : time);
            };

            methods.dimensions = function () {
                vars.mainWidth = $main.width();
                vars.mainItemsWidth = 0;
                vars.mainItemsWidths = [];
                vars.mainItemsLength = $mainItems.length;
                vars.mainItemsPositions = [];

                $mainItems.each(function(i, item){
                    if ( i == 0 ) {
                        vars.mainItemsMargin = (parseFloat($(item).css('margin-left')));
                    }
                    vars.mainItemsWidth += vars.mainItemsWidths[i] = ($(item).outerWidth(true));
                    vars.mainItemsPositions[i] = ($(item).position().left);
                });

                vars.diffW = (vars.mainItemsWidth - vars.mainWidth - vars.mainItemsMargin*2);
                if ( Math.floor(vars.diffW) <= 0 ) {
                    vars.diffW = 0;
                    methods.detachEvents();
                }
                else {
                    methods.attachEvents();
                }
                vars.currentPos = vars.mainItemsPositions[vars.currentIndex];
            };

            methods.getClosestItemToLeft = function (position, shift) {
                var _position = Math.abs(position);
                var _index = 0;

                for (var i = vars.mainItemsLength - 1; i >= 0; i--) {
                    if ( shift > vars.shiftToChange && _position <= vars.mainItemsPositions[i] ) {
                        _index = i;
                    }
                    else if ( shift < -1*vars.shiftToChange && _position <= vars.mainItemsPositions[i] + vars.mainItemsWidths[i] ) {
                        _index = i;
                    }
                    else if ( _position <= vars.mainItemsPositions[i] ) {
                        _index = i;
                    }
                }
                return _index;
            };

            methods.goTo = function (index, anim) {
                var _index = index < 0 ? 0 : index > vars.mainItemsLength-1 ? vars.mainItemsLength-1 : index;
                methods.reposition(vars.mainItemsPositions[_index], undefined, anim)
            };

            methods.checkEdges = function (position) {
                position = Math.round(position);
                if ( position >= 0 ) {
                    $yasher.addClass('at-left');
                }
                else {
                    $yasher.removeClass('at-left');
                }

                if ( Math.abs(position) >=  Math.floor(vars.diffW) ) {
                    $yasher.addClass('at-right');
                }
                else {
                    $yasher.removeClass('at-right');
                }
            };

            methods.reposition = function (diffX, shift, noAnim) {
                if ( isNaN(diffX) ) return;

                if ( noAnim ) $mainIn.removeClass('transition');


                var _position = (diffX);
                var _diffX = 0;
                var _index = 0;

                if ( shift > vars.shiftToChange ) {
                    if ( _position > 0 ) {
                        _index = 0;
                    }
                    else {
                        _position = Math.abs(diffX);
                        for (var i = vars.mainItemsLength - 1; i >= 0; i--) {
                            if ( _position <= vars.mainItemsPositions[i] ) {
                                _index = i;
                            }
                        }
                    }
                    vars.currentIndex = _index = (_index - 1 < 0 ? 0 : _index - 1);
                    _diffX = vars.mainItemsPositions[_index];
                }

                if ( shift < -vars.shiftToChange ) {
                    _position = Math.abs(diffX);
                    for (var i = 0; i <= vars.mainItemsLength - 1; i++) {
                        if ( vars.mainItemsPositions[i] + vars.mainItemsWidths[i] <= _position + vars.mainWidth + vars.mainItemsMargin*2) {
                            _index = i;
                        }
                    }
                    vars.currentIndex = _index = (_index + 1 > (vars.mainItemsLength-1) ? (vars.mainItemsLength-1) : _index + 1);
                    _diffX = vars.mainItemsPositions[_index] - vars.mainWidth + vars.mainItemsWidths[_index] - vars.mainItemsMargin*2;
                }

                if ( isNaN(shift) ) {
                    _position = Math.abs(diffX);
                    for (var i = 0; i <= vars.mainItemsLength - 1; i++) {
                        if ( vars.mainItemsPositions[i] == _position) {
                            _index = i;
                        }
                    }
                    vars.currentIndex = _index;
                    _diffX = diffX;
                }

                if ( Math.abs(shift) > vars.shiftToChange || isNaN(shift) ) {
                    _diffX = -Math.abs(_diffX <= 0 ? 0 : _diffX >= vars.diffW ? vars.diffW : _diffX);
                }
                else {
                    _diffX = -Math.abs(vars.currentPos);
                }

                vars.currentPos = _diffX;

                $mainIn.css({
                    transform: 'translate3d('+ _diffX +'px, 0, 0)'
                });
                if ( !noAnim ) {
                    $mainIn.addClass('transition');
                }
                else {
                    setTimeout(function(){
                        $mainIn.addClass('transition');
                    }, 10);
                }

                methods.checkEdges(_diffX);

            };

            methods.attachEvents = function () {
                methods.detachEvents();

                var _diffX = 0;
                var _diffW = 0;
                var _startX = 0;

                vars.burrito = EventBurrito($main[0], {
                    mouse: true,
                    preventDefault: true,
                    start: function (event, start, diff, speed) {
                        $mainIn.removeClass('transition');
                        $yasher.addClass('is-touching');

                        _startX = vars.currentPos;
                        _diffW = vars.diffW;
                    },
                    move: function (event, start, diff, speed) {
                        _diffX = _startX + diff.x;
                        _diffX = _diffX > 0 ? (_diffX - (_diffX)/1.25) : ( Math.abs(_diffX) > _diffW ? _diffX + (Math.abs(_diffX) - _diffW)/1.25 : _diffX );

                        $mainIn.css({
                            transform: 'translate3d('+ _diffX +'px, 0, 0)'
                        });

                        methods.checkEdges(_diffX);
                    },
                    end: function (event, start, diff, speed) {
                        methods.reposition((Math.abs(diff.x) > 20 ? _diffX : _startX), diff.x);
                        $yasher.removeClass('is-touching');
                    }
                });

                $W.on('resize'+nameSpace, function (e) {
                    methods.update();
                });

                $nav.on('click'+nameSpace, '.yasher-nav-prev', function (e) {
                    e.preventDefault();

                    methods.goTo(vars.currentIndex-1);
                });

                $nav.on('click'+nameSpace, '.yasher-nav-next', function (e) {
                    e.preventDefault();

                    methods.goTo(vars.currentIndex+1);
                });

            };

            methods.detachEvents = function () {
                $nav.off(nameSpace);
                if ( vars.burrito ) vars.burrito.kill();
            };

            methods.getData = function () {
                return {
                    id: ID,
                    burrito: vars.burrito,
                    currentIndex: vars.currentIndex
                }
            };

            methods.init = function () {
                methods.attachEvents();
                methods.dimensions();
                if ( data ) methods.goTo(vars.currentIndex, true);

                methods.checkEdges(vars.currentPos);

                $yasher.addClass('is-inited').data('yasher', methods.getData).data('yasher-api', {
                    update: methods.update,
                    reposition: methods.reposition,
                    goTo: methods.goTo,
                    $items: vars.$mainItems
                });
            };

            methods.init();
        });
    };
})(jQuery);
