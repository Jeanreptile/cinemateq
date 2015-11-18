var express = require('express');
var router = express.Router();
var bCrypt = require('bcrypt-nodejs');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var config = require('../config');

var db = require("seraph")(config.database_url);

/* POST user login. */
router.post('/login', authenticate, function(req, res) {
   if (!user) {
      console.log("no user");
     return res.json(401, { message: 'no user' });
   }
   //user has authenticated correctly thus we create a JWT token
   var token = jwt.sign({ username: user.username}, 'SecretStory', { expiresIn : 1440});
   res.json({ token : token, user : user });
});

router.post('/register', findOrCreateUser, function(req, res) {
   if (!user) {
      console.log("no user");
     return res.json(401, { error: 'no user' });
   }
   //user has authenticated correctly thus we create a JWT token
   var token = jwt.sign({ username: user.username}, 'SecretStory', { expiresIn : 1440});
   res.json({ token : token, user : user });
});

router.put('/updateUser', function(req, res) {
  // check in neo4j if a user with username exists or not
  predicate = {'username': req.body.username};
  db.find(predicate, 'User', function (err, objs) {
    // In case of any error, return using the done method
    if (err) {
      res.json(401, {"message" : "Error with database"});
    }
      // Username does not exist, log error & redirect back
    if (objs.length == 0) {
      return res.status(401).json({'message':'User Not found.'});
    }

    var userNode = objs[0];

    var username = req.body.username;
    var pwd = req.body.password ? createHash(req.body.password) : objs[0].password;
    var email = req.body.email;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;

    userNode.username = username;
    userNode.password = pwd;
    userNode.email = email;
    userNode.firstName = firstName;
    userNode.lastName = lastName;

    db.save(userNode, function(err, node) {
      if (err) throw err;
      var userUpdated = {'firstName':node.firstName, 'lastName':node.lastName, 'username': node.username,
        'id': node.id, 'email': node.email, 'password': node.password};
      res.json({user: userUpdated});
    });
  });
});


function authenticate(req, res, next) {
  // check in neo4j if a user with username exists or not
  predicate = {'username': req.body.username};
  db.find(predicate, 'User', function (err, objs) {
      // In case of any error, return using the done method
    if (err) {
      res.json(401, {"message" : "Error with database"});
    }
      // Username does not exist, log error & redirect back
    if (objs.length == 0) {
      return res.json(401, {'message':'User Not found.'});
    }
      // User exists but wrong password, log the error
    if (!isValidPassword(objs[0], req.body.password)) {
      return res.json(401, {'message' :'Invalid Password'});
      // User and password both match, return user from
      // done method which will be treated like success
    }
    user = {'firstName':objs[0].firstName, 'lastName':objs[0].lastName, 'username': objs[0].username, 'id':objs[0].id, 'email':objs[0].email};
    next();
    });
}

var isValidPassword = function(user, password){
    return bCrypt.compareSync(password, user.password);
}

function findOrCreateUser(req, res, next) {
  predicate = {'username': req.body.username};
  db.find(predicate, 'User', function (err, objs) {
      // In case of any error, return using the done method
    if (err){
      console.log('Error in SignUp: ' + err);
      return res.json(401, {'message' : 'error with database'});
    }
    //already exists
    if (objs.length > 0) {
      console.log('User already exists');
      return res.status(401).json({'message' : 'User Already Exists !'});
    }
    else{
      // if there is no user with that email create the user
      var user_name = req.body.username;
      var pass = createHash(req.body.password);
      var email = req.body.email;
      var firstName = req.body.firstName;
      var lastName = req.body.lastName;
      console.log("ok");

      db.save({ 'username': user_name, 'password': pass,
                'email': email, 'firstName': firstName, 'lastName': lastName},
                'User', function(err, node) {
        if (err) throw err;
        console.log("User Registration Sucessful");
        user = {'firstName':node.firstName, 'lastName':node.lastName, 'username': node.username, 'id':node.id, 'email': node.email};
        next();
      });
    }
  });
}
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

module.exports = router;
