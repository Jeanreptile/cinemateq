var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* GET movies listing. */
router.get('/movie', function(req, res) {
    var limit = 10;
    if (req.query.limit)
    {
        limit = parseInt(req.query.limit);
    }
    var reqBefore = req.query.query;

    var requestMovie = reqBefore.replace(" ", " AND ");
    var cypher = "START movie=node:node_auto_index('title:(" + requestMovie + "*)') WHERE NOT (ANY ( x IN [\"Short\", \"Documentary\"] WHERE x in movie.genre)) RETURN movie LIMIT 10";
    dbLocal.query(cypher,
        function(err, result)
        {
            if (err) throw err;
            res.json(result);
        });
});


var getMoviePoster = function(name, year, callback){
  http.get("http://api.themoviedb.org/3/search/movie?api_key=c3c017954845b8a2c648fd4fafd6cda0&query=" + name + "&year=" + year, function(res)
  {
    var body = '';

    res.on('data', function(chunk) {
        body += chunk;
    });

    res.on('end', function() {
        var resp = JSON.parse(body)
        console.log("Got response: ", resp.results[0].poster_path);
        var request = require('request'),
            fs      = require('fs'),
            url     = "http://image.tmdb.org/t/p/w500" + resp.results[0].poster_path,
            dir     = 'public/images/movies/'+ name + year + '/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        request(url, {encoding: 'binary'}, function(error, response, body) {
          fs.writeFile(dir + 'poster.jpg', body, 'binary', function (err) {});
        });
        callback(resp.results[0]);
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });

}

router.get('/movie/poster', function(req, res) {
  var RateLimiter = require('limiter').RateLimiter;
  var limiter = new RateLimiter(20, 10000);

  limiter.removeTokens(1, function() {
    getMoviePoster(req.query.query, req.query.year, function (resp)
    {
      res.json(resp);
    });
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
            res.json(result);
        });
});


module.exports = router;
