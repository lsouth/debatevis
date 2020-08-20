import sys, os, json
from pymongo import MongoClient
from speaker import Speaker
from debate import Debate
from pprint import pprint
from pathlib import Path

import gensim
from gensim.models import CoherenceModel
from nltk.corpus import stopwords

import re

class DebateAnalyzer():
    def __init__(self):
        client = MongoClient("mongodb+srv://user:alwaysbearound@cluster0-1a2st.mongodb.net/test?retryWrites=true&w=majority")
        self.db = client.debates
        self.debates = []
        self.stop_words = stopwords.words('english')

    def read_debate(self,file):
        debate = Debate(file)

    def clean_text(self,line):
        for sw in stop_words:
            line = line.replace(sw,"")
        line = line.lower()

    def create_corpus(self):
        documents = []
        for filename in Path('data/').rglob('*.txt'):
            try:
                print("\nReading %s." % filename,flush=True)
                debate = Debate(filename)
                self.debates.append(debate)
            except UnicodeDecodeError:
                print("Error reading %s" % filename)

    def save_corpus_to_json(self):
        for debate in self.debates:
            debate_dict = debate.__dict__
            for i in range(len(debate_dict["lines"])):
                debate_dict["lines"][i] = debate_dict["lines"][i].__dict__

            for i in range(len(debate_dict["speakers"])):
                debate_dict["speakers"][i] = debate_dict["speakers"][i].__dict__

            for i in range(len(debate_dict["topics"])):
                debate_dict["topics"][i] = debate_dict["topics"][i].__dict__
            with open(debate.filename.replace(".txt",".json"),"w") as f:
                json.dump(debate_dict,f)


    def save_corpus_to_db(self):
        for debate in self.debates:
            debate_dict = debate.__dict__
            for i in range(len(debate_dict["lines"])):
                debate_dict["lines"][i] = debate_dict["lines"][i].__dict__

            for i in range(len(debate_dict["speakers"])):
                debate_dict["speakers"][i] = debate_dict["speakers"][i].__dict__

            for i in range(len(debate_dict["topics"])):
                debate_dict["topics"][i] = debate_dict["topics"][i].__dict__

            prev_entry = self.db.debates.delete_one({"filename": debate.filename})
            self.db.debates.insert_one(debate_dict)
            print("Inserted %s." % debate.filename,flush=True)
    #         tokens = [word for word in gensim.utils.simple_preprocess(line) if word not in stop_words]
    #         documents.append(tokens)
    #     print("Creating model with %d documents." % len(documents))
    #     # Create Dictionary
    #     id2word = gensim.corpora.Dictionary(documents)
    #     print(id2word)
    #     # Create Corpus
    #     texts = documents
    #
    #     # Term Document Frequency
    #     corpus = [id2word.doc2bow(text) for text in documents]
    #
    #     # View
    #     print([[(id2word[id], freq) for id, freq in cp] for cp in corpus[:5]])
    #
    #     lda_model = gensim.models.ldamodel.LdaModel(corpus=corpus,id2word=id2word,num_topics=10,random_state=100,update_every=1,chunksize=100,passes=10,alpha='auto',per_word_topics=True)
    #     pprint(lda_model.print_topics())
    #     doc_lda = lda_model[corpus]
    #
    #     # Compute Perplexity
    #     print('\nPerplexity: ', lda_model.log_perplexity(corpus))  # a measure of how good the model is. lower the better.
    #
    #     # Compute Coherence Score
    #     coherence_model_lda = CoherenceModel(model=lda_model, texts=documents, dictionary=id2word, coherence='c_v')
    #     coherence_lda = coherence_model_lda.get_coherence()
    #     print('\nCoherence Score: ', coherence_lda)
    #
    # #    model = gensim.models.Word2Vec(documents,size=150,window=10,min_count=2,workers=10,iter=10)
    # #    print(model.wv.most_similar(positive="russia", topn=6))
    #
    #

if __name__ == "__main__":
    engine = DebateAnalyzer()
    #engine.read_debate("2020/dem/debate2-night1.txt")
    engine.create_corpus()
    engine.save_corpus_to_json()
