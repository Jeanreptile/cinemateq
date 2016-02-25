var express = require('express');
var http = require('http');
var request = require('request');
var router = express.Router();
var config = require('../config');

var dbLocal = require("seraph")({ server : config.neo4j.url,
                                  user: config.neo4j.user,
                                  pass: config.neo4j.password});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

/* GET a node with the number of relationships by type */
router.get('/:id', function(req, res) {
	var query = 'MATCH (n) WHERE id(n) = {id} OPTIONAL MATCH (n)-[r]-() '
		+ 'RETURN n as node, head(labels(n)) as label, type(r) as type, count(r) as count '
		+ 'ORDER BY count DESC';
	dbLocal.query(query, { id : parseInt(req.params.id) }, function(err, result) {
		if (err || result.length === 0)
			throw err;
		var n = result[0].node;
		n.label = result[0].label;

		var relationships = {};
		for (var i = 0; i < result.length; i++)
			if (result[i].type != null)
				relationships[result[i].type] = result[i].count;

		res.json({ node: n, relationships: relationships });
	});
});

/* GET related nodes with, for each related node, the number of relationships by type */
router.get('/related/:id/:types', function(req, res) {
	var types = JSON.parse(req.params.types);
	var query = [];
	for (var t in types) {
		if (types[t].active){
			query.push('MATCH (n1)-[r1:' + t + ']-(n2) WHERE id(n1)={id} '
				+ 'WITH type(r1) as type1, n2 as node, head(labels(n2)) as label '
				+ 'SKIP ' + types[t].skip + ' LIMIT ' + types[t].limit + ' '
				+ 'MATCH (node)-[r2]-() '
				+ 'WITH type1 as type, node, label, count(r2) as count2, type(r2) as type2 '
				+ 'ORDER BY count2 DESC '
				+ 'RETURN type, node, label, collect([type2, count2]) as relationships');
		}
	}

	dbLocal.query(query.join(" UNION ALL "), {
		id : parseInt(req.params.id)
	}, function(err, result) {
		if (err)
			throw err;

		res.json(result);
	});
});


/* GET a node by id. */
/*router.get('/:id', function(req, res) {
	var cypher = "MATCH (n) WHERE id(n) = {nodeId} RETURN n";
	dbLocal.query(cypher, {nodeId: parseInt(req.params.id)}, function(err, result) {
		if (err)
			throw err;
		dbLocal.readLabels(result[0], function(err, labels) {
			result[0].type = labels[0];

			if (result[0].img == undefined){
				if (result[0].type == 'Person')
				{
					var parsedName = result[0].fullname.replace(" ", "+");
					request('https://localhost/api/search/person/poster?query=' + parsedName , function (error, response, body) {
						if (!error && response.statusCode == 200) {
							var cypher = "MATCH (p:Person) WHERE id(p) = {personId} \
														SET p.img = true RETURN p"
							dbLocal.query(cypher, { personId: result[0].id }, function(err, result) {
								if (err) throw err;
							});
						}
						else {
							console.log(error);
						}
				})

				}
				else if (result[0].type == 'Movie')
				{
					var parsedTitle = result[0].title.replace(" ", "+");
					request('https://localhost/api/search/movie/poster?query=' + parsedTitle + '&year=' + result[0].released, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							var cypher = "MATCH (m:Movie) WHERE id(m) = {movieId} \
														SET m.img = true RETURN m"
							dbLocal.query(cypher, { movieId: result[0].id }, function(err, result) {
								if (err) throw err;
							});
						}
						else {
							console.log(error);
						}
					})
				}
				else {
				}
			}
			if (result[0].type == "Person") {
				var relTypes = [{ "name": "PRODUCED", "number": 0 }, { "name": "ACTED_IN", "number": 0 }, { "name": "DIRECTED", "number": 0 },
				{ "name": "COMPOSED_MUSIC", "number": 0 }, { "name": "WROTE", "number": 0 }, { "name": "DIRECTED_PHOTOGRAPHY", "number": 0 },
				{ "name": "DESIGNED_COSTUMES", "number": 0 }, { "name": "EDITED", "number": 0 }, { "name": "DESIGNED_PRODUCTION", "number": 0}];
				var count = { val: 0 };
				for (var i = 0; i < relTypes.length; i++) {
					pushNumberOfRelations(i, req.params.id, relTypes, count, function(relTypesResult) {
						relTypesResult.sort(function(a,b) {
							var x = a["number"], y = b["number"];
							return ((x < y) ? -1 : ((x > y) ? 1 : 0));
						}).reverse();
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
});*/

/*
var setImg = function(object, type){
	if (result[0].type == "Perso ")
	{
		http.get("http://api.themoviedb.org/3/search/" + type+ "?api_key=c3c017954845b8a2c648fd4fafd6cda0&query="
							+ result[0].\);
	}
}
*/
/*
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
});*/

/*router.get('/:id/relationshipsRaw/:direction', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, function(err, relationships) {
		res.json(relationships);
	});
});*/

/*router.get('/:id/relationshipsRaw/:direction/:type', function(req, res) {
	dbLocal.relationships(req.params.id, req.params.direction, req.params.type, function(err, relationships) {
		res.json(relationships);
	});
});*/

/*router.get('/:id/relationshipsRaw/:direction/:type/:limit/:offset?', function(req, res) {
	var offset = req.params.offset ? req.params.offset : "";
	if (req.params.direction == "in") {
		if (req.params.type == "ACTED_IN")
			var cypher = "MATCH (m:Movie) WHERE id(m) = " + req.params.id +
			" MATCH (m)-[r:" + req.params.type + "]-(p:Person) " +
			"WHERE r.position IS NOT NULL RETURN r ORDER BY r.position " +
			(req.params.offset ? "SKIP " + req.params.offset : "") +
			" LIMIT " + req.params.limit
		else
			var cypher = "MATCH (m:Movie) WHERE id(m) = " + req.params.id +
				" MATCH (m)-[r:" + req.params.type + "]-(p:Person) " +
				"RETURN r ORDER BY m.globalLoveScore " +
				(req.params.offset ? "SKIP " + req.params.offset : "") +
				" LIMIT " + req.params.limit
	}
	else {
		if (req.params.type == "ACTED_IN")
			var cypher = "MATCH (p:Person) WHERE id(p) = " + req.params.id +
				" MATCH (p)-[r:" + req.params.type + "]-(m:Movie) " +
				"WHERE r.position IS NOT NULL RETURN r ORDER BY r.position " +
				(req.params.offset ? "SKIP " + req.params.offset : "") +
				" LIMIT " + req.params.limit
		else
			var cypher = "MATCH (p:Person) WHERE id(p) = " + req.params.id +
				" MATCH (p)-[r:" + req.params.type + "]-(m:Movie) " +
				"RETURN r ORDER BY p.globalLoveScore " +
				(req.params.offset ? "SKIP " + req.params.offset : "") +
				" LIMIT " + req.params.limit
	}
	dbLocal.query(cypher, function (err, relationships) {
		res.json(relationships);
	});
});*/
/*
router.get('/:id/relationships/:direction/:type', function(req, res) {
	if (req.params.type == "ACTED_IN")
	{
		if (req.params.direction == "in")
			var cypher = "MATCH (m:Movie) WHERE id(m) = " + req.params.id + "  MATCH (m)-[r:ACTED_IN]-(p:Person) WHERE r.position IS NOT NULL RETURN r ORDER BY r.position"
		else
			var cypher = "MATCH (p:Person) WHERE id(p) = " + req.params.id + "  MATCH (p)-[r:ACTED_IN]-(m:Movie) WHERE r.position IS NOT NULL RETURN r ORDER BY r.position"

		dbLocal.query(cypher,
				function(err, relationships)
				{
						var nodes = [];
						if (err)
							throw err;
						if (relationships.length > 0) {
							for (var i = 0; i < relationships.length; i++) {
								var endpoint = relationships[i].start;
								if (req.params.direction == "out")
								{
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
	}
	else
	{
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
}
});*/
/*
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
});*/


module.exports = router;
