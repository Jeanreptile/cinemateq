var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

function pushNumberOfRelations(index, id, relTypes, callback) {
	dbLocal.relationships(id, "out", relTypes[index]["name"], function(err, relationships) {
		if (err)
			throw err;
		if (relationships.length > 0) {
			var length = relationships.length;
			relTypes[index]["number"] = length;
		}
		if (index == relTypes.length - 1) {
			relTypes.sort(function(a,b) {
				var x = a["number"], y = b["number"];
				return ((x < y) ? -1 : ((x > y) ? 1 : 0));
			}).reverse();
			callback(relTypes);
		}
	});
}

/* GET a node by id. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n) WHERE id(n) = {nodeId} RETURN n";
	dbLocal.query(cypher, {nodeId: parseInt(req.params.id)}, function(err, result) {
		if (err)
			throw err;
		dbLocal.readLabels(result[0], function(err, labels) {
			result[0].type = labels[0];
			if (result[0].type == "Person") {
				var relTypes = [{ "name": "PRODUCED", "number": 0 }, { "name": "ACTED_IN", "number": 0 }, { "name": "DIRECTED", "number": 0 },
				{ "name": "COMPOSED_MUSIC", "number": 0 }, { "name": "WROTE", "number": 0 }, { "name": "DIRECTED_PHOTOGRAPHY", "number": 0 },
				{ "name": "DESIGNED_COSTUMES", "number": 0 }, { "name": "EDITED", "number": 0 }, { "name": "DESIGNED_PRODUCTION", "number": 0}];
				for (var i = 0; i < relTypes.length; i++) {
					pushNumberOfRelations(i, req.params.id, relTypes, function(relTypesResult) {
						result[0].jobs = relTypesResult;
						res.json(result[0]);
					});
				}
			}
			else {
				res.json(result[0]);
			}
		});
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

router.get('/:id/relationshipsRaw/:direction', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, function(err, relationships) {
		res.json(relationships);
	});
});

router.get('/:id/relationshipsRaw/:direction/:type', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, req.params.type, function(err, relationships) {
		res.json(relationships);
	});
});

router.get('/:id/relationshipsRaw/:direction/:type/:limit', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, req.params.type, function(err, relationships) {
		res.json(relationships.slice(0, req.params.limit));
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


router.get('/:id/relationships/:direction/:type/:limit', function(req, res) {
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
					if (nodes.length == req.params.limit) {
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