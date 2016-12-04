#!/usr/bin/env python
# -*- coding: utf-8 -*-
from FeatureProcessing import *
from keras.models import Sequential
from keras.layers import Activation, Dense, LSTM
from keras.optimizers import Adam
import numpy as np
import abc
from ClassificationModule import ClassificationModule


class reponamelstm(ClassificationModule):
    """A basic feedforward neural network"""
    
    def __init__(self, num_hidden_layers=3):
        ClassificationModule.__init__(self, "Repo-Name Only LSTM", "A LSTM reading the repository-name character by character")

        hidden_size = 128
        self.maxlen = 30

        # Set output_size
        self.output_size = 7 # Hardcoded for 7 classes

        model = Sequential()

        # Maximum of self.maxlen charcters allowed, each in one-hot-encoded array
        model.add(LSTM(hidden_size, input_shape=(self.maxlen, getLstmCharLength())))

        for _ in range(num_hidden_layers):
            model.add(Dense(hidden_size))

        model.add(Dense(self.output_size))
        model.add(Activation('softmax'))

        model.compile(loss='categorical_crossentropy',
                    optimizer=Adam(),
                    metrics=['accuracy'])

        self.model = model
        print "\t-", self.name


    def resetAllTraining(self):
        """Reset classification module to status before training"""
        self.model.compile(metrics=['accuracy'], loss='categorical_crossentropy', optimizer=Adam())

    def trainOnSample(self, sample, nb_epoch=1, shuffle=True, verbose=True):
        """Trainiere (inkrementell) mit Sample. Evtl zusätzlich mit best. Menge alter Daten, damit overfitten auf neue Daten verhindert wird."""
        readme_vec = self.formatInputData(sample)
        label_index = getLabelIndex(sample)
        label_one_hot = np.expand_dims(oneHot(label_index), axis=0) # [1, 0, 0, ..] -> [[1, 0, 0, ..]] Necessary for keras
        self.model.fit(readme_vec, label_one_hot, nb_epoch=nb_epoch, shuffle=shuffle, verbose=verbose) # TODO: think about nb_epoch-value

    def train(self, samples, nb_epoch=40, shuffle=True, verbose=True):
        """Trainiere mit Liste von Daten. Evtl weitere Paramter nötig (nb_epoch, learning_rate, ...)"""
        train_samples = []
        train_lables = []
        for sample in samples:
            formatted_sample = self.formatInputData(sample)[0].tolist()
            train_samples.append(formatted_sample)
            train_lables.append(oneHot(getLabelIndex(sample)))
        train_lables = np.asarray(train_lables)
        return self.model.fit(train_samples, train_lables, nb_epoch=nb_epoch, shuffle=shuffle, verbose=verbose)

    def predictLabel(self, sample):
        """Gibt zurück, wie der Klassifikator ein gegebenes Sample klassifizieren würde"""
        sample = self.formatInputData(sample)
        return np.argmax(self.model.predict(sample))
    
    def predictLabelAndProbability(self, sample):
        """Return the probability the module assignes each label"""
        sample = self.formatInputData(sample)
        prediction = self.model.predict(sample)[0]
        return [np.argmax(prediction)] + list(prediction) # [0] So 1-D array is returned

    def formatInputData(self, sample):
        """Extract description and transform to vector"""
        sd = getName(sample)
        # Returns numpy array which contains 1 array with features
        return np.expand_dims(lstmEncode(sd, maxlen=self.maxlen), axis=0)

