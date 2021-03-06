import re
import time
import os
import codecs


newCSVPath="new_CSV"
newListsPath="new_lists"

# Encode string for cypher query
def encodeName(str):
  str = unicode(str, encoding='latin-1')
  str = str.replace('\\', '\\\\')
  str = str.replace('\"', '\\\"')
  return str


def lineIsValid(str):
  return (str and str != "\n")


def titleIsValid(str):
  return ("(TV)" not in str and "(V)" not in str
      and "(VG)" not in str and "{{SUSPENDED}}" not in str)


def removeDuplicates():
  # writing persons.csv
  uniquePersons = set()
  for file in os.listdir(newCSVPath + "/parts"):
    if file.endswith("_per.csv"):
      with codecs.open(newCSVPath + "/parts/" + file, "r", encoding='utf8') as f:
        for line in f:
          uniquePersons.add(line)
  uniquePersons.discard("")
  outputPer = codecs.open(newCSVPath + "/persons.csv", "w", encoding='utf8')
  outputPer.write("name:ID,firstname,lastname,fullname,biography,:LABEL\n")
  for line in uniquePersons:
    outputPer.write(line)
  outputPer.close()
  # writing special header for actors/actresses relationships
  outputActedHeader = codecs.open(newCSVPath + "/relations_act_header.csv", "w", encoding='utf8')
  outputActedHeader.write(":START_ID,role,position:int,:END_ID,:TYPE\n")
  outputActedHeader.close()
  # writing relations.csv
  outputRel = codecs.open(newCSVPath + "/relations.csv", "w", encoding='utf8')
  directedOutputRel = codecs.open(newCSVPath + "/directors_relations.csv", "w", encoding='utf8')
  directedOutputRel.write(":START_ID,:END_ID,:TYPE\n")
  outputRel.write(":START_ID,:END_ID,:TYPE\n")
  for file in os.listdir(newCSVPath + "/parts"):
    if file == "actors_rel.csv" or file == "actresses_rel.csv":
      continue
    # removing duplicates from writers file
    if file == "writers_rel.csv":
      uniqueWriterSet = set()
      with codecs.open(newCSVPath + "/parts/" + file, "r", encoding='utf8') as f:
        for line in f:
          uniqueWriterSet.add(line)
      with codecs.open(newCSVPath + "/parts/" + file, "w", encoding='utf8') as f:
        for line in uniqueWriterSet:
          f.write(line)
    # concatenation of *_rel.csv files
    if file.endswith("_rel.csv"):
      with codecs.open(newCSVPath + "/parts/" + file, "r", encoding='utf8') as f:
        for line in f:
          outputRel.write(line)
          if (file == "directors_rel.csv"):
             directedOutputRel.write(line)
  outputRel.close()


# regular expressions
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
#               \s+                         # WTF(rryan) leave commented
                (?:\((?:                    # optionally, in parens - EITHER
                \#(?P<season>\d+)\.         # hash, season number, dot
                (?P<episode>\d+)            # episode number
                |                           #   OR
                (?P<date>\d{4}-\d{2}-\d{2}) # release date
                )\)){0,1}                   # the paren statement is optional
                }){0,1}                     # zero or one of the curly brace
                (?P<extras>\s*\(.*?\))*     # any extra crap (TV), (V), etc.
                (?:\s*\<.*?\>)?             # screenwriting credits
                $                           # end of string
                """
titleRegex = re.compile(TITLE_RE)


BIO_NAME_RE = "^NM:\s(?P<name>.+)$"
BIO_BIO_RE = "^BG:\s(?P<bio>.+)$"
BIO_AUTHOR_RE = "^BY:\s(?P<author>.+)$"
bioNameRegex = re.compile(BIO_NAME_RE)
bioRegex = re.compile(BIO_BIO_RE)
bioAuthorRegex = re.compile(BIO_AUTHOR_RE)


def parseBiographies():
  bios = {}
  with open(newListsPath + '/biographies.list', 'rb') as f:
    currentName = ""
    currentBio = []
    currentBios = []
    for line in f:
      bioNameMatch = bioNameRegex.match(line)
      bioMatch = bioRegex.match(line)
      bioAuthorMatch = bioAuthorRegex.match(line)
      if bioNameMatch:
        if currentName:
          if currentBio:
            currentBios.append(' '.join(currentBio))
            currentBio = []
          if currentBios:
            bios[currentName] = currentBios
          currentBios = []
        currentName = encodeName(bioNameMatch.group('name').strip())
      elif bioMatch:
        currentBio.append(bioMatch.group('bio').strip())
      elif bioAuthorMatch:
        currentBios.append(' '.join(currentBio))
        currentBio = []
    # last one
    if currentName:
      if currentBio:
        currentBios.append(' '.join(currentBio))
      if currentBios:
        bios[currentName] = currentBios
  return bios


PLOT_TITLE_RE = "^MV:\s(?P<title>.+)$"
PLOT_PLOT_RE = "^PL:\s(?P<plot>.+)$"
PLOT_AUTHOR_RE = "^BY:\s(?P<author>.+)$"
plotTitleRegex = re.compile(PLOT_TITLE_RE)
plotRegex = re.compile(PLOT_PLOT_RE)
plotAuthorRegex = re.compile(PLOT_AUTHOR_RE)


def parseMoviePlots():
  plots = {}
  with open(newListsPath + '/plot.list', 'rb') as f:
    current_title = ""
    current_plot = []
    current_plots = []
    for line in f:
      plot_title_match = plotTitleRegex.match(line)
      plot_match = plotRegex.match(line)
      plot_author_match = plotAuthorRegex.match(line)
      if plot_title_match:
        if current_title:
          if current_plot:
            current_plots.append(' '.join(current_plot))
            current_plot = []
          titleMatch = titleRegex.match(current_title)
          movieId = encodeName("m_" + str(titleMatch.group('movie'))
            + str(titleMatch.group('year')))
          plots[movieId] = current_plots
          current_plots = []
        current_title = str(plot_title_match.group('title').strip())
      elif plot_match:
        current_plot.append(plot_match.group('plot').strip())
      elif plot_author_match:
        current_plots.append(' '.join(current_plot))
        current_plot = []
    # last one
    if current_title:
      if current_plot != []:
        current_plots.append(' '.join(current_plot))
      titleMatch = titleRegex.match(current_title)
      movieId = encodeName("m_" + str(titleMatch.group('movie'))
        + str(titleMatch.group('year')))
      plots[movieId] = current_plots
  return plots


def parseMovieTaglines():
  taglines = {}
  currentMovie = ""
  currentTagline = ""
  with open(newListsPath + '/taglines.list', 'rb') as f:
    for line in f:
      if line == "TAG LINES LIST\n":
        break
    for line in f:
      if line[0] == "#":
        if currentMovie:
          taglines[currentMovie] = currentTagline
          currentTagline = ""
        titleMatch = titleRegex.match(line[2:])
        currentMovie = encodeName("m_" + str(titleMatch.group('movie'))
          + str(titleMatch.group('year')))
      elif line[0] == "\t":
        if not currentTagline:
          currentTagline = line.strip()
    # last one
    if currentMovie:
      taglines[currentMovie] = currentTagline
  return taglines


GENRE_RE = "^(?P<title>.+?)\t+(?P<genre>.+)$"
genreRegex = re.compile(GENRE_RE)


def parseMovieGenres():
  genres = {}
  currentMovie = ""
  currentGenres = []
  with open(newListsPath + '/genres.list', 'rb') as f:
    for line in f:
      if line == "8: THE GENRES LIST\n":
        break
    for line in f:
      if not titleIsValid(line):
        continue
      match = genreRegex.match(line)
      if match:
        titleMatch = titleRegex.match(match.group('title'))
        movieId = encodeName("m_" + str(titleMatch.group('movie'))
          + str(titleMatch.group('year')))
        if currentMovie and movieId != currentMovie:
          genres[currentMovie] = currentGenres
          currentGenres = []
        currentMovie = movieId
        currentGenres.append(match.group('genre'))
    # last
    if currentMovie:
      genres[currentMovie] = currentGenres
  return genres


DURATION_RE = "^(?P<title>.+?)\t+[^\d]*(?P<time>\d+).*$"
durationRegex = re.compile(DURATION_RE)


def parseMovieDurations():
  durations = {}
  currentMovie = ""
  currentDurations = []
  with open(newListsPath + '/running-times.list', 'rb') as f:
    for line in f:
      if line == "RUNNING TIMES LIST\n":
        break
    for line in f:
      if not titleIsValid(line):
        continue
      match = durationRegex.match(line)
      if match:
        titleMatch = titleRegex.match(match.group('title'))
        movieId = encodeName("m_" + str(titleMatch.group('movie'))
          + str(titleMatch.group('year')))
        if currentMovie and movieId != currentMovie:
          durations[currentMovie] = currentDurations
          currentDurations = []
        currentMovie = movieId
        currentDurations.append(int(match.group('time')))
    # last
    if currentMovie:
      durations[currentMovie] = currentDurations
  return durations


RELATION_RE = r"(?P<name>[^\t]+?)?\t+(?P<title>[^\t]+?)( +\((TV|V|VG)\))?( +\[(?P<role>.+)\])?( +<(?P<bill_pos>\d+)>)?\n"
relationRegex = re.compile(RELATION_RE)

PERSON_RE = r"(?P<lastname>.+?)(?:(?:, )(?P<firstname>.+?)|$)?(?P<num> \(.+\))?$"
personRegex = re.compile(PERSON_RE)

biographies = {}
def parseRelations(category, beginMark, beginSkip, endMark, relationship):
  global biographies
  start = time.time()
  if not biographies:
    print "Parsing biographies..."
    biographies = parseBiographies()
  print "Parsing " + category + " and writing CSV..."
  # initializing directories
  if not os.path.exists(newCSVPath + "/parts"):
    os.makedirs(newCSVPath + "/parts")
  outputPer = codecs.open(newCSVPath + "/parts/"+ category + "_per.csv", "w", encoding='utf8')
  outputRel = codecs.open(newCSVPath + "/parts/"+ category + "_rel.csv", "w", encoding='utf8')
  currentName = ""
  with open(newListsPath + "/" + category + ".list", 'rb') as f:
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
        bio = encodeName(biographies.get(currentName, [""])[0])
        nameMatch = personRegex.match(currentName)
        # matching a person
        if nameMatch:
          lastname = nameMatch.group('lastname')
          firstname = nameMatch.group('firstname')
          if firstname == None:
            firstname = ""
          num = nameMatch.group('num')
          if num == None or num == " (I)":
            num = ""
          fullname = (firstname + " " + lastname + num).lower()
          # writing a person
          outputPer.write("\"" + currentName + "\",\"" + firstname + "\",\""
            + lastname + "\",\"" + fullname + "\",\"" + bio + "\",Person\n")
        else:
          print "Match error on: " + currentName
      # matching a movie
      titleMatch = titleRegex.match(lineMatch.group('title'))
      if titleMatch == None or not titleIsValid(line):
        continue
      title = encodeName(str(titleMatch.group('movie')))
      released = encodeName(str(titleMatch.group('year')))
      yearextra = encodeName(str(titleMatch.group('yearextra'))[1:])
      if title == "None" or released == "????":
        continue;
      if yearextra and yearextra != "I":
        title = title + " [" + yearextra + "]"
      # writing relation
      if category == "actors" or category == "actresses":
        bill_pos = ""
        role = ""
        if lineMatch.group('bill_pos') != None:
          bill_pos = encodeName(str(lineMatch.group('bill_pos')))
        if lineMatch.group('role') != None:
          role = encodeName(str(lineMatch.group('role')))
        outputRel.write("\"" + currentName + "\",\"" + role + "\","+ bill_pos + ",\"m_"
          + title + released + "\"," + relationship + "\n")
      else:
        outputRel.write("\"" + currentName + "\",\"m_" + title + released + "\"," + relationship + "\n")
  outputPer.close()
  outputRel.close()
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


MOVIE_RE = "^(?P<title>.+?)\t+(?P<startyear>(?:\d{4}|\?{4}))(?:-((?:\d{4}|\?{4}))){0,1}$"
movieRegex = re.compile(MOVIE_RE)


def parseMovies():
  print "Parsing movies, plots, taglines, genres, durations and writing CSV..."
  start = time.time()
  plots = parseMoviePlots()
  taglines = parseMovieTaglines()
  genres = parseMovieGenres()
  durations = parseMovieDurations()
  if not os.path.exists(newCSVPath):
    os.makedirs(newCSVPath)
  output = codecs.open(newCSVPath + "/movies.csv", "w", encoding='utf8')
  output.write("movieId:ID,title,released:int,plot,tagline,genre:string[],duration:int,:LABEL\n")
  with open(newListsPath + "/movies.list") as f:
    # skipping head of file
    for _ in xrange(15):
      next(f)
    for line in f:
      # skipping invalid lines
      if not lineIsValid(line) or not titleIsValid(line):
        continue
      if line.startswith("-----"):
        break
      # getting values
      lineMatch = movieRegex.match(line)
      titleMatch = titleRegex.match(lineMatch.group('title'))
      if titleMatch == None:
        continue
      title = encodeName(str(titleMatch.group('movie')))
      released = encodeName(str(titleMatch.group('year')))
      yearextra = encodeName(str(titleMatch.group('yearextra'))[1:])
      if title == "None" or released == "????" or released != str(lineMatch.group('startyear')):
        continue;
      if yearextra and yearextra != "I":
        title = title + " [" + yearextra + "]"
      # writing .csv
      movieId = "m_" + title + released
      plot = encodeName(plots.get(movieId, [""])[0])
      tagline = encodeName(taglines.get(movieId, ""))
      genre = encodeName(";".join(genres.get(movieId, [""])))
      duration = max(durations.get(movieId, [-1]))
      duration = str(duration) if duration != -1 else ""
      output.write("\"" + movieId + "\",\"" + title + "\"," + released + ",\""
        + plot + "\",\"" + tagline + "\"," + "\"" + genre + "\"," + duration + ",Movie\n")
  output.close();
  print "Elapsed time: " + str((time.time() - start) / 60.0) + " minutes"


def convertToCSV(new_csv_path):
  newCSVPath = new_csv_path
  globalStart = time.time()
  parseMovies()
  parseRelations("directors", "THE DIRECTORS LIST\n", 4, "----", "DIRECTED")
  parseRelations("actors", "THE ACTORS LIST\n", 4, "----", "ACTED_IN")
  parseRelations("actresses", "THE ACTRESSES LIST\n", 4, "----", "ACTED_IN")
  parseRelations("cinematographers", "THE CINEMATOGRAPHERS LIST\n", 4, "----", "DIRECTED_PHOTOGRAPHY")
  parseRelations("composers", "THE COMPOSERS LIST\n", 4, "----", "COMPOSED_MUSIC")
  parseRelations("producers", "THE PRODUCERS LIST\n", 4, "----", "PRODUCED")
  parseRelations("writers", "THE WRITERS LIST\n", 4, "----", "WROTE")
  parseRelations("costume-designers", "THE COSTUME DESIGNERS LIST\n", 4, "----", "DESIGNED_COSTUMES")
  parseRelations("production-designers", "THE PRODUCTION DESIGNERS LIST\n", 4, "----", "DESIGNED_PRODUCTION")
  parseRelations("editors", "THE EDITORS LIST\n", 5, "----", "EDITED")
  removeDuplicatesStart = time.time()
  print "Removing duplicates..."
  removeDuplicates()
  print "Elapsed time: " + str((time.time() - removeDuplicatesStart) / 60.0) + " minutes"
  print "Total elapsed time: " + str((time.time() - globalStart) / 60.0) + " minutes"
