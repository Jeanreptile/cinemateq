import re
import time
import sys
import codecs
import os
from py2neo import Graph
from py2neo import Node, Relationship
from py2neo.packages.httpstream import http

if len(sys.argv) < 2:
  print "Please specify the data to parse"
  print "For example: python parser.py value"
  print "Values: all, movies, directors, actors, actresses"
  exit()
if not os.path.exists("lists"):
  print "Please create a \"lists\" directory containing all imdb .list files"
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

def lineIsValid(str):
  return (str and str != "\n" and "(TV)" not in str
    and "(V)" not in str and "(VG)" not in str)

# reg exps
TITLE_RE = r"""(?x)                         # turn on verbose
                ^                           # grab from start
                (?:                         # get the title (nongreedy) either:
                "(?P<series>.*?)"           #   quoted series title
                |                           #     OR
                (?P<movie>.*?)              #   movie name
                )                           #
                \s+                         # needs to be at least 1
                \(                          # in parens
                (?P<year>(?:\d{4}|\?{4}))   # grab the year
                (?P<yearextra>.*?)          # and maybe other crap (non-greedy)
                \)                          #
                \s*                         # could be nothing more, so *
                (?:{                        # optionally the curly brace part
                (?P<episodetitle>.*?)       # non-greedy grab episode title
#                \s+                         # WTF(rryan) leave commented
                (?:\((?:                    # optionally, in parens - EITHER
                \#(?P<season>\d+)\.         # hash, season number, dot
                (?P<episode>\d+)            # episode number
                |                           #   OR
                (?P<date>\d{4}-\d{2}-\d{2}) # release date
                )\)){0,1}                   # the paren statement is optional
                }){0,1}                     # zero or one of the curly brace
                (?P<extras>\s*\(.*?\))*     # any extra crap (TV), (V), etc.
                $                           # end of string
                """
# TITLE_RE = r"^(?:"(.*?)"|(?P<movie>.*?))\s+\((?P<year>(?:\d{4}|\?{4}))(?P<yearextra>.*?)\)\s*({(.*?)}){0,1}(\s*\(.*?\))*$"
RELATION_RE = r"(?P<name>[^\t]+?)?\t+(?P<title>[^\t]+?)( +\((TV|V|VG)\))?( +\[(?P<role>.+)\])?( +<(?P<bill_pos>\d+)>)?\n"
MOVIE_RE = "^(?P<title>.+?)\t+(?P<startyear>(?:\d{4}|\?{4}))(?:-((?:\d{4}|\?{4}))){0,1}$"

titleRegex = re.compile(TITLE_RE)
relationRegex = re.compile(RELATION_RE)
movieRegex = re.compile(MOVIE_RE)

def parseRelations(category, beginMark, beginSkip, endMark, relationship):
  print "Parsing " + category + " and writing CSV..."
  start = time.time()
  if not os.path.exists("CSV"):
    os.makedirs("CSV")
  output = codecs.open("CSV/"+ category + ".csv", "w", encoding='utf8')
  output.write("\"name\",\"title\",\"released\"\n")
  currentName = ""
  with open("lists/" + category + ".list") as f:
    #skipping head of file
    line = next(f)
    while line != beginMark:
      line = next(f)
    for _ in xrange(beginSkip):
      next(f)
    for line in f:
      # skipping invalid lines
      if not lineIsValid(line):
        continue
      if line.startswith(endMark):
        break
      # getting values
      lineMatch = relationRegex.match(line)
      name = encodeName(str(lineMatch.group('name')))
      if name != "None":
        currentName = name
      titleMatch = titleRegex.match(lineMatch.group('title'))
      if titleMatch == None:
        continue
      title = encodeName(str(titleMatch.group('movie')))
      released = encodeName(str(titleMatch.group('year')))
      if title == "None" or released == "????":
        continue;
      # writing to csv
      output.write("\"" + currentName + "\",\"" + title + "\",\"" + released + "\"\n")
  output.close()
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"
  print "Executing query"
  start = time.time()
  graph.cypher.execute('USING PERIODIC COMMIT LOAD CSV WITH HEADERS \
    FROM "file:' + encodeName(os.path.abspath("CSV/" + category + ".csv")) + '" AS row \
    MATCH (m:Movie {title: row.title, released:row.released}) \
    MERGE (p:Person {name: row.name}) \
    CREATE (p)-[:' + relationship + ']->(m);')
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


# movies
if sys.argv[1] == "all" or sys.argv[1] == "movies":
  print "Parsing movies and writing CSV..."
  start = time.time()
  if not os.path.exists("CSV"):
    os.makedirs("CSV")
  output = codecs.open("CSV/movies.csv", "w", encoding='utf8')
  output.write("\"title\",\"released\"\n")
  with open("lists/movies.list") as f:
    # skipping head of file
    for _ in xrange(15):
      next(f)
    for line in f:
      # skipping invalid lines
      if not lineIsValid(line):
        continue
      if line.startswith("-----"):
        break
      # getting values
      lineMatch = movieRegex.match(line)
      titleMatch = titleRegex.match(lineMatch.group('title'))
      if titleMatch == None:
        continue
      title = encodeName(str(titleMatch.group('movie')))
      released = encodeName(str(lineMatch.group('startyear')))
      if title == "None" or released == "????":
        continue;
      # writing .csv
      output.write("\"" + title + "\",\"" + released + "\"\n")
  output.close();
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"
  print "Executing query"
  start = time.time()
  graph.cypher.execute('USING PERIODIC COMMIT LOAD CSV WITH HEADERS \
    FROM "file:' + encodeName(os.path.abspath("CSV/movies.csv")) + '" AS row \
    CREATE (:Movie {title: row.title, released: row.released});')
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


if sys.argv[1] == "all" or sys.argv[1] == "directors":
  parseRelations("directors", "THE DIRECTORS LIST\n", 4, "----", "DIRECTED")
if sys.argv[1] == "all" or sys.argv[1] == "actors":
  parseRelations("actors", "THE ACTORS LIST\n", 4, "----", "ACTED_IN")
if sys.argv[1] == "all" or sys.argv[1] == "actresses":
  parseRelations("actresses", "THE ACTRESSES LIST\n", 4, "----", "ACTED_IN")
if sys.argv[1] == "all" or sys.argv[1] == "cinematographers":
  parseRelations("cinematographers", "THE CINEMATOGRAPHERS LIST\n", 4, "----", "DIRECTED_PHOTOGRAPHY")
if sys.argv[1] == "all" or sys.argv[1] == "composers":
  parseRelations("composers", "THE COMPOSERS LIST\n", 4, "----", "COMPOSED_MUSIC")
if sys.argv[1] == "all" or sys.argv[1] == "producers":
  parseRelations("producers", "THE PRODUCERS LIST\n", 4, "----", "PRODUCED")

print "Total elapsed time: " + str((time.time() - globalStart) / 60.0) + " minutes"
