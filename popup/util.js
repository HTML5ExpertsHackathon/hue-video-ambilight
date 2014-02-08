var util = this.util || {};

(function() {
    util.findUsedColors = function(imageData, topN) {
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
            var color = { r: r, g: g, b: b };
            var nearColor = findNearColor(color, usedColors);
            if (nearColor >= 0) {
                usedColors[nearColor].count++;
            } else {
                usedColors.push({
                    color: color,
                    count: 1
                });
            }
        }
        usedColors.sort(function(a, b) {
            return b.count - a.count;
        });
        return usedColors.slice(0, TOP).map(function(obj) {
            return obj.color;
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
    function findNearColor(color, colors) {
        for (var i = 0, n = colors.length; i < n; i++) {
            var color2 = colors[i].color;
            if (isNearColor(color, color2)) {
                return i;
            }
        }
        return -1;
    }
    function isNearColor(color1, color2) {
        var THRESHOLD = 70;
        var rDiff = color1.r - color2.r;
        var gDiff = color1.g - color2.g;
        var bDiff = color1.b - color2.b;
        return (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) < THRESHOLD;
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
