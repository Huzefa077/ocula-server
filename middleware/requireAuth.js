const jwt = require('jsonwebtoken');

// Middleware factory: pass in the secret once, receive middleware Express can run.
function createRequireAuth(jwtSecret = process.env.JWT_SECRET) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Frontend requests should send: Authorization: Bearer <token>
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json('Authorization token is required');
    }

    // Remove the "Bearer " prefix so jsonwebtoken receives only the token text.
    const token = authHeader.slice('Bearer '.length);

    try {
      // jwt.verify checks the signature and expiry. If valid, the payload is trusted.
      req.auth = jwt.verify(token, jwtSecret);
      return next();
    } catch (error) {
      return res.status(401).json('Invalid or expired token');
    }
  };
}

module.exports = {
  createRequireAuth
};
