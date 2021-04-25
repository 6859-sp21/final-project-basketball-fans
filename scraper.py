from basketball_reference_scraper.shot_charts import get_shot_chart
d = get_shot_chart('2019-12-28', 'TOR', 'BOS')
print(d['TOR'])