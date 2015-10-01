var express = require('express');
var http = require('http');
var router = express.Router();

var config = require('../config');

var dbLocal = require("seraph")(config.database_url);

/* For tests only. */
router.get('/query', function(req, res) {
	var cypher = "MATCH (n:Person) RETURN n LIMIT 25";
	dbLocal.query(cypher, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
});

/* GET persons listing. */
router.get('/find/:friendName', function(req, res) {
	var cypher = "MATCH (n:User) WHERE n.username =~ \".*"+ req.params.friendName + ".*\" RETURN n";
	dbLocal.query(cypher, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
});

router.post('/add', function(req, res) {
  var cypher = "MATCH (u1:User),(u2:User) \
                  WHERE u1.username = {userName} AND u2.username = {friendName} \
                  MERGE (u1)-[r:FRIEND_WITH]->(u2)  \
                  ON CREATE SET r.alreadyExisted=false  \
					        ON MATCH SET r.alreadyExisted=true  \
                  RETURN r.alreadyExisted";
	dbLocal.query(cypher, { userName: req.body.user, friendName: req.body.friend}, function(err, result) {
		if (err)
			throw err;
		res.json(result["r.alreadyExisted"]);
	});
	// TODO: Handle errors
});


/* GET friends of an user. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n:User)-[r:FRIEND_WITH]-(friends:User) WHERE id(n) = {personId} RETURN friends";
	dbLocal.query(cypher, {personId: parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
});
module.exports = router;
