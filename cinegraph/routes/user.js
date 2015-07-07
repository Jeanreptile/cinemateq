var express = require('express');
var router = express.Router();
var bCrypt = require('bcrypt-nodejs');
var db = require("seraph")("http://localhost:7474");
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');




router.get('/rating/:movieId', authenticate, function(req, res) {
  var userName = decodedToken.username;
	var cypher =   "MATCH (u:User)-[r:RATED]->(m) \
                  WHERE id(m) = {movieId} AND u.username = {userName} \
                  RETURN r"

  db.query(cypher, {movieId: parseInt(req.params.movieId), userName: userName}, function (err, result) {
		if (err) throw err;
    if (result[0] == undefined)
    {
      return res.json({message: "no rate"});
    }
		res.json(result[0].properties);
  });
});

router.post('/rateObj', authenticate, function(req, res) {
  var userName = decodedToken.username;
	var cypher =   "MATCH (u:User),(m) \
                  WHERE id(m) = {movieId} AND u.username = {userName} \
                  MERGE (u)-[r:RATED]->(m) \
                  SET r.obj = {noteObj} \
                  RETURN r"

  db.query(cypher, {movieId: parseInt(req.body.movieId), userName: userName,
                    noteObj: req.body.noteObj }, function (err, result) {
		if (err) throw err;
		res.json(result);
  });
});


router.post('/rateLove', authenticate, function(req, res) {
  var userName = decodedToken.username;

	var cypher =   "MATCH (u:User),(m) \
                  WHERE id(m) = {movieId} AND u.username = {userName} \
                  MERGE (u)-[r:RATED]->(m) \
                  SET r.love = {noteLove} \
                  RETURN r"

  db.query(cypher, {movieId: parseInt(req.body.movieId), userName: userName,
                    noteLove: req.body.noteLove }, function (err, result) {
		if (err) throw err;
		res.json(result);
  });
});

function authenticate(req, res, next) {
  var token = req.headers['authorization'];
  if (token == undefined)
  {
    token = req.body.token;
  }
  else {
    token = token.replace('Bearer ', '');
  }
  if (token)
  {
  jwt.verify(token, 'SecretStory', function(err, decoded) {
     if (err) {
       return res.json({ success: false, message: 'Failed to authenticate token.' });
     } else {
       decodedToken = decoded
       next();
     }
   });
  }
  else{
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }
}

module.exports = router;
