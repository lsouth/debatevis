from flask import Flask
from flask_cors import CORS

import pymongo, json
app = Flask(__name__)
app.config['DEBUG'] = False
CORS(app)

@app.route('/')
def hello_world():
    return 'Hello, World!'

client = pymongo.MongoClient("mongodb+srv://user:alwaysbearound@cluster0-1a2st.mongodb.net/test?retryWrites=true&w=majority")
db = client.debates

@app.route('/debate/<name>')
def grab_record(name):
    print("/debate/", name,flush=True)
    return db.debates.find_one({'id':name}, {'_id':False})

@app.route('/all/')
def get_all_labels():
    print("Getting all labels.", flush=True)
    cursor = db.debates.find({},{'_id':False,"id":True,"year":True,"category":True,"name":True})
    debate_list = []
    for doc in cursor:
    #    debate_list += doc["id"] + ","
        debate_list.append(doc)
    debate_list = json.dumps(debate_list)
    print(debate_list)
    return debate_list
