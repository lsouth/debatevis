from speaker import Speaker
from statement import Statement
from topic import Topic
from textblob import TextBlob
from pprint import pprint
import re, math, string, json

class Debate():
    def __init__(self,filename):
        self.filename = str(filename)
        self.id = self.filename[self.filename.index("data") + 5: self.filename.index(".txt")].replace("\\","-")
        self.year, self.category = self.id.split("-")[:2]
        self.name = self.id.replace("-"," ").title()
        print(self.year, self.category,self.name)
        self.speakers = []
        self.lines = []
        self.tokens = []
        self.topics = []
        self.audience = []
        self.is_debate = "debate" in self.id #or "nyt_interviews" in self.id
        if self.is_debate:
            self.get_lines()
            self.get_speakers()
            self.get_speaker_titles()
            self.get_topics()
            self.find_interactions()
            self.get_topic_speaker_matrix()

    def get_lines(self):
        count = 0
        audience_actions = ["applause","laughter","booing"]
        with open(self.filename, "r", encoding="utf-8") as f:
            prev_statement = None
            for line in f.readlines():
                if line.strip() != "":
                    line = line.replace("\n","")
                    line = line.replace("\r\n","")
                    if ":" in line:
                        loc = line.index(":")
                        if line[:loc].upper() == line[:loc]: #and loc > 3:
                            speaker = line[:loc]
                            speaker = speaker.strip()
                            if speaker.upper() == speaker:
                                if prev_statement and speaker == prev_statement.speaker:
                                    # Combine statements.
                                    for action in audience_actions:
                                        if "[" + action + "]" in line or "(" + action.upper() + ")" in line:
                                            if action not in self.audience:
                                                self.audience.append(action)
                                            # line = line.replace("[" + action + "]","")
                                            # line = line.replace("(" + action.upper() + ")","")
                                            prev_statement.audience_actions.append(action)
                                    prev_statement.text += " " + line.replace(speaker + ":","")
                                else:
                                    statement = Statement(line)
                                    statement.index = count
                                    count += 1
                                    for action in audience_actions:
                                        if "[" + action + "]" in statement.text or "(" + action.upper() + ")" in statement.text:
                                            if action not in self.audience:
                                                self.audience.append(action)
                                            # statement.text = statement.text.replace("[" + action + "]","")
                                            # statement.text = statement.text.replace("(" + action.upper() + ")","")
                                            statement.audience_actions.append(action)
                                    self.lines.append(statement)
                                prev_statement = statement
                    else:
                        if prev_statement:
                            for action in audience_actions:
                                if "[" + action + "]" in line or "(" + action.upper() + ")" in line:
                                    if action not in self.audience:
                                        self.audience.append(action)
                                    # line = line.replace("[" + action + "]","")
                                    # line = line.replace("(" + action.upper() + ")","")
                                    prev_statement.audience_actions.append(action)
                            prev_statement.text += " " + line

    def get_topic_speaker_matrix(self):
        counts = {"total": {}}
        for topic in self.topics:
            counts["total"][topic.label] = 0

        for speaker in self.speakers:
            speaker_counts = {} if not speaker.is_moderator else counts.get("moderator") if "moderator" in counts else {}
            for topic in self.topics:
        #        speaker_counts[topic.label] = 0
                speaker_counts[topic.label] = []
            speaker_counts["total"] = 0
            if speaker.is_moderator:
                counts["moderator"] = speaker_counts
            else:
                counts[speaker.id] = speaker_counts

        for line in self.lines:
            for topic in line.topics:
                try:
                    keywords = line.topics[topic]
                    keyword_locations = [line.text.index(keyword) for keyword in keywords]
                    sentences = []
                    for keyword in keywords:
                        sentences = sentences + list(filter(lambda s : keyword in s, line.sentences))
            #        sentences = [("" if l < 100 else  "...") + line.text[max(0,l-100):min(len(line.text), l+100)] + ("" if len(line.text) < 100 else "...") for l in keyword_locations]
                    topic_mention_obj = {"statement": line.text, "sentence": sentences, "statement_index": line.index}
                    if list(filter(lambda x: x.id == line.speaker, self.speakers))[0].is_moderator:
                    #    counts["moderator"][topic] += 1
                        sentence_sentiment = TextBlob(line.text).sentiment.polarity
                        counts["moderator"][topic].append(topic_mention_obj)
                        counts["moderator"]["total"] += 1
                    else:
                        counts[line.speaker][topic].append(topic_mention_obj)
                        counts[line.speaker]["total"] += 1
                    counts["total"][topic] += 1
                except KeyError as e:
                    print(e)
                    print(line.speaker)
                    print(topic)

        self.topic_speaker_matrix = counts

    def get_topics(self):
        with open("data/topic-dictionary.json") as f:
            dictionary = json.load(f)
            num_categorized = 0
            for line in self.lines:
                for topic in dictionary:
                    label = list(topic.keys())[0]
                    keywords = list(topic.values())[0]
                    for keyword in keywords:
                        topic_already_seen = False
                        if keyword in line.text:
                            if label in line.topics.keys():
                                if keyword not in line.topics[label]:
                                    line.topics[label].append(keyword)
                            else:
                                line.topics[label] = [keyword]

                            for t in self.topics:
                                if t.label == label:
                                    topic_already_seen = True
                                    if keyword not in t.keywords:
                                        t.keywords.append(keyword)
                                    t.indices.append(line.index)
                            if not topic_already_seen:
                                new_topic = Topic(label)
                                new_topic.indices.append(line.index)
                                self.topics.append(new_topic)

                num_categorized += 1 if line.topics else 0
                # if not line.topics:
                #     print(line.text)
        # last_mentions = []
        # i = len(self.lines) - 1
        # while(i >= 0 or len(last_mentions) < len(self.topics)):
        #     line = self.lines[i]
        #     for topic in line.topics:
        #         if topic not in last_mentions:
        #             last_mentions.append(topic)
        #             line.last_mention.append(topic)
        #     i -= 1
        print("%d statements were categorized out of %d. (%f%%)" % (num_categorized, len(self.lines), num_categorized / len(self.lines)))

    def get_speaker_titles(self):
        titles = ["Senator","Governor","Vice President","Mayor","Congressman","Congresswoman","Secretary","Businessman"]
        for line in self.lines:
            line = line.text
            for speaker in self.speakers:
                if speaker.title == "" and speaker.last_name in line and not speaker.is_moderator:
                    tokens = line.split(" ")
                    prev_token2 = None
                    prev_token1 = None
                    for i in range(len(tokens)):
                        token = tokens[i]
                        if speaker.last_name in token:
                            break
                        prev_token2 = prev_token1
                        prev_token1 = token
                    for title in titles:
                        if title in prev_token1:
                            speaker.title = title
                    if prev_token2 == "Vice" and prev_token1 == "President":
                        speaker.title = "Vice President"

    def find_interactions(self):
        interactions_matrix = {}
        interactions = []
        for source in self.speakers:
            source_mentions = {}
            for target in self.speakers:
                if target.id not in source_mentions:
                    source_mentions[target.id] = []
            interactions_matrix[source.id] = source_mentions

        for statement in self.lines:
            if not statement.speaker:
                continue
            statement_speaker = list(filter(lambda x: x.id == statement.speaker, self.speakers))[0]
            for mentioned_speaker in self.speakers:
                if mentioned_speaker == statement_speaker or statement_speaker.is_moderator or mentioned_speaker.is_moderator:
                    continue
                if mentioned_speaker.first_name in statement.text or mentioned_speaker.last_name in statement.text:
                    sentences = statement.text.split(".")
                    sentence = ""
                    for s in sentences:
                        if mentioned_speaker.first_name in s or mentioned_speaker.last_name in s:
                            sentence = s
                    sentence += "."
                    sentence_sentiment = TextBlob(sentence).sentiment.polarity

                    interaction_class = classifyInteraction(statement.text, sentence, statement_speaker, mentioned_speaker)

                    # We need to get the sentence level polarity as well as the statement level polarity.
                    interaction_obj = {"source": statement_speaker.id,
                                       "target": mentioned_speaker.id,
                                       "statement_polarity": statement.polarity,
                                       "sentence_polarity": sentence_sentiment,
                                       "statement": statement.text,
                                       "sentence":sentence,
                                       "statement_index":statement.index,
                                       "classification": interaction_class}

                    statement.mentions.append(interaction_obj)
                    interactions_matrix[statement_speaker.id][mentioned_speaker.id].append(interaction_obj)
                    interactions.append(interaction_obj)

                    mentioned_speaker.target_count += 1
                    statement_speaker.source_count += 1

        self.interactions = interactions
        self.interactions_matrix = interactions_matrix
        print("Found %d speaker interactions. " % len(interactions))
        # interactions = sorted(interactions, key=lambda i: i["statement_polarity"])
        # for i in interactions:
        #     print("%s mentioned by %s. Statement polarity: %f Sentence polarity: %f" % (str(i["target"]), str(i["source"]), i["statement_polarity"],i["sentence_polarity"]))
        #     print("%s" % i["statement"])

    def get_speakers(self):
        current_speaker = None
        for line in self.lines:
            text = line.text
            if ":" in text:
                loc = text.index(":")
                if text[:loc].upper() == text[:loc]:# and loc > 3:
                    speaker = text[:loc]
                    if "(APPLAUSE)" in speaker:
                        speaker = speaker.replace("(APPLAUSE)","")
                    if "(CROSSTALK)" in speaker:
                        speaker = speaker.replace("(CROSSTALK)","")
                    speaker = speaker.strip()
                    if speaker.upper() != speaker or speaker == "":
                        continue
                    elif " " in speaker and speaker != "DE BLASIO" and speaker != "AUDIENCE MEMBER":
                        # we have a new speaker. Add it to the list.
                        new_speaker = Speaker(speaker)
                        self.speakers.append(new_speaker)
                        current_speaker = new_speaker
                    else:
                        for sp in self.speakers:
                            if speaker.title() == sp.last_name or speaker.title() == sp.first_name:
                                current_speaker = sp
                    line.text = text[loc+1:]
            if current_speaker is not None:
                line.speaker = current_speaker.id
                current_speaker.total_utterances += 1
            else:
                line.speaker = ""
        for speaker in self.speakers:
            print(str(speaker),flush=True)

def classifyInteraction(text, sentence, source, target):
    sentiment = TextBlob(sentence).sentiment.polarity

    mentionLoc = sentence.index(target.last_name) if target.last_name in sentence else sentence.index(target.first_name)
    if " agree " in sentence[max(0,mentionLoc-20):mentionLoc]:
        return "agree"

    if sentiment < -0.2:
        return "attack"
    return "neutral"
