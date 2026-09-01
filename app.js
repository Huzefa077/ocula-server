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
const scanHistory = require('./controllers/scanHistory');
const admin = require('./controllers/admin');
const authFlows = require('./controllers/authFlows');
const { createRequireAuth } = require('./middleware/requireAuth');
const { requirePermission } = require('./middleware/requirePermission');
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

function createCorsOptions(corsOrigin) {
  if (corsOrigin === true) {
    return { origin: true, credentials: true };
  }

  const allowedOrigins = String(corsOrigin || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Requests from tools like curl/Postman do not send an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const isAllowedProductionOrigin = allowedOrigins.includes(origin);
      const isAllowedLocalReactOrigin = /^http:\/\/localhost:300[0-9]$/.test(origin);

      if (isAllowedProductionOrigin || isAllowedLocalReactOrigin) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  };
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
  },
  passwordResetLimiterConfig = {
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: 'Too many password reset attempts. Please try again later.'
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
  const passwordResetLimiter = createRateLimiter(
    passwordResetLimiterConfig.windowMs,
    passwordResetLimiterConfig.max,
    passwordResetLimiterConfig.message
  );

  // CORS controls which frontend websites are allowed to call this backend in a browser.
  app.use(cors(createCorsOptions(corsOrigin)));

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
    register.handleRegister(req, res, db, bcryptLib);
  });

  app.post('/verify-email', authFlows.handleVerifyEmail(db, jwtSecret));
  app.post('/resend-verification', registerLimiter, authFlows.handleResendVerification(db));
  app.post('/forgot-password', passwordResetLimiter, authFlows.handleForgotPassword(db));
  app.post('/reset-password', passwordResetLimiter, authFlows.handleResetPassword(db, bcryptLib));
  app.post('/auth/google', signinLimiter, authFlows.handleGoogleAuth(db, jwtSecret));

  // Protected user routes: requireAuth verifies the Bearer token before controller code runs.
  app.get('/profile/:id', requireAuth, (req, res) => {
    profile.handleProfileGet(req, res, db);
  });

  app.put('/image', requireAuth, (req, res) => {
    image.handleImage(req, res, db);
  });

  app.get('/scan-history', requireAuth, scanHistory.handleListScanHistory(db));
  app.post('/scan-history', requireAuth, scanHistory.handleCreateScanHistory(db));
  app.delete('/scan-history/:id', requireAuth, scanHistory.handleDeleteScanHistoryItem(db));
  app.delete('/scan-history', requireAuth, scanHistory.handleClearScanHistory(db));

  // Admin routes use two checks: first verify the token, then verify permissions.
  app.get('/admin/users', requireAuth, requirePermission('view_users'), (req, res) => {
    admin.handleListUsers(req, res, db);
  });
  app.delete('/admin/users/:id', requireAuth, requirePermission('delete_users'), (req, res) => {
    admin.handleDeleteUser(req, res, db);
  });

  // The proxy lets the frontend load images through the backend when direct loading is blocked.
  app.get('/image-proxy', imageProxy.handleImageProxy);

  return app;
}

module.exports = {
  createApp
};
