import codecs
import time
import gzip
import os
import shutil
from py2neo import Graph
from py2neo.packages.httpstream import http
import urllib
import urllib2
from convert_to_CSV import convertToCSV

newListsPath="new_lists"
newCSVFolder="new_CSV"
oldCSVFolder="old_CSV"
abs_path = "/Users/jeanreptile/Documents/Projects/plic-suivi3/parser/"
duplicate_movies_file = "duplicate_movies.csv"

def diff(old, new, dst):
    print "Diff between " + old + " and " + new + "..."
    start = time.time()
    oldData = set()
    #init old data
    with codecs.open(old, "r", encoding='utf8') as f:
        for line in f:
            oldData.add(line)

    #see diff between new and old (so nodes to ADD)
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

if not os.path.exists(newCSVFolder):
  convertToCSV(newCSVFolder)


diff( oldCSVFolder + "/movies.csv", newCSVFolder + "/movies.csv", "new_movies.csv")
diff( oldCSVFolder + "/persons.csv",  newCSVFolder + "/persons.csv", "new_persons.csv")
diff( oldCSVFolder + "/directors_relations.csv", newCSVFolder + "/directors_relations.csv", "new_directors_relations.csv")
diff( oldCSVFolder + "/relations.csv", newCSVFolder + "/relations.csv", "new_relations.csv")
diff( oldCSVFolder + "/parts/actors_rel.csv", newCSVFolder + "/parts/actors_rel.csv", "new_actors_rel.csv")

http.socket_timeout = 9999
graph = Graph()

graph.cypher.execute("create constraint on (p:Person) assert p.name is unique;")
graph.cypher.execute("create constraint on (m:Movie) assert m.movieId is unique;")

def exec_query(query, message):
    print message
    start = time.time()
    graph.cypher.execute(query)
    print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


 # updating movies
exec_query("USING PERIODIC COMMIT\
     LOAD CSV FROM 'file:" + abs_path + "new_movies.csv' AS line\
     MERGE (m:Movie {movieId: line[0]})\
     ON CREATE SET m.movieId=line[0], m.title=line[1], m.released=toInt(line[2]), m.plot=line[3], m.tagline=line[4], m.genre=split(line[5],';'), m.duration=toInt(line[6]), m.migrated=true\
     ON MATCH SET m.plot=line[3], m.tagline=line[4], m.genre=split(line[5],';'), m.duration=toInt(line[6])", "Updating movies...")

# # updating persons
exec_query("USING PERIODIC COMMIT\
    LOAD CSV FROM 'file:" + abs_path + "new_persons.csv' AS line\
    MERGE (p:Person {name: line[0]})\
    ON CREATE SET p.name = line[0], p.firstname=line[1], p.lastname=line[2], p.fullname=line[3], p.biography=line[4],\
    p.migrated = true\
    ON MATCH SET p.biography=line[4]", "Updating persons...")


# Here we are getting all duplicate movies, settings all of new properties (except movieId) in the old movie node
# Then we save the movieId of old and new node
query = "LOAD CSV FROM 'file:" +  abs_path + "new_directors_relations.csv' AS line \
         MATCH (m:Movie {movieId: line[1]}) \
         MATCH (p:Person {name: line[0]})-[:DIRECTED]->(m2:Movie)\
         WHERE m2.title = m.title AND m2.released <> m.released \
         AND  NOT (ANY ( x IN [\"Short\", \"Documentary\"] WHERE x in m2.genre)) \
         WITH m2 AS m2, m AS m, m.movieId AS tmpMovieId, p AS p \
         SET m2.released = m.released,\
         m2.plot = m.plot,\
         m2.tagline = m.tagline,\
         m2.genre = m.genre\
         RETURN m.movieId, m2.movieId"

print("Getting duplicate movies...")
results = graph.cypher.execute(query)
moviesSet = set()
for result in results:
    moviesSet.add(result[0] + "," + result[1]  + "\n")

with codecs.open(duplicate_movies_file, 'w', encoding='utf8') as f:
    for line in moviesSet:
        f.write(line)

#We delete every new movie node with their movieId

exec_query("LOAD CSV FROM 'file:" + abs_path + duplicate_movies_file + "' AS line \
         MATCH (m:Movie {movieId: line[0]}) \
         OPTIONAL MATCH (m)-[r]-() \
         DELETE r, m", "Deleting obsolete movies nodes")

print "Duplicated movies deleted"

# Then we can set the new movieId property in the old movie node

exec_query("LOAD CSV FROM 'file:" + abs_path + duplicate_movies_file + "' AS line \
         MATCH (m:Movie {movieId: line[1]}) \
         SET m.movieId = line[0]\
         RETURN m", "Updating fresh movies...")

print "Fresh movies updated"

# # updating relationships
exec_query("USING PERIODIC COMMIT\
    LOAD CSV FROM 'file:" + abs_path + "new_relations.csv' AS line\
  MATCH (p:Person {name: line[0]}), (m:Movie {movieId: line[1]}) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='DIRECTED_PHOTOGRAPHY' THEN [1] ELSE [] END | \
    MERGE (p)-[:DIRECTED_PHOTOGRAPHY]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='WROTE' THEN [1] ELSE [] END | \
    MERGE (p)-[:WROTE]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='ACTED_IN' THEN [1] ELSE [] END | \
    MERGE (p)-[:ACTED_IN]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='PRODUCED' THEN [1] ELSE [] END | \
    MERGE (p)-[:PRODUCED]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='DIRECTED' THEN [1] ELSE [] END | \
    MERGE (p)-[:DIRECTED]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='EDITED' THEN [1] ELSE [] END |\
    MERGE (p)-[:EDITED]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='COMPOSED_MUSIC' THEN [1] ELSE [] END | \
    MERGE (p)-[:COMPOSED_MUSIC]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='DESIGNED_COSTUMES' THEN [1] ELSE [] END | \
    MERGE (p)-[:DESIGNED_COSTUMES]->(m)) \
  FOREACH(ignoreMe IN CASE WHEN line[2]='DESIGNED_PRODUCTION' THEN [1] ELSE [] END | \
    MERGE (p)-[:DESIGNED_PRODUCTION]->(m))", "Updating relations...")

print "Relations updated"

# # updating relationships
exec_query("USING PERIODIC COMMIT\
    LOAD CSV FROM 'file:" + abs_path + "new_relations.csv' AS line\
    MATCH (p:Person {name: line[0]}), (m:Movie {movieId: line[3]}) \
    MERGE (p)-[:ACTED_IN]->(m)", "Updating actors relations...")

print "Actors relations updated"

if os.path.exists("old_" + oldCSVFolder):
  shutil.rmtree("old_" + oldCSVFolder )

shutil.rmtree(newListsPath)

os.rename(oldCSVFolder, "old_" + oldCSVFolder)
os.rename(newCSVFolder, oldCSVFolder)

print "Total elapsed time: " + str((time.time() - globalStart) / 60.0) + " minutes"
