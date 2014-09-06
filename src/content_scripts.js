(function () {
if (!document.querySelector('video')) {
    return;
}

$(function() {
    'use strict';

    var messageContent = $('<div></div>').appendTo('body').css({
        'position' : 'absolute',
        'right' : 0,
        'top' : 0,
        'z-index' : '2999999999' // for YouTube
    });

    var HUE_DEVICE_TYPE = 'Hue Video Ambilight';

    var makeNextError = function (next) {
        return function (jqXHR, textStatus, errorThrown) {
            next({ xhr: jqXHR, status: textStatus, error: errorThrown});
        };
    };
    var makeAsyncError = function (next) {
        return function (error, result) {
            var error = arguments[0];
            if (!error) {
                return next.apply(this, arguments);
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

    window.addEventListener('popstate', function() {
    });

    async.waterfall([
        function (next) {
            $('<iframe></iframe>')
                .css({
                    'border' : 'none'
                })
                .attr({
                    'srcdoc' : '<body style="margin: 0;padding: 0;overflow: hidden;text-align: center;"><button>' + chrome.i18n.getMessage('ConnectToHue') + '</button></body>',
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
            messageContent.text(chrome.i18n.getMessage('InitializeHue'));
            next();
        },
        initializeHue,
        function (baseURL, lightIds, next) {
            messageContent.text(chrome.i18n.getMessage('ReadyToPlay'));
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
                messageContent.text(chrome.i18n.getMessage('ConnectingToMeethue'));
                next();
            }, function (next) {
                $.getJSON('http://www.meethue.com/api/nupnp')
                    .done(function(result) {
                        // [{"id":"<ID of bridge>","internalipaddress":"<IP of bridge>","macaddress":"<Mac address of bridge>"}]
                        var ip = result && result[0] && result[0].internalipaddress;
                        if(ip && ip.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) {
                            next(null, ip);
                        } else {
                            next({ error: chrome.i18n.getMessage('unableToReachHueBridge') });
                        }
                    }).fail(makeNextError(next));
                ;
            },
            function (baseIP, next) {
                messageContent.text(chrome.i18n.getMessage('ConnectingToBridge'));
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
                            next({ error: chrome.i18n.getMessage('unknownErrorDetected'), result : results });
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
                    messageContent.text(chrome.i18n.getMessage('PleasePressLinkButtonOnTheBridge'));
                    setTimeout(function () {
                        connect(baseIP, next);
                    }, 1000);
                }
            }, function (result, next) {
                messageContent.text(chrome.i18n.getMessage('Connected'));
                var url = "http://" + result.baseIP + "/api/" + result.username;
                chrome.storage.local.set({'hueURL' : url}, function () {
                    next(null, url);
                });
            }, function (baseURL, next) {
                $.getJSON(baseURL + '/lights')
                    .done(function (results) {
                        if (typeof results === Array && results[0].error) {
                            return console.error(results[0].error);
                        }
                        next(null, baseURL, Object.keys(results));
                    })
                    .fail(makeNextError(next))
                ;
            }
        ], makeAsyncError(asyncComplete));
    }

    function playVideo (baseURL, lightIds, asyncComplete) {
        async.waterfall([
            function (next) {
                async.parallel(lightIds.map(function (lightId) {
                    return function (done) {
                        $.getJSON(baseURL + '/lights/' + lightId)
                            .done(function (res) {
                                done(null, {
                                    'id' : lightId,
                                    'state' : res['state']
                                });
                            })
                        ;
                    };
                }), function (error, responses) {
                    chrome.storage.local.set({'defaultStatus' : responses}, function () {
                        next();
                    });
                });
            }, function (next) {
                var videos = $('video').on('play', function () {
                    next(null, this);
                }).get();
                videos.filter(function (video) {
                   return !video.paused && !video.ended;
                }).forEach(function (video) {
                   next(null, video);
                });
            }, function (source, next) {
                messageContent.text(chrome.i18n.getMessage('PlayHue'));
                   next(null, source);
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
                util.findUsedColors(imageData, function(error, color) {
                    if (error) {
                        return console.error(error);
                    }
                    console.log(color);
                    async.parallel(lightIds.map(function (lightId, idx) {
                        return function (done) {
                            var hsb = util.rgbToHsv(color.r, color.g, color.b);
                            $.putJSON(baseURL + '/lights/' + lightId + '/state', {
                                hue: Math.floor(65535 * hsb.h / 360),
                                sat: Math.floor(255 * hsb.s / 100),
                                bri: Math.floor(255 * hsb.v / 100),
                                transitiontime: 10
                            }).always(function () { done(); });
                        };
                    }), recursiveCall);
                    function recursiveCall () {
                        setTimeout(changeLight.bind(this, source, ctx, width, height, next), 1000);
                    }
                });
            }, function (next) {
                messageContent.text(chrome.i18n.getMessage('LightsOff'));
                next();
            }, function (next) {
                chrome.storage.local.get('defaultStatus', function (item) {
                    next(null, item['defaultStatus']);
                });
            }, function (status, next) {
                async.parallel(status.map(function (state) {
                    return function (done) {
                        $.putJSON(baseURL + '/lights/' + state['id'] + '/state', state['state'])
                            .done(function () { done(); })
                        ;
                    };
                }), function () {
                    next();
                });
            }, function (next) {
                messageContent.text(chrome.i18n.getMessage('ReadyToPlay'));
                next();
            }
        ], makeAsyncError(asyncComplete));
    }

});

//in worker
var color_analyzer = function(event) {
    var param = event.data;
    var callId = param.callId;
    var usedColor = findUsedColors(param.imageData);
    postMessage({
        callId: callId,
        color: usedColor
    });
};
function findUsedColors(imageData) {
    var NEAR_THRESHOLD = 100;
    var OPACITY_THRESHOLD = .1;
    var usedColors = []; // [{color: {rgb}, count: n}]
    var imageDataArray = imageData.data;
    for (var i = 0, n = imageDataArray.length; i < n; i+=4) {
        var r = imageDataArray[i];
        var g = imageDataArray[i+1];
        var b = imageDataArray[i+2];
        var a = imageDataArray[i+3];
        
        if (a < OPACITY_THRESHOLD) {
            continue;
        }
        var nearColorIndex = -1;
        for (var j = 0, len = usedColors.length; j < len; j++) {
            var usedColor = usedColors[j].color;
            var rDiff = (r - usedColor.r);
            var gDiff = (g - usedColor.g);
            var bDiff = (b - usedColor.b);
            // 近似色が見つかった
            if (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff < NEAR_THRESHOLD) {
                nearColorIndex = j;
                break;
            }
        }
        if (nearColorIndex >= 0) {
            usedColors[nearColorIndex].count++;
        } else{
            usedColors.push({
                color: { r: r, g: g, b: b },
                count: 1
            });
        }
    }
    usedColors.sort(function(a, b) {
        return b.count - a.count;
    });
    var topColors = usedColors.slice(0, 3).map(function(obj) {
        return obj.color;
    });
    var color = topColors.reduce(function (base, target) {
        return Object.keys(target).reduce(function (base, key) {
            base[key] = (base[key] || 0) + target[key];
            return base;
        }, base);
    }, {});
    console.log(color)
    // Object.keys(color).forEach(function (key) {
    //     color[key] /= color.length;
    // });
    return color;
}
var util = (function() {
    var worker = new Worker(URL.createObjectURL(new Blob(['onmessage='+color_analyzer.toString() + ';' + findUsedColors.toString()], {type : "text\/javascript"})));
    
    var util = {};
    util.findUsedColors = function(imageData, callback) {
        var callId = Date.now();
        worker.onmessage = function(event) {
            var result = event.data;
            if (result.callId !== callId) {
                return;
            }
            callback(null, result.color);
        };
        worker.postMessage({
            callId: callId,
            imageData: imageData
        }, [imageData.data.buffer]);
    }
    util.rgbToString = function(color) {
        return '#' + byteToHex(color.r) + byteToHex(color.g) + byteToHex(color.b); 
    }
    
    function byteToHex(n) {
        var hex = n.toString(16);
        if (hex.length === 1) {
            hex = '0' + hex;
        }
        return hex;
    }
    util.rgbToHsv = function(r, g, b) {
        var rr, gg, bb,
        r = r / 255,
        g = g / 255,
        b = b / 255,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };

        if (diff == 0) {
            h = s = 0;
        } else {
            s = diff / v;
            rr = diffc(r);
            gg = diffc(g);
            bb = diffc(b);

            if (r === v) {
                h = bb - gg;
            } else if (g === v) {
                h = (1 / 3) + rr - bb;
            } else if (b === v) {
                h = (2 / 3) + gg - rr;
            }
            if (h < 0) {
                h += 1;
            } else if (h > 1) {
                h -= 1;
            }
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    };
    
    util.rgbToHsl = function(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        
        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    };

    return util;
})();

})();