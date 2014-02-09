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
            var iframe = $('<iframe></iframe>')
                .css({
                    'border' : 'none'
                })
                .attr({
                    'srcdoc' : '<body style="margin: 0;padding: 0;overflow: hidden;text-align: center;"><button>Connect to hue</button></body>',
                    'sandbox' : 'allow-same-origin allow-scripts'
                })
                .appendTo(messageContent)
                .on('load', function () {
                    next(null, $(this));
                })
            ;
        }, function (iframe, next) {
            var button = iframe.contents().find('button');
            iframe.width(button.outerWidth() + 10);
            iframe.height(button.outerHeight() + 5);
            button.on('click', function () {
                // drop arguments
                next();
            });
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
                chrome.storage.local.get('hueURL', function (item) {
                    next(null, item['hueURL']);
                });
            }, function (hueURL, next) {
                if (!hueURL) {
                    return next();
                }

                $.ajax({
                    url: hueURL,
                    type: "get",
                    dataType: "json",
                    timeout: 3000
                }).done(function (results) {
                    if (!results.lights) {
                        return next();
                    }
                    asyncComplete(
                        null,
                        hueURL,
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
            }, function (result, next) {
                messageContent.text('Connected');
                var url = "http://" + result.baseIP + "/api/" + result.username;
                chrome.storage.local.set({'hueURL' : url}, function () {
                    next(null, url);
                });
            }, function (baseURL, next) {
                $.getJSON(baseURL + '/lights')
                    .done(function (results) {
                        if (typeof results === Array && results[0].error) {
                            console.error(results[0].error);
                            return alert('エラー');
                        }
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
                canvas.width = $(source).width();
                canvas.height = $(source).height();
                var ctx = canvas.getContext('2d');

                next(null, source, ctx, canvas.width, canvas.height);
            }, function changeLight (source, ctx, width, height, next) {
                if (source.paused || source.ended) {
                    // stop capture
                    return next();
                }

                ctx.drawImage(source, 0, 0, width, height);
                var imageData = ctx.getImageData(0, 0, width, height);
                util.findUsedColors(imageData, lightIds.length, function(error, colors) {
                    if (error) {
                        console.error(error);
                        return alert('色の解析に失敗しました');
                    }
                    if (!colors.length) {
                        return recursiveCall();
                    }
                    console.log(colors);
                    for (var i = 0; i < lightIds.length; i++) {
                        var color = colors[i];
                        var hsb = util.rgbToHsv(color.r, color.g, color.b);
                        console.log(hsb);

                        $.putJSON(baseURL + '/lights/' + lightIds[i] + '/state', {
                            on: true,
                            hue: Math.floor(65535 * hsb.h / 360),
                            sat: Math.floor(255 * hsb.s / 100),
                            bri: Math.floor(255 * hsb.v / 100)
                        })
                            .done(function (results) {
                                console.log(arguments);
                            })
                            .fail(function () {
                                console.log(arguments);
                            })
                            .always(recursiveCall)
                        ;
                    }
                    function recursiveCall () {
                        setTimeout(changeLight.bind(this, source, ctx, width, height, next), 1000);
                    }
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
