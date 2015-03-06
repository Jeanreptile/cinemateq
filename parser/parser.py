import re
import time

from py2neo import Graph
from py2neo import Node, Relationship

# Encode string for cypher query
def encodeName(str):
  str = unicode(str, encoding='latin-1')
  str = str.replace('\\', '\\\\')
  str = str.replace('\"', '\\\"')
  return;


graph = Graph()

# print "parsing movies..."
# count = 0;
# with open("movies.list") as f:
#   for _ in xrange(15):
#     next(f)
#   tx = graph.cypher.begin()
#   for line in f:

#     # skipping invalid line
#     if not line or "(TV)" in line or line[0] == "\"" or "(V)" in line:
#       continue
#     values = re.split(r'\t+', line)
#     if len(values) < 2:
#       continue

#     # getting values
#     title = unicode(values[0], encoding='latin-1')[:-7]
#     title = title.replace('\\', '\\\\')
#     title = title.replace('\"', '\\\"')
#     year = values[1][:4]

#     # creating request
#     if '{' in title or year[0] == "?":
#       continue
#     query = 'CREATE (:Movie {title:\"' + title + '\", released:' + year + '})\n'
#     tx.append(query)
#     count += 1
#     if count % 25000 == 0:
#       print count
#       start = time.time()
#       tx.commit()
#       end = time.time()
#       print "Elements inserted in " + str(end - start) + " seconds"
#       tx = graph.cypher.begin()
#   tx.commit()



print "parsing directors..."
personId = 0
count = 0;
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
    film = encodeName(values[1][:-8])

    # creating the person 
    if name:
      query = 'CREATE (_'  + str(personId) + ':Person {name:"' + name + '"})'
      tx.append(query)
      personId += 1
      count += 1

    # creating the relationships
    if film:
      if '{' in film or '(????)' in film or "(TV)" in film or "(V)" in film:
        continue
      query = 'CREATE UNIQUE (_' + str(personId - 1) +')-[:DIRECTED]->(:Movie {title:"' + film +'"})'
      tx.append(query)
      count += 1
      if count % 25000 == 0:
        print count
        start = time.time()
        tx.commit()
        end = time.time()
        print "Elements inserted in " + str(end - start) + " seconds"
        tx = graph.cypher.begin()
  tx.commit()