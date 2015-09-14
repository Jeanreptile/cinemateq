var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* For tests only. */
router.get('/query', function(req, res) {
	var cypher = "MATCH (n:Person) RETURN n LIMIT 25";
	dbLocal.query(cypher, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
});

/* GET persons listing. */
router.get('/all', function(req, res) {
	dbLocal.nodesWithLabel('Person', function(err, persons) {
		res.json(persons);
	});
	// TODO: Handle errors
});

router.post('/add', function(req, res) {
  var cypher = "MATCH (u1:User),(u2:User) \
                  WHERE u1.username = {userName} AND u2.username = {friendName} \
                  MERGE (u1)-[r:FRIEND_WITH]->(u2)  \
                  RETURN u1,u2,r";
	dbLocal.query(cypher, { userName: req.body.user, friendName: req.body.friend}, function(err, result) {
		if (err)
			throw err;
		res.json(result[0]);
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
