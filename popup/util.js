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

    // 以下はパフォーマンスチューニング用。あとで削る。
    util.findUsedColorsNoWorker = function(imageData, topN, callback) {
        var NEAR_THRESHOLD = 30;
        var TOP = topN || 3, OPACITY_THRESHOLD = .1;
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
        var result = usedColors.slice(0, TOP).map(function(obj) {
            return obj.color;
        });
        callback(null, result);
    }
})();
