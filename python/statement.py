from textblob import TextBlob
import spotlight, requests, re

class Statement():

    def __init__(self, text):
        self.text = text
    #    self.spotlight_text = self.getSpotlightText()
        self.index = 0
        self.speaker = ""
        self.type = ""
        self.target = ""
        self.audience_actions = []
        self.is_interruption = False
        self.topics = {}
        self.mentions = []
        tb = TextBlob(text)
        self.polarity = tb.sentiment.polarity
        self.subjectivity = tb.sentiment.subjectivity
        self.first_mention = []
        self.last_mention = []
        self.sentences = re.split("(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s", text)

    def getSpotlightText(self):
        base_url = "http://api.dbpedia-spotlight.org/en/annotate"
        params = {"text": self.text, "confidence": 0.5}
        headers = {'accept': 'text/html'}
        res = requests.get(base_url, params=params, headers=headers)
        print(res.text,flush=True)
        if res.status_code != 200:
            print("Error accessing Spotlight API.")
            return ""
        return res.text
