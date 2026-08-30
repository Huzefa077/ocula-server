// This file starts the backend server, connects to the database, and wires all API routes together.
console.log("SERVER.JS LOADED - UPDATED FOR RENDER");

const { createDb } = require('./db');
const { createApp } = require('./app');

if (!process.env.JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable');
}

const db = createDb();
const app = createApp({ db });

// Render provides PORT in production. Local uses 3001.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Knex opens the database connection lazily. Warming it here moves the first
  // Neon connection cost away from the user's first sign-in/register request.
  db.raw('select 1')
    .then(() => console.log('Database connection warmed'))
    .catch((error) => console.error('Database warm-up failed:', error.message));
});
