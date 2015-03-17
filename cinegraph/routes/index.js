module.exports = function(passport) {

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Cinegraph' });
});

/* GET login page. */
router.get('/test', function(req, res) {
  // Display the Login page with any flash message, if any
  res.render('test',{message: req.flash('message')});
});

router.get('/home', function(req, res) {
  // Display the Login page with any flash message, if any
  res.render('home', {user: req.user });
});

/* Handle Login POST */
router.post('/login', passport.authenticate('login', {
  successRedirect: '/home',
  failureRedirect: '/test',
  failureFlash : true
}));

/* GET Registration Page */
router.get('/signup', function(req, res){
  res.render('register',{message: req.flash('message')});
});

/* Handle Registration POST */
router.post('/signup', passport.authenticate('signup', {
  successRedirect: '/home',
  failureRedirect: '/signup',
  failureFlash : true
}));

/* Handle Logout */
router.get('/signout', function(req, res) {
    req.logout();
      res.redirect('/test');
});

return router;
}
