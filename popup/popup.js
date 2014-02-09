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
        var source = document.getElementById('testVideo');
        
        var canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        var ctx = canvas.getContext('2d');

        function changeLight() {
            if (source.paused || source.ended) {
                return;
            }
            ctx.drawImage(source, 0, 0, source.width, source.height);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
                    hue.api('/lights/' + lightIds[i] + '/state', {
                        type: 'PUT',
                        data: {
                            on: true,
                            hue: hsb.h,
                            sat: hsb.s,
                            bri: hsb.b
                        }
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
