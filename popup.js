$(function() {
    'use strict';
    
    var ipAddressOfBridge;
    
    $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
        alert('AJAX Error occurred. Please check console.');
        console.error(jqXHR);
        console.error(thrownError);
    });
    
    $.getJSON('http://www.meethue.com/api/nupnp')
     .done(function(result) {
         // [{"id":"<ID of bridge>","internalipaddress":"<IP of bridge>","macaddress":"<Mac address of bridge>"}]
         ipAddressOfBridge = result[0].internalipaddress;
         $(document.body).append(ipAddressOfBridge);
     });

    function ajaxHueBridge(settings) {
        if (!ipAddressOfBridge) {
            throw 'IP address of bridge is not specified';
        }
        return $.ajax(settings);
    }

    
});
