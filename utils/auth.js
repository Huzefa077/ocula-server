const jwt = require('jsonwebtoken');

const ROLE_PERMISSIONS = {
  user: [],
  admin: ['view_users', 'delete_users']
};

function getUserRole(userProfile, adminEmail = process.env.ADMIN_EMAIL) {
  if (adminEmail && userProfile?.email === adminEmail) {
    return 'admin';
  }

  if (userProfile?.role) {
    return userProfile.role;
  }

  return 'user';
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function buildAuthUser(userProfile) {
  const role = getUserRole(userProfile);

  return {
    id: userProfile.id,
    name: userProfile.name,
    email: userProfile.email,
    entries: userProfile.entries,
    joined: userProfile.joined,
    role,
    authProvider: userProfile.auth_provider || 'password',
    isEmailVerified: userProfile.is_email_verified !== false,
    permissions: getRolePermissions(role)
  };
}

function createAuthToken(userProfile, jwtSecret = process.env.JWT_SECRET) {
  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }

  const role = getUserRole(userProfile);

  return jwt.sign(
    {
      userId: userProfile.id,
      email: userProfile.email,
      role,
      permissions: getRolePermissions(role)
    },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

module.exports = {
  buildAuthUser,
  createAuthToken,
  getRolePermissions,
  getUserRole
};
