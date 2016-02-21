var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config');
var expressJwt = require('express-jwt');

var dbLocal = require("seraph")({ server : config.neo4j.url,
                                  user: config.neo4j.user,
                                  pass: config.neo4j.password});

/* For tests only. */
router.get('/query', function(req, res) {
	var cypher = "MATCH (n:) RETURN n LIMIT 25";
	dbLocal.query(cypher, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
});

/* GET a path between two nodes */
router.get('/path/:idStart/:idEnd', function(req, res) {
	var cypher = 'MATCH (n1) WHERE id(n1)={startId} MATCH (n2) WHERE id(n2)={endId}\
				  MATCH p = allShortestPaths((n1)-[*0..5]-(n2))\
				  RETURN extract(r IN relationships(p) | "{\\"id\\":"+ id(r) + ",\\"type\\":\\"" + type(r)\
				  + "\\",\\"start\\":" + id(startNode(r)) + ",\\"end\\":" + id(endNode(r)) + "}")';
	dbLocal.query(cypher, {
		startId : parseInt(req.params.idStart),
		endId : parseInt(req.params.idEnd)
	}, function(err, result) {
		if (err) throw err;
		res.json(result);
	});
	// TODO: Handle errors
});

/* DELETE a cinegraph */
router.delete('/:id', function(req, res) {
	var cypher = "MATCH (n:MyCinegraph)-[r]-() WHERE id(n) = {idCinegraph} DELETE n, r";
	dbLocal.query(cypher, { idCinegraph : parseInt(req.params.id) }, function(err) {
		if (err) throw err;
		res.end();
	});
	// TODO: Handle errors
});

/* CREATE a cinegraph */
router.post('/', function(req, res) {
	var cypher = "MATCH (u:User) WHERE id(u) = {userId} CREATE (c:MyCinegraph {title : {titleCinegraph}, nodes: [] })-[:BELONGS_TO]->(u) RETURN c"
	dbLocal.query(cypher, { titleCinegraph : req.body.titleCinegraph, userId: parseInt(req.body.idUser)}, function(err, result) {
		if (err)
			throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

/* EDIT a cinegraph */
router.put('/:id', function(req, res) {
	var cypher = "MATCH (n:MyCinegraph) WHERE id(n) = {idCinegraph} SET n.title = {titleCinegraph}, n.nodes = {cinegraphNodes} RETURN n";
	dbLocal.query(cypher, { idCinegraph : parseInt(req.params.id), titleCinegraph : req.body.titleCinegraph, cinegraphNodes: req.body.cinegraphNodes }, function(err, result) {
		if (err) throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

/* GET all cinegraph of a user. */
router.get('/all/:idUser', function(req, res) {
	var cypher = "MATCH (u:User) WHERE id(u) = {userId} MATCH (b:MyCinegraph)-[r:BELONGS_TO]->(u) RETURN b";
	dbLocal.query(cypher, { userId : parseInt(req.params.idUser)}, function(err, result) {
		if (err) throw err;
		for (var i = result.length - 1; i >= 0; i--) {
			if (result[i].nodes.length != 0) {
				result[i].nodes = JSON.parse(result[i].nodes);
			}
		};
		res.json(result);
	});
	// TODO: Handle errors
});

/* GET a cinegraph by id. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n:MyCinegraph) WHERE id(n) = {idCinegraph} RETURN n";
	dbLocal.query(cypher, { idCinegraph : parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

/* GET ACTED_IN relationships for one person. */
/*router.get('/:id/actor', function(req, res) {
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
});*/

/* GET ACTED_IN relationships for one person. */
/*router.get('/:id/actor/movies', function(req, res) {
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
});*/

module.exports = router;
