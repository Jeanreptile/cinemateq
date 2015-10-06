var express = require('express');
var http = require('http');
var router = express.Router();
var config = require('../config');
var redis = require('redis');


/* Get all notifications of an user */
router.get('/:userName', function(req, res) {
  result = [];
  var redisClient = redis.createClient();
  redisClient.smembers("notifs." + req.params.userName, function (err, replies) {
    console.log(JSON.stringify(replies));
    if (replies && replies.length)
    {
      console.log('dedans');
      replies.forEach(function (reply, i) {
        redisClient.get("notif." + req.params.userName + ":" + reply, function(err, reply_notif)
        {
          if(!err)
          {
            result.push(JSON.parse(reply_notif));
            if((i+1) === replies.length)
              res.json(result);
          }
          else
            console.log("Redis error: " + err.toString());
        })
      })
      redisClient.quit();
    }
    else {
      res.json([]);
    }
  });
});


/* Get a notification of an user */
router.delete('/', function(req, res) {
  var redisClient = redis.createClient();
  redisClient.srem("notifs." + req.query.userName, req.query.idNotif);
  redisClient.del("notif." + req.query.userName + ":" + req.query.idNotif);
  redisClient.quit();
  res.end();
});


router.post('/inviteToRate', function(req, res) {
	// save in redis (Create an object notif.username:n and append n in notifs.username)
	var redisClient = redis.createClient();
	redisClient.incr("id:notifs." + req.body.friendName, function(err, idNotif)
	{
		notifData = '{"type":"invite_to_rate", "dataOfNode":"' + req.body.dataOfNode + '", "idToRate":"' + req.body.idToRate + '", "friend_name": "' + req.body.userName + '", "id" : "' + idNotif + '"}'
	//redisClient.set();
		redisClient.set("notif." + req.body.friendName + ":" + idNotif, notifData);
		redisClient.sadd("notifs." + req.body.friendName, idNotif);
		//publish notif
		redisClient.publish("notifs."+req.body.friendName, notifData);
	});
	res.json(true);
});




module.exports = router;
