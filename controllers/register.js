// This file creates a new user account and saves it in both the auth and profile tables.
// Creates a new user in both auth and profile tables.
const { createEmailVerificationToken } = require('../services/tokenService');
const { sendVerificationEmail } = require('../services/emailService');

const handleRegister = async (req, res, db, bcrypt) => {
  const { name, password } = req.body;
  const email = (req.body.email || '').trim().toLowerCase();

  // Basic validation
  if (!email || !name || !password) {
    return res.status(400).json('incorrect form submission');
  }

  // Store the password as a hash, not plain text.
  const passwordHash = bcrypt.hashSync(password, 10);
  const verificationToken = createEmailVerificationToken();

  try {
    // One transaction wraps both inserts so we do not create a half-finished user.
    await db.transaction(async (trx) => {
      const authRows = await trx
        .insert({
          hash: passwordHash,
          email,
          password_auth_enabled: true,
          email_verification_token_hash: verificationToken.tokenHash,
          email_verification_expires_at: verificationToken.expiresAt
        })
        .into('user_auth')
        .returning('email');

      await trx('user_profiles')
        .returning('*')
        .insert({
          email: authRows[0].email,
          name: name,
          joined: new Date(),
          auth_provider: 'password',
          is_email_verified: false
        });
    });

    await sendVerificationEmail({ email, token: verificationToken.token });

    return res.json({
      message: 'Account created. Please verify your email before signing in.'
    });
  } catch (err) {
    console.error('Register transaction error:', err);
    return res.status(400).json('unable to register');
  }
};

module.exports = {
  handleRegister
};
