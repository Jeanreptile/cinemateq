import re
import time
import sys
import codecs
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
graph.cypher.execute('CREATE INDEX ON :Person(name)')
graph.cypher.execute('CREATE INDEX ON :Movie(title)')
graph.cypher.execute('CREATE INDEX ON :Movie(released)')
globalStart = time.time()

# Encode string for cypher query
def encodeName(str):
  str = unicode(str, encoding='latin-1')
  str = str.replace('\\', '\\\\')
  str = str.replace('\"', '\\\"')
  return str

# movies
if sys.argv[1] == "all" or sys.argv[1] == "movies":
  print "Parsing movies and writing CSV..."
  output = codecs.open("movies.csv", "w", encoding='utf8')
  output.write("\"title\",\"released\"\n")
  with open("movies.list") as f:
    # skipping head of file
    for _ in xrange(15):
      next(f)
    for line in f:
      # skipping invalid line
      if not line or "(TV)" in line or line[0] == "\"" or "(V)" in line \
        or "(VG)" in line:
        continue
      values = re.split(r'\t+', line)
      if len(values) < 2:
        continue
      # getting values
      title = encodeName(values[0][:-7])
      year = values[1][:4]    
      if '{' in title or year[0] == "?":
        continue
      # writing .csv
      output.write("\"" + title + "\",\"" + year + "\"\n")
  output.close();
  print "Executing query"
  graph.cypher.execute('USING PERIODIC COMMIT LOAD CSV WITH HEADERS \
    FROM "file:C:/Users/Florian/Desktop/plic/parser/movies.csv" AS row \
    CREATE (:Movie {title: row.title, released: row.released});')

# directors
if sys.argv[1] == "all" or sys.argv[1] == "directors":
  print "Parsing directors and writing CSV..."
  output = codecs.open("directors.csv", "w", encoding='utf8')
  output.write("\"name\",\"title\",\"released\"\n")
  currentDirector = ""
  with open("directors.list") as f:
    #skipping head of file
    line = next(f)
    while line != "THE DIRECTORS LIST\n":
      line = next(f)
    for _ in xrange(5):
      next(f)
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
      if name:
        currentDirector = name
      if '{' in film or '(????)' in film or "(TV)" in film \
        or "(V)" in film or "(VG)" in film:
        continue
      else:
        released = encodeName(film[:-2][-4:])
        film = encodeName(film[:-8])
      # writing .csv
      output.write("\"" + currentDirector + "\",\"" + film + "\",\"" + released + "\"\n")
  output.close()
  print "Executing query"
  graph.cypher.execute('USING PERIODIC COMMIT LOAD CSV WITH HEADERS \
    FROM "file:C:/Users/Florian/Desktop/plic/parser/directors.csv" AS row \
    MATCH (m:Movie {title: row.title, released:row.released}) \
    MERGE (p:Person {name: row.name}) \
    MERGE (p)-[:DIRECTED]->(m);')

print "Total elapsed time: " + str((time.time() - globalStart) / 60) + " minutes"
