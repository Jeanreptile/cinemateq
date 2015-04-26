import sys
import os
import requests
import json
import fileinput
import re

if len(sys.argv) < 2:
  print "Please specify the path of Neo4j"
  print "For example: python file.py /path/to/neo4j-community-2.2.1"
  sys.exit(1)

if (os.name == 'nt'):
    if (sys.argv[1][-1] == "\\"):
        path = os.path.join(sys.argv[1] + 'neo4j.properties')
    else:
        path = os.path.join(sys.argv[1] + '\\neo4j.properties')
else:
    if (sys.argv[1][-1] == "/"):
        path = os.path.join(sys.argv[1] + 'conf/neo4j.properties')
    else:
        path = os.path.join(sys.argv[1] + '/conf/neo4j.properties')


if not os.path.exists(path):
    print 'You have not specified the correct path to your Neo4j directory'
    print "For example: python file.py /path/to/neo4j-community-2.2.0"
    print "PS: In Windows the path looks like : C:\\Users\\UserName\\Documents\\Neo4j\\import.db"
    sys.exit(1)

for line in fileinput.input(path, inplace=True):
        newline = re.sub('^.*node_auto_indexing.*$','node_auto_indexing=true', line).strip()
        if (newline == line.strip()):
            newline = re.sub('^.*node_keys_indexable.*$','node_keys_indexable=title, released, fullname', line).strip()
        print newline

url = 'http://localhost:7474/db/data/index/node/'
payload = {'name': 'node_auto_index', 'config': {'type':'fulltext', 'provider':'lucene', 'to_lower_case':'true'}}
headers = {'Accept': 'application/json; charset=UTF-8', 'Content-Type': 'application/json'}

r = requests.post(url, data=json.dumps(payload), headers=headers)

if (r.status_code != 201):
    print "Woops, there is a problem with your Neo4j"
    sys.exit(1)
else:
    print "Configuration of Lucene in Neo4j done.\n"
    print "You can restart your Neo4j"
