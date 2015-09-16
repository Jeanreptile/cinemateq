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

	var movieId = parseInt(req.body.movieId);

	var queryHasAlreadyRatedObj = "MATCH (u:User)-[r:RATED]->(m:Movie) \
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

	var queryHasAlreadyRatedLove = "MATCH (u:User)-[r:RATED]->(m:Movie) \
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

		var globalScore = node.globalLoveScore;
		var numberOfRatings = node.numberOfLoveRatings;
		if (type == "obj") {
			globalScore = node.globalObjScore;
			numberOfRatings = node.numberOfObjRatings;
		}
		if (globalScore == undefined) {
			globalScore = 0;
		}
		if (numberOfRatings == undefined) {
			numberOfRatings = 0;
		}
		if (!alreadyRatedByUser) {
			numberOfRatings++;
			globalScore += score * 1;
			globalScore /= numberOfRatings;
		}
		else {
			globalScore -= oldScore / numberOfRatings;
			globalScore += score / numberOfRatings;
		}

		globalScore = globalScore % 1 != 0 ? globalScore.toFixed(1) : globalScore;
		if (type == "love") {
			node.globalLoveScore = globalScore;
			node.numberOfLoveRatings = numberOfRatings;
		}
		else {
			node.globalObjScore = globalScore;
			node.numberOfObjRatings = numberOfRatings;
		}
		//console.log("node: " + JSON.stringify(node));
		//console.log("global" + type + "Score: " + globalScore);
		db.save(node, function (err, updatedNode) {
			if (err) throw err;
			//console.log("new node: " + JSON.stringify(updatedNode));
			callback(updatedNode);
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
