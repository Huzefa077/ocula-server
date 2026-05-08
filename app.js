const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const register = require('./controllers/register');
const signin = require('./controllers/signin');
const profile = require('./controllers/profile');
const image = require('./controllers/image');
const imageProxy = require('./controllers/imageProxy');
const admin = require('./controllers/admin');
const { createRequireAuth } = require('./middleware/requireAuth');
const { requireRole } = require('./middleware/requireRole');
const { openApiDocument } = require('./docs/openapi');

// Small helper around express-rate-limit so each route can choose its own limits.
function createRateLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message
  });
}

// createApp builds the Express application without starting the network server.
// This keeps server startup separate from route setup, which makes testing easier.
function createApp({
  db,
  bcryptLib = bcrypt,
  jwtSecret = process.env.JWT_SECRET,
  corsOrigin = process.env.FRONTEND_URL || true,
  signinLimiterConfig = {
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many sign-in attempts. Please try again later.'
  },
  registerLimiterConfig = {
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many registration attempts. Please try again later.'
  }
}) {
  const app = express();

  // JWT auth is created once here, then reused on every protected route.
  const requireAuth = createRequireAuth(jwtSecret);

  // Signin/register are rate-limited because attackers commonly target these routes.
  const signinLimiter = createRateLimiter(
    signinLimiterConfig.windowMs,
    signinLimiterConfig.max,
    signinLimiterConfig.message
  );
  const registerLimiter = createRateLimiter(
    registerLimiterConfig.windowMs,
    registerLimiterConfig.max,
    registerLimiterConfig.message
  );

  // CORS controls which frontend website is allowed to call this backend in a browser.
  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));

  // express.json() lets Express read JSON request bodies as req.body.
  app.use(express.json());

  // Render/Vercel can call this route to check if the backend is awake.
  app.get('/', (req, res) => {
    res.send('Backend is working!');
  });

  // Swagger UI gives a browser-readable API reference at /docs.
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/docs.json', (req, res) => {
    res.json(openApiDocument);
  });

  // Public auth routes: users do not have a token yet, so these only use rate limits.
  app.post('/signin', signinLimiter, signin.handleSignin(db, bcryptLib, jwtSecret));
  
  app.post('/register', registerLimiter, (req, res) => {
    register.handleRegister(req, res, db, bcryptLib, jwtSecret);
  });

  // Protected user routes: requireAuth verifies the Bearer token before controller code runs.
  app.get('/profile/:id', requireAuth, (req, res) => {
    profile.handleProfileGet(req, res, db);
  });

  app.put('/image', requireAuth, (req, res) => {
    image.handleImage(req, res, db);
  });

  // Admin routes use two checks: first verify the token, then verify the user's role.
  app.get('/admin/users', requireAuth, requireRole('admin'), (req, res) => {
    admin.handleListUsers(req, res, db);
  });
  app.delete('/admin/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    admin.handleDeleteUser(req, res, db);
  });

  // The proxy lets the frontend load images through the backend when direct loading is blocked.
  app.get('/image-proxy', imageProxy.handleImageProxy);

  return app;
}

module.exports = {
  createApp
};
