#!/usr/bin/env python
# -*- coding: utf-8 -*-

from bottle import Bottle
import webbrowser
from Controllers.HomeController import homebottle
from Models.ClassifierCollection import ClassifierCollection
from Models.ClassificationModules.basicneuralnetwork import basicneuralnetwork

rootApp = Bottle()

# Should we create the ClassifierCollection here once and then pass it to the other controllers?
# Have no idea at the moment if that´s the best way to do it in our case
classifiercollection = ClassifierCollection()

#testing stuff
#bnn = basicneuralnetwork()
#classifiercollection.addClassificationModule(bnn)
#print bnn.getdescription()
#print classifiercollection.getClassificationModules()


if __name__ == '__main__':
    webbrowser.open("http://localhost:8080/")
    rootApp.merge(homebottle)
    rootApp.run(debug=True)