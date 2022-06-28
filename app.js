require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const { Schema, model, connect } = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');

const app = express();
const { PORT, MONGO_URL, SECRET, SALT_ROUNDS } = process.env;

connect(MONGO_URL, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('Database started');
  }
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const userSchema = new Schema({
  email: String,
  password: String,
});

// userSchema.plugin(encrypt, { secret: SECRET, encryptedFields: ['password'] });

const User = model('User', userSchema);

app.get('/', (req, res) => {
  res.render('home');
});

app
  .route('/register')
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, +SALT_ROUNDS, function (err, hash) {
      if (err) {
        console.log(err);
      } else {
        const newUser = new User({
          email: username,
          password: hash,
        });
        newUser.save((err, savedUser) => {
          if (err) {
            console.log(err);
          } else {
            res.render('secrets');
          }
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

    User.findOne({ email: username }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (!foundUser) {
          return res.redirect('login');
        } else {
          bcrypt.compare(password, foundUser.password, function (err, result) {
            // result == true
            if (result) {
              return res.render('secrets');
            } else {
              return res.json({ message: 'Password do not match.' });
            }
          });
        }
      }
    });
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
