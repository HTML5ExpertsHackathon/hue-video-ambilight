(function(_global) {
    'use strict';

    var bridges;

    _global.hue = _global.hue || {};

    hue.init = function(callback) {
        $.getJSON('http://www.meethue.com/api/nupnp')
            .done(function(result) {
                // [{"id":"<ID of bridge>","internalipaddress":"<IP of bridge>","macaddress":"<Mac address of bridge>"}]
                bridges = result;
                callback(null, result);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                callback({ xhr: jqXHR, status: textStatus, error: errorThrown});
            });
        ;
    };

    hue.ajax = function(path, ajaxSettings, callback, indexOfBridge) {
        indexOfBridge = indexOfBridge || 0;
        if (!bridges) {
            throw 'IP address of bridge is not specified';
        }
        var settings = $.extend({}, ajaxSettings);
        // Hueでは通信データは全てJSONなので、リクエストデータをJSON文字列に変換
        if (settings.data && typeof settings.data === 'object') {
            settings.data = JSON.stringify(settings.data);
        }
        // レスポンスもJSONなので、タイプも固定に
        settings.dataType = 'JSON';
        
        var url = 'http://' + bridges[indexOfBridge].internalipaddress + path;
        var deferred = $.ajax(url, settings);
        processHueResponse(deferred, callback);
    };

    hue.api = function(path, ajaxSettings, callback, indexOfBridge) {
        indexOfBridge = indexOfBridge || 0;
        path = '/api/' + bridges[indexOfBridge].userName + path;
        hue.ajax(path, ajaxSettings, callback, indexOfBridge);
    };

    hue.setUser = function(deviceType, userName, create, callback, indexOfBridge) {
        indexOfBridge = indexOfBridge || 0;
        var bridge = bridges[0];
        if (!create) {
            bridge.deviceType = deviceType;
            bridge.userName = userName;
            callback();
        } else {
            hue.ajax('/api', {
                type: 'POST',
                data: { devicetype: deviceType, username: userName }
            }, function(error, result) {
                if (!error) {
                    bridge.deviceType = deviceType;
                    bridge.userName = userName;
                }
                callback(error, result);
            }, indexOfBridge);
        }
    };

    function processHueResponse(ajaxDeferred, callback) {
        ajaxDeferred.done(function(result) {
            if (result instanceof Array && result[0].error) {
                callback(result[0].error);
            } else {
                callback(null, result);
            }
        });
    }
})(this);
