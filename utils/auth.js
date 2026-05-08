const jwt = require('jsonwebtoken');

function getUserRole(userProfile, adminEmail = process.env.ADMIN_EMAIL) {
  if (userProfile?.role) {
    return userProfile.role;
  }

  if (adminEmail && userProfile?.email === adminEmail) {
    return 'admin';
  }

  return 'user';
}

function createAuthToken(userProfile, jwtSecret = process.env.JWT_SECRET) {
  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }

  return jwt.sign(
    {
      userId: userProfile.id,
      email: userProfile.email,
      role: getUserRole(userProfile)
    },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

module.exports = {
  createAuthToken,
  getUserRole
};
