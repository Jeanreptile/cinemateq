var LocalStrategy   = require('passport-local').Strategy;
var bCrypt = require('bcrypt-nodejs');

module.exports = function(db, passport){
passport.use('signup', new LocalStrategy({
    passReqToCallback : true
  },
  function(req, username, password, done) {
    findOrCreateUser = function(){
    console.log("ok 0");
    predicate = {'username': username};
    db.find(predicate, 'User', function (err, objs) {
        // In case of any error, return using the done method
      if (err){
        console.log('Error in SignUp: ' + err);
        return done(err);
      }
      //already exists
      if (objs.length > 0) {
        console.log('User already exists');
        return done(null, false,
            req.flash('message', 'User Already Exists !'));
      }
      else{
        // if there is no user with that email
        // create the user
        var user_name = username;
        var pass = createHash(password);
        var email = req.param('email');
        var firstName = req.param('firstName');
        var lastName = req.param('lastName');
        console.log("ok");

        db.save({ 'username': user_name, 'password': pass,
                  'email': email, 'firstName': firstName, 'lastName': lastName},
                  'User', function(err, node) {
          if (err) throw err;
          console.log("User Registration Sucessful");
          return done(null, node);
        });
      }
    });
    };

    // Delay the execution of findOrCreateUser and execute 
    // the method in the next tick of the event loop
    process.nextTick(findOrCreateUser);
  }));
    var createHash = function(password){
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }
}
