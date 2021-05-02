import {stringToColor, coord, url, duration, sliderDuration, aggregateShots} from "./utilities.js"

// GET DATA
const dataUrl = url("./shot_data_2016.json");
const playerImagesUrl = url("./playerImages.json");
let data = await d3.json(dataUrl)
let playerImages = await d3.json(playerImagesUrl)
var moving = false
var timer = 0
// ADD ALL GAMES TO THE SELECT
let select = document.getElementById('choosegame')
let firstGameId = ""
for (const gameId in data) {
   if(firstGameId === "") firstGameId = gameId 
   var option = document.createElement('option')
   option.value = gameId 
   let gameData = data[gameId]
   option.innerHTML = gameData['home'] + " - " + gameData['visitor'] + " (" + gameData['date'] + ")"
   select.appendChild(option)
}
select.value = firstGameId 
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

select.onchange = (event) => {
   pause()
   updateShotChart(event.target.value, 0)
   //console.log(currentGameID + " " + currentTime)
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

var currentGameID = firstGameId
var currentTime = 0 // time goes from 0 to 48*60

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
    .max(48*60)
    .step(1)
    .width(600)
   // .tickFormat(d3.timeFormat('%x'))
    .ticks(4)
    //.default(0.015);
    .handle(
        d3.symbol()
        .type(d3.symbolCircle)
        .size(100)()
    )
    .displayValue(false)
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
  currentGameID = gameID

  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom - 250;
  const gameData = data[gameID]
  let shots = data[gameID]['shots_home']
  shots = shots.concat(data[gameID]['shots_visitor'])
  shots = shots.filter((entry)=>{return entry.MAKE_MISS === 'MAKE' })
  shots = shots.filter((entry) => {
      let q = entry['QUARTER']
      let time_remaining = entry['TIME_REMAINING']
      let splt = time_remaining.split(":")

      let curtime = ((q>4)?(4*12*60+(q-4)*5*60) : q*12*60) - (parseInt(splt[0])*60+parseFloat(splt[1]))
      entry['sorttime'] = curtime
      return curtime < time
  })
  shots.sort((a, b) => (a['sorttime'] > b['sorttime']) ? 1 : -1)

  var [homeCountOfThrees, homeCountOfTwos, visitorCountOfThrees, visitorCountOfTwos] = aggregateShots(shots)

  d3.select('#scoreboard').select('#home-score').select('#home-name').text(gameData['home'])
  d3.select('#scoreboard').select('#home-score').select('#threes').text(`Threes: ${homeCountOfThrees}`)
  d3.select('#scoreboard').select('#home-score').select('#twos').text(`Twos: ${homeCountOfTwos}`)

  d3.select('#scoreboard').select('#visitor-score').select('#visitor-name').text(gameData['visitor'])
  d3.select('#scoreboard').select('#visitor-score').select('#threes').text(`Threes: ${visitorCountOfThrees}`)
  d3.select('#scoreboard').select('#visitor-score').select('#twos').text(`Twos: ${visitorCountOfTwos}`)


  currentGameID = gameID 
  d3.select('#game_id').text(gameData['home'] + " - " + gameData['visitor'] + " (" + gameData['date'] + ")");
  
  const courtRect = document.querySelector('.court-image').getBoundingClientRect();
  const svgRect = document.getElementById('my_svg').getBoundingClientRect();
  
  let image = svg
    .selectAll('.shot')
    .data(shots, (d, i) => {return (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) })
    .join(
      enter => {
        // G IS THE GROUP OF IMAGE AND TEXT/RECTANGLE
        let g = enter.append('g').attr("class", "shot").attr("overflow", "hidden");
        //console.log(shots)
        g.call(enter => enter.transition().duration(duration)
        .attr('transform', function (d) {
          // d.x and d.y are relative to left corner of court when facing hoop
          if (d.TEAM === "home") {
            var x = courtRect.left - svgRect.left - margin.left + (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top + courtRect.height - svgRect.top - margin.top - coord(d.x)/COURT_HEIGHT_FT * courtRect.height;
          } else {
            var x = courtRect.left + courtRect.width - svgRect.left - margin.left - (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top - svgRect.top - margin.top + coord(d.x)/COURT_HEIGHT_FT * courtRect.height;
          }
          return "translate(" + x + "," + y + ")";
        }))

        
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
            tooltip.attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER ? 1 : 0})
            point.attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER ? 0 : 1})
          })
          point.on("mouseout", function(event, d) {
            tooltip.attr('opacity', (d2,i)=>{return 0})
            point.attr('opacity', (d2,i)=>{return 1})
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
            var y = courtRect.top + courtRect.height - svgRect.top - margin.top - coord(d.x)/COURT_HEIGHT_FT * courtRect.height;
          } else {
            var x = courtRect.left + courtRect.width - svgRect.left - margin.left - (coord(d.y) + HOOP_OFFSET_FT)/COURT_WIDTH_FT * courtRect.width;
            var y = courtRect.top - svgRect.top - margin.top + coord(d.x)/COURT_HEIGHT_FT * courtRect.height;
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
}

updateShotChart(currentGameID, currentTime)    