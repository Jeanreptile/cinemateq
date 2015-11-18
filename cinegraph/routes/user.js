var express = require('express');
var router = express.Router();
var bCrypt = require('bcrypt-nodejs');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var config = require('../config');
var db = require("seraph")(config.database_url);


router.get('/:userId/rating/:movieId', function(req, res) {
	var cypher = "MATCH (u:User)-[r:RATED]->(m) " +
					"WHERE id(m) = {movieId} AND id(u) = {userId} " +
					"RETURN r"

	db.query(cypher, {movieId: parseInt(req.params.movieId), userId: parseInt(req.params.userId)}, function (err, result) {
		if (err) throw err;
		if (result[0] == undefined)
		{
			return res.json({message: "no rate"});
		}
		res.json(result[0].properties);
	});
});

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

	var movieId = parseInt(req.body.movieId);

	var queryHasAlreadyRatedObj = "MATCH (u:User)-[r:RATED]->(m) \
																	WHERE id(m) = {movieId} AND u.username = {username} AND HAS (r.obj) \
																	RETURN r";

	var hasAlreadyRatedObj = true;
	var oldScore;

	db.query(queryHasAlreadyRatedObj, {movieId: movieId, username: userName}, function (err, result) {
		if (err) throw err;
		if (result[0] == undefined) {
			hasAlreadyRatedObj = false;
		}
		else {
			oldScore = result[0].properties.obj;
		}

		var cypher =   "MATCH (u:User),(m) \
										WHERE id(m) = {movieId} AND u.username = {userName} \
										MERGE (u)-[r:RATED]->(m) \
										SET r.obj = {noteObj} \
										RETURN r"

		db.query(cypher, {movieId: movieId, userName: userName,
											noteObj: req.body.noteObj }, function (err, result) {
			if (err) throw err;

			updateGlobalScore("obj", movieId, req.body.noteObj, hasAlreadyRatedObj, oldScore, function (updatedNode) {
				res.json(updatedNode);
			});
		});
	});
});


router.post('/rateLove', authenticate, function(req, res) {
	var userName = decodedToken.username;

	var movieId = parseInt(req.body.movieId);

	var queryHasAlreadyRatedLove = "MATCH (u:User)-[r:RATED]->(m) \
																	WHERE id(m) = {movieId} AND u.username = {username} AND HAS (r.love) \
																	RETURN r";

	var hasAlreadyRatedLove = true;
	var oldScore;

	db.query(queryHasAlreadyRatedLove, {movieId: movieId, username: userName}, function (err, result) {
		if (err) throw err;
		if (result[0] == undefined) {
			hasAlreadyRatedLove = false;
		}
		else {
			oldScore = result[0].properties.love;
		}

		var cypher =   "MATCH (u:User),(m) \
										WHERE id(m) = {movieId} AND u.username = {userName} \
										MERGE (u)-[r:RATED]->(m) \
										SET r.love = {noteLove} \
										RETURN r"

		db.query(cypher, {movieId: movieId, userName: userName,
											noteLove: req.body.noteLove }, function (err, result) {
			if (err) throw err;

			updateGlobalScore("love", movieId, req.body.noteLove, hasAlreadyRatedLove, oldScore, function (updatedNode) {
				res.json(updatedNode);
			});
		});
	});
});

function updateGlobalScore(type, id, score, alreadyRatedByUser, oldScore, callback) {
	db.read(id, function (err, node) {
		if (err) throw err;

		var cypherRatings;
		var cypherLoveRatings = "MATCH (u:User)-[r:RATED]->(m) WHERE id(m) = {movieId} AND HAS (r.love) RETURN r";
		var cypherObjRatings = "MATCH (u:User)-[r:RATED]->(m) WHERE id(m) = {movieId} AND HAS (r.obj) RETURN r";

		if (type == "love") {
			cypherRatings = cypherLoveRatings;
		}
		else {
			cypherRatings = cypherObjRatings;
		}

		db.query(cypherRatings, {movieId: id}, function (err, result) {
			if (err) throw err;

			var globalScore;
			var numberOfRatings;
			if (result[0] == undefined) {
				globalScore = 0;
			}
			else {
				numberOfRatings = result.length;
				//console.log("numberOfRatings: " + numberOfRatings);
				var sumOfRatings = 0;
				for (var i = result.length - 1; i >= 0; i--) {
					if (type == "love") {
						sumOfRatings += parseInt(result[i].properties.love);
					}
					else {
						sumOfRatings += parseInt(result[i].properties.obj);
					}
				};
				//console.log("sumOfRatings: " + sumOfRatings);
				globalScore = sumOfRatings / numberOfRatings;
				globalScore = globalScore % 1 != 0 ? globalScore.toFixed(1) : globalScore;
			}
			if (type == "love") {
				node.globalLoveScore = globalScore;
			}
			else {
				node.globalObjScore = globalScore;
			}
			//console.log("node: " + JSON.stringify(node));
			//console.log("global" + type + "Score: " + globalScore);
			db.save(node, function (err, updatedNode) {
				if (err) throw err;
				//console.log("new node: " + JSON.stringify(updatedNode));
				callback(updatedNode);
			});
		});
	});
}

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
