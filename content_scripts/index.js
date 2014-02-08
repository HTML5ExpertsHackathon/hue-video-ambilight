$(function() {
    'use strict';

    if (!document.querySelector('video')) {
        return;
    }

    var messageContent = $('<div></div>').appendTo('body').css({
        'position' : 'absolute',
        'right' : 0,
        'top' : 0
    });

    var HUE_DEVICE_TYPE = 'test user';

    var makeNextError = function (next) {
        return function (jqXHR, textStatus, errorThrown) {
            next({ xhr: jqXHR, status: textStatus, error: errorThrown});
        };
    };
    var makeAsyncError = function (next) {
        return function (error, result) {
            if (!error) {
                return next(null, result);
            }
            console.log(error);
            messageContent.text(error.error);
        };
    };

    jQuery.each( [ "put", "post" ], function( i, method ) {
        jQuery[ method + "JSON" ] = function( url, data, callback, type ) {
            // shift arguments if data argument was omitted
            if ( jQuery.isFunction( data ) ) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            if ( jQuery.isPlainObject( data ) ) {
                data = jQuery.extend(data, {
                    'devicetype' : HUE_DEVICE_TYPE
                })
            }

            return jQuery.ajax({
                url: url,
                type: method,
                dataType: type || "json",
                data: JSON.stringify(data),
                success: callback
            });
        };
    });

    async.waterfall([
        function (next) {
            $('<button>Connect to hue</button>')
                .appendTo(messageContent)
                .css({
                    'margin' : '0',
                    'font' : '-webkit-small-control',
                    'letter-spacing' : 'normal',
                    'word-spacing' : 'normal',
                    'text-transform' : 'none',
                    'text-indent' : '0px',
                    'text-shadow' : 'none',
                    'display' : 'inline-block',
                    'align-items' : 'flex-start',
                    'text-align' : 'center',
                    'cursor' : 'default',
                    'color' : 'buttontext',
                    'padding' : '2px 6px 3px',
                    'border' : '2px outset buttonface',
                    'border-image-source' : 'initial',
                    'border-image-slice' : 'initial',
                    'border-image-width' : 'initial',
                    'border-image-outset' : 'initial',
                    'border-image-repeat' : 'initial',
                    'background-color' : 'buttonface',
                    'box-sizing' : 'border-box',
                    '-webkit-writing-mode' : 'horizontal-tb',
                    '-webkit-appearance' : 'button'
                })
                .on('click', function () {
                    // drop arguments
                    next();
                });
            ;
        }, function (next) {
            messageContent.text('Initialize hue...');
            next();
        },
        initializeHue,
        function (baseURL, lightIds, next) {
            messageContent.text('Ready to play');
            next(null, baseURL, lightIds);
        },
        playVideo
    ]);

    function initializeHue (asyncComplete) {
        // connection to hue
        async.waterfall([
            function (next) {
                if (!localStorage['hueURL']) {
                    return next();
                }

				$.ajax({
	                url: localStorage['hueURL'],
	                type: "get",
	                dataType: "json",
	                timeout: 3000
	            }).done(function (results) {
                    if (!results.lights) {
                        return next();
                    }
                    asyncComplete(
                        null,
                        localStorage['hueURL'],
                        Object.keys(results.lights)
                    );
                }).fail(function () {
                    next();
                });
            }, function (next) {
                messageContent.text('Connecting to meethue...');
                next();
            }, function (next) {
                $.getJSON('http://www.meethue.com/api/nupnp')
                    .done(function(result) {
                        // [{"id":"<ID of bridge>","internalipaddress":"<IP of bridge>","macaddress":"<Mac address of bridge>"}]
                        var ip = result && result[0] && result[0].internalipaddress;
                        if(ip && ip.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) {
                            next(null, ip);
                        } else {
                            next({ error: "unable to reach hue bridge." });
                        }
                    }).fail(makeNextError(next));
                ;
            },
            function (baseIP, next) {
                messageContent.text('Connecting to bridge...');
                next(null, baseIP);
            },
            function connect (baseIP, next) {
                $.postJSON("http://" + baseIP + "/api", {"devicetype": HUE_DEVICE_TYPE, "username": "newdeveloper"} )
                    .done(function (results) {
                        var result = results && results.shift && results.shift();
                        if(result.error) {
                            return errorHandling(result.error);
                        }
                        if (!result.success) {
                            next({ error: "unknown error detected", result : results });
                        }
                        next(null, {
                            'baseIP' : baseIP,
                            'username' : result.success.username
                        });
                    })
                    .fail(makeNextError(next))
                ;

                function errorHandling (error) {
                    if(error.description !== "link button not pressed") {
                        return next({
                            error: "unknown error:" + error.description,
                            result : error
                           });
                    }
                    messageContent.text("Please press link button on the bridge");
                    setTimeout(function () {
                        connect(baseIP, next);
                    }, 1000);
                }
            },
            function (result, next) {
                messageContent.text('Connected');
                var url = "http://" + result.baseIP + "/api/" + result.username;
                localStorage['hueURL'] = url;
                next(null, url);
            }, function (baseURL, next) {
                $.getJSON(baseURL + '/lights')
                    .done(function (results) {
                        next(null, baseURL, Object.keys(results.lights));
                    })
                    .fail(makeNextError(next))
                ;
            }
        ], makeAsyncError(asyncComplete));
    }

    function playVideo (baseURL, lightIds, asyncComplete) {
        async.waterfall([
            function (next) {
                $('video').on('play', function () {
                    next(null, this);
                });
            }, function (source, next) {
                var canvas = document.createElement('canvas');
                canvas.width = source.videoWidth;
                canvas.height = source.videoHeight;
                var ctx = canvas.getContext('2d');

                next(null, source, ctx);
            }, function changeLight (source, ctx, next) {
                if (source.paused || source.ended) {
                    // stop capture
                    return next();
                }

                ctx.drawImage(source, 0, 0, source.videoWidth, source.videoHeight);
                var imageData = ctx.getImageData(0, 0, source.videoWidth, source.videoHeight);
                util.findUsedColors(imageData, lightIds.length, function(error, colors) {
                    if (error) {
                        console.error(error);
                        return alert('色の解析に失敗しました');
                    }
                    console.log(colors);
                    for (var i = 0; i < lightIds.length; i++) {
                        var color = colors[i];
                        var hsb = util.rgbToHsv(color.r, color.g, color.b);
                        console.log(hsb);

                        $.putJSON(baseURL + '/lights/' + lightIds[i] + '/state', {
                            on: true,
                            hue: hsb.h,
                            sat: hsb.s,
                            bri: hsb.b
                        })
                            .done(function (results) {
                                console.log(arguments);
                            })
                            .fail(function () {
                                console.log(arguments);
                            })
                        ;
                    }
                    // recursive call
                    setTimeout(changeLight.bind(this, source, ctx, next), 5000);
                });
            }, function () {
                for (var i = 0; i < lightIds.length; i++) {
                    $.putJSON(baseURL + '/lights/' + lightIds[i] + '/state', {
                        on: false
                    });
                }
            }
        ], makeAsyncError(asyncComplete));
    }

});
