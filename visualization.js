import {stringToColor, coord, url, duration, sliderDuration} from "./utilities.js"

// GET DATA
const dataUrl = url("./shot_data_2019.json");
const playerImagesUrl = url("./playerImages.json");
let data = await d3.json(dataUrl)
let playerImages = await d3.json(playerImagesUrl)

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
select.onchange = (event) => {
   updateShotChart(event.target.value)
}

// Setting up variables that describe our chart's space.
const margin = { top: 30, right: 30, bottom: 30, left: 30 };

// append the svg object to the body of the page
var svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var currentGameID = firstGameId
var currentTime = 0 // time goes from 0 to 48*60

/**
 * UPDATING THE SHOT CHART CODE 
 * @param {*} gameID 
 * @param {*} time 
 */
function updateShotChart(gameID, time) { // this will need to take time as input once we animate
  
  currentTime = time
  currentGameID = gameID

  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom - 250;
  const gameData = data[gameID]
  let shots = data[gameID]['shots_home']
  shots = shots.filter((entry)=>{return entry.MAKE_MISS == 'MAKE' })
  shots = shots.filter((entry) => {
      let q = entry['QUARTER']
      let time_remaining = entry['TIME_REMAINING']
      let splt = time_remaining.split(":")

      let curtime = ((q>4)?(4*12*60+(q-4)*5*60) : q*12*60) - (parseInt(splt[0])*60+parseFloat(splt[1]))
      return curtime < time
    })
  currentGameID = gameID 
  d3.select('#game_id').text(gameData['home'] + " - " + gameData['visitor'] + " (" + gameData['date'] + ")");
 
  let image = svg
    .selectAll('g')
    .data(shots, (d, i) => {return (i) + (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) })
    .join(
      enter => {
        // G IS THE GROUP OF IMAGE AND TEXT/RECTANGLE
        let g = enter.append('g').attr("overflow", "hidden");
        g.call(enter => enter.transition().duration(duration)
        .attr('transform', function (d) { 
          return "translate(" + 20*coord(d.x) + "," + 15*coord(d.y) + ")"
        }))

        g.append('circle')
          
          .attr('fill', (d)=>{return stringToColor(d.PLAYER)})
          .call(enter => enter.transition()
          .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
          .duration(duration)
          .attr('r', 25)
          .attr('cx', 20)
          .attr('cy', 20)
          );

        g.append('clipPath')
          .attr('id', (d,i) => gameID + '_' + i)
          .append('circle')
          .call(enter => enter
            .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
            .transition()
          .duration(duration)
          .attr('r', 20)
          .attr('cx', 20)
          .attr('cy', 20)
          );
          // THE RECT
        let image =  g.append('svg:image')
           .attr('xlink:href', function (d) {return playerImages[d.PLAYER] } )
          .attr("preserveAspectRatio", "xMinYMin slice")
          .attr('clip-path', (d,i) => `url(#${gameID + '_' + i})`)
          
          
        image.call(enter => enter
            .attr('x', 0)
            .attr('y', 0)
              .attr('width', 0)
              .attr('height', 0)
            .transition()
          .duration(duration)
          .attr('width', 40)
          .attr('height', 40))

        },
      update => update,
      exit => {
          exit.select("image").call(exit1 => exit1.transition().duration(duration)
          .attr('width', 0)
          .attr('height', 0)
          )
          exit.select("circle").call(exit1 => exit1.transition().duration(duration)
          .attr('r', 0)
          )

          exit.select("clipPath").select("circle").call(exit1 => exit1.transition().duration(duration)
          .attr('r', 0)
          )

          exit.call(exit1 => exit1.transition().delay(duration)
          .remove())  
      }     
    )
}
updateShotChart(currentGameID, currentTime)    

/**
 * SLIDER and PLAY BUTTON CODE
 * 
 */
 let total_time = 30
 const slider = () => {
    var playButton = d3.select("#play-button");
    var moving = false
    var timer = 0 
    var slider = d3
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
        slider.value(val);
        updateShotChart(currentGameID, val)
    })

    function step() {
        
        
        let nextTime = currentTime + 5
        console.log(nextTime)
        if (nextTime > 48*60) {
            moving = false;
            console.log("done" + currentTime)
            clearInterval(timer);
            timer = 0
            playButton.text("Play")
            d3.select('.paused').style('display', 'block');
            d3.select('.playing').style('display', 'none');
        } else {
            console.log("notdone" + currentTime + ' -> ' + nextTime)
            slider.value(nextTime)
            updateShotChart(currentGameID, nextTime)
        }
        
    }
   
   //var playButton = d3.select("#play-button");
    playButton
    .on("click", function() {
        //var button = d3.select(this);
        
        if (playButton.text() == "Pause") {
            moving = false;
            clearInterval(timer);
            timer = 0;
            playButton.text("Play")
            d3.select('.paused').style('display', 'block');
            d3.select('.playing').style('display', 'none');
        } else {
            moving = true;
           //console.log("interval: "+ (total_time/(48*60))*1000*5)
           total_time = parseInt(document.getElementById('total-time').value)
            timer = setInterval(step, (total_time/(48*60))*5*1000);
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
 slider()