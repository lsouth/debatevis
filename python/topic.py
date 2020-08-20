class Topic():
    def __init__(self,label):
        self.label = label
        self.id = label.replace(" ","-")
        self.first_mention = 0
        self.keywords = []
        self.indices = []

    def __eq__(a,b):
        return a.label == b.label
