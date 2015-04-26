import sys
import os

if len(sys.argv) < 4:
  print "Please specify the path of Neo4j, the path of your CSV files and the path to create your future database"
  print "For example: python file.py /path/to/neo4j-community-2.2.1 ./path/to/CSV ./path/to/database"
  sys.exit(1)

if (os.name == 'nt'):
    if (sys.argv[1][-1] == "\\"):
        pathNeo4jBin = os.path.join(sys.argv[1] + 'bin\\Neo4jImport.bat')
    else:
        pathNeo4jBin = os.path.join(sys.argv[1] + '\\bin\\neo4j-import.bat')
    if (sys.argv[2][-1] != "\\"):
        pathCSV = os.path.join(sys.argv[2] + '\\')
    else:
        pathCSV = sys.argv[2]
else:
    if (sys.argv[1][-1] == "/"):
        pathNeo4jBin = os.path.join(sys.argv[1] + 'bin/neo4j-import')
        pathNeo4jProp = os.path.join(sys.argv[1] + 'conf/neo4j-server.properties')
    else:
        pathNeo4jBin = os.path.join(sys.argv[1] + '/bin/neo4j-import')
        pathNeo4jProp = os.path.join(sys.argv[1] + '/conf/neo4j-server.properties')
    if (sys.argv[2][-1] != "/"):
        pathCSV = os.path.join(sys.argv[2] + '/')
    else:
        pathCSV = sys.argv[2]


if not os.path.exists(pathNeo4jBin):
    print 'You have not specified the correct path to your Neo4j directory'
    print "For example: python file.py /path/to/neo4j-community-2.2.1 ./path/to/CSV ./path/to/database"
    sys.exit(1)

if not os.path.exists(sys.argv[3]):
    os.makedirs(sys.argv[3])
pathDB = sys.argv[3]

if not os.path.exists(pathCSV):
    print 'You have not specified the correct path to your CSV files'
    print "For example: python file.py /path/to/neo4j-community-2.2.1 ./path/to/CSV ./path/to/database"
    sys.exit(1)

#for line in fileinput.input(path, inplace=True):
#        newline = re.sub('^.*node_auto_indexing.*$','node_auto_indexing=true', line).strip()
#        if (newline == line.strip()):
#            newline = re.sub('^.*node_keys_indexable.*$','node_keys_indexable=title, released, fullname', line).strip()
#        print newline

if (os.name == 'nt'):
    os.system(pathNeo4jBin + " --into " + pathDB  + " \
                --nodes " + pathCSV + "movies.csv --nodes " + pathCSV + "persons.csv  \
                --relationships " + pathCSV + "relations_act_header.csv," + pathCSV + "parts\\actors_rel.csv," + pathCSV + "parts\\actresses_rel.csv \
                --relationships " + pathCSV + "relations.csv --bad-tolerance 20000")
else:
    os.system(pathNeo4jBin + " --into " + pathDB  + " \
                --nodes " + pathCSV + "movies.csv --nodes " + pathCSV + "persons.csv  \
                --relationships " + pathCSV + "relations_act_header.csv," + pathCSV + "parts/actors_rel.csv," + pathCSV + "parts/actresses_rel.csv \
                --relationships " + pathCSV + "relations.csv --bad-tolerance 20000")
