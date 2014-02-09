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
    return usedColors.slice(0, TOP).map(function(obj) {
        return obj.color;
    });
}
