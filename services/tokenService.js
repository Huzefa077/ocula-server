const crypto = require('crypto');

const EMAIL_VERIFICATION_TOKEN_HOURS = 24;
const PASSWORD_RESET_TOKEN_MINUTES = 30;

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function createEmailVerificationToken(now = new Date()) {
  const token = createRawToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: addHours(now, EMAIL_VERIFICATION_TOKEN_HOURS)
  };
}

function createPasswordResetToken(now = new Date()) {
  const token = createRawToken();

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: addMinutes(now, PASSWORD_RESET_TOKEN_MINUTES)
  };
}

function isTokenExpired(expiresAt, now = new Date()) {
  return !expiresAt || new Date(expiresAt).getTime() < now.getTime();
}

module.exports = {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashToken,
  isTokenExpired
};
