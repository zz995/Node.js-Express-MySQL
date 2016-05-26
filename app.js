'use strict';

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const MySQLStore = require('express-mysql-session');
const flash = require('connect-flash');
const passport = require('passport');

const routes = require('./routes/index');
const admin = require('./routes/admin');
const config = require('./config');
const db = require('./db');
const adminModel = require('./model/admin');

const app = express();

adminModel.check().then(
        res => {
      if (!res) {
        return adminModel.create('root', 'root');
      } else return null;
    }
).then(
    () => {
      next();
    },
    (err) => {
      console.log(err);
      next(err);
    }
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: config.get('session:secret'),
  store: new MySQLStore({}, db)
}));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser((admin, cb) => {
    console.log('serializeUser');
    cb(null, admin.name)
});
passport.deserializeUser((id, cb) => {
    console.log('deserializeUser');
    console.log(id);
    adminModel.load(id).then(
        (res) => {
            cb(null, res);
        },
        err => cb(err)
    );
    //Admin.load({ criteria: { _id: id } }, cb)
});
passport.use(require('./passport/local'));

app.use(function (req, res, next) {
   console.log(req.user);
    next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

/*app.use(function(req, res, next) {
  adminModel.check().then(
      res => {
        if (!res) {
          return adminModel.create('root', 'root');
        } else return null;
      }
  ).then(
      () => {
        next();
      },
      (err) => {
        console.log(err);
        next(err);
      }
  );
});*/

app.use('/', routes);
app.use('/admin', admin);

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
      error: err,
      isAuth: req.isAuthenticated()
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
    isAuth: req.isAuthenticated()
  });
});


module.exports = app;
