$(function() {
    'use strict';

    // デバイスタイプとユーザ名は固定とする
    var HUE_DEVICE_TYPE = 'test user';
    var HUE_USER_NAME = 'newdeveloper';
    var hueLights;

    hue.init(function(error, result) {
        if (error) {
            return console.error(error);
        }
        onHueReady();
    });

    function onHueReady() {
        hue.setUser(HUE_DEVICE_TYPE, HUE_USER_NAME, false, function(error, result) {
            if (error) {
                console.error(error);
                return alert('ユーザの設定に失敗しました。');
            }
            $('#deviceType').val(HUE_DEVICE_TYPE);
            $('#userName').val(HUE_USER_NAME);
            
            hue.api('/lights', { type: 'GET' }, function(error, lights) {
                if (error) {
                    console.error(error);
                    return alert('ライト情報の取得に失敗しました。');
                }
                hueLights = lights;
                enableFields();
                $('main').show();
            });
        });
    }
    function enableFields(enable) {
        $('.fieldsEnabledWhenHueReady').find('input,button,select,textarea').attr('disabled', !!enable);
    }
    $('#deviceSettingsForm').submit(function(e) {
        HUE_DEVICE_TYPE = $(this.deviceType).val();
        HUE_USER_NAME = $(this.userName).val();
        var create = this.createUser.checked;

        enableFields(false);
        
        hue.setUser(HUE_DEVICE_TYPE, HUE_USER_NAME, create, function(error, result) {
            if (error) {
                console.error(error);
                return alert('ユーザの設定に失敗しました。');
            }
            hue.api('/lights', { type: 'GET' }, function(error, lights) {
                if (error) {
                    console.error(error);
                    return alert('ライト情報の取得に失敗しました。');
                }
                hueLights = lights;
                enableFields();
            });
        });
        e.preventDefault();
        return false;
    });

    $('#allOnButton').click(function() {
        Object.keys(hueLights).forEach(function(id) {
            hue.api('/lights/' + id + '/state', {
                type: 'PUT',
                data: {
                    on: true
                }
            }, function(error, result) {
                if (error) {
                    return console.error(error);
                }
            });
        });
    });
    $('#allOffButton').click(function() {
        Object.keys(hueLights).forEach(function(id) {
            hue.api('/lights/' + id + '/state', {
                type: 'PUT',
                data: {
                    on: false
                }
            }, function(error, result) {
                if (error) {
                    return console.error(error);
                }
            });
        });
    });

    var timer;
    $('#colorredLightButton').click(function() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            $('#allOffButton').click();
            return;
        }
        var lightIds = Object.keys(hueLights);
        var source = document.getElementById('testImg');
        var w = source.width > 400 ? 400 : source.width;
        var h = Math.floor(w * (source.height / source.width));
        
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');

        function changeLight() {
            if (source.paused || source.ended) {
                return;
            }
            ctx.drawImage(source, 0, 0, w, h, 0, 0, source.width, source.height);
            var imageData = ctx.getImageData(0, 0, w, h);
            util.findUsedColors(imageData, lightIds.length, function(error, colors) {
                if (error) {
                    console.error(error);
                    return alert('色の解析に失敗しました');
                }
                var $palette = $('#palette').children();
                var $palette2 = $('#palette2').children();
                
                for (var i = 0; i < lightIds.length; i++) {
                    var color = colors[i];
                    $($palette[i]).css('backgroundColor', util.rgbToString(color));

                    var hsb = util.rgbToHsv(color.r, color.g, color.b);
                    var hsbStr = 'hsl(' + hsb.h + ',' + hsb.s + '%,' + hsb.v + '%)';
                    $($palette2[i]).css('backgroundColor', hsbStr);
                    console.log('css:' + hsbStr);
                    var hueParam = {
                        on: true,
                        hue: Math.floor(65535 * hsb.h / 360),
                        sat: Math.floor(255 * hsb.s / 100),
                        bri: Math.floor(255 * hsb.v / 100)
                    };
                    console.log(hueParam);
                    hue.api('/lights/' + lightIds[i] + '/state', {
                        type: 'PUT',
                        data: hueParam
                    }, function(error, result) {
                        if (error) {
                            console.error(error);
                            return alert('ライトの色を変更する際にエラーが発生しました。');
                        }
                    });
                }
                timer = setTimeout(changeLight, 5000);
            });
        }
        changeLight();
    });
});
