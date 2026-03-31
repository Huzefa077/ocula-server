// Checks login details and returns the matching user profile.
const handleSignin = (db, bcrypt) => async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json('incorrect form submission');
    }

    // Auth data is kept separate from the public profile data.
    const data = await db.select('email', 'hash')
      .from('user_auth')
      .where('email', '=', email);

    // 3. Check if user exists
    if (data.length === 0) {
      return res.status(400).json('wrong credentials');
    }

    // 4. Compare password
    const isValid = bcrypt.compareSync(password, data[0].hash);

    if (!isValid) {
      return res.status(400).json('wrong credentials');
    }

    // After password check, return the user profile used by the UI.
    const user = await db.select('*')
      .from('user_profiles') 
      .where('email', '=', email);

    // 6. Return user
    return res.json(user[0]);

  } catch (err) {
    console.error('Signin error:', err);
    return res.status(400).json('unable to signin');
  }
};

module.exports = {
  handleSignin: handleSignin
};
