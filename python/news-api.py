import requests, json
from pprint import pprint

private_key = "e74a362865914116b76c0a6beef285a4"
query = "presidential debate"

url = ('https://newsapi.org/v2/everything?'
       'q=' + query + '&'
       'from=2020-01-05&'
       'sortBy=popularity&'
       'apiKey=e74a362865914116b76c0a6beef285a4&'
       'pageSize=100')

response = requests.get(url)
response_json = json.loads(response.text)
pprint(response_json)

with open("articles-1-5.json","w") as f:
    json.dump(response_json["articles"],f)
