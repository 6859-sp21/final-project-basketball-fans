import {stringToColor, coord, url} from "./utilities.js"

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

function updateShotChart(gameID) { // this will need to take time as input once we animate
  
 

  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom - 80;
  const gameData = data[gameID]
  let shots = data[gameID]['shots_home']
  shots = shots.filter((entry)=>{return entry.MAKE_MISS == 'MAKE'})
  currentGameID = gameID 
  d3.select('#game_id').text(gameData['home'] + " - " + gameData['visitor'] + " (" + gameData['date'] + ")");
  let duration = 2000
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
          .attr('id', (d,i) => d.gameId + '_' + i)
          .append('circle')
          .call(enter => enter.transition()
          .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
          .duration(duration)
          .attr('r', 20)
          .attr('cx', 20)
          .attr('cy', 20)
          );
          // THE RECT
        let image =  g.append('svg:image')
           .attr('xlink:href', function (d) {return playerImages[d.PLAYER] } )
          .attr("preserveAspectRatio", "xMinYMin slice")
          .attr('clip-path', (d,i) => `url(#${d.gameId + '_' + i})`)
          
          
        image.call(enter => enter.transition()
        .attr('x', 0)
        .attr('y', 0)
          .attr('width', 0)
          .attr('height', 0)
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
updateShotChart(currentGameID)    