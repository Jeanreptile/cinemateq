import re
import time
import sys
from py2neo import Graph
from py2neo import Node, Relationship
from py2neo.packages.httpstream import http


if len(sys.argv) < 2:
  print "Please specify the data to parse"
  print "For example: python parser.py value"
  print "Values: all, movies, directors"
  exit()

http.socket_timeout = 9999
graph = Graph()
graph.cypher.execute('CREATE INDEX ON :Movie(name)')
graph.cypher.execute('CREATE INDEX ON :Movie(released)')
globalStart = time.time()

# Encode string for cypher query
def encodeName(str):
  str = unicode(str, encoding='latin-1')
  str = str.replace('\\', '\\\\')
  str = str.replace('\"', '\\\"')
  return str

# Add a query to the current transaction
def executeTransaction(count, tx, query, steps):
  if query:
    count += 1
    tx.append(query)
    if steps == 0 or count % steps == 0:
      print count
      start = time.time()
      tx.commit()
      end = time.time()
      print str(steps) + " elements inserted in " + str(end - start) + " seconds"
      tx = graph.cypher.begin()
  return count, tx


# movies
if sys.argv[1] == "all" or sys.argv[1] == "movies":
  print "parsing movies..."
  count = 0
  steps = 25000
  with open("movies.list") as f:
    # skipping head of file
    for _ in xrange(15):
      next(f)
    tx = graph.cypher.begin()
    for line in f:
      # skipping invalid line
      if not line or "(TV)" in line or line[0] == "\"" or "(V)" in line:
        continue
      values = re.split(r'\t+', line)
      if len(values) < 2:
        continue
      # getting values
      title = encodeName(values[0][:-7])
      year = values[1][:4]    
      if '{' in title or year[0] == "?":
        continue
      # creating and executing request
      query = 'CREATE (:Movie {title:\"' + title + '\", released:' + year + '})\n'
      count, tx = executeTransaction(count, tx, query, steps)
    tx.commit()


# directors
if sys.argv[1] == "all" or sys.argv[1] == "directors":
  print "parsing directors..."
  count = 0
  movieId = 0;
  query = ""
  steps = 1000
  with open("directors.list") as f:
    #skipping head of file
    line = next(f)
    while line != "THE DIRECTORS LIST\n":
      line = next(f)
    for _ in xrange(5):
      next(f)
    tx = graph.cypher.begin()
    for line in f:
      # skipping invalid lines
      if not line:
        continue
      if line.startswith("----"):
        break
      values = re.split(r'\t+', line)
      if len(values) < 2:
        continue
      # getting values
      name = encodeName(values[0])
      film = values[1]
      if '{' in film or '(????)' in film or "(TV)" in film \
        or "(V)" in film:
        film = ""
      else:
        released = encodeName(film[:-2][-4:])
        film = encodeName(film[:-8])
      # creating the person and the relationships
      if name:
        count, tx = executeTransaction(count, tx, query, steps)
        query = 'CREATE (p:Person {name:\"' + name + '\"})'
      if film:
        query += '\nMERGE (m' + str(movieId) + ':Movie{title:"' \
          + film + '", released:"' + released \
          + '"}) CREATE UNIQUE (p)-[:DIRECTED]->(m' + str(movieId) + ')'
        movieId += 1
    count, tx = executeTransaction(count, tx, query, 0)
    tx.commit()

print "Total elapsed time: " + str((time.time() - globalStart) / 60) + " minutes"
