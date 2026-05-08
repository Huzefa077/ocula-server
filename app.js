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

function createRateLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message
  });
}

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
  const requireAuth = createRequireAuth(jwtSecret);
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

  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('Backend is working!');
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/docs.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.post('/signin', signinLimiter, signin.handleSignin(db, bcryptLib, jwtSecret));
  
  app.post('/register', registerLimiter, (req, res) => {
    register.handleRegister(req, res, db, bcryptLib, jwtSecret);
  });

  app.get('/profile/:id', requireAuth, (req, res) => {
    profile.handleProfileGet(req, res, db);
  });

  app.put('/image', requireAuth, (req, res) => {
    image.handleImage(req, res, db);
  });

  // This route is intentionally small so RBAC stays easy to understand.
  app.get('/admin/users', requireAuth, requireRole('admin'), (req, res) => {
    admin.handleListUsers(req, res, db);
  });
  app.delete('/admin/users/:id', requireAuth, requireRole('admin'), (req, res) => {
    admin.handleDeleteUser(req, res, db);
  });

  app.get('/image-proxy', imageProxy.handleImageProxy);

  return app;
}

module.exports = {
  createApp
};
