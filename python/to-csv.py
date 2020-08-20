from pathlib import Path

for filename in Path('data/').rglob('*.txt'):
    print("\nReading %s." % filename,flush=True)

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
