console.log("SERVER.JS LOADED - UPDATED FOR RENDER");

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');

const register = require('./controllers/register');
const signin = require('./controllers/signin');
const profile = require('./controllers/profile');
const image = require('./controllers/image');
const imageProxy = require('./controllers/imageProxy');

// Stop early if the database connection string is missing.
if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Knex is the DB layer used by all route handlers.
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();

app.use(cors());
app.use(express.json());

// Simple health route to confirm the backend is up.
app.get('/', (req, res) => {
  res.send('Backend is working!');
});

app.post('/signin', signin.handleSignin(db, bcrypt));

app.post('/register', (req, res) => {
  register.handleRegister(req, res, db, bcrypt);
});
app.get('/profile/:id', (req, res) => {
  profile.handleProfileGet(req, res, db);
});
app.put('/image', (req, res) => {
  image.handleImage(req, res, db);
});

app.get('/image-proxy', imageProxy.handleImageProxy);

// Render provides PORT in production. Local uses 3001.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
