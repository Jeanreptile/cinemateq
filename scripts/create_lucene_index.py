import sys
import os
import re

from py2neo import Graph
from py2neo import Node, Relationship
from py2neo.packages.httpstream import http
http.socket_timeout = 9999


graph = Graph()

req_lucene_index_persons = "MATCH (n:Person) \
                           WHERE NOT HAS(n.migrated) \
                           SET n.fullname = n.fullname, n.migrated=true\
                           RETURN n LIMIT 20000"

print "Indexing persons",
results = graph.cypher.execute(req_lucene_index_persons)

while (len(results)!= 0):
    print ".",
    results = graph.cypher.execute(req_lucene_index_movies)

print "Indexation of personss done!\n"
