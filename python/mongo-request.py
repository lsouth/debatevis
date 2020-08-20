import bottle, pymongo, json

client = pymongo.MongoClient("mongodb+srv://user:alwaysbearound@cluster0-1a2st.mongodb.net/test?retryWrites=true&w=majority")
db = client.debates

@bottle.route('/debate/<name>')
def grab_record(name):
    print("/debate/", name,flush=True)
    bottle.response.headers['Access-Control-Allow-Origin'] = '*' # <- needed to allow request from D3

    return db.debates.find_one({'id':name}, {'_id':False})

@bottle.route('/all/')
def get_all_labels():
    print("Getting all labels.", flush=True)
    bottle.response.headers['Access-Control-Allow-Origin'] = '*' # <- needed to allow request from D3
    cursor = db.debates.find({},{'_id':False,"id":True,"year":True,"category":True,"name":True})
    debate_list = []
    for doc in cursor:
    #    debate_list += doc["id"] + ","
        debate_list.append(doc)
    debate_list = json.dumps(debate_list)
    print(debate_list)
    return debate_list


bottle.run(host='0.0.0.0', port=8080, debug=True)
