from DatabaseCommunication import getLabeledData, getUnlabeledData
from Models.FeatureProcessing import getVectorsFromData, getMetaAttMax

import random


data = getLabeledData()
f, l, ln = getVectorsFromData(data)

print(f[random.randint(0, len(f))])