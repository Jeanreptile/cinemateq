import re

output = open("output.txt", 'w')

with open("movies.list") as f:
	for _ in xrange(15):
		next(f)
	for line in f:
		if not line or "(TV)" in line or line[0] == "\"":
			continue
		values = re.split(r'\t+', line)
		if len(values) < 2:
			continue

		title = values[0]
		year = values[1]
		if '{' in title or year[0] == "?":
			continue
		output.write(title + " " + year)

output.close()