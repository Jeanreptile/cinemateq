var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* GET a node by id. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n) WHERE id(n) = {nodeId} RETURN n";
	dbLocal.query(cypher, {nodeId: parseInt(req.params.id)}, function(err, result) {
		if (err)
			throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

router.get('/:id/relationships/:direction', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, function(err, relationships) {
		var nodes = [];
		if (err)
			throw err;
		if (relationships.length > 0) {
			for (var i = 0; i < relationships.length; i++) {
				var endpoint = relationships[i].start;
				if (req.params.direction == "out") {
					endpoint = relationships[i].end;
				}
				dbLocal.read(endpoint, function(err, node) {
					nodes.push(node);
					if (nodes.length == relationships.length) {
						res.json(nodes);
					}
				});
			}
		}
		else
			res.json(null);
	});
});

router.get('/:id/relationships/:direction/:type', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, req.params.type, function(err, relationships) {
		var nodes = [];
		if (err)
			throw err;
		if (relationships.length > 0) {
			for (var i = 0; i < relationships.length; i++) {
				var endpoint = relationships[i].start;
				if (req.params.direction == "out") {
					endpoint = relationships[i].end;
				}
				dbLocal.read(endpoint, function(err, node) {
					nodes.push(node);
					if (nodes.length == relationships.length) {
						res.json(nodes);
					}
				});
			}
		}
		else
			res.json(null);
	});
});


module.exports = router;