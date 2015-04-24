var LocalStrategy = require('passport-local').Strategy;
var bCrypt = require('bcrypt-nodejs');

module.exports = function(db, passport){
passport.use('login', new LocalStrategy({
    passReqToCallback : true
  },
  function(req, username, password, done) {
    // check in neo4j if a user with username exists or not

    predicate = {'username': username};
    db.find(predicate, 'User', function (err, objs) {
        // In case of any error, return using the done method
      if (err) {
        return done(err);
      }
        // Username does not exist, log error & redirect back
      if (objs.length == 0) {
        return done(null, false,
              req.flash('message', 'User Not found.'));
      }
        // User exists but wrong password, log the error
      if (!isValidPassword(objs[0], password)) {
        return done(null, false,
            req.flash('message', 'Invalid Password'));
        // User and password both match, return user from
        // done method which will be treated like success
      }
      user = {'firstName':objs[0].firstName, 'lastName':objs[0].lastName, 'username': objs[0].username, 'id':objs[0].id}
      return done(null, user);
      });
}));
    var isValidPassword = function(user, password){
        return bCrypt.compareSync(password, user.password);
    }
}
