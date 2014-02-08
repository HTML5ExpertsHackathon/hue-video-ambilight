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
                $('#allOnButton, #allOffButton').removeAttr('disabled');
                $('main').show();
            });
        });
    }
    $('#deviceSettingsForm').submit(function(e) {
        HUE_DEVICE_TYPE = $(this.deviceType).val();
        HUE_USER_NAME = $(this.userName).val();
        var create = this.createUser.checked;

        $('#allOnButton, #allOffButton').attr('disabled', 'disabled');
        
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
                $('#allOnButton, #allOffButton').removeAttr('disabled');
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
});
