import json,os
from datetime import datetime

# defining a Message class to store only relevant data from a message
class Message:
    def __init__(self, id, text, date, author):
        self.id = id
        self.text = text
        self.date = date
        self.author = author
        self.replies = []


    def __str__(self) -> str:
        return str([(k,v) for k,v in self.__dict__.items()])
    
    def __repr__(self) -> str:
        return str(self)
    
    def addReply(self, message):
        self.replies.append(message)


# where all of our jsons for slack are stored
path = '/Users/aaronzaks/Desktop/IEEE Velocity Research/Slack Export'

# creating an empty list
list_of_msgs = []
date_dict = dict()
author_dict = dict()

# open every file in that folder
for root, dirs, files in os.walk(path, topdown=True):

    # load the json file using the json package
    for name in files:
        with open(os.path.join(root, name), 'r') as f:
            data = json.load(f)
        
        # converting the NAME OF THE FILE into an iso format. 
        #                       remove ".json"            isoformat is legible by javascript as well for later d3 stuff
        m_time = datetime.strptime(name[:-5], '%Y-%m-%d').isoformat()

        # count the number of messages per day as we go
        n = 0
        for msg in data:

            # removing channel joins - irrelevant. maybe we should keep them? 
            if 'subtype' in msg and msg['subtype'] == "channel_join":
                continue

            n += 1
            m_id = msg['ts']
            m_text = msg['text']
            m_author_id = msg['user']
            message = Message(m_id, m_text, m_time, m_author_id)
            list_of_msgs.append(message)

            # putting together a dictionary that gives us real names for every author_id
            # i decided it was cheaper computationally for the script to 
            # overwrite existing k,v pairs instead of check if it's already in
            if 'user_profile' in msg:
                author_dict[m_author_id] = msg['user_profile']['real_name']
        
        date_dict[m_time] = n


    #for name in dirs:
    #    print(os.path.join(root, name))

date_json = json.dumps(date_dict, indent=4)
 
# Writing to sample.json
with open("date_dict.json", "w") as outfile:
    outfile.write(date_json)