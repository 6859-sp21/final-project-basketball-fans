import {stringToColor, coord, url, duration, sliderDuration, aggregateShots, aggregatePlayerListData} from "./utilities.js"

// GET DATA
const dataUrl = url("./shot_data_2018.json");
const playerImagesUrl = url("./playerImages.json");
let data = await d3.json(dataUrl)
let playerImages = await d3.json(playerImagesUrl)
var moving = false
var timer = 0

// ADD ALL GAMES TO THE SELECT
let options = [];
for (const gameId in data) {
   let {home, visitor, date, shots_home, shots_visitor, ...rest} = data[gameId]
   let players = new Set();
   [...shots_home, ...shots_visitor].forEach(shot => players.add(shot.PLAYER));
   options.push({
     value: gameId,
     text: `${visitor} at ${home}, ${date}`,
     player: Array.from(players),
     home,
     visitor,
     date
   });
}
var select = new TomSelect('#choosegame', {
  options,
  items: [options[0].value],
  maxItems: 1,
  searchField: ['home', 'visitor', 'date', 'player'],
  sortField: [{field: '$order'}, {field: '$score'}],
  selectOnTab: true,
  onChange: value => {
    pause();
    updateShotChart(value, 0);
  },
  onDelete: () => false
});


var playButton = d3.select("#play-button");
var playButtonDOM = document.getElementById("play-button");
function pause() {
  moving = false;
        //console.log("done" + currentTime)
        if(timer != 0) timer.stop();
        timer = 0
        playButton.text("Play")
        d3.select('.paused').style('display', 'block')
        
        d3.select('.playing').style('display', 'none');
        playButtonDOM.disabled = true
        setTimeout(() => {playButtonDOM.disabled = false}, duration);
}


// Setting up variables that describe our chart's space.
const margin = { top: 30, right: 30, bottom: 30, left: 30 };

// append the svg object to the body of the page
var svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("id", "my_svg")
  .append("g")
  .attr("id", "court")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var currentGameID = options[0].value;
var currentTime = 0 // time goes from 0 to 48*60
var maxTime = 48*60
/**
 * SIDE Panel Play List Code
 * 
 */

const formatTicks = (tickValue) => {
  var firstPart = (Math.floor(tickValue/60))
  var secondPart = ( tickValue % 60 )
  if (secondPart < 10){
    secondPart = "0" + secondPart
  }
  return firstPart + ":" + secondPart
}
var div = d3
  .select("#side-panel")
  .append("div")
  .attr("id", "player-list")
  .attr("class", "player-list")

/**
 * SLIDER and PLAY BUTTON CODE
 * 
 */
 let total_time = 60
 let interval_time = (total_time/(48*60))*5*1000
 let slider = -1
 let sliderFunc = () => {
    
    
     
    slider = d3
    .sliderBottom()
    .min(0)
    .max(maxTime)
    .step(1)
    .width(600)
    .tickFormat(formatTicks)
    .tickValues([0, 12*60, 24*60, 36*60, 48*60])
    //.default(0.015);
    .handle(
        d3.symbol()
        .type(d3.symbolCircle)
        .size(100)()
    )
    .displayValue(true)
    .default(0)
    .fill('black')
    .on("onchange", (val) => {
        //slider.value(val);
        updateShotChart(currentGameID, val)
    })

    function step() {
        
        
        let nextTime = currentTime + 5
       // console.log(nextTime)
        if (nextTime > 48*60) {
            pause()
        } else {
            //console.log("notdone" + currentTime + ' -> ' + nextTime)
           
            updateShotChart(currentGameID, nextTime)
        }
        
    }
   
    
   //var playButton = d3.select("#play-button");
    playButton
    .on("click", function() {
        //var button = d3.select(this);
        
        if (playButton.text() === "Pause") {
            pause()
        } else {
            moving = true;
           //console.log("interval: "+ (total_time/(48*60))*1000*5)
           total_time = parseInt(document.getElementById('total-time').value)
            if(timer !== 0) timer.stop()
            interval_time = (total_time/(48*60))*5*1000
            timer = d3.interval(step, interval_time);
            playButton.text("Pause");
            d3.select('.playing').style('display', 'block');
            d3.select('.paused').style('display', 'none');
        }
        
    })

    
    


    d3.select("#slider")
    .append("svg")
    .attr("width", 800)
    .attr("height", 80)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(slider);
 }

 sliderFunc()



 
const COURT_HEIGHT_FT = 50;
const COURT_WIDTH_FT = 94;
const HOOP_OFFSET_FT = 4;

/**
 * UPDATING THE SHOT CHART CODE 
 * @param {*} gameID 
 * @param {*} time 
 */
let oldCourtRect = {top: -1, left: -1}
function updateShotChart(gameID, time) { // this will need to take time as input once we animate
  slider.value(time)
  currentTime = time
  let newGame = (currentGameID != gameID)
  currentGameID = gameID

  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom - 250;
  const gameData = data[gameID]
  let shots = data[gameID]['shots_home']
  shots = shots.concat(data[gameID]['shots_visitor'])
  shots = shots.filter((entry)=>{return entry.MAKE_MISS === 'MAKE' })
  let maxQ = -1
  shots = shots.filter((entry) => {
      let q = entry['QUARTER']
      let time_remaining = entry['TIME_REMAINING']
      let splt = time_remaining.split(":")

      let curtime = ((q>4)?(4*12*60+(q-4)*5*60) : q*12*60) - (parseInt(splt[0])*60+parseFloat(splt[1]))
      entry['sorttime'] = curtime
      if(q > maxQ) maxQ = q
      return curtime < time
  })
  if(newGame) {
  maxTime = (maxQ > 4 ? ((maxQ-4)*5+48) : 48)*60
    let tickValues = [0, 12*60, 24*60, 36*60, 48*60]
    if (maxQ > 4) {
      console.log(maxQ)
      let cur = 48*60
      for(var i=0; i<maxQ-4; i++) {
        cur += 5*60 
        tickValues.push(cur)
        console.log(cur/60)
      }
    }
    slider.max(maxTime).tickValues(tickValues)
    d3.select("#slider").call(slider)
  }
  shots.sort((a, b) => (a['sorttime'] > b['sorttime']) ? 1 : -1)

  var [homeCountOfThrees, homeCountOfTwos, visitorCountOfThrees, visitorCountOfTwos, homeScore, visitorScore] = aggregateShots(shots)

  d3.select('#scoreboard').select('#home-score').select('#home-name').text(gameData['home'])
  d3.select('#scoreboard').select('#home-score').select('#score').text(`${homeScore}`)
  // d3.select('#scoreboard').select('#home-score').select('#threes').text(`Threes: ${homeCountOfThrees}`)
  // d3.select('#scoreboard').select('#home-score').select('#twos').text(`Twos: ${homeCountOfTwos}`)

  d3.select('#scoreboard').select('#visitor-score').select('#visitor-name').text(gameData['visitor'])
  d3.select('#scoreboard').select('#visitor-score').select('#score').text(`${visitorScore}`)
  // d3.select('#scoreboard').select('#visitor-score').select('#threes').text(`Threes: ${visitorCountOfThrees}`)
  // d3.select('#scoreboard').select('#visitor-score').select('#twos').text(`Twos: ${visitorCountOfTwos}`)

  currentGameID = gameID 
  d3.select('#game_id').text(`${gameData['visitor']} at ${gameData['home']}, ${gameData['date']}`);
  
  const courtRect = document.querySelector('.court-image').getBoundingClientRect();
  const svgRect = document.getElementById('my_svg').getBoundingClientRect();
  const x_i = courtRect.left - svgRect.left - margin.left;
  const y_i = courtRect.top + courtRect.height/2 - svgRect.top - margin.top;
  
  let image = svg
    .selectAll('.shot')
    .data(shots, (d, i) => {return (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) })
    .join(
      enter => {
        // G IS THE GROUP OF IMAGE AND TEXT/RECTANGLE
        let g = enter.append('g').attr("class", "shot").attr("overflow", "hidden")
          .attr('transform', function (d) {
            let x_offset = d.TEAM == 'home' 
              ? HOOP_OFFSET_FT/COURT_WIDTH_FT * courtRect.width 
              : (1 - HOOP_OFFSET_FT/COURT_WIDTH_FT) * courtRect.width;
            return `translate(${x_i + x_offset}, ${y_i})`;
          });
        //console.log(shots)
        g.call(enter => enter.transition().duration(duration)
        .attr('transform', function (d) {
          // d.x and d.y are relative to left corner of court when facing hoop
          // d.x is slightly off (some values are negative) so we apply a slight correction below
          if (d.TEAM === "home") {
            var x = courtRect.left - svgRect.left - margin.left + (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top + courtRect.height - svgRect.top - margin.top - (coord(d.x)+1)/COURT_HEIGHT_FT * courtRect.height;
          } else {
            var x = courtRect.left + courtRect.width - svgRect.left - margin.left - (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top - svgRect.top - margin.top + (coord(d.x)+1)/COURT_HEIGHT_FT * courtRect.height;
          }
          return "translate(" + x + "," + y + ")";
        }));

        
          // .attr('opacity', 0);

        let tooltip = g.append('g').attr('class', 'tooltip');

        let point = g.append('circle')
          .attr('class', 'shotpoint')
          .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
          // .attr('transform', function (d) { 
          //   return "translate(" + 20*coord(d.x) + "," + 15*coord(d.y) + ")"
          // })
          .attr('fill', (d)=>{return stringToColor(d.PLAYER)});

        tooltip.append('circle')
          .attr('class', 'border')
          .attr('pointer-events', 'none')
          .attr('fill', (d)=>{return stringToColor(d.PLAYER)})
          .call(enter => enter.transition()
          .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
          .duration(duration)
          .attr('r', 25)
          .attr('cx', 0)
          .attr('cy', 0)
          );

        tooltip.append('clipPath')
        .attr('pointer-events', 'none')
          .attr('id', (d,i) => gameID + '_' + i)
          .append('circle')
          .call(enter => enter
            .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
            .transition()
          .duration(duration)
          .attr('r', 20)
          .attr('cx', 0)
          .attr('cy', 0)
          );
          // THE RECT
        let image =  tooltip.append('svg:image')
        .attr('pointer-events', 'none')
           .attr('xlink:href', function (d) {return playerImages[d.PLAYER] } )
          .attr("preserveAspectRatio", "xMinYMin slice")
          .attr('clip-path', (d,i) => `url(#${gameID + '_' + i})`)
          
          
        image.call(enter => enter
            .attr('x', -20)
            .attr('y', -20)
              .attr('width', 0)
              .attr('height', 0)
            .transition()
          .duration(duration)
          .attr('width', 40)
          .attr('height', 40))
          
          //TOOLTIP
          tooltip.append('text')
          .attr('pointer-events', 'none')
          .text((d, i) => {
            return d.PLAYER + " " + (d.MAKE_MISS ? "makes" : "misses") + " " + d.DISTANCE + " shot";
          })
          .attr("x", function (d) { return -50; })
          .attr("y", function (d) { return 50; })
          .attr("opacity", 0)
          .call(enter => enter.transition()
              .delay(duration/2).duration(duration/2)
              .attr("opacity", 1)
              )
          /*.call(enter => enter.transition()
          .delay(duration*2/2 + interval_time*5).duration(duration/2)
          .attr("opacity", 0))*/
         // .transition().delay(500).remove()
         
          tooltip.call(e => e.attr("opacity", 1).transition().delay(duration + interval_time*5).duration(duration/2).attr("opacity", 0))
          

          point.on("mouseover", function(event, d) {
            d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER ? 1 : 0})
            d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER ? 0 : 0.2})
          })
          point.on("mouseout", function(event, d) {
            d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return 0})
            d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return 1})
          })

          point.call(e => e.transition().delay(duration + interval_time*5).duration(duration/2).attr('r', 5).attr('opacity', 1))
        },
      update => {
        if(oldCourtRect.top === courtRect.top && oldCourtRect.left === courtRect.left) {
          return
        } 
        oldCourtRect = courtRect
        update.call(upd => upd.transition().duration(duration).attr('transform', function (d) {
          // d.x and d.y are relative to left corner of court when facing hoop
          if (d.TEAM === "home") {
            var x = courtRect.left - svgRect.left - margin.left + (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top + courtRect.height - svgRect.top - margin.top - (coord(d.x)+1)/COURT_HEIGHT_FT * courtRect.height;
          } else {
            var x = courtRect.left + courtRect.width - svgRect.left - margin.left - (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top - svgRect.top - margin.top + (coord(d.x)+1)/COURT_HEIGHT_FT * courtRect.height;
          }
          return "translate(" + x + "," + y + ")";
        }))
      },
      exit => {
          exit.select(".border").call(exit1 => exit1.transition().duration(duration)
          .attr('r', 0)
          );

          exit.select("clipPath").select("circle").call(exit1 => exit1.transition().duration(duration)
          .attr('r', 0)
          );
          
          exit.select(".shotpoint").call(exit1 => exit1.transition().duration(duration)
            .attr('r', 0).remove());

          exit.call(exit1 => exit1.transition().delay(duration).remove());
      }     
    )

  var topPlayersList = aggregatePlayerListData(shots)

  var playerCard = div 
        .selectAll('div.player-card')
        .data(topPlayersList, (d, i) => {return d.PLAYER + d.POINTS_SCORED + d.SHOTS_MADE + d.FARTHEST_SHOT_MADE})
        //.sort(function(a,b){return d3.descending(a.POINTS_SCORED, b.POINTS_SCORED)})
        .join(
          enter => {
            let p = enter.append('div').attr('class', 'player-card')
            let playerPicDiv = p.append('div').attr('class', 'player-card-pic')
            let image = playerPicDiv.append('img').attr('class', 'player-card-pic').attr('src', function(d) {return playerImages[d.PLAYER]})
            let playerStatsDivOne = p.append('div').attr('class', 'player-card-stats')
            let playerName = playerStatsDivOne.append('div').text(function(d){return d.PLAYER})
            let playerScore = playerStatsDivOne.append('div').text(function(d){return "Points Scored: " + d.POINTS_SCORED})

            let playerStatsDivTwo = p.append('div').attr('class', 'player-card-stats')
            let playerShotsMade = playerStatsDivTwo.append('div').text(function(d){return "Shots Made: " + d.SHOTS_MADE})
            let playerFarthestShot = playerStatsDivTwo.append('div').text(function(d){return "Farthest Shot Made: " + d.FARTHEST_SHOT_MADE})
            
          },
          update => update,
          exit => exit.remove()
        )
}

updateShotChart(currentGameID, currentTime)    