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
});
