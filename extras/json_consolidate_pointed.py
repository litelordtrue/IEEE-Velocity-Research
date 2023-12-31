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
        self.direction = []


    def __str__(self) -> str:
        return str([(k,v) for k,v in self.__dict__.items()])
    
    def __repr__(self) -> str:
        return str(self)
    
    def addReply(self, message):
        self.replies.append(message)
    
    def setDirection(self, direction):
        self.direction = direction


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
            if 'subtype' in msg and (msg['subtype'] == "channel_join" or msg['subtype'] == "channel_leave"):
                continue

            m_direction = []

            if 'blocks' in msg:
                for block in msg['blocks']:
                    if 'elements' in block:
                        for element in block['elements']:
                            if 'elements' in element:
                                for subelement in element['elements']:
                                    if subelement["type"] == "user":
                                        m_direction.append(subelement["user_id"])
                    
            
            n += 1
            m_id = msg['ts']
            m_text = msg['text']
            m_author_id = msg['user']
            message = {
                "id": m_id,
                "text": m_text,
                "date": m_time,
                "author": m_author_id,
                "direction": m_direction
            }
            list_of_msgs.append(message)

            # putting together a dictionary that gives us real names for every author_id
            # i decided it was cheaper computationally for the script to 
            # overwrite existing k,v pairs instead of check if it's already in
            if 'user_profile' in msg:
                author_dict[m_author_id] = msg['user_profile']['display_name']
        
        date_dict[m_time] = n



    #for name in dirs:
    #    print(os.path.join(root, name))

# sort by date

list_of_msgs.sort(key=(lambda msg : msg["date"]))


list_json = json.dumps(author_dict, indent=4)

# Writing to sample.json
with open("author_dump.json", "w") as outfile:
    outfile.write(list_json)

#print(list_of_msgs[0])