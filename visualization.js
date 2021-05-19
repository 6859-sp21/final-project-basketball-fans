import {stringToColor, coord, url, duration, sliderDuration, aggregateShots, aggregatePlayerListData} from "./utilities.js"
import colors from "./team_colors.js";

// GET DATA
const dataUrl = url("./shot_data_2020_all.json");
const playerImagesUrl = url("./playerImages.json");
const teamImagesUrl = url("./team_pics.json")
let data = await d3.json(dataUrl)
//let playerImages = await d3.json(playerImagesUrl)
let teamImages = await d3.json(teamImagesUrl)
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
  maxOptions: 82,
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
var justStarted = true 
var currentTime = 0 // time goes from 0 to 48*60
var maxTime = 48*60;
/**
 * SIDE Panel Play List Code
 * 
 */

const QUARTERS = ['1st', '2nd', '3rd', '4th']
const formatTicks = (tickValue) => {
  if (tickValue === maxTime) {
    return 'Final';
  }
  if (tickValue === 48*60) {
    if (maxTime > 48*60 + 300) {
      return `OT ${Math.ceil((tickValue - 48*60)/300)}`;
    }
    return 'OT';
  }
  return QUARTERS[tickValue/720];
}

const formatDisplay = tickValue => {
  if (tickValue === maxTime) {
    return 'Final';
  }
  let qtr, length;
  if (tickValue >= 48*60) {
    if (maxTime > 48*60 + 300) {
      qtr = `OT ${Math.ceil((tickValue - 48*60)/300)}`;
    }
    else {
      qtr = 'OT';
    } 
    length = 300;
    tickValue -= 48*60;
  } else {
    qtr = QUARTERS[Math.floor(tickValue/720)]
    length = 720;
  }
  let remaining = length - tickValue % length;
  var firstPart = (Math.floor(remaining/60))
  var secondPart = (remaining % 60)
  if (secondPart < 10){
    secondPart = "0" + secondPart;
  }
  return qtr + " " + firstPart + ":" + secondPart;
}


/**
 * SLIDER and PLAY BUTTON CODE
 * 
 */
 let total_time = 120
 let interval_time = (total_time/(48*60))*5*1000
 let slider = -1
 let sliderFunc = () => {
    
    
     
    slider = d3
    .sliderBottom()
    .min(0)
    .max(maxTime)
    .step(1)
    .width(document.getElementById('main-panel').getBoundingClientRect().width - 30)
    .tickFormat(formatTicks)
    .tickValues([0, 12*60, 24*60, 36*60, 48*60])
    .displayFormat(formatDisplay)
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
        if (nextTime > maxTime) {
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
    .attr("width", document.getElementById('main-panel').getBoundingClientRect().width)
    .attr("height", 70)
    .append("g")
    .attr("transform", "translate(15,20)")
    .call(slider);
 }

 sliderFunc()



 
const COURT_HEIGHT_FT = 50;
const COURT_WIDTH_FT = 94;
const HOOP_OFFSET_FT = 4;

const flipping = new Flipping();
var old_shot = 0;
var tooltipText = d3.select("#my_dataviz").append("div")
  .attr("class", "tooltip-text")
  .style("opacity", 0);

/**
 * UPDATING THE SHOT CHART CODE 
 * @param {*} gameID 
 * @param {*} time 
 */
let oldCourtRect = {top: -1, left: -1}
function updateShotChart(gameID, time) { // this will need to take time as input once we animate
  slider.value(time)
  d3.select('#game-clock').text(formatDisplay(time));

  currentTime = time
  let newGame = (currentGameID != gameID)
  currentGameID = gameID

  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom - 250;
  const gameData = data[gameID]
  let shots = data[gameID]['shots_home']
  shots = shots.concat(data[gameID]['shots_visitor'])
 //s shots = shots.filter((entry)=>{return entry.MAKE_MISS === 'MAKE' })
  let maxQ = -1
  shots = shots.filter((entry) => {
      let q = entry['QUARTER']
      let time_remaining = entry['TIME_REMAINING']
      let splt = time_remaining.split(":")

      let curtime = ((q>4)?(4*12*60+(q-4)*5*60) : q*12*60) - (parseInt(splt[0])*60+parseFloat(splt[1]))
      entry['sorttime'] = curtime
      if(q > maxQ) maxQ = q
      return (curtime <= time) 
  })
  if(newGame || justStarted) {
    justStarted = false
  maxTime = (maxQ > 4 ? ((maxQ-4)*5+48) : 48)*60
    let tickValues = [0, 12*60, 24*60, 36*60, 48*60]
    if (maxQ > 4) {
      let cur = 48*60
      for(var i=0; i<maxQ-4; i++) {
        cur += 5*60 
        tickValues.push(cur)
      }
    }
    slider.max(maxTime).tickValues(tickValues)
    d3.select("#slider").call(slider)
  }
  //console.log(gameData['home'])
  shots.sort((a, b) => (a['sorttime'] > b['sorttime']) ? 1 : -1)
  // var [homeCountOfThrees, homeCountOfTwos, visitorCountOfThrees, visitorCountOfTwos, homeScore, visitorScore] = aggregateShots(shots)
  var homeScore = (shots.length > 0) ? shots[shots.length-1].HOME_SCORE  : 0
  var visitorScore = (shots.length > 0)  ? shots[shots.length-1].VISITOR_SCORE  : 0
  d3.select('#scoreboard').select('#home-score').select('#home-name').text(gameData['home'])
  d3.select('#scoreboard').select('#team-image-home').attr('src', teamImages[gameData['home']])
  d3.select('#scoreboard').select('#home-score').text(`${homeScore}`)
  // d3.select('#scoreboard').select('#home-score').select('#threes').text(`Threes: ${homeCountOfThrees}`)
  // d3.select('#scoreboard').select('#home-score').select('#twos').text(`Twos: ${homeCountOfTwos}`)

  d3.select('#scoreboard').select('#visitor-score').select('#visitor-name').text(gameData['visitor'])
  d3.select('#scoreboard').select('#visitor-score').text(`${visitorScore}`)
  d3.select('#scoreboard').select('#team-image-visitor').attr('src', teamImages[gameData['visitor']])

  // d3.select('#scoreboard').select('#visitor-score').select('#threes').text(`Threes: ${visitorCountOfThrees}`)
  // d3.select('#scoreboard').select('#visitor-score').select('#twos').text(`Twos: ${visitorCountOfTwos}`)

  currentGameID = gameID 
  d3.select('#game_id').text(`${gameData['visitor']} at ${gameData['home']}, ${gameData['date']}`);
  
  const courtRect = document.querySelector('.court-image').getBoundingClientRect();
  const svgRect = document.getElementById('my_svg').getBoundingClientRect();
  const x_i = courtRect.left - svgRect.left - margin.left;
  const y_i = courtRect.top + courtRect.height/2 - svgRect.top - margin.top;

  var homeName = gameData['home'].split(' ');
  var visitorName = gameData['visitor'].split(' ');

  if (shots.length - 1 > old_shot && moving) {
    let latest = shots[shots.length - 1];
    let text = `${latest.PLAYER} (${latest.TEAM == 'home' ? homeName[homeName.length - 1] : visitorName[visitorName.length - 1]}) ${(latest.MAKE_MISS == 'MAKE') ? `makes ${latest.DISTANCE}` : "misses"} shot`;
    // if (text !== old_shot) {
    tooltipText.text(text);
    tooltipText
      .style('left', `${courtRect.left + courtRect.width/2 - tooltipText.node().getBoundingClientRect().width/2}px`)
      .style('top', `${courtRect.top + window.scrollY + 20}px`)
    tooltipText.transition().style('opacity', 1).transition().delay(duration + interval_time*5).duration(duration/2).style('opacity', 0);
  }
  old_shot = shots.length - 1;

  // tooltipContainer.style("left", `${courtRect.left + courtRect.width/2}px`).style("top", `${courtRect.top}px`);
  // tooltipContainer
  //   .selectAll('.tooltip-text')
  //   .data(shots.filter(entry => (entry.x && (entry.VALUE > 1))), (d, i) => {return (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) + d.HOME_SCORE + d.VISITOR_SCORE })
  //   .enter()
  //   .;

  // let tooltipText = d3.selectAll('.tooltip-text')
  //   .data(shots.filter(entry => (entry.x && (entry.VALUE > 1))), (d, i) => {return (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) + d.HOME_SCORE + d.VISITOR_SCORE })
  //   .enter()
  //   .append('div')
  //     .attr('class', 'tooltip-text')
  //     .style('left', `${courtRect.left + courtRect.width/2 - 50}px`)
  //     .style('top', `${courtRect.top}px`)
  //     .text(d =>  d.PLAYER + " " + ((d.MAKE_MISS == 'MAKE') ? "makes" : "misses") + " " + d.DISTANCE + " shot")
  //     .transition().delay(duration + interval_time*5).duration(duration/2).style("opacity", 0);
  
  let homeColors = Object.values(colors).find(team => team.fullName === gameData['home']);
  let visitorColors = Object.values(colors).find(team => team.fullName === gameData['visitor']);
  let homeColor = d3.color(homeColors.colors[homeColors.mainColor].hex);
  let visitorColor = d3.color(visitorColors.colors[visitorColors.mainColor].hex);
  if (!d3.noticeablyDifferent(homeColor, visitorColor)) {
    visitorColor = d3.color(visitor_colors.colors[visitor_colors.secondaryColor].hex);
  }

  let image = svg
    .selectAll('.shot')
    .data(shots.filter(entry => (entry.x && (entry.VALUE > 1))), (d, i) => {return (d.PLAYER) + (d.TIME_REMAINING) + (d.x) + (d.y) + d.HOME_SCORE + d.VISITOR_SCORE })
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
          .attr('fill', d => d.TEAM === 'home' ? homeColor.formatHex() : visitorColor.formatHex())
          .attr('fill-opacity', d => d.MAKE_MISS === 'MAKE' ? 1 : 0)
          .attr('stroke', d => d.TEAM === 'home' ? homeColor.formatHex() : visitorColor.formatHex());
          // .attr('stroke-width', d => d.MAKE_MISS === 'MAKE' ? 0 : 1);

        tooltip.append('circle')
          .attr('class', 'border')
          .attr('pointer-events', 'none')
          .attr('fill', (d)=>{return d.TEAM === 'home' ? homeColor.formatHex() : visitorColor.formatHex() /*return stringToColor(d.PLAYER)*/})
          .call(enter => enter.transition()
          .attr('r', 0)
          .attr('cx', 0)
          .attr('cy', 0)
          .duration(duration)
          .attr('r', 22)
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
           .attr('xlink:href', function (d) {return d.IMAGE } )
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
          // NO TEXT
          
          // d3.select('#my_dataviz')
          // .append('div')
          // .attr('class', 'tooltip-text')
          // // .append('text')
          // .attr('pointer-events', 'none')
          // .style("left", `${courtRect.left + courtRect.width/2}px`)
          // .style("top", `${courtRect.top}px`)
          // .text((d, i) => {
          //   return d.PLAYER + " " + ((d.MAKE_MISS == 'MAKE') ? "makes" : "misses") + " " + d.DISTANCE + " shot";
          // })
          // .attr("opacity", moving ? 1 : 0);

/*
          tooltip
          .attr("opacity", 0)
          .call(enter => enter.transition()
              .delay(duration/2).duration(duration/2)
              .attr("opacity", 1)
              )*/


          /*.call(enter => enter.transition()
          .delay(duration*2/2 + interval_time*5).duration(duration/2)
          .attr("opacity", 0))*/
         // .transition().delay(500).remove()
         
          tooltip.call(e => e.attr("opacity", 1).transition().delay(duration + interval_time*5).duration(duration/2).attr("opacity", 0))
          

          point.on("mouseover", function(event, d) {
            d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return (d.PLAYER === d2.PLAYER) && (d.TIME_REMAINING == d2.TIME_REMAINING) ? 1 : 0})
            d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER && (d.TIME_REMAINING == d2.TIME_REMAINING)? 0 : 0.2})//.attr('stroke-width', 0)
          })
          point.on("mouseout", function(event, d) {
            d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return 0})
            d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return 1})//.attr('stroke-width', 2)
          })

          point.call(e => e.transition().delay(duration + interval_time*5).duration(duration/2).attr('r', 5).attr('opacity', 1).attr('stroke-width', 2))
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
  console.log(topPlayersList);
  var playerDuration = (moving) ? (total_time <= 20 ? 50 : 100) : 1000
  var playerCard = d3.select('#player-list')
        .selectAll('div.player-card')
        .data(topPlayersList, (d, i) => {return d.PLAYER})
        //.sort(function(a,b){return d3.descending(a.POINTS_SCORED, b.POINTS_SCORED)})
        .join(
          enter => {
            let p = enter.append('div')
              .attr('class', 'player-card')
              .attr('data-flip-key', d => d.PLAYER)
              .style('border-color', d => d.TEAM === 'home' ? homeColor.formatHex() : visitorColor.formatHex());
              // .call(u=> {
              //   // u.transition().duration(playerDuration).style("order", (d, index) => index)
              //   flipping.read();
              //   u.style('order', (d, index) => index);
              //   flipping.flip();
              //   // flipping.wrap(() => u.style('order', (d, index) => index))
              // });
            // flipping.wrap(() => p.style('order', (d, index) => index));
            
            
            p.append('img').attr('class', 'player-card-pic').attr('src', function(d) {return d.IMAGE})
            let playerName = p.append('div').attr('class', 'player-card-name');
            playerName.append('div').text(function(d){return d.PLAYER.split(' ')[0]});
            playerName.append('div').text(function(d){return d.PLAYER.split(' ')[1]}).style('font-weight', 'bold');

            let playerStats = p.append('div').attr('class', 'player-card-stats')
            playerStats.append('div').attr('class', 'stat pts-reb-ast').text(function(d){return d.POINTS + "/" + d.REBOUNDS + "/" + d.ASSISTS})
            playerStats.append('div').attr('class', 'stat field-goal').text(function(d){return d.FG_MADE + "/" + d.FG_ATTEMPTED})
            playerStats.append('div').attr('class', 'stat three-pt').text(function(d){return d['3FG_MADE'] + "/" + d['3FG_ATTEMPTED']})
            
            p.on("mouseover", function(event, d) {
              d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return (d.PLAYER === d2.PLAYER) ? 1 : 0})
              .select('text').attr('opacity', 0)

              d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return d.PLAYER === d2.PLAYER ? 0 : 0.2})//.attr('stroke-width', 0)
            })
            p.on("mouseout", function(event, d) {
              d3.selectAll('.tooltip').attr('opacity', (d2,i)=>{return 0})
              d3.selectAll('.shotpoint').attr('opacity', (d2,i)=>{return 1})//.attr('stroke-width', 2)
            })

            flipping.read();
            p.style('order', (d, index) => index);
            flipping.flip();
          },
          update => {
            update.select('.pts-reb-ast').text(function(d){return d.POINTS + "/" + d.REBOUNDS + "/" + d.ASSISTS});
            update.select('.field-goal').text(function(d){return d.FG_MADE + "/" + d.FG_ATTEMPTED});
            update.select('three-pt').text(function(d){return d['3FG_MADE'] + "/" + d['3FG_ATTEMPTED']});
            // update.call(u => {
            flipping.read();
            update.style('order', (d, index) => index);
            flipping.flip();
          },
          exit => {
            flipping.read();
            exit.style('order', 99);
            flipping.flip();
            exit.remove();
          }
        )
  

}

updateShotChart(currentGameID, currentTime)    