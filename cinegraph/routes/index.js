module.exports = function(passport) {

var express = require('express');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Cinegraph', user: req.user });
});

/* GET login page. */
router.get('/signin', function(req, res) {
  // Display the Login page with any flash message, if any
  res.render('signin',{message: req.flash('message')});
});

router.get('/restricted', expressJwt({secret: 'SecretStory'}), function(req, res) {
  res.json({
      name: 'You are allowed here !!'
    });
})

router.get('/home', function(req, res) {
  // Display the Login page with any flash message, if any
  res.render('home', {user: req.user });
});

/* Handle Login POST */
router.post('/login', function(req,res, next) {
  passport.authenticate('login', function(err, user, info) {
   if (err) { console.log("err?");return next(err) }
   if (!user) {
     console.log("no user");
     return res.json(401, { error: 'message' });
   }
   //user has authenticated correctly thus we create a JWT token
   console.log("JWT done");
   var token = jwt.sign({ username: 'somedata'}, 'SecretStory');
   res.json({ token : token, user:user });
 })(req, res, next);
 });

/* GET Registration Page */
router.get('/signup', function(req, res){
  res.render('register', {message: req.flash('message')});
});

/* Handle Registration POST */
router.post('/signup', passport.authenticate('signup', {
  successRedirect: '/',
  failureRedirect: '/signup',
  failureFlash : true
}));

/* Handle Logout */
router.get('/signout', function(req, res) {
    req.logout();
    res.redirect('/');
});

/* Search Bar*/
router.get('/search', function(req, res){
  res.render('search');
});

router.post('/search', function(req, res){
  console.log('req is :');
  console.log(req.body.movieId);
  res.render('searchResult', {movieId: req.body.movieId});
});

return router;

}
