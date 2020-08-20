import numpy as np
import pandas as pd
from collections import Counter
from pathlib import Path
import json
import re
import matplotlib.pyplot as plt
from pprint import pprint
import operator
import string
from hlda.sampler import HierarchicalLDA
import guidedlda

import gensim
from gensim.utils import lemmatize
from gensim.corpora import Dictionary
from gensim.models import CoherenceModel, LdaModel, LsiModel, HdpModel

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.pipeline import Pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import accuracy_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multiclass import OneVsRestClassifier
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.decomposition import LatentDirichletAllocation

from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer
from nltk.tokenize import word_tokenize
stop_words = set(stopwords.words('english') + list(string.punctuation) + ['will', 'also', 'said'] + ["clinton","sanders","warren","buttigieg","harris","gillibrand","applause","president","senator","person"])

class TopicClassifier():
    def __init__(self):
    #    self.corpus =  pd.DataFrame({"text": [], "topics": []})
        self.corpus = {"text": [], "topics":[]}
        self.dictionary = None
        with open("data/topic-dictionary.json","r") as f:
            self.dictionary = json.load(f)
        self.categories = [list(topic.keys())[0] for topic in self.dictionary]
        self.categories = ["foreign-policy","healthcare","abortion-rights"]
        self.categories.append("none")


    def construct_corpus(self):
        transcript_count = 0
        for filename in Path('labelled/2016/dem/').rglob('*.csv'):
            print(filename)
            transcript_count += 1
            df = pd.read_csv(filename)
            for index, row in df.iterrows():
                text = row["text"]
                topics = []
                for topic in self.dictionary:
                    tags = list(topic.values())[0]
                    if any([tag in text for tag in tags]):
                #        print("Classifying as %s." % topic.keys())
                        topics.append(list(topic.keys())[0])
                if not topics:
                    topics.append("none")
            #    new_df = pd.DataFrame({"text": text, "topics": topics})
                self.corpus["text"].append(text)
                self.corpus["topics"].append(topics)
        print("Constructed corpus with %d transcripts." % transcript_count)
    #    print("Top topics:")
        # counter = Counter(self.corpus["topics"])
        # top_topics = {i: idx for idx, i in enumerate(counter.most_common(10))}
        # print(top_topics)

    def process_texts(self):
        bigram = gensim.models.Phrases(self.corpus)
        self.tokens = [[word for word in line.split(" ") if word not in stop_words] for line in self.corpus["text"]]
        self.tokens = [bigram[line] for line in self.tokens]
        self.tokens = [[word.decode("utf-8").split('/')[0] for word in lemmatize(' '.join(line), allowed_tags=re.compile('(NN)'), min_length=3)] for line in self.tokens]

        self.dictionary = Dictionary(self.tokens)
        self.corpus2 = [self.dictionary.doc2bow(text) for text in self.tokens]

    def run_guidedLDA(self):
        corpus = []
        all_docs = []
        vocab = set()
        texts = []
        stemmer = PorterStemmer()
        for filename in Path('data/2020/dem/').rglob('*.txt'):
            with open(filename, encoding="utf-8") as f:
                try:
                    lines = f.read().splitlines()
                    for line in lines:
                        if ":" in line:
                            loc = line.index(":")
                            if loc < 20 and line[:loc].isupper():
                                line = line[loc+2:]
                        if not line:
                            continue

                        doc = line
                        doc = re.sub('['+string.punctuation+']', '', doc) # strip punctuations
                        doc = ''.join(i for i in doc if not i.isdigit()) # strip numbers
                        all_docs.append(doc)

                        tokens = word_tokenize(str(doc))
                        filtered = []
                        for w in tokens:
                            w = lemmatize(w, allowed_tags=re.compile('(NN)'), min_length=3)
                            if not w:
                                continue
                            w = w[0].decode("utf-8").split('/')[0]
                            if len(w) < 3:              # remove short tokens
                                continue
                            if w in stop_words:            # remove stop words
                                continue
                            filtered.append(w)
                        texts.append(" ".join(filtered))
                        vocab.update(filtered)
                        corpus.append(filtered)

                except UnicodeDecodeError as e:
                    print(e)
                    print("Failed to load %s" % filename)

        self.count_vect = CountVectorizer(stop_words)
        counts = self.count_vect.fit_transform(texts)
        self.tfidf_transformer = TfidfTransformer()
        tfidf = self.tfidf_transformer.fit_transform(counts)
        vocab = sorted(list(vocab))

        seed_topic_list = []
        word2id = dict((v, idx) for idx, v in enumerate(vocab))
        for topic in self.dictionary:
            words = list(topic.values())[0]
            words = [word.replace(" ","") for word in words]
            seed_topic_list.append(words)

        n_topics = len(seed_topic_list)
        model = guidedlda.GuidedLDA(n_topics=n_topics, n_iter=10, random_state=7, refresh=20)

        seed_topics = {}
        for t_id, st in enumerate(seed_topic_list):
            for word in st:
                try:
                    seed_topics[word2id[word]] = t_id
                except KeyError:
                    pass
        print("Shape of X is %s" % str(counts.shape))
        model.fit(counts)
        n_top_words = 10
        topic_word = model.topic_word_
        print("%d words in vocab." % len(vocab))
        doc_topic = model.transform(counts)
        for i in range(9):
            print("top topic: {} Document: {}".format(doc_topic[i].argmax(),
                                                  ', '.join(np.array(vocab)[list(reversed(counts[i,:].argsort()))[0:5]])))
        for i, topic_dist in enumerate(topic_word):
            topic_words = np.array(vocab)[np.argsort(topic_dist)][:-(n_top_words+1):-1]
            print('Topic {}: {}'.format(i, ' '.join(topic_words)))

        # doc_topic = model.transform(counts)
        # for i in range(180,189):
        #     print(texts[i])
        #     print("top topic: {}".format(doc_topic[i].argmax()),flush=True)
        print("Seed topics: ", seed_topics)
        model.fit(counts, seed_topics=seed_topics, seed_confidence=1.0)
    #    doc_topic = model.transform(tfidf)
        for i, topic_dist in enumerate(topic_word):
            topic_words = np.array(vocab)[np.argsort(topic_dist)][:-(n_top_words+1):-1]
            print('Topic {}: {}'.format(i, ' '.join(topic_words)))

    def run_hLDA(self):
        corpus = []
        all_docs = []
        vocab = set()

        stemmer = PorterStemmer()
        for filename in Path('data/').rglob('*.txt'):
            with open(filename, encoding="utf-8") as f:
                try:
                    lines = f.read().splitlines()
                    for line in lines:
                        if ":" in line:
                            loc = line.index(":")
                            if loc < 20 and line[:loc].isupper():
                                line = line[loc+2:]
                        if not line:
                            continue
                        doc = line
                        # doc = filter(None, doc) # remove empty string
                        # doc = '. '.join(doc)
                        doc = re.sub('['+string.punctuation+']', '', doc) # strip punctuations
                        doc = ''.join(i for i in doc if not i.isdigit()) # strip numbers
                #        doc = doc.decode("utf8").encode('ascii', 'ignore') # ignore fancy unicode chars
                        all_docs.append(doc)

                        tokens = word_tokenize(str(doc))
                        filtered = []
                        for w in tokens:
                    #        w = stemmer.stem(w.lower()) # use Porter's stemmer

                            w = lemmatize(w, allowed_tags=re.compile('(NN)'), min_length=3)
                            if not w:
                                continue
                            w = w[0].decode("utf-8").split('/')[0]
                            if len(w) < 3:              # remove short tokens
                                continue
                            if w in stop_words:            # remove stop words
                                continue
                            filtered.append(w)

                        vocab.update(filtered)
                        corpus.append(filtered)

                except UnicodeDecodeError as e:
                    print(e)
                    print("Failed to load %s" % filename)
        print(len(vocab), len(corpus), len(corpus[0]), len(corpus[1]),flush=True)
        vocab = sorted(list(vocab))
        vocab_index = {}
        for i, w in enumerate(vocab):
            vocab_index[w] = i

        new_corpus = []
        for doc in corpus:
            new_doc = []
            for word in doc:
                word_idx = vocab_index[word]
                new_doc.append(word_idx)
            new_corpus.append(new_doc)

        # bigram = gensim.models.Phrases(self.corpus)
        # self.tokens = [[word for word in line.split(" ") if word not in stop_words] for line in self.corpus["text"]]
        # self.tokens = [bigram[line] for line in self.tokens]
        # self.tokens = [[word.decode("utf-8").split('/')[0] for word in lemmatize(' '.join(line), allowed_tags=re.compile('(NN)'), min_length=3)] for line in self.tokens]
        #
        # self.dictionary = Dictionary(self.tokens)
        # self.numbered_corpus = [self.dictionary.doc2bow(text)[0] for text in self.tokens]
        # print(self.tokens[:10])
        # print(self.numbered_corpus[:10])

        n_samples = 50       # no of iterations for the sampler
        alpha = 10.0          # smoothing over level distributions
        gamma = 1.0           # CRP smoothing parameter; number of imaginary customers at next, as yet unused table
        eta = 0.1             # smoothing over topic-word distributions
        num_levels = 3        # the number of levels in the tree
        display_topics = 50   # the number of iterations between printing a brief summary of the topics so far
        n_words = 10           # the number of most probable words to print for each topic after model estimation
        with_weights = False  # whether to print the words with the weights

        hlda = HierarchicalLDA(new_corpus, vocab, alpha=alpha, gamma=gamma, eta=eta, num_levels=num_levels)
        print("Created hLDA.",flush=True)
        print(hlda.estimate(n_samples, display_topics=display_topics, n_words=n_words, with_weights=with_weights),flush=True)

    def run_LDA_sklearn(self):
        lda = LatentDirichletAllocation(n_components=20, random_state=0)
        self.LDA_model = lda.fit(self.x_train_tfidf)

    def get_top_model(self):
        top_topics = [(0, 0)]
        while top_topics[0][1] < 0.97:
            lm = LdaModel(corpus=self.corpus2, id2word=self.dictionary)
            coherence_values = {}
            for n, topic in lm.show_topics(num_topics=-1, formatted=False):
                topic = [word for word, _ in topic]
                cm = CoherenceModel(topics=[topic], texts=self.tokens, dictionary=self.dictionary, window_size=10)
                coherence_values[n] = cm.get_coherence()
            top_topics = sorted(coherence_values.items(), key=operator.itemgetter(1), reverse=True)
        return lm, top_topics

    def evaluate_graph(self):
        c_v = []
        lm_list = []
        limit = 20
        for num_topics in range(1, limit):
            lm = LdaModel(corpus=self.corpus2, num_topics=num_topics, id2word=self.dictionary)
            lm_list.append(lm)
            cm = CoherenceModel(model=lm, texts=self.tokens, dictionary=self.dictionary, coherence='c_v')
            c_v.append(cm.get_coherence())
            print(cm.get_coherence())

        # Show graph
        x = range(1, limit)
        plt.plot(x, c_v)
        plt.xlabel("num_topics")
        plt.ylabel("Coherence score")
        plt.legend(("c_v"), loc='best')
        plt.show(block=True)

        return lm_list, c_v

    def run_NB(self):
        NB_pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(stop_words=stop_words)),
                ('clf', OneVsRestClassifier(MultinomialNB(
                    fit_prior=True, class_prior=None))),
            ])

        print()
        print("Running Naive Bayes pipeline on corpus.")
        for category in self.categories:
            print("... Processing %s" % category)
            # train the model using X_dtm & y
            binary_Ytrain = [category in y for y in self.Y_train]
            binary_Ytest = [category in y for y in self.Y_test]

            NB_pipeline.fit(self.X_train, binary_Ytrain)
            train_pred = NB_pipeline.predict(self.X_train)
            # compute the testing accuracy
            test_pred = NB_pipeline.predict(self.X_test)
            print("Sum of true in Y_train: %d" % np.count_nonzero(binary_Ytrain))
            print("Sum of true in Y_train pred: %d" % np.count_nonzero(train_pred))
            print("Train accuracy is %f." % accuracy_score(binary_Ytrain, train_pred))
            print("Sum of true in Y_test: %d" % np.count_nonzero(binary_Ytest))
            print("Sum of true in Y_test pred: %d" % np.count_nonzero(test_pred))
            print("Test accuracy is %f." % accuracy_score(binary_Ytest, test_pred))
            print()

    def run_SVM(self):
        SVC_pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(stop_words=stop_words)),
                ('clf', OneVsRestClassifier(LinearSVC(), n_jobs=1)),
            ])
        print()
        print("Running Linear SVM on corpus.")
        self.X_test = pd.DataFrame({"text": ["Healthcare medicare. And we should be worried about foreign policy and nuclear weapons in China."]})
        self.Y_test = pd.DataFrame({"topics": [["healthcare","foreign-policy"]]})
        models = []
        for category in self.categories:
            print("... Processing %s" % category)
            # train the model using X_dtm & y
            binary_Ytrain = [category in y for y in self.Y_train]
            binary_Ytest = [category in y.topics for i,y in self.Y_test.iterrows()]
            print("Category %s is in Y_test[i] ? %s " % (category, binary_Ytest))
            SVC_pipeline.fit(self.X_train, binary_Ytrain)
            train_pred = SVC_pipeline.predict(self.X_train)
            # compute the testing accuracy
            test_pred = SVC_pipeline.predict(self.X_test)
            print("Sum of true in Y_train: %d" % np.count_nonzero(binary_Ytrain))
            print("Sum of true in Y_train pred: %d" % np.count_nonzero(train_pred))
            print("Train accuracy is %f." % accuracy_score(binary_Ytrain, train_pred))

            print("Sum of true in Y_test: %d" % np.count_nonzero(binary_Ytest))
            print("Sum of true in Y_test pred: %d" % np.count_nonzero(test_pred))
            print("Test accuracy is %f." % accuracy_score(binary_Ytest, test_pred))

            if category is not "none":
                for i in range(len(self.Y_test)):
                    if test_pred[i]:
                        print("Text: %s" % str(self.X_test.iloc[i]))
                        print("Assigned to class %s: %s" % (category, test_pred[i]))
            print()

    def run_LR(self):
        print()
        print("Running LR on corpus.")
        LogReg_pipeline = Pipeline([
                        ('tfidf', TfidfVectorizer(stop_words=stop_words)),
                        ('clf', OneVsRestClassifier(LogisticRegression(solver='sag'), n_jobs=1)),
                    ])

        for category in self.categories:
            print("... Processing %s" % category)
            # train the model using X_dtm & y
            binary_Ytrain = [category in y for y in self.Y_train]
            binary_Ytest = [category in y for y in self.Y_test]

            LogReg_pipeline.fit(self.X_train, binary_Ytrain)
            train_pred = LogReg_pipeline.predict(self.X_train)
            # compute the testing accuracy
            test_pred = LogReg_pipeline.predict(self.X_test)
            print("Sum of true in Y_train: %d" % np.count_nonzero(binary_Ytrain))
            print("Sum of true in Y_train pred: %d" % np.count_nonzero(train_pred))
            print("Train accuracy is %f." % accuracy_score(binary_Ytrain, train_pred))

            print("Sum of true in Y_test: %d" % np.count_nonzero(binary_Ytest))
            print("Sum of true in Y_test pred: %d" % np.count_nonzero(test_pred))
            print("Test accuracy is %f." % accuracy_score(binary_Ytest, test_pred))
            print()

    def get_test_train_split(self):
        self.X_train, self.X_test, self.Y_train, self.Y_test = train_test_split(self.corpus["text"], self.corpus["topics"], random_state=42, test_size=0.2, shuffle=True)
        self.count_vect = CountVectorizer(stop_words)
        self.x_train_counts = self.count_vect.fit_transform(self.X_train)

        self.tfidf_transformer = TfidfTransformer()
        self.x_train_tfidf = self.tfidf_transformer.fit_transform(self.x_train_counts)

    def predict_LDA(self, X):
        print("Using trained LDA model to classify text: %s" % X)
        X = [X]
        X_counts = self.count_vect.transform(X)
        X_tfidf = self.tfidf_transformer.transform(X_counts)
        prediction = self.LDA_model.transform(X_tfidf)
        print(prediction)

if __name__ == "__main__":
    tc = TopicClassifier()
    tc.construct_corpus()
    tc.get_test_train_split()
    tc.run_guidedLDA()
    # tc.construct_corpus()
    # tc.process_texts()
    #
#    tc.run_hLDA()
# print(data)
# counter = Counter(data["topic"].tolist())
#
# top_topics = {i[0]: idx for idx, i in enumerate(counter.most_common(10))}
# print(top_topics)
# data = data[data['topic'].map(lambda x: x in top_topics)]
# texts = data["text"].tolist()
# topic_list = [top_topics[i] for i in data['topic'].tolist()]
# topic_list = np.array(topic_list)
#
# count_vect = CountVectorizer()
# x_train_counts = count_vect.fit_transform(texts)
#
# tfidf_transformer = TfidfTransformer()
# x_train_tfidf = tfidf_transformer.fit_transform(x_train_counts)
#
# train_x, test_x, train_y, test_y = train_test_split(x_train_tfidf, topic_list, test_size=0.3)
#
# clf = MultinomialNB().fit(train_x, train_y)
# y_score = clf.predict(test_x)
#
# n_right = 0
# for i in range(len(y_score)):
#     if y_score[i] == test_y[i]:
#         n_right += 1
#
# print("Accuracy: %.2f%%" % ((n_right/float(len(test_y)) * 100)))
