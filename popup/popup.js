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
        $('#fieldsEnabledWhenHueReady').find('input,button,select,textarea').disabled('disabled', !!enable);
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
    $('#allOnButton').click(function() {
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

    $('#testImg').on('load', function() {
        var lightIds = Object.keys(hueLights);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0, this.width, this.height);
        var colors = util.findUsedColors(ctx.getImageData(0, 0, canvas.width, canvas.height), lightIds.length);

        for (var i = 0; i < lightIds.length; i++) {
            var color = colors[i];
            var hsb = util.rgbToHsv(color.r, color.g, color.b);
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
        console.log(colors);
    });
});
