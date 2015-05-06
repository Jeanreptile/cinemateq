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
		dbLocal.readLabels(result[0], function(err, labels) {
			result[0].type = labels[0];
			/*
			if (result[0].img_url == undefined)
			{
				if (result[0].type == "Person" || result[0].type == "Movie")
					setImg(result[0]);
			}*/
			res.json(result[0]);
		});
	});
	// TODO: Handle errors
});

/*
var setImg = function(object, type){
	if (result[0].type == "Perso ")
	{
		http.get("http://api.themoviedb.org/3/search/" + type+ "?api_key=c3c017954845b8a2c648fd4fafd6cda0&query="
							+ result[0].\);
	}
}
*/

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
