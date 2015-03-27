var express = require('express');
var http = require('http');
var router = express.Router();
var dbLocal = require("seraph")(); // default is http://localhost:7474/db/data

/* GET movies listing. */
router.get('/movie', function(req, res) {
    var limit = 10;
    if (req.query.limit)
    {
        limit = parseInt(req.query.limit);
    }
    var cypher = "MATCH (n:Movie) WHERE n.title =~ \"" + req.query.query + ".*\" RETURN n ORDER BY n.released DESC LIMIT 10";
    dbLocal.query(cypher,
        function(err, result)
        {
            if (err) throw err;
            console.log("OK");
            console.log(result);
            res.json(result);
        });
});

module.exports = router;
