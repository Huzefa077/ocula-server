// This file checks a user's login details and returns the matching profile when the credentials are correct.
// Checks login details and returns the matching user profile.
const { createAuthToken, getUserRole } = require('../utils/auth');

const handleSignin = (db, bcrypt, jwtSecret) => async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json('incorrect form submission');
    }

    // Auth data is kept separate from the public profile data.
    const authRows = await db.select('email', 'hash')
      .from('user_auth')
      .where('email', '=', email);

    // 3. Check if user exists
    if (authRows.length === 0) {
      return res.status(400).json('wrong credentials');
    }

    // 4. Compare password
    const isPasswordValid = bcrypt.compareSync(password, authRows[0].hash);

    if (!isPasswordValid) {
      return res.status(400).json('wrong credentials');
    }

    // After password check, return the user profile used by the UI.
    const userRows = await db.select('*')
      .from('user_profiles') 
      .where('email', '=', email);

    if (userRows.length === 0) {
      return res.status(400).json('wrong credentials');
    }

    const userProfile = userRows[0];
    const token = createAuthToken(userProfile, jwtSecret);

    // Return both the user profile and the token so the frontend can call protected routes.
    return res.json({
      token,
      user: {
        ...userProfile,
        role: getUserRole(userProfile)
      }
    });

  } catch (err) {
    console.error('Signin error:', err);
    return res.status(400).json('unable to signin');
  }
};

module.exports = {
  handleSignin: handleSignin
};
