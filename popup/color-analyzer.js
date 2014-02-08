onmessage = function(event) {
    var param = event.data;
    var callId = param.callId;
    var usedColors = findUsedColors(param.imageData, param.topN);
    postMessage({
        callId: callId,
        colors: usedColors
    });
};

function findUsedColors(imageData, topN) {
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
