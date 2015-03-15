var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* GET movies listing. */
router.get('/all', function(req, res) {
	dbLocal.nodesWithLabel('Movie', function(err, movies) {
		res.json(movies);
	});
	// TODO: Handle errors
});

/* GET a movie by id. */
router.get('/:id', function(req, res) {
	dbLocal.nodesWithLabel('Movie', function(err, movies) {
		for (var index = 0; index < movies.length; index++) {
			if (movies[index].id == req.params.id) {
				res.json(movies[index]);
			}
		}
	});
	// TODO: Handle errors
});

module.exports = router;