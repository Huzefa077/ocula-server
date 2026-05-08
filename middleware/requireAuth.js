const jwt = require('jsonwebtoken');

function createRequireAuth(jwtSecret = process.env.JWT_SECRET) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json('Authorization token is required');
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      // After verification, req.auth holds the identity claimed by the token.
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
