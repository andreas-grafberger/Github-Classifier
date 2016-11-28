#!/usr/bin/env python
# -*- coding: utf-8 -*-
import cPickle as pickle
import os
import base64

from sklearn.feature_extraction.text import TfidfVectorizer
import re
from nltk.stem import PorterStemmer
import numpy as np

# Constants
max_stars = 1000
max_forks =  100
max_watches = 10
max_folder_count = 100
max_treeDepth = 10
max_branch_count = 10
max_forks = 100
max_commit_interval_avg = 10
max_contributors_count = 10
max_open_issues_count = 10
max_avg_commit_length = 100
max_file_count = 100
max_commit_interval_max = 10

max_vectorizer_word_count = 3000

label_dict = {'DEV':0, 'HW':1, 'EDU':2, 'DOCS':3, 'WEB':4, 'DATA':5, 'OTHER':6}

# Save vectorizer so it doesnt have to be loaded from serialised file each time
global_vectorizer = None

#besser: evtl in getunlabeleddata und getlabeleddata und gettrainingsdata aufspalten?
def getVectorsFromData(data, processText=True):
    """Get list of dicts which contain all feature-vectors"""
    # Feature vectors
    features = []
    # Klassennamen
    label_names = []
    # Classes
    labels = []
    for i in xrange(len(data)):
        sample = data[i]
        feature = {'readme':None, 'description':None, 'meta':None}
        feature['readme'] = getReadme(sample)
        feature['meta'] = getMetadataVector(sample)
        feature['description'] = getDescription(sample)
        if processText:
            feature['readme'] = process_text(feature['readme'])
            feature['description'] = process_text(feature['description'])
        features.append(feature)
        labels.append(getLabelIndex(sample[i]))
    return (features, labels, label_names)

def getLabelIndex(sample):
    return label_dict[sample['class']]

def getLabelName(index):
    for label in label_dict:
        if label_dict[label] == index:
            return label

    
def text_from_base64(text):
    """Convert text back from base64"""
    missing_padding = len(text) % 4
    if missing_padding != 0:
        text += b'='* (4 - missing_padding)
    text = None
    try:
        text = base64.b64decode(text)
    except TypeError:
        print "Error decoding readme"
        return ""
    return text

def getReadme(data):
    return base64.b64decode(data['readme'])

def getDescription(data):
    return data['description']

def getMetadataVector(sample):
    # Get metadata
    vec = []
    vec.append(min(1., (float(sample['hasDownloads']))))
    vec.append(min(1., float(sample['watches']) / max_watches))
    vec.append((min(1., float(sample['folder_count']) / max_folder_count)))
    vec.append((min(1., float(sample['treeDepth']) / max_treeDepth)))
    vec.append((min(1., float(sample['stars']) / max_stars)))
    vec.append((min(1., float(sample['branch_count']) / max_branch_count)))
    vec.append((min(1., float(sample['forks']) / max_forks)))
    vec.append((min(1., float(sample['commit_interval_avg']) / max_commit_interval_avg)))
    vec.append((min(1., float(sample['contributors_count']) / max_contributors_count)))
    vec.append((min(1., float(sample['open_issues_count']) / max_open_issues_count)))
    vec.append((min(1., float(sample['avg_commit_length']) / max_avg_commit_length)))
    vec.append((min(1., float(sample['hasWiki']))))
    vec.append((min(1., float(sample['file_count']) / max_file_count)))
    vec.append((min(1., float(sample['commit_interval_max']) / max_commit_interval_max)))
    vec.append((min(1., float(sample['isFork']))))
    return vec

def getFileNameAndAuthorString(sample):
    return (sample['files'], sample['author'])

def getTextVectorizer(max_features, vectorizer_name="vectorizer.bin"):
    """Creates new TfIdfVectorizer"""
    vectorizer = TfidfVectorizer(
                            sublinear_tf=True,  # Reason: 'It seems unlikely that twenty occurrences of a 
                                                # term in a document truly carry twenty times the significance of a single occurrence.'
                                                # http://nlp.stanford.edu/IR-book/html/htmledition/sublinear-tf-scaling-1.html
                            stop_words='english', # Removes Stopwords from document
                            decode_error='ignore', # Ignore if character couldnt be read
                            analyzer='word',    # Scan words, not characters
                            ngram_range=(1, 2), # Try different ngrams, possibly useful with more training data
                            max_features=max_features
                            #max_df=0.5 # Verwendet im ML-Kurs unter Preprocessing                   
                )
    return vectorizer


def process_text(text, remove_url=True, remove_code=True, remove_punctuation=True, stem=True):
    # Process string
    readme_codefree = ""
    readme = ""
    words = ""
    final_words = ""
    if text is not None:
        if remove_code is True:
            for no_code in text.split("```")[::2]:
                # skip content code in e.g.  blalba```code```blabla
                readme += no_code
        if remove_url:
            # Remove urls
            readme = re.sub(r'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)', ' ', readme)
        if remove_punctuation:
            for word in ((char if char.isalpha() else " ") for char in readme):
                try:
                    words += word.decode('ascii')
                except UnicodeEncodeError:
                    continue
            words = " ".join(words.split())
        else:
            words = readme
        if stem:
            stemmer = PorterStemmer()
            for word in words.split():
                final_words += stemmer.stem(word) + " "
        else:
            final_words = words
    return final_words

def getMetaAttMax(data):
    max_dict = dict()
    for c in data[0]:
        max_dict[c] = data[0][c]
    for sample in data:
        for c in sample:
            if sample[c] > max_dict[c]:
                max_dict[c] = sample[c]
    for c in max_dict:
        try:
            k = int(max_dict[c])
            print c, k
        except ValueError:
            continue
    
def oneHot(index):
    arr = np.zeros(7)
    arr[index] = 1
    return arr