import json,os
from datetime import datetime

# defining a Message class to store only relevant data from a message

# where all of our jsons for slack are stored
path = "/Users/aaronzaks/Desktop/IEEE Velocity Research"

# creating an empty list
author_dict = []


with open(path + "/drupal_issues.json", "r") as f:
    data = json.load(f)

    for issue in data:
        if issue["author"] in author_dict:
            pass
        else:
            if issue["author"] == None:
                print(issue)
            author_dict.append(issue["author"])

author_list = json.dumps(author_dict, indent=4)

with open(path + "/author_dump.json", "w") as outfile:
    outfile.write(author_list)