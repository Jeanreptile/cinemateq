var express = require('express');
var http = require('http');
var router = express.Router();
var path = require('path');
var config = require('../config');
var dbLocal = require("seraph")(config.database_url);

var path = require("path");

/* GET movies listing. */
router.get('/movie', function(req, res) {
    var limit = 10;
    if (req.query.limit)
    {
        limit = parseInt(req.query.limit);
    }
    var reqBefore = req.query.query;

    var regEx = /[+\-!(){}\[\]^"~*?:\\]|(&&)|(\|{2})/g; // regex for special characters allowed by Lucene: + - && || ! ( ) { } [ ] ^ " ~ * ? : \
    var subst = "\\\\$&"; // substitution string: double backslash before matched content
    var requestMovie = reqBefore.replace(regEx, subst);

    console.log("request 1 is " + requestMovie);
    var requestMovie2 = requestMovie.replace(/ /g, "* AND ");
    requestMovie2 = requestMovie2 + "*";
    console.log("request is " + requestMovie2);
    var cypher = "START movie=node:node_auto_index(\"title:(" + requestMovie2 + "*)\") WHERE NOT (ANY ( x IN [\"Short\", \"Documentary\"] WHERE x in movie.genre)) RETURN movie ORDER BY length(movie.title) LIMIT 10";
    dbLocal.query(cypher,
        function(err, result)
        {
            if (err) throw err;
            res.json(result);
        });
});


var sanitizeFileName = function(filename)
{
	// The replaceChar should be either a space
	// or an underscore.
	var replaceChar = "_";
	var regEx = new RegExp('[,/\:*?""<>|]', 'g');
	var Filename = filename.replace(regEx, replaceChar);

	// Show me the new file name.
  return Filename;
}


var getMoviePoster = function(name, year, callback){
  http.get("http://api.themoviedb.org/3/search/movie?api_key=c3c017954845b8a2c648fd4fafd6cda0&query=" + name + "&year=" + year, function(res)
  {
    var body = '';
    res.on('data', function(chunk) {
        body += chunk;
    });

    res.on('end', function() {
        var resp = JSON.parse(body)
        if (resp.total_results != 0 && resp.results != undefined && resp.results[0] && resp.results[0].poster_path != null)
        {
        var request = require('request'),
            fs      = require('fs'),
            url     = "http://image.tmdb.org/t/p/w500" + resp.results[0].poster_path,
            dir     = path.join('public','images','movies', sanitizeFileName(name + year));
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        request(url, {encoding: 'binary'}, function(error, response, body) {
          fs.writeFile(path.join(dir, 'poster.jpg'), body, 'binary', function (err) {});
        });
        if (resp.results[0].backdrop_path != null)
        {
          var request2= require('request'),
              fs2     = require('fs'),
              url2     = "http://image.tmdb.org/t/p/w1000" + resp.results[0].backdrop_path;
              request2(url2, {encoding: 'binary'}, function(error, response, body) {
            fs2.writeFile(path.join(dir, 'backdrop.jpg'), body, 'binary', function (err) {});
          });
        }
        callback(resp.results[0]);
        }
        else {
          callback(null);
        }
        });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}


var getPersonPicture = function(name, callback){
  http.get("http://api.themoviedb.org/3/search/person?api_key=c3c017954845b8a2c648fd4fafd6cda0&query=" + name , function(res)
  {
    var body = '';

    res.on('data', function(chunk) {
        body += chunk;
    });

    res.on('end', function() {
        var resp = JSON.parse(body);
        if (resp.total_results != 0 && resp.results[0] && resp.results[0].profile_path != null)
        {
        var request = require('request'),
            fs      = require('fs'),
            url     = "http://image.tmdb.org/t/p/w500" + resp.results[0].profile_path,
            dir     = path.join('public','images','persons');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        request(url, {encoding: 'binary'}, function(error, response, body) {
          fs.writeFile(path.join(dir, sanitizeFileName(name) + '.jpg'), body, 'binary', function (err) {});
          callback(resp.results[0]);
        });
        }
        else {
          callback(null);
        }
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

router.get('/:type/poster', function(req, res) {
  var RateLimiter = require('limiter').RateLimiter;
  var limiter = new RateLimiter(20, 10000);

  limiter.removeTokens(1, function() {
    if (req.params.type == 'movie')
    {
      getMoviePoster(req.query.query, req.query.year, function (resp)
      {
        if (resp == null)
        {
          res.status(302).json({ error: 'image not found' })
        }
        else {
          res.json(resp);
        }

      });
    }
    else {
      {
        getPersonPicture(req.query.query, function (resp)
        {
          if (resp == null)
          {
            res.status(302).json({ error: 'image not found' })
          }
          else {
            res.json(resp);
          }
        });
      }
    }
  });
});

router.get('/person', function(req, res) {
    var limit = 10;
    if (req.query.limit)
    {
        limit = parseInt(req.query.limit);
    }
    var reqBefore = req.query.query;

    var requestPerson = reqBefore.replace(" ", " AND ");
    var cypher = "START person=node:node_auto_index('fullname:(" + requestPerson + "*)') RETURN person LIMIT 10";
    dbLocal.query(cypher,
        function(err, result)
        {
            if (err) throw err;
            /*
            if (result.length == 0)
            {
              var cypher2 = "MATCH (person:Person) WHERE person.fullname =~ '" + reqBefore + ".*' RETURN person LIMIT 10";
              dbLocal.query(cypher2,
                function(err, result)
                {
                  if (err) throw err;

                  console.log("result is " + JSON.stringify(result));
                  return res.json(result)
                });
            }
            else {
            */
              console.log("result is " + JSON.stringify(result));
              res.json(result);
            //}
        });
});


module.exports = router;
