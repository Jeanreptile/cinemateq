var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* GET persons listing. */
router.get('/all', function(req, res) {
	dbLocal.nodesWithLabel('Person', function(err, persons) {
		res.json(persons);
	});
	// TODO: Handle errors
});

/* GET a person by id. */
router.get('/:id', function(req, res) {
	dbLocal.nodesWithLabel('Person', function(err, persons) {
		for (var index = 0; index < persons.length; index++) {
			if (persons[index].id == req.params.id) {
				res.json(persons[index]);
			}
		}
	});
	// TODO: Handle errors
});

/* GET ACTED_IN relationships for one person. */
router.get('/:id/actor', function(req, res) {
	dbLocal.nodesWithLabel('Person', function(err, persons) {
		for (var index = 0; index < persons.length; index++) {
			if (persons[index].id == req.params.id) {
				dbLocal.relationships(persons[index].id, 'out', 'ACTED_IN', function(err, relationships) {
					res.json(relationships);
				});
			}
		}
	});
	// TODO: Handle errors
});

/* GET ACTED_IN relationships for one person. */
router.get('/:id/actor/movies', function(req, res) {
	dbLocal.nodesWithLabel('Person', function(err, persons) {
		for (var index = 0; index < persons.length; index++) {
			if (persons[index].id == req.params.id) {
				var movies = [];
				dbLocal.relationships(persons[index].id, 'out', 'ACTED_IN', function(err, relationships) {
					for (var i = 0; i < relationships.length; i++) {
						var role = relationships[i].properties.roles[0];
						dbLocal.read(relationships[i].end, function(err, endNode) {
							var movie = endNode;
							movies.push(movie);
							if (movies.length == relationships.length) {
								res.json(movies);
							}
						});
					}
				});
			}
		}
	});
	// TODO: Handle errors
});

module.exports = router;