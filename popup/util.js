var util = this.util || {
    'color-analyzer.js' : 'color-analyzer.js'
};

(function() {
    var worker = new Worker(util['color-analyzer.js']);
    
    util.findUsedColors = function(imageData, topN, callback) {
        var TOP = topN || 3;
        var callId = Date.now();
        worker.onmessage = function(event) {
            var result = event.data;
            if (result.callId !== callId) {
                return;
            }
            callback(null, result.colors);
        };
        worker.postMessage({
            callId: callId,
            imageData: imageData,
            topN: topN
        });
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

    util.rgbToHsv = function(r, g, b, coneModel) {
        var h, // 0..360
        s, v, // 0..255
        max = Math.max(Math.max(r, g), b),
        min = Math.min(Math.min(r, g), b);

        // hue の計算
        if (max == min) {
            h = 0; // 本来は定義されないが、仮に0を代入
        } else if (max == r) {
            h = 60 * (g - b) / (max - min) + 0;
        } else if (max == g) {
            h = (60 * (b - r) / (max - min)) + 120;
        } else {
            h = (60 * (r - g) / (max - min)) + 240;
        }
        while (h < 0) {
            h += 360;
        }
        // saturation の計算
        if (coneModel) {
            // 円錐モデルの場合
            s = max - min;
        } else {
            s = (max == 0)
                ? 0 // 本来は定義されないが、仮に0を代入
                : (max - min) / max * 255;
        }
        // value の計算
        v = max;
        return {'h': Math.floor(h), 's': Math.floor(s), 'v': Math.floor(v)};
    }

})();
