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
    var homeScore = 0
    var visitorScore = 0
    for (var i = 0; i < shots.length; i++) {
        if (shots[i]['TEAM'] === 'home') {
            homeScore += shots[i]['VALUE']
            if (shots[i]['VALUE'] === 2) {
                homeCountOfTwos++
            } else if (shots[i]['VALUE'] === 3) {
                homeCountOfThrees++
            }
        } else if (shots[i]['TEAM'] === 'visitor') {
            visitorScore += shots[i]['VALUE']
            if (shots[i]['VALUE'] === 2) {
                visitorCountOfTwos++
            } else if (shots[i]['VALUE'] === 3) {
                visitorCountOfThrees++
            }
        }
    }
    return [homeCountOfThrees, homeCountOfTwos, visitorCountOfThrees, visitorCountOfTwos, homeScore, visitorScore]
}

const aggregatePlayerListData = (shots) => {
    var playersData = {}
    const initialize = (playerName, shot) => {
        playersData[playerName] = {}
        playersData[playerName]['FG_MADE'] = 0
        playersData[playerName]['FG_ATTEMPTED'] = 0
        playersData[playerName]['3FG_MADE'] = 0
        playersData[playerName]['3FG_ATTEMPTED'] = 0
        playersData[playerName]['POINTS'] = 0
        playersData[playerName]['ASSISTS'] = 0
        playersData[playerName]['REBOUNDS'] = 0
        playersData[playerName]['TEAM'] = shot.TEAM
        playersData[playerName]['IMAGE'] = shot.IMAGE
        playersData[playerName]['PLAYER'] = shot.PLAYER
    }
    for (var i = 0; i < shots.length; i++) {
        var playerName = shots[i]['PLAYER']
        if (!playersData.hasOwnProperty(playerName)) {
            initialize(playerName, shots[i])
        }
        var shot = shots[i]
        if(!playersData[playerName]['IMAGE']) {
            playersData[playerName]['IMAGE'] = shot.IMAGE
            playersData[playerName]['TEAM'] = shot.TEAM
            playersData[playerName]['PLAYER'] = shot.PLAYER
        }
        if (shots[i].REBOUND) {
            playersData[playerName]['REBOUNDS'] += 1
            continue
        }
        if(shots[i].VALUE >= 2) {
            playersData[playerName]['FG_ATTEMPTED'] += 1
            if(shots[i].MAKE_MISS == "MAKE")
                playersData[playerName]['FG_MADE'] += 1
        }
        if(shots[i].VALUE >= 3) {
            if(shots[i].MAKE_MISS == "MAKE") {
                playersData[playerName]['3FG_MADE'] += 1
            }
            playersData[playerName]['3FG_ATTEMPTED'] += 1
        }
        if(shots[i].MAKE_MISS == "MAKE") {
            playersData[playerName]['POINTS'] += shots[i]['VALUE']
        }
        if(shots[i].ASSIST) {
            if (!playersData.hasOwnProperty(shots[i]['ASSIST'])) {
                initialize(shots[i]['ASSIST'], {})
            }
            playersData[shots[i]['ASSIST']]['ASSISTS'] += 1
        }

    }
    var topPlayersList = []

    for (var property in playersData) {
       // var newPlayer = {'PLAYER': property, 'FG_MADE': playersData[property]['SHOTS_MADE'], 'POINTS_SCORED': playersData[property]['POINTS_SCORED'], 'FARTHEST_SHOT_MADE': playersData[property]['FARTHEST_SHOT_MADE']}
        if(playersData[property].IMAGE) {
            topPlayersList.push(playersData[property])
        }
    }

    topPlayersList.sort((a, b) => ((a['POINTS'] < b['POINTS']) ? 1 : -1))
    if (topPlayersList.length > 10) {
        topPlayersList = topPlayersList.slice(0, 10)
    }

    return topPlayersList
}

/*
const aggregatePlayerListData = (shots) => {
    var playersData = {}
    for (var i = 0; i < shots.length; i++) {
        var playerName = shots[i]['PLAYER']
        if (playersData.hasOwnProperty(playerName)) {
            playersData[playerName]['SHOTS_MADE'] += 1
            playersData[playerName]['POINTS_SCORED'] += shots[i]['VALUE']
            var shotDistanceInt = parseInt(shots[i]['DISTANCE'].split(" ")[0])
            var currentFarthestShotDistanceInt = parseInt(playersData[playerName]['FARTHEST_SHOT_MADE'].split(" ")[0])
            if (shotDistanceInt > currentFarthestShotDistanceInt) {
                playersData[playerName]['FARTHEST_SHOT_MADE'] = shots[i]['DISTANCE']
            }
        } else {
            playersData[playerName] = {}
            playersData[playerName]['SHOTS_MADE'] = 1
            playersData[playerName]['POINTS_SCORED'] = shots[i]['VALUE']
            playersData[playerName]['FARTHEST_SHOT_MADE'] = shots[i]['DISTANCE']
        }
    }
    var topPlayersList = []

    for (var property in playersData) {
        var newPlayer = {'PLAYER': property, 'SHOTS_MADE': playersData[property]['SHOTS_MADE'], 'POINTS_SCORED': playersData[property]['POINTS_SCORED'], 'FARTHEST_SHOT_MADE': playersData[property]['FARTHEST_SHOT_MADE']}
        topPlayersList.push(newPlayer)
    }

    topPlayersList.sort((a, b) => (a['POINTS_SCORED'] < b['POINTS_SCORED']) ? 1 : -1)
    if (topPlayersList.length > 10) {
        topPlayersList = topPlayersList.slice(0, 10)
    }

    return topPlayersList
}
*/

const duration = 1000
const sliderDuration = 500
export {stringToColor, coord, url, duration, sliderDuration, aggregateShots, aggregatePlayerListData}