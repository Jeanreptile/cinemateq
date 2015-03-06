import re
import time

from py2neo import Graph
from py2neo import Node, Relationship

graph = Graph()


print "parsing movies..."
#output = open("movies.cql", 'w')

count = 0;

with open("movies.list") as f:
	for _ in xrange(15):
		next(f)
	tx = graph.cypher.begin()
	for line in f:
		if not line or "(TV)" in line or line[0] == "\"" or "(V)" in line:
			continue
		values = re.split(r'\t+', line)
		if len(values) < 2:
			continue

		#title = values[0]
		title = unicode(values[0], encoding='latin-1')
		title = title.replace('\"', '\\\"')
		year = values[1][:4]

		if '{' in title or year[0] == "?":
			continue
		query = 'CREATE (:Movie {title:\"' \
			+ title + '\", released:' + year + '})\n'
		#output.write(query)
		#graph.create(Node("Movie", title=title, released=year))
		#print title
		#graph.cypher.execute(query)
		tx.append(query)

		count += 1
		if count % 25000 == 0:
			print count
			start = time.time()
			tx.commit()
			end = time.time()
			print str(count) + " elements inserted in " + str(end - start) + " seconds"
			tx = graph.cypher.begin()

	tx.commit()

output.close()

#print graph.find(title="Interstellar")


# print "parsing directors..."
# output = open("directors.cql", 'w')
# personId = 0

# with open("directors.list") as f:

# 	#skipping head of file
# 	line = next(f)
# 	while line != "THE DIRECTORS LIST\n":
# 		line = next(f)
# 	for _ in xrange(5):
# 		next(f)

# 	for line in f:
# 		# skipping invalid lines
# 		if not line:
# 			continue
# 		if line.startswith("----"):
# 			print line
# 			break
# 			break
# 			break
# 		values = re.split(r'\t+', line)
# 		if len(values) < 2:
# 			continue

# 		# getting values
# 		name = values[0]
# 		film = values[1][:-1]
# 		film = film.replace("\"", "\\\"")

# 		# creating the person 
# 		if name:
# 			output.write('CREATE (_'	+ str(personId) + ':Person {name:"'
# 				+ name + '"})\n')
# 			personId += 1

# 		# creating the relationships
# 		if film:
# 			if '{' in film or '(????)' in film or "(TV)" in film:
# 				continue
# 			output.write('\tCREATE UNIQUE (_'
# 				+ str(personId - 1)
# 				+')-[:DIRECTED]->(:Movie {title:"'
# 				+ film +'"})\n')

# output.close()