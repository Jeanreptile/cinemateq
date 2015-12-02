import codecs
import time
from py2neo import Graph
from py2neo.packages.httpstream import http
import urllib

def diff(old, new, dst):
    print "Diff between " + old + " and " + new + "..."
    start = time.time()
    oldData = set()
    with codecs.open(old, "r", encoding='utf8') as f:
        for line in f:
            oldData.add(line)
    with codecs.open(new, "r", encoding='utf8') as f:
        outputData = codecs.open(dst, "w", encoding='utf8')
        for line in f:
            if line not in oldData:
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

for file in files:
    print "Downloading " + file + "..."
    testfile = urllib.URLopener()
    testfile.retrieve(url + file + ".gz", file)

# generating csv diff
#diff("old_CSV/movies.csv", "CSV/movies.csv", "new_movies.csv")
#diff("old_CSV/persons.csv", "CSV/persons.csv", "new_persons.csv")
#diff("old_CSV/relations.csv", "CSV/relations.csv", "new_relations.csv")
#diff("old_CSV/parts/actors_rel.csv", "CSV/parts/actors_rel.csv", "new_actors_rel.csv")

http.socket_timeout = 9999
graph = Graph()

def update(query, message):
    print message
    start = time.time()
    graph.cypher.execute(query)
    print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"

# # updating movies
# update("USING PERIODIC COMMIT\
#     LOAD CSV FROM 'file:c:/Users/Florian/Desktop/plic/parser/new_movies.csv' AS line\
#     MERGE (m:Movie {movieId: line[0]})\
#     SET m.title=line[1], m.released=toInt(line[2]), m.plot=line[3],\
#     m.tagline=line[4], m.genre=split(line[5],';'), m.duration=toInt(line[6])", "Updating movies...")

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