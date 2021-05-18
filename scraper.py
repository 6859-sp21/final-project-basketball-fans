import json
import random 
import sys
import contextlib
import re
from io import StringIO
from datetime import datetime
sys.path.append("./basketball_reference_scraper/basketball_reference_scraper")
from pbp import get_pbp
from shot_charts import get_shot_chart
from seasons import get_schedule, get_standings
from players import get_stats, get_game_logs, get_player_headshot, get_name, get_team_image
abbrevs = {}

def readPlayerImages():
    f = open('playerImages.json')
    return json.load(f)
def readPlayerNames():
    f = open('playerNames.json')
    return json.load(f)
def addPlayerImage(player):
    if not player in playerImages:
        #oldstdin = sys.stdin 
        # oldstdout = sys.stdout 
        #sys.stdin = StringIO("0\n")
        
        try:
            #with contextlib.redirect_stdout(None):
            playerImages[player] = get_player_headshot(player)
        except Exception as e:
            print(e)
            print(f"ERROR: {player}")
            playerImages[player] = "https://image.shutterstock.com/image-illustration/3d-small-person-double-thumbs-260nw-92842738.jpg"
        #sys.stdin = oldstdin
    return playerImages[player]
def addPlayerName(player):
    if not player in playerNames:
        # print(f'Getting name for {player}')
        playerNames[player] = get_name(player)
    if playerNames[player] == None:
        print("What is the name of " + player)
        playerNames[player] = input()
    return playerNames[player]
        
playerImages = readPlayerImages()
playerNames = readPlayerNames()
def abbrev(team, yr):
    uppercase = team.upper()
    if uppercase == "CHARLOTTE HORNETS":
        if yr >= 2014:
            uppercase = "CHARLOTTE HORNETS (2014-Present)"
        else:
            uppercase = "CHARLOTTE HORNETS (1988-2004)"
    return abbrevs[uppercase]
def readAbbrevs():
    f = open("abbreviations.txt", "r")
    for line in f:
        arr = line.split(":")
        abbrevs[arr[0].strip()] = arr[1].strip()
readAbbrevs()
def getGameID(date, home, visitor):
    if(home < visitor):
        return str(date) + '_' + home + '_' + visitor
    return str(date) + '_' + visitor + '_' + home 
def getRegularSeasonShots(year):
    sched = get_schedule(year, playoffs=False)
    data = {}
    for index, row in sched.iterrows():
        yr = row['DATE'].year
        gameId = getGameID(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        print(gameId)
        dd = get_shot_chart(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        home_shots = json.loads(dd[abbrev(row['HOME'], yr)].to_json(orient='records'))
        visitor_shots = json.loads(dd[abbrev(row['VISITOR'], yr)].to_json(orient='records'))
        for entry in home_shots:
            img = addPlayerImage(entry['PLAYER'])
            entry.update({"TEAM": "home"})
            entry.update({"IMAGE": img})
        for entry in visitor_shots:
            img = addPlayerImage(entry['PLAYER'])
            entry.update({"TEAM": "visitor"})
            entry.update({"IMAGE": img})
        data[gameId] = {
            "date": row['DATE'].strftime("%m/%d/%Y"),
            "home": row['HOME'],
            "visitor": row['VISITOR'],
            "shots_home": home_shots,
            "shots_visitor": visitor_shots,
            "game_id": gameId
        }
    with open(f'shot_data_{year}.json', 'w') as outfile:
        json.dump(data, outfile)
    with open(f'playerImages.json', 'w') as outfile:
        json.dump(playerImages, outfile)

def getPlayByPlay(year):
    sched = get_schedule(year, playoffs=False)
    data = {}
    for index, row in sched.iterrows():
        yr = row['DATE'].year
        gameId = getGameID(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        print(gameId)
        dd = get_pbp(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        pbp = json.loads(dd.to_json(orient='records'))
        data[gameId] = {
            "date": row['DATE'].strftime("%m/%d/%Y"),
            "home": row['HOME'],
            "visitor": row['VISITOR'],
            "play_by_play": pbp,
            "game_id": gameId
        }
        
    with open(f'play_by_play_data_{year}.json', 'w') as outfile:
        json.dump(data, outfile)
    #with open(f'playerImages.json', 'w') as outfile:
       # json.dump(playerImages, outfile)
def time(entry):
    q = entry['QUARTER']
    if q == '1OT' or q == '2OT' or q == '3OT' or q == '4OT' or q == '5OT' or q == '6OT':
        q = int(q[0])+4
    time_remaining = entry['TIME_REMAINING']
    splt = time_remaining.split(":")

    curtime = ((4*12*60+(q-4)*5*60) if (q>4) else q*12*60) - (int(splt[0])*60+float(splt[1]))
    return curtime
      
def getRegularSeasonShotsWithPBP(year):
    sched = get_schedule(year, playoffs=False)
    data = {}
    for index, row in sched.iterrows():

        # SHOT DATA
        yr = row['DATE'].year
        gameId = getGameID(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        print(gameId)
        
        dd = get_shot_chart(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        home_shots = json.loads(dd[abbrev(row['HOME'], yr)].to_json(orient='records'))
        visitor_shots = json.loads(dd[abbrev(row['VISITOR'], yr)].to_json(orient='records'))
        for entry in home_shots:
            addPlayerImage(entry['PLAYER'])
            entry.update({"TEAM": "home"})
        for entry in visitor_shots:
            addPlayerImage(entry['PLAYER'])
            entry.update({"TEAM": "visitor"})

        # PBP DATA
        dd = get_pbp(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        pbp = json.loads(dd.to_json(orient='records'))
        home = " ".join(row['HOME'].split(" ")[:-1]).replace(' Trail','').upper()
        if home == "LOS ANGELES":
            home = "LA " + row['HOME'].split(" ")[-1].upper()
        visitor = " ".join(row['VISITOR'].split(" ")[:-1]).replace(' Trail','').upper()
        if visitor == "LOS ANGELES":
            visitor = "LA " + row['VISITOR'].split(" ")[-1].upper()
        home_shots_extra = []
        visitor_shots_extra = []
        hsi = 0
        vsi = 0
        for entry in pbp:
            # print(entry)
            isHome = entry[visitor+"_ACTION"] == None

            action = entry[(home if isHome else visitor) +"_ACTION"]
            if 'Instant Replay' in action:
                continue
            while hsi < len(home_shots) and time(home_shots[hsi]) < time(entry):
                hsi += 1
                

            while vsi < len(visitor_shots) and time(visitor_shots[vsi]) < time(entry):
                vsi += 1
                
            #print(entry[visitor+"_ACTION"])
            #print(isHome)
            
            #print(entry)
            #print((home if isHome else visitor) +"_ACTION")
            #print(action)
            match = re.match(r'(.*) \b(misses|makes) (\d)-pt (.*) \(assist by (.*)\)', action)
            if not match:
                match = re.match(r'(.*) \b(misses|makes) (\d)-pt (.*)', action)
            if match:
                groups = match.groups()
                if (isHome and (hsi >= len(home_shots) or time(home_shots[hsi]) > time(entry))) or ((not isHome) and (vsi >= len(visitor_shots) or time(visitor_shots[vsi]) > time(entry))):
                    match = re.match(r'(.*) \b(misses|makes) (\d)-pt (.*) from (\d+) ft', action)
                    if(not match):
                        match = re.match(r'(.*) \b(misses|makes) (\d)-pt (.*) at rim', action)

                        # print(action)
                    groups = match.groups()
                    extra = {}
                    extra['x'] = "25.0 ft"
                    extra['y'] = f"{groups[4] if (len(groups)>=5) else 0}.0 ft"
                    extra['QUARTER'] = entry['QUARTER']
                    extra['TIME_REMAINING'] = entry['TIME_REMAINING']
                    extra['PLAYER'] = addPlayerName(entry['LINK'].split(" ")[0])
                    extra['IMAGE'] = addPlayerImage(extra['PLAYER'])
                    extra['MAKE_MISS'] = 'MAKE' if groups[1] == 'makes' else 'MISS'
                    extra['VALUE'] = int(groups[2])
                    extra['DISTANCE'] = f'{groups[4] if (len(groups)>=5) else 0} ft'
                    extra['TEAM'] = 'home' if isHome else 'visitor'
                    extra['HOME_SCORE'] = entry[home +"_SCORE"]
                    extra['VISITOR_SCORE'] = entry[visitor +"_SCORE"]
                    if isHome:
                        home_shots_extra.append(extra)
                    else:
                        visitor_shots_extra.append(extra)
                elif isHome:
                    home_shots[hsi]['HOME_SCORE'] = entry[home +"_SCORE"]
                    home_shots[hsi]['VISITOR_SCORE'] = entry[visitor +"_SCORE"]
                    #print("Shot!")
                    if len(groups) > 4:
                        home_shots[hsi]['ASSIST'] = addPlayerName(entry['LINK'].split(" ")[1])
                        #print("Assist!")
                    home_shots[hsi]['IMAGE'] = addPlayerImage(home_shots[hsi]['PLAYER'])
                else:
                    visitor_shots[vsi]['VISITOR_SCORE'] = entry[visitor +"_SCORE"]
                    visitor_shots[vsi]['HOME_SCORE'] = entry[home +"_SCORE"]
                   # print("Shot!")
                    if len(groups) > 4:
                        visitor_shots[vsi]['ASSIST'] = addPlayerName(entry['LINK'].split(" ")[1])
                      #  print("Assist!")
                    visitor_shots[vsi]['IMAGE'] = addPlayerImage(visitor_shots[vsi]['PLAYER'])
            else:
                extra = {}
                match = re.match(r'(.*) \b(misses|makes) free throw (\d) of (\d)', action)
                if not match:
                    match = re.match(r'(.*) \b(misses|makes) technical free throw', action)
                if match:
                    # print("Free Throw!")
                    groups = match.groups() 
                    extra['x'] = "25.0 ft"
                    extra['y'] = "15.0 ft"
                    extra['QUARTER'] = entry['QUARTER']
                    extra['TIME_REMAINING'] = entry['TIME_REMAINING']
                    extra['PLAYER'] = addPlayerName(entry['LINK'].split(" ")[0])
                    extra['IMAGE'] = addPlayerImage(extra['PLAYER'])
                    extra['MAKE_MISS'] = 'MAKE' if groups[1] == 'makes' else 'MISS'
                    extra['VALUE'] = 1 
                    extra['DISTANCE'] = '15 ft'
                    extra['TEAM'] = 'home' if isHome else 'visitor'
                    extra['HOME_SCORE'] = entry[home +"_SCORE"]
                    extra['VISITOR_SCORE'] = entry[visitor +"_SCORE"]
                else:
                    match = re.match(r'\b(Offensive|Defensive) rebound by (.*)', action)
                    if match:
                        # print("Rebound!")
                        groups = match.groups() 
                        if groups[1] != 'Team':
                            extra['QUARTER'] = entry['QUARTER']
                            extra['TIME_REMAINING'] = entry['TIME_REMAINING']
                            extra['PLAYER'] = addPlayerName(entry['LINK'].split(" ")[0])
                            extra['IMAGE'] = addPlayerImage(extra['PLAYER'])
                            extra['TEAM'] = 'home' if isHome else 'visitor'
                            extra['HOME_SCORE'] = entry[home +"_SCORE"]
                            extra['VISITOR_SCORE'] = entry[visitor +"_SCORE"]
                            extra['REBOUND'] = groups[0]
                if extra:
                    if isHome:
                        home_shots_extra.append(extra)
                    else:
                        visitor_shots_extra.append(extra)
                    


                
        hs = (home_shots + home_shots_extra)
        hs.sort(key=time)
        vs = (visitor_shots + visitor_shots_extra)
        vs.sort(key=time)
        data[gameId] = {
            "date": row['DATE'].strftime("%m/%d/%Y"),
            "home": row['HOME'],
            "visitor": row['VISITOR'],
            "shots_home": hs,
            "shots_visitor": vs,
            "game_id": gameId
        }

        if(index == 10):
            with open(f'shot_data_{year}_all_first_10.json', 'w') as outfile:
                json.dump(data, outfile)
        

    with open(f'shot_data_{year}_all.json', 'w') as outfile:
        json.dump(data, outfile)
    with open(f'playerImages.json', 'w') as outfile:
        json.dump(playerImages, outfile)
    with open(f'playerNames.json', 'w') as outfile:
        json.dump(playerNames, outfile)

# getRegularSeasonShotsWithPBP(2020)

teamdata = {}
for team in abbrevs:
    team_new = team.split(" ")
    for i in range(len(team_new)):
        team_new[i] = team_new[i].capitalize()
    team_new = " ".join(team_new)
    teamdata[team_new] = get_team_image(abbrevs[team])
with open(f'team_pics.json', 'w') as outfile:
    json.dump(teamdata, outfile)