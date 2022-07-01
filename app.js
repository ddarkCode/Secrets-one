require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const { Schema, model, connect } = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const {
  PORT,
  MONGO_URL,
  SECRET,
  SALT_ROUNDS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

connect(MONGO_URL, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Database started');
  }
});

const userSchema = new Schema({
  email: String,
  password: String,
  googleId: {
    type: String,
    default: '',
  },
  secrets: [String],
});

// userSchema.plugin(encrypt, { secret: SECRET, encryptedFields: ['password'] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = model('User', userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log('Google Profile: ', profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  }
);

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/secrets', (req, res) => {
  if (req.isAuthenticated()) {
    User.find({}, (err, foundUsers) => {
      if (err) {
        console.log(err);
      } else {
        let allSecrets = [];
        foundUsers.forEach((secret) => {
          allSecrets = allSecrets.concat(secret.secrets);
        });
        res.render('secrets', { secrets: allSecrets });
      }
    });
  } else {
    res.redirect('/login');
  }
});

app
  .route('/submit')
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('submit');
    } else {
      res.redirect('/login');
    }
  })
  .post((req, res) => {
    const { secret } = req.body;
    User.findById(req.user.id, (err, foundUser) => {
      if (err) {
        console.log(err);
        res.redirect('/login');
      } else if (!foundUser) {
        res.redirect('/login');
      } else {
        foundUser.secrets.push(secret);
        foundUser.save((err) => {
          if (err) {
            console.log(err);
          } else {
            res.redirect('/secrets');
          }
        });
      }
    });
  });

app
  .route('/register')
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    const { username, password } = req.body;

    User.register({ username }, password, (err, user) => {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    });
  });

app
  .route('/login')
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const { username, password } = req.body;
    const user = new User({
      username,
      password,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    });
  });
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
      res.redirect('/');
    } else {
      res.redirect('/');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
