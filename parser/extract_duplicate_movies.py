import codecs
import time
import gzip
import os
from py2neo import Graph
from py2neo.packages.httpstream import http

http.socket_timeout = 9999
graph = Graph()
start = time.time()

abs_path = "/Users/jeanreptile/Documents/Projects/plic-suivi3/parser/"
duplicate_movies_file = "duplicate_movies.csv"

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
results = graph.cypher.execute(query)
moviesSet = set()
for result in results:
    moviesSet.add(result[0] + "," + result[1]  + "\n")

with codecs.open(duplicate_movies_file, 'w', encoding='utf8') as f:
    for line in moviesSet:
        f.write(line)

query2 = "LOAD CSV FROM 'file:" + abs_path + duplicate_movies_file + "' AS line \
         MATCH (m:Movie {movieId: line[0]}) \
         OPTIONAL MATCH (m)-[r]-() \
         DELETE r, m"

results = graph.cypher.execute(query2)
print "Duplicated movies deleted"

query3 = "LOAD CSV FROM 'file:" + abs_path + duplicate_movies_file + "' AS line \
         MATCH (m:Movie {movieId: line[1]}) \
         SET m.movieId = line[0]\
         RETURN m"

results = graph.cypher.execute(query3)
print "Old movies updated"
