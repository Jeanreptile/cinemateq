var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config');

var dbLocal = require("seraph")(config.database_url);

/* GET movies listing. */
router.get('/all', function(req, res) {
	dbLocal.nodesWithLabel('Movie', function(err, movies) {
		res.json(movies);
	});
	// TODO: Handle errors
});

/* GET a movie by id. */
router.get('/:id', function(req, res) {
	var cypher = "MATCH (n:Movie) WHERE id(n) = {movieId} RETURN n";
	dbLocal.query(cypher, {movieId: parseInt(req.params.id)}, function(err, result) {
		if (err) throw err;
		res.json(result[0]);
	});
	// TODO: Handle errors
});

module.exports = router;
