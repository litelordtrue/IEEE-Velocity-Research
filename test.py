from datetime import datetime
import json

#x = Message("abc")
#print(x.text)

# convert date format to date object in python
datestring = "2023-05-23"
date = datetime.strptime(datestring, '%Y-%m-%d').isoformat()
#print(date)

path = '/Users/aaronzaks/Desktop/IEEE Velocity Research/Slack Export/project_messaging/2021-08-11.json'
with open(path, 'r') as f:
    data = json.load(f)

print(data[0])