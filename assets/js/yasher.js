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
            var $mainItems = $mainIn.find('.yasher-item');
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
                }).one('load'+nameSpace, function (e) {
                    methods.update(0);
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
