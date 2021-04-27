// Takes a string and outputs a colors
var stringToColor = function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}

// takes "3.5 ft" and outputs 3.5
const coord = (str) => {
    return parseFloat(str.substring(0, str.length - 3))
}

export {stringToColor, coord}