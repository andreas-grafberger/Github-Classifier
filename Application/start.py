#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
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
import Models.DatabaseCommunication as DC

print("Starting application..")

rootApp = Bottle()

# Initialize ClassifierCollection
classifiercollection = ClassifierCollection()

#Initialize ClassificationModules
print 'Getting DB Data to be able to create vectorizers for classifiers that need it'
#descriptionCorpus = DC.getAllDescriptions()
#readmeCorpus = DC.getAllReadmes()
#filenameCorpus = DC.getAllFilenames()
descriptionCorpus, readmeCorpus, filenameCorpus, filetypeCorpus, foldernameCorpus = DC.getCorpi()

#Initialize Classifiers
print 'Creating and adding Classifiers to Classifier Collection:'
classifiers = []

creponamelstm = reponamelstm()
cnnall = nnall(readmeCorpus + descriptionCorpus, filetypeCorpus, foldernameCorpus, creponamelstm)
cnnmetaonly = nnmetaonly()
cmetaonlyadaboost = metaonlyadaboost()

#classifiers.append(nndescriptiononly(descriptionCorpus))
#classifiers.append(lrdescriptiononly(descriptionCorpus))
#classifiers.append(nnreadmeonly(readmeCorpus))
#classifiers.append(lrreadmeonly(readmeCorpus))
#classifiers.append(readmeonlyrandomforest(readmeCorpus))
#classifiers.append(knnreadmeonly(readmeCorpus))
#classifiers.append(multinomialnbdescriptiononly(descriptionCorpus))
#classifiers.append(multinomialnbreadmeonly(readmeCorpus))
#classifiers.append(bernoullinbdescriptiononly(descriptionCorpus))
#classifiers.append(bernoullinbreadmeonly(readmeCorpus))
#classifiers.append(readmelstm())
#classifiers.append(svmall(readmeCorpus + descriptionCorpus, filetypeCorpus, foldernameCorpus, creponamelstm))
#classifiers.append(filenamesonlysvc(filenameCorpus))
#classifiers.append(metaonlyrandomforest())
#classifiers.append(metaonlysvc())

classifiers.append(cnnall)
classifiers.append(cnnmetaonly)
classifiers.append(cmetaonlyadaboost)
classifiers.append(creponamelstm)
classifiers.append(lrstacking([cnnmetaonly, cmetaonlyadaboost, creponamelstm, cnnall]))

print 'Loading last checkpoint for classifiers if available:'
for c in classifiers:
	classifiercollection.addClassificationModuleWithLastSavePoint(c)

# Pass ClassifierCollection to Controller
homesetclassifiercollection(classifiercollection)

# Wait a bit so website doesnt get called before it's ready
time.sleep(3)

print 'Done. Starting Bottle...'
#Start Bottle
if __name__ == '__main__':
    webbrowser.open("http://localhost:8080/")
    rootApp.merge(homebottle)
    rootApp.run(server='paste', debug=True)
