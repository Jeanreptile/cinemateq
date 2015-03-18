var login = require('./login');
var signup = require('./signup');
var db = require("seraph")("http://localhost:7474");

module.exports = function(passport){

  // Passport needs to be able to serialize and deserialize users to support persistent login sessions
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      var cypher = "MATCH (n) WHERE id(n) = {id}"
                   + "RETURN n;"
      db.query(cypher, {'id': id}, function(err, result) {
        if (err) throw err;
        if (result.length > 0) {
            done(err, result[0]);
        }
        else{
          console.log("User not found");
          done(err, null);
        }
      });
    });

    // Setting up Passport Strategies for Login and SignUp/Registration
    login(db, passport);
    signup(db, passport);

}
