var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require("seraph")("http://localhost:7474");
var expressJwt = require('express-jwt');

var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var app = express();

// Session & init. of passport for user management
var passport = require('passport');
var expressSession = require('express-session');
app.use(expressSession({secret: 'secretsecret', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// We use flash
var flash = require('connect-flash');
app.use(flash());

var passportConfig = require('./passport/init')
passportConfig(passport);


var routes = require('./routes/index')(passport);
var users = require('./routes/users');
var persons = require('./routes/persons');
var movies = require('./routes/movies');
var searchRoutes = require('./routes/search');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));



app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/restricted', expressJwt({secret: 'SecretStory'}));

app.use('/', routes);
app.use('/users', users);
app.use('/api/persons', persons);
app.use('/api/movies', movies);
app.use('/api/search', searchRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
