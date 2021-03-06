var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config');

var dbLocal = require("seraph")({ server : config.neo4j.url,
                                  user: config.neo4j.user,
                                  pass: config.neo4j.password});

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

/* GET a person by id. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n:Person) WHERE id(n) = {personId} RETURN n";
	dbLocal.query(cypher, {personId: parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

/* GET ACTED_IN relationships for one person. */
router.get('/:id/actor', function(req, res) {
	var cypher = "MATCH (n:Person) WHERE id(n) = {personId} RETURN n";
	dbLocal.query(cypher, {personId: parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		dbLocal.relationships(result[0].id, 'out', 'ACTED_IN', function(err, relationships) {
			if (err) {
				res.json(null);
			}
				//throw err;
			else if (relationships.length > 0)
				res.json(relationships[0]);
			else
				res.json(null);
		});
	});
	// TODO: Handle errors
});

/* GET ACTED_IN relationships for one person. */
router.get('/:id/actor/movies', function(req, res) {
	var cypher = "MATCH (n:Person) WHERE id(n) = {personId} RETURN n";
	dbLocal.query(cypher, {personId: parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		var movies = [];
		dbLocal.relationships(result[0].id, 'out', 'ACTED_IN', function(err, relationships) {
			if (err) {
				res.json(null);
			}
			//throw err;
			else if (relationships.length == 0) {
				res.json(null);
			}
			else {
				for (var i = 0; i < relationships.length; i++) {
					var role = "role"; //relationships[i].properties.roles[0];
					dbLocal.read(relationships[i].end, function(err, endNode) {
						var movie = endNode;
						movies.push(movie);
						if (movies.length == relationships.length) {
							res.json(movies);
						}
					});
				}
			}

		});
	});
	// TODO: Handle errors
});

module.exports = router;
