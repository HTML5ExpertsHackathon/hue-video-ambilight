$(function() {
    'use strict';

    // if (!document.querySelector('video')) {
    // 	return;
    // }

    var messageContent = $('<div></div>').appendTo('body').css({
    	'position' : 'absolute',
    	'right' : 0,
    	'top' : 0
    });


    var HUE_DEVICE_TYPE = 'test user';
    var HUE_USER_NAME = 'newdeveloper';

	var makeNextError = function (next) {
		return function (jqXHR, textStatus, errorThrown) {
			next({ xhr: jqXHR, status: textStatus, error: errorThrown});
		};
	};
	var makeAsyncError = function (next) {
		return function (error, result) {
			if (error) {
				return next(result);
			}
			console.log(error);
			messageContent.text(error.error);
		};
	};

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
		},
		function (next) {
			messageContent.text('Connecting to meethue...');
			next();
		},
		initializeHue
//		fullscreenchange,
	], function () {

	});

	function initializeHue (asyncComplete) {
		// connection to hue
		async.waterfall([
			function (next) {
		        $.getJSON('http://www.meethue.com/api/nupnp')
		            .done(function(result) {
		                // [{"id":"<ID of bridge>","internalipaddress":"<IP of bridge>","macaddress":"<Mac address of bridge>"}]
		                var ip = result && result[0] && result[0].internalipaddress;
		                if(ip && ip.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) {
		                    next(null, ip);
		                } else {
		                    next({ error: "unable to reach hue bridge." });
		                }
		            })
		            .fail(makeNextError(next));
		        ;
			},
			function (baseIP, next) {
				messageContent.text('Connecting to bridge...');
				next(null, baseIP);
			},
			function connect (baseIP, next) {
        		$.ajax(
        			"http://" + baseIP + "/api",
	        		{
	        			type: 'POST',
	        			dataType: 'JSON',
	        			data : JSON.stringify({
	        				"devicetype": HUE_DEVICE_TYPE
	        			})
	        		}
	        	).done(function (results) {
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
    			.fail(makeNextError(next));

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
				next(null, "http://" + result.baseIP + "/api/" + result.username);
			}
		], makeAsyncError(asyncComplete));
	}

	function fullscreenchange (baseURL, asyncComplete) {
	    async.waterfall([
	        function (next) {
	            document.addEventListener('webkitfullscreenchange', function () {
			        if (!document.webkitFullscreenElement) {
			        	return;
			        }

	            	next();
	            });
	        }, function (next) {
        		$.ajax(
        			baseURL + '/lights',
	        		{
	        			type: 'GET',
	        			dataType: 'JSON'
	        		}
	        	).done(function (results) {
	        		next(null, results);
    			})
    			.fail(makeNextError(next));
    		}, function (results, next) {
		        var lightIds = Object.keys(results);

		        var source = document.querySelector('video');

		        var canvas = document.createElement('canvas');
		        canvas.width = source.width;
		        canvas.height = source.height;
		        var ctx = canvas.getContext('2d');

		        next(null, lightIds, source, ctx);
    		}, function changeLight (lightIds, source, ctx, next) {
	            if (source.paused || source.ended) {
	            	// stop capture
	                return next();
	            }

	            ctx.drawImage(source, 0, 0, source.width, source.height);
	            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    			// recursive call
    			setTimeout(changeLight.bind(this, lightIds, source, ctx, next), 5000);
    		}
		], makeAsyncError(asyncComplete));
	}

});
