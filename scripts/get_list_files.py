import sys
import os
import json
import gzip
import ftplib
import progressbar


def gunzip(name_list):
    inF = gzip.GzipFile("lists/" + name_list + ".list.gz", 'rb')
    s = inF.read()
    inF.close()

    outF = file("lists/" + name_list + ".list", 'wb')
    outF.write(s)
    outF.close()
    os.remove("lists/" + name_list + ".list.gz")
    print " Done!"

def retrieve(name_list):
    ftp = ftplib.FTP('ftp.funet.fi')
    ftp.login()
    filesize = ftp.size('pub/mirrors/ftp.imdb.com/pub/' + name_list + '.list.gz')
    progress = progressbar.AnimatedProgressBar(end=filesize, width=50)

    print 'Downloading ' + name_list + '.list.gz'

    with open( "lists/" + name_list + '.list.gz', 'w') as f:
        def callback(chunk):
            f.write(chunk)
            progress + len(chunk)

            # Visual feedback of the progress!
            progress.show_progress()

        ftp.retrbinary('RETR pub/mirrors/ftp.imdb.com/pub/' + name_list + '.list.gz', callback)

if not os.path.exists("lists"):
    os.makedirs("lists")
    ####
    retrieve("actors")
    gunzip("actors")
    ####
    retrieve("actresses")
    gunzip("actresses")
    ####
    retrieve("biographies")
    gunzip("biographies")
    ####
    retrieve("cinematographers")
    gunzip("cinematographers")
    ####
    retrieve("composers")
    gunzip("composers")
    ####
    retrieve("costume-designers")
    gunzip("costume-designers")
    ####
    retrieve("directors")
    gunzip("directors")
    ####
    retrieve("editors")
    gunzip("editors")
    ####
    retrieve("genres")
    gunzip("genres")
    ####
    retrieve("movies")
    gunzip("movies")
    ####
    retrieve("plot")
    gunzip("plot")
    ####
    retrieve("producers")
    gunzip("producers")
    ####
    retrieve("production-designers")
    gunzip("production-designers")
    ####
    retrieve("running-times")
    gunzip("running-times")
    ####
    retrieve("taglines")
    gunzip("taglines")
    ####
    retrieve("writers")
    gunzip("writers")
else:
    print "You already have a lists directory !"
