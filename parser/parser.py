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
# http.socket_timeout = 9999
# graph = Graph()
# graph.cypher.execute('CREATE CONSTRAINT ON (p:Person) ASSERT p.name IS UNIQUE')
# graph.cypher.execute('CREATE CONSTRAINT ON (m:Movie) ASSERT m.movieId IS UNIQUE')
globalStart = time.time()

# Encode string for cypher query
def encodeName(str):
  str = unicode(str, encoding='latin-1')
  str = str.replace('\\', '\\\\')
  str = str.replace('\"', '\\\"')
  return str

def lineIsValid(str):
  return (str and str != "\n" and "(TV)" not in str
    and "(V)" not in str and "(VG)" not in str
    and "{{SUSPENDED}}" not in str)

def removeDuplicates():
  # building unique sets from all csv
  persons = ""
  relations = ""
  for file in os.listdir("CSV"):
    if file.endswith("_per.csv"):
      f = codecs.open("CSV/" + file, "r", encoding='utf8')
      persons += f.read()
      f.close()
    if file.endswith("_rel.csv"):
      f = codecs.open("CSV/" + file, "r", encoding='utf8')
      relations += f.read()
      f.close()
  uniquePersons = set(persons.split("\n"))
  uniqueRelations = set(relations.split("\n"))
  uniquePersons.discard("")
  uniqueRelations.discard("")
  # writing persons.csv
  outputPer = codecs.open("CSV/persons.csv", "w", encoding='utf8')
  outputPer.write("name:ID,:LABEL\n")
  for line in uniquePersons:
    outputPer.write(line + "\n")
  outputPer.close()
  # writing relations.csv
  outputRel = codecs.open("CSV/relations.csv", "w", encoding='utf8')
  outputRel.write(":START_ID,:END_ID,:TYPE\n")
  for line in uniqueRelations:
    outputRel.write(line + "\n")
  outputRel.close()

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
  outputPer = codecs.open("CSV/"+ category + "_per.csv", "w", encoding='utf8')
  outputRel = codecs.open("CSV/"+ category + "_rel.csv", "w", encoding='utf8')
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
        outputPer.write("\"" + currentName + "\",Person\n")
      titleMatch = titleRegex.match(lineMatch.group('title'))
      if titleMatch == None:
        continue
      title = encodeName(str(titleMatch.group('movie')))
      released = encodeName(str(titleMatch.group('year')))
      yearextra = encodeName(str(titleMatch.group('yearextra'))[1:])
      if title == "None" or released == "????":
        continue;
      if yearextra and yearextra != "I":
        title = title + " [" + yearextra + "]"
      # writing to csv
      outputRel.write("\"" + currentName + "\",\"m_" + title + released + "\"," + relationship + "\n")
  outputPer.close()
  outputRel.close()
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


# movies
if sys.argv[1] == "all" or sys.argv[1] == "movies":
  print "Parsing movies and writing CSV..."
  start = time.time()
  if not os.path.exists("CSV"):
    os.makedirs("CSV")
  output = codecs.open("CSV/movies.csv", "w", encoding='utf8')
  output.write("movieId:ID,title,released,:LABEL\n")
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
      yearextra = encodeName(str(titleMatch.group('yearextra'))[1:])
      if title == "None" or released == "????":
        continue;
      if yearextra and yearextra != "I":
        title = title + " [" + yearextra + "]"
      # writing .csv
      output.write("\"m_" + title + released + "\",\"" + title + "\", \"" + released + "\",Movie\n")
  output.close();
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

removeDuplicatesStart = time.time()
print "Removing duplicates..."
removeDuplicates()
print "Elapsed time: " + str((time.time() - removeDuplicatesStart) / 60.0) + " minutes"

print "Total elapsed time: " + str((time.time() - globalStart) / 60.0) + " minutes"
