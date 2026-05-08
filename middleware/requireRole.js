// Role middleware runs after requireAuth, because it needs req.auth.role.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json('Authentication is required');
    }

    // Example: requireRole('admin') allows only tokens whose payload has role: 'admin'.
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json('You do not have permission to access this route');
    }

    return next();
  };
}

module.exports = {
  requireRole
};
