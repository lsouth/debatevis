from pathlib import Path
import string, warnings, re
import numpy as np
import pandas as pd

import gensim
import gensim.corpora
from gensim.utils import lemmatize

from sklearn.decomposition import LatentDirichletAllocation
from nltk.corpus import stopwords
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import CountVectorizer

stopwords = set(stopwords.words('english') + list(string.punctuation) + ['will', 'also', 'said'] + ["clinton","sanders","warren","buttigieg","harris","gillibrand","applause","president","senator","person"])

def train_LDA_sklearn(train):
    lda = LatentDirichletAllocation(n_components=20, random_state=0)
    lda_model = lda.fit(train)
    return lda_model

def strip_newline(series):
    return [review.replace('\n','') for review in series]

def remove_stopwords(texts):
    return [[word for word in doc if word not in stopwords] for doc in texts]

def bigrams(words, bi_min=15, tri_min=10):
    bigram = gensim.models.Phrases(words, min_count = bi_min)
    bigram_mod = gensim.models.phrases.Phraser(bigram)
    return bigram_mod

def sent_to_words(sentences):
    for sentence in sentences:
        yield(gensim.utils.simple_preprocess(str(sentence), deacc=True))

def get_corpus(df):
    df['text'] = strip_newline(df.text)
    words = list(sent_to_words(df.text))
    words = remove_stopwords(words)
    words = [[w.decode("utf-8").split('/')[0] for w in lemmatize(' '.join(word), allowed_tags=re.compile('(NN)'), min_length=3)] for word in words]
    bigram_mod = bigrams(words)
    bigram = [bigram_mod[review] for review in words]
    id2word = gensim.corpora.Dictionary(bigram)
    id2word.filter_extremes(no_below=10, no_above=0.35)
    id2word.compactify()
    corpus = [id2word.doc2bow(text) for text in bigram]
    return corpus, id2word, bigram

def collect_data():
    transcript_count = 0
    corpus = {"text": []}
    for filename in Path("data/").rglob('*.txt'):
        print(filename)
        with open(filename, encoding="utf-8") as f:
            transcript_count += 1
            lines = f.read().splitlines()
            for line in lines:
                if ":" in line:
                    loc = line.index(":")
                    if loc < 20 and line[:loc].isupper():
                        line = line[loc+2:]
                if not line:
                    continue
                corpus["text"].append(line)
    print("Constructed corpus with %d transcripts." % transcript_count)
    return pd.DataFrame.from_dict(corpus)

def predict_LDA(lda_model, X):
    print("Using trained LDA model to classify text: %s" % X)
    X = [X]
    X_counts = self.count_vect.transform(X)
    X_tfidf = self.tfidf_transformer.transform(X_counts)
    prediction = self.LDA_model.transform(X_tfidf)
    return prediction

def get_bigram(df):
    df['text'] = strip_newline(df.text)
    words = list(sent_to_words(df.text))
    words = remove_stopwords(words)
    bigram = bigrams(words)
    bigram = [bigram[review] for review in words]
    return bigram

if __name__ == "__main__":
    data_train = collect_data()
    train_corpus, train_id2word, bigram_train = get_corpus(data_train)
    num_topics = 25

    lda_train = gensim.models.ldamulticore.LdaMulticore(
                           corpus=train_corpus,
                           num_topics=num_topics,
                           id2word=train_id2word,
                           chunksize=100,
                           workers=7, # Num. Processing Cores - 1
                           passes=50,
                           eval_every = 1,
                           per_word_topics=True)
    lda_train.save('lda_train.model')

    for topic in lda_train.print_topics(num_topics,num_words=15):
        print(topic)
        print()

    healthcare = "obamacare and healthcare and insurance obamacare and healthcare and insurance obamacare and healthcare and insurance."
    sanders = "And I'll tell you what the advantage — if there's an advantage of being 78 — is that I have been doing what I do for a long time. So, if you want to get your researchers to take a look at my record, what you'll find out is I have been on more picket lines than probably all of my opponents combined, because I believe in workers' rights. In terms of Medicare for All, this is not a new idea for me. Trust me. I was talking about that, going up to Canada, getting Canadians to come to talk about it when I was mayor of the city of Burlington. Taking on the pharmaceutical industry: 20 years ago I took a bus load of Vermonters across the Canadian border to buy tamoxifen, a breast cancer drug, for one-tenth the price. So, the advantage in the sense of age, is that what I do today, is by and large what I've been doing my whole life. Now, you may like it. You may not like it. Ain't going to change when I get to the White House. And I see that as an advantage. People know who I am. What I stand for. Some like it, some don't. But the president I will be is not different than the guy I've been for the last 30, 40 years."

    data_test = pd.DataFrame.from_dict({"text": [healthcare, sanders]})
    bigram_test = get_bigram(data_test)
    test_corpus = [train_id2word.doc2bow(text) for text in bigram_test]

    test_vecs = []
    for i in range(len(data_test)):
        top_topics = lda_train.get_document_topics(test_corpus[i], minimum_probability=1/num_topics)
    #    topic_vec = [top_topics[i][1] for i in range(25)]
        topic_vec = sorted(top_topics, key = lambda x : x[1], reverse = True)
        print()
        print(data_test["text"][i])
        print(topic_vec)
    #    topic_vec.extend([data_train.iloc[i].real_counts]) # counts of reviews for restaurant
    #    topic_vec.extend([len(data_train.iloc[i].text)]) # length review
    # train, test = train_test_split(corpus, random_state=42, test_size=0.2, shuffle=True)
    #
    # count_vectorizer = CountVectorizer(stopwords)
    # train_counts = count_vectorizer.fit_transform(train)
    # tfidf_transformer = TfidfTransformer()
    # train_tfidf = tfidf_transformer.fit_transform(train_counts)
    # lda_model = train_LDA_sklearn(train_tfidf)
    # predict_LDA(lda_model, "This is a test.")
