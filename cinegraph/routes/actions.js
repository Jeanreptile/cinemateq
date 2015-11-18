var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config');
var redis = require('redis');

router.get('/:userName', function(req, res) {
  result = [];
  isRedisLaunched = true;
  var redisClient = redis.createClient();
  redisClient.on("error", function (err) {
      console.log("Error " + err);
      String.prototype.endsWith = function(pattern) {
        var d = this.length - pattern.length;
        return d >= 0 && this.lastIndexOf(pattern) === d;
      };
      errStr = "" + err;
      if (errStr.endsWith("ECONNREFUSED"))
      {
        console.log("Redis can't connect.");
        isRedisLaunched = false;
      }
  });
  if (isRedisLaunched)
  {
    redisClient.smembers("actions." + req.params.userName, function (err, replies) {
      if (replies && replies.length)
      {
        replies.forEach(function (reply, i) {
          redisClient.get("action." + req.params.userName + ":" + reply, function(err, reply_action)
          {
          	console.log("reply_action: " + reply_action);
            if(!err)
            {
              result.push(JSON.parse(reply_action));
              if ((i+1) === replies.length)
                res.json(result);
            }
            else {
           	  console.log("Redis error: " + err.toString());
          	  res.json([]);
            } 
          })
        })
        redisClient.quit();
      }
      else {
        redisClient.quit();
        res.json([]);
      }
    });
  }
});

router.post('/', function(req, res) {
	// save in redis (Create an object notif.username:n and append n in notifs.username)
	var redisClient = redis.createClient();
	redisClient.incr("id:actions." + req.body.username, function(err, idAction)
	{
		if (req.body.actionType == "ratingLove" || req.body.actionType == "ratingObj") {
			actionData = '{"type":"' + req.body.actionType + '", "idToRate":"' + req.body.idToRate +
				'", "rate": "' + req.body.rate + '", "username": "' + req.body.username + '", "id" : "' + idAction + '"}';
		}
		else if (req.body.actionType == "friendship") {
			actionData = '{"type": "' + req.body.actionType + '", "username": "' + req.body.username +
				'", "friend_username": "' + req.body.friendUsername + '", "id": "' + idAction + '"}';
		}
		else {
			// TODO: Handle errors.
			actionData = null;
		}

		redisClient.set("action." + req.body.username + ":" + idAction, actionData);
		redisClient.sadd("actions." + req.body.username, idAction);
	});
	res.json(true);
});

module.exports = router;