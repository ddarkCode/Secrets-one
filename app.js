require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');

const app = express();

const { PORT } = process.env;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
