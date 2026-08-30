// Permission middleware runs after requireAuth, because it needs req.auth.permissions.
function requirePermission(...allowedPermissions) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json('Authentication is required');
    }

    const userPermissions = req.auth.permissions || [];
    const hasPermission = allowedPermissions.some((permission) => userPermissions.includes(permission));

    // Example: requirePermission('delete_users') allows any role that owns that permission.
    if (!hasPermission) {
      return res.status(403).json('You do not have permission to access this route');
    }

    return next();
  };
}

module.exports = {
  requirePermission
};
