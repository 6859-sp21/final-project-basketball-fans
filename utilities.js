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

const url = (str) => {
    return str + "?q=" + Math.floor(Math.random()*10000)
}

const aggregateShots = (shots) => {
    var homeCountOfThrees = 0
    var homeCountOfTwos = 0
    var visitorCountOfThrees = 0
    var visitorCountOfTwos = 0
    for (var i = 0; i < shots.length; i++) {
        if (shots[i]['TEAM'] === 'home') {
            if (shots[i]['VALUE'] === 2) {
                homeCountOfTwos++
            } else if (shots[i]['VALUE'] === 3) {
                homeCountOfThrees++
            }
        } else if (shots[i]['TEAM'] === 'visitor') {
            if (shots[i]['VALUE'] === 2) {
                visitorCountOfTwos++
            } else if (shots[i]['VALUE'] === 3) {
                visitorCountOfThrees++
            }
        }
    }
    return [homeCountOfThrees, homeCountOfTwos, visitorCountOfThrees, visitorCountOfTwos]
}

const duration = 1000
const sliderDuration = 500
export {stringToColor, coord, url, duration, sliderDuration, aggregateShots}