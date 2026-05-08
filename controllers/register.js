// This file creates a new user account and saves it in both the auth and profile tables.
// Creates a new user in both auth and profile tables.
const { createAuthToken, getUserRole } = require('../utils/auth');

const handleRegister = async (req, res, db, bcrypt, jwtSecret) => {
  const { email, name, password } = req.body;

  // Basic validation
  if (!email || !name || !password) {
    return res.status(400).json('incorrect form submission');
  }

  // Store the password as a hash, not plain text.
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    // One transaction wraps both inserts so we do not create a half-finished user.
    const newUser = await db.transaction(async (trx) => {
      const authRows = await trx
        .insert({
          hash: passwordHash,
          email: email
        })
        .into('user_auth')
        .returning('email');

      const userRows = await trx('user_profiles')
        .returning('*')
        .insert({
          email: authRows[0].email,
          name: name,
          joined: new Date()
        });

      return userRows[0];
    });

    const token = createAuthToken(newUser, jwtSecret);

    return res.json({
      token,
      user: {
        ...newUser,
        role: getUserRole(newUser)
      }
    });
  } catch (err) {
    console.error('Register transaction error:', err);
    return res.status(400).json('unable to register');
  }
};

module.exports = {
  handleRegister
};
