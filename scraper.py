import json
import random 
from datetime import datetime
from basketball_reference_scraper.shot_charts import get_shot_chart
from basketball_reference_scraper.seasons import get_schedule, get_standings
abbrevs = {}
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
        data[gameId] = {
            "date": row['DATE'].strftime("%m/%d/%Y"),
            "home": row['HOME'],
            "visitor": row['VISITOR'],
            "shots_home": json.loads(dd[abbrev(row['HOME'], yr)].to_json(orient='records')),
            "shots_visitor": json.loads(dd[abbrev(row['VISITOR'], yr)].to_json(orient='records'))
        }
        if(index > 10):
            break
    with open(f'shot_data_{year}.json', 'w') as outfile:
        json.dump(data, outfile)

# getRegularSeasonShots(2019)