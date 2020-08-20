def classifyInteraction(text, sentence, source, target):
    sentiment = TextBlob(text).sentiment.polarity

    mentionLoc = sentence.index(target.last_name) if target.last_name in sentence else sentence.index(target.first_name)
    if "agree" in sentence[:sentence.in]
