const { OAuth2Client } = require('google-auth-library');
const { buildAuthUser, createAuthToken } = require('../utils/auth');
const {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashToken,
  isTokenExpired
} = require('../services/tokenService');
const {
  sendPasswordResetEmail,
  sendVerificationEmail
} = require('../services/emailService');

const googleClient = new OAuth2Client();

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

async function findProfileByEmail(db, email) {
  const rows = await db.select('*').from('user_profiles').where('email', '=', email);
  return rows[0];
}

async function findAuthByEmail(db, email) {
  const rows = await db.select('*').from('user_auth').where('email', '=', email);
  return rows[0];
}

function safeAuthResponse(userProfile, jwtSecret) {
  return {
    token: createAuthToken(userProfile, jwtSecret),
    user: buildAuthUser(userProfile)
  };
}

const handleVerifyEmail = (db, jwtSecret) => async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { token } = req.body;

  if (!email || !token) {
    return res.status(400).json('Verification link is missing required data');
  }

  try {
    const authRow = await findAuthByEmail(db, email);

    if (!authRow || authRow.email_verification_token_hash !== hashToken(token)) {
      return res.status(400).json('Verification link is invalid');
    }

    if (isTokenExpired(authRow.email_verification_expires_at)) {
      return res.status(400).json('Verification link has expired');
    }

    const verifiedUser = await db.transaction(async (trx) => {
      await trx('user_auth')
        .where({ email })
        .update({
          email_verification_token_hash: null,
          email_verification_expires_at: null
        });

      const updatedRows = await trx('user_profiles')
        .where({ email })
        .update({
          is_email_verified: true,
          email_verified_at: new Date()
        })
        .returning('*');

      return updatedRows[0];
    });

    return res.json(safeAuthResponse(verifiedUser, jwtSecret));
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(400).json('Unable to verify email');
  }
};

const handleResendVerification = (db) => async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json('Email is required');
  }

  try {
    const profile = await findProfileByEmail(db, email);

    if (!profile) {
      return res.status(200).json({ message: 'If that account needs verification, we sent a new link.' });
    }

    if (profile.is_email_verified) {
      return res.status(200).json({ message: 'This account is already verified. You can sign in now.' });
    }

    const verificationToken = createEmailVerificationToken();

    await db('user_auth')
      .where({ email })
      .update({
        email_verification_token_hash: verificationToken.tokenHash,
        email_verification_expires_at: verificationToken.expiresAt
      });

    await sendVerificationEmail({ email, token: verificationToken.token });

    return res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(400).json('Unable to resend verification email');
  }
};

const handleForgotPassword = (db) => async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const genericMessage = 'If that email exists, a reset link has been sent.';

  if (!email) {
    return res.status(400).json('Email is required');
  }

  try {
    const authRow = await findAuthByEmail(db, email);

    if (authRow && authRow.password_auth_enabled !== false) {
      const resetToken = createPasswordResetToken();

      await db('user_auth')
        .where({ email })
        .update({
          password_reset_token_hash: resetToken.tokenHash,
          password_reset_expires_at: resetToken.expiresAt
        });

      await sendPasswordResetEmail({ email, token: resetToken.token });
    }

    // Always return the same response so attackers cannot check which emails exist.
    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(400).json('Unable to start password reset');
  }
};

const handleResetPassword = (db, bcrypt) => async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { token, password } = req.body;

  if (!email || !token || !password || password.length < 6) {
    return res.status(400).json('Valid email, token, and password are required');
  }

  try {
    const authRow = await findAuthByEmail(db, email);

    if (!authRow || authRow.password_reset_token_hash !== hashToken(token)) {
      return res.status(400).json('Password reset link is invalid');
    }

    if (isTokenExpired(authRow.password_reset_expires_at)) {
      return res.status(400).json('Password reset link has expired');
    }

    await db('user_auth')
      .where({ email })
      .update({
        hash: bcrypt.hashSync(password, 10),
        password_auth_enabled: true,
        password_reset_token_hash: null,
        password_reset_expires_at: null
      });

    return res.json({ message: 'Password reset successful. You can sign in now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(400).json('Unable to reset password');
  }
};

const handleGoogleAuth = (db, jwtSecret) => async (req, res) => {
  const { credential } = req.body;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return res.status(500).json('Google sign-in is not configured on the server');
  }

  if (!credential) {
    return res.status(400).json('Google credential is required');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });

    const payload = ticket.getPayload();
    const email = normalizeEmail(payload.email);
    const googleSub = payload.sub;
    const name = payload.name || email.split('@')[0];

    if (!payload.email_verified) {
      return res.status(400).json('Google account email is not verified');
    }

    const userProfile = await db.transaction(async (trx) => {
      const existingByGoogle = await trx('user_profiles')
        .select('*')
        .where({ google_sub: googleSub })
        .first();

      if (existingByGoogle) {
        return existingByGoogle;
      }

      const existingByEmail = await trx('user_profiles')
        .select('*')
        .where({ email })
        .first();

      if (existingByEmail) {
        await trx('user_profiles')
          .where({ email })
          .update({
            google_sub: googleSub,
            auth_provider: existingByEmail.auth_provider === 'password' ? 'password_google' : 'google',
            is_email_verified: true,
            email_verified_at: existingByEmail.email_verified_at || new Date()
          });

        await trx('user_auth')
          .where({ email })
          .update({
            password_auth_enabled: true
          });

        return {
          ...existingByEmail,
          google_sub: googleSub,
          auth_provider: existingByEmail.auth_provider === 'password' ? 'password_google' : 'google',
          is_email_verified: true
        };
      }

      await trx('user_auth')
        .insert({
          email,
          hash: null,
          password_auth_enabled: false
        });

      const createdRows = await trx('user_profiles')
        .insert({
          email,
          name,
          joined: new Date(),
          google_sub: googleSub,
          auth_provider: 'google',
          is_email_verified: true,
          email_verified_at: new Date()
        })
        .returning('*');

      return createdRows[0];
    });

    return res.json(safeAuthResponse(userProfile, jwtSecret));
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(400).json('Unable to sign in with Google');
  }
};

module.exports = {
  handleForgotPassword,
  handleGoogleAuth,
  handleResendVerification,
  handleResetPassword,
  handleVerifyEmail
};
