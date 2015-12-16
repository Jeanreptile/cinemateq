import csv
import codecs
import sys
reload(sys)
sys.setdefaultencoding("utf-8")

if len(sys.argv) < 2:
  print "Please specify the name of the relations CSV file"
  print "For example: python parser.py relations.csv"
  exit()

relationsCSVFile = sys.argv[1]

directorsSet = set()
otherSet = set()


# THIS SCRIPT IS ONLY FOR EXTRACTING DIRECTORS OF A FULL RELATIONS.CSV
# IT WILL CREATE A FILE "directors_relations.csv" WITH ONLY DIRECTED RELATIONSHIPS
# BUT NOW THE CSV CONVERTER DOES THAT AUTOMATICALLY

with codecs.open(relationsCSVFile, 'rb') as f:
    next(f, None)
    for line in f:
       if (line.endswith("DIRECTED\n")):
           directorsSet.add(line)
           otherSet.add(line)
       else:
           otherSet.add(line)

print "ok set done"
print str(len(directorsSet))

with codecs.open(relationsCSVFile, 'w', encoding='utf8') as f:
    f.write(":START_ID,:END_ID,:TYPE\n")
    for line in otherSet:
        f.write(line)

with codecs.open('directors_relations.csv', 'w', encoding='utf8') as f:
    f.write(":START_ID,:END_ID,:TYPE\n")
    for line in directorsSet:
        f.write(line)
