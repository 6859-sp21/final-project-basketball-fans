import json
import random 
import sys
import contextlib
from io import StringIO
from datetime import datetime
from basketball_reference_scraper.shot_charts import get_shot_chart
from basketball_reference_scraper.seasons import get_schedule, get_standings
from basketball_reference_scraper.players import get_stats, get_game_logs, get_player_headshot
abbrevs = {}
print(get_player_headshot('Lebron James'))
def readPlayerImages():
    f = open('playerImages.json')
    return json.load(f)
def addPlayerImage(player):
    if not player in playerImages:
        oldstdin = sys.stdin 
        # oldstdout = sys.stdout 
        sys.stdin = StringIO("0\n")
        
        try:
            #with contextlib.redirect_stdout(None):
            playerImages[player] = get_player_headshot(player)
        except Exception as e:
            print(e)
            print(f"ERROR: {player}")
            playerImages[player] = "https://image.shutterstock.com/image-illustration/3d-small-person-double-thumbs-260nw-92842738.jpg"
        sys.stdin = oldstdin
        
playerImages = readPlayerImages()
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
print(abbrevs)
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
        dd = get_shot_chart(row['DATE'].strftime("%m/%d/%Y"), abbrev(row['HOME'], yr), abbrev(row['VISITOR'], yr))
        print(gameId)
        home_shots = json.loads(dd[abbrev(row['HOME'], yr)].to_json(orient='records'))
        visitor_shots = json.loads(dd[abbrev(row['VISITOR'], yr)].to_json(orient='records'))
        for entry in home_shots:
            addPlayerImage(entry['PLAYER'])
        for entry in visitor_shots:
            addPlayerImage(entry['PLAYER'])
        data[gameId] = {
            "date": row['DATE'].strftime("%m/%d/%Y"),
            "home": row['HOME'],
            "visitor": row['VISITOR'],
            "shots_home": home_shots,
            "shots_visitor": visitor_shots,
            "game_id": gameId
        }
        if(index > 10):
            break
    with open(f'shot_data_{year}.json', 'w') as outfile:
        json.dump(data, outfile)
    with open(f'playerImages.json', 'w') as outfile:
        json.dump(playerImages, outfile)

getRegularSeasonShots(2019)
