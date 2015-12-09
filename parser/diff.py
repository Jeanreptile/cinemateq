import codecs
import time
import gzip
import os
from py2neo import Graph
from py2neo.packages.httpstream import http
import urllib
import urllib2
from convert_to_CSV import convertToCSV

newListsPath="new_lists"
newCSVPath="new_CSV"
oldCSVPath="old_CSV"

def diff(old, new, dst):
    print "Diff between " + old + " and " + new + "..."
    start = time.time()
    oldData = set()
    newData = set()
    #init old data
    with codecs.open(old, "r", encoding='utf8') as f:
        for line in f:
            oldData.add(line)
    #init new data
    with codecs.open(new, "r", encoding='utf8') as f:
        for line in f:
            newData.add(line[0])

    #see diff between new and old (so nodes to ADD)
    with codecs.open(new, "r", encoding='utf8') as f:
        outputData = codecs.open(dst, "w", encoding='utf8')
        for line in f:
            if line not in oldData:
                outputData.write(line)
        outputData.close()

    #see diff between old and new (so nodes to REMOVE)
    with codecs.open(old, "r", encoding='utf8') as f:
        outputData = codecs.open("toRemove " + dst, "w", encoding='utf8')
        for line in f:
            if line[0] not in newData:
                outputData.write(line)
        outputData.close()
    print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"

globalStart = time.time()

# downloading latest imdb text files

files = (
    'taglines.list',
    'actors.list',
    'actresses.list',
    'biographies.list',
    'cinematographers.list',
    'composers.list',
    'costume-designers.list',
    'directors.list',
    'editors.list',
    'genres.list',
    'movies.list',
    'plot.list',
    'producers.list',
    'production-designers.list',
    'running-times.list',
    'taglines.list',
    'writers.list'
)

url = "ftp://ftp.fu-berlin.de/pub/misc/movies/database/"

if not os.path.exists(newListsPath):
  os.makedirs(newListsPath)
  for list_file in files:
    print "Downloading " + list_file + "..."
    testfile = urllib.URLopener()
    fileGzipName = list_file + ".gz"
    u = urllib2.urlopen(url + fileGzipName)
    localFile = open(newListsPath + "/" + fileGzipName, 'w')
    localFile.write(u.read())
    localFile.close()
    print "Unziping " + list_file
    inF = gzip.GzipFile(newListsPath + "/" + fileGzipName, 'rb')
    s = inF.read()
    inF.close()
    outF = file(newListsPath + "/" + list_file, 'wb')
    outF.write(s)
    outF.close()
    print list_file + " downloaded and unziped !"

if not os.path.exists(newCSVPath):
  convertToCSV()

# generating csv diff

#diff("CSV/movies.csv", "new_CSV/movies.csv", "new_movies.csv")
#diff("CSV/persons.csv", "new_CSV/persons.csv", "new_persons.csv")
diff("directors_relations.csv", "new_CSV/directors_relations.csv", "new_directors_relations.csv")
diff("other_relations.csv", "new_CSV/relations.csv", "new_relations.csv")
#diff("old_CSV/parts/actors_rel.csv", "CSV/parts/actors_rel.csv", "new_actors_rel.csv")

http.socket_timeout = 9999
graph = Graph()

#graph.cypher.execute("create constraint on (p:Person) assert p.name is unique;")
#graph.cypher.execute("create constraint on (m:Movie) assert m.movieId is unique;")

def update(query, message):
    print message
    start = time.time()
    graph.cypher.execute(query)
    print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"

# # updating movies
#update("USING PERIODIC COMMIT\
#     LOAD CSV FROM 'file:/Users/jeanreptile/Documents/Projects/plic-suivi3/parser/new_movies.csv' AS line\
#     MERGE (m:Movie {movieId: line[0]})\
#     SET m.title=line[1], m.released=toInt(line[2]), m.plot=line[3],\
#     m.tagline=line[4], m.genre=split(line[5],';'), m.duration=toInt(line[6]), m.migrated=true", "Updating movies...")

# # updating persons
# update("USING PERIODIC COMMIT\
#     LOAD CSV FROM 'file:c:/Users/Florian/Desktop/plic/parser/new_persons.csv' AS line\
#     MERGE (p:Person {name: line[0]})\
#     SET p.firstname=line[1], p.lastname=line[2], p.fullname=line[3], p.biography=line[4]", "Updating persons...")

# # updating relationships
# update("USING PERIODIC COMMIT\
#     LOAD CSV FROM 'file:c:/Users/Florian/Desktop/plic/parser/new_relations.csv' AS line\
#     MATCH (p:Person {name: line[0]}), (m:Movie {movieId: line[1]})\
#     CREATE (p)-[:line[2]]->(m)", "Updating relations...")

print "Total elapsed time: " + str((time.time() - globalStart) / 60.0) + " minutes"
