#!/usr/bin/env python
# -*- coding: utf-8 -*-

###########################################################
# Initialization and startup file for the file based mode #
###########################################################

import time
import sys
import collections
from bottle import Bottle
import webbrowser
from Controllers.HomeController import homebottle, homesetclassifiercollection
from Models.ClassifierCollection import ClassifierCollection
from Models.ClassificationModules.nndescriptiononly import nndescriptiononly
from Models.ClassificationModules.lrdescriptiononly import lrdescriptiononly
from Models.ClassificationModules.nnreadmeonly import nnreadmeonly
from Models.ClassificationModules.lrreadmeonly import lrreadmeonly
from Models.ClassificationModules.readmeonlyrandomforest import readmeonlyrandomforest
from Models.ClassificationModules.multinomialnbreadmeonly import multinomialnbreadmeonly
from Models.ClassificationModules.multinomialnbdescriptiononly import multinomialnbdescriptiononly
from Models.ClassificationModules.bernoullinbreadmeonly import bernoullinbreadmeonly
from Models.ClassificationModules.bernoullinbdescriptiononly import bernoullinbdescriptiononly
from Models.ClassificationModules.nnmetaonly import nnmetaonly
from Models.ClassificationModules.metaonlyrandomforest import metaonlyrandomforest
from Models.ClassificationModules.metaonlysvc import metaonlysvc
from Models.ClassificationModules.metaonlyadaboost import metaonlyadaboost
from Models.ClassificationModules.reponamelstm import reponamelstm
from Models.ClassificationModules.readmelstm import readmelstm
from Models.ClassificationModules.nnall import nnall
from Models.ClassificationModules.knnreadmeonly import knnreadmeonly
from Models.ClassificationModules.svcfilenamesonly import filenamesonlysvc
from Models.ClassificationModules.lrstacking import lrstacking
from Models.ClassificationModules.svmall import svmall
from Models.ClassificationModules.rfall import allrandomforest
from Models.ClassificationModules.gbrtmetaonly import gbrtmetaonly
from Models.ClassificationModules.gbrtreadmeonly import gbrtreadmeonly
from Models.ClassificationModules.gbrtfilesandfolders import gbrtfilesandfolders
from Models.ClassificationModules.gbrtdescriptionmeta import gbrtdescriptionmeta
from Models.ClassificationModules.svmreadmemeta import svmreadmemeta
from Models.ClassificationModules.allbernoullinb import allbernoullinb
from Models.ClassificationModules.allmultinomialnb import allmultinomialnb
from Models.ClassificationModules.averageensemble import averageensemble
from Models.ClassificationModules.nnstacking import nnstacking
from Models.ClassificationModules.lrstackingmeta import lrstackingmeta
from Models.ClassificationModules.foldernameslstm import foldernameslstm
from Models.ClassificationModules.descriptionfoldersreponamelstm import descriptionfoldersreponamelstm
from Models.ClassificationModules.descriptionlstm import descriptionlstm
from Models.ClassificationModules.descriptionreponamelstm import descriptionreponamelstm

import Models.DatabaseCommunication as DC

print("Starting application..")


# Initialize ClassifierCollection
classifiercollection = ClassifierCollection()

print 'Getting DB Data to be able to create vectorizers for classifiers that need it'
descriptionCorpus, readmeCorpus, filenameCorpus, filetypeCorpus, foldernameCorpus = DC.getCorpi()


#Initialize Classifiers
print 'Creating and adding Classifiers to Classifier Collection:'

# First load all classifiers which don't need other classifiers as parameter

loadedClassifiers = [] # Keep track, which classifiers have be loaded or such attempt has been made

classifiers = {}

classifiers['metaonlyrandomforest'] = metaonlyrandomforest()
classifiers['metaonlysvc'] = metaonlysvc()
classifiers['gbrtdescriptionmeta'] = gbrtdescriptionmeta(descriptionCorpus)
classifiers['svmreadmemeta'] = svmreadmemeta(readmeCorpus)

#classifiers['descriptionlstm'] = descriptionlstm() # Remove all commented classifiers?
#classifiers['descriptionfoldersreponamelstm'] = descriptionfoldersreponamelstm()
classifiers['reponamelstm'] = reponamelstm()
#classifiers['readmelstm'] = readmelstm()
#classifiers['descriptionreponamelstm'] = descriptionreponamelstm()


for classifier in classifiers:
    loaded_classifier = classifiers[classifier].loadClassificationModuleSavePoint(filename="lastused")
    if loaded_classifier is not None:
        classifiers[classifier] = loaded_classifier
    loadedClassifiers.append(classifier)

# Now all classifiers should have been loaded from last savepoint, if available
# Use these loaded classifiers by giving them to specific ensemble-Models

classifiers['nnall'] = nnall(readmeCorpus + descriptionCorpus, filetypeCorpus, filenameCorpus, foldernameCorpus)
classifiers['svmall'] = svmall(readmeCorpus + descriptionCorpus, filetypeCorpus, filenameCorpus, foldernameCorpus)
classifiers['allrandomforest'] = allrandomforest(readmeCorpus + descriptionCorpus, filetypeCorpus, filenameCorpus, foldernameCorpus)

for classifier in classifiers:
    if classifier not in loadedClassifiers:
        loaded_classifier = classifiers[classifier].loadClassificationModuleSavePoint(filename="lastused")
        if loaded_classifier is not None:
            classifiers[classifier] = loaded_classifier
        loadedClassifiers.append(classifier)
        
#classifiers['lrstacking'] = lrstacking([classifiers['nnall'], classifiers['metaonlyrandomforest'], classifiers['svmall'], classifiers['metaonlysvc'], classifiers['allrandomforest'], classifiers['reponamelstm'], classifiers['gbrtdescriptionmeta'], classifiers['svmreadmemeta']])
#classifiers['averageensemble'] = averageensemble([classifiers['nnall'], classifiers['metaonlyrandomforest'], classifiers['svmall'], classifiers['metaonlysvc'], classifiers['allrandomforest'], classifiers['reponamelstm'], classifiers['gbrtdescriptionmeta'], classifiers['svmreadmemeta']])
classifiers['nnstacking'] = nnstacking([classifiers['nnall'], classifiers['metaonlyrandomforest'], classifiers['svmall'], classifiers['metaonlysvc'], classifiers['allrandomforest'], classifiers['reponamelstm'], classifiers['gbrtdescriptionmeta'], classifiers['svmreadmemeta']])
#classifiers['lrstackingmeta'] = lrstackingmeta([classifiers['nnall'], classifiers['metaonlyrandomforest'], classifiers['svmall'], classifiers['metaonlysvc'], classifiers['allrandomforest'], classifiers['reponamelstm'], classifiers['gbrtdescriptionmeta'], classifiers['svmreadmemeta']])
# Finally load all meta-models such as lrstacking

for classifier in classifiers:
    if classifier not in loadedClassifiers:
        loaded_classifier = classifiers[classifier].loadClassificationModuleSavePoint(filename="lastused")
        if loaded_classifier is not None:
            classifiers[classifier] = loaded_classifier

# Order the classifiers for the final submission
    orderedClassifiers = collections.OrderedDict()
    order = ['nnstacking', 'gbrtdescriptionmeta', 'svmall', 'nnall', 'svmreadmemeta', 'allrandomforest', 'metaonlyrandomforest', 'metaonlysvc', 'reponamelstm']
    for classifiername in order:
        orderedClassifiers[classifiername] = classifiers[classifiername]

# Load classifiers into collection
for c in orderedClassifiers:
    classifiercollection.addClassificationModule(classifiers[c])

# Pass ClassifierCollection to Controller
homesetclassifiercollection(classifiercollection)

print "Predicting..."

if len(sys.argv) <= 1:
    sys.exit()
try:
    linkFile = open(sys.argv[1], "r")
    resultFile = open('classification_result.txt', "w")
    data, result = None, None
    classes = ['DEV', 'HW', 'EDU', 'DOCS', 'WEB', 'DATA', 'OTHER']
    for line in linkFile:
        api_link = line.rstrip().replace("https://github.com", "https://api.github.com/repos")
        if api_link[-1] == '/':     #remove / at the end
            api_link = api_link[0:-1]
        data = DC.getInformationsForRepo(api_link)
        prediction = classifiers['nnstacking'].predictLabelAndProbability(data)
        resultFile.write(line.rstrip() + ' ' + classes[prediction[0]] + '\n')
    linkFile.close()
    resultFile.close()
except IOError:
    print "Der Kommandozeilenparameter war keine Datei", sys.exc_info()[0]
