// This file creates a new user account and saves it in both the auth and profile tables.
// Creates a new user in both auth and profile tables.
const handleRegister = (req, res, db, bcrypt) => {
  console.log('REGISTER ENDPOINT CALLED');
  console.log('Received body:', req.body);

  const { email, name, password } = req.body;

  // Basic validation
  if (!email || !name || !password) {
    console.log('Missing fields');
    return res.status(400).json('incorrect form submission');
  }

  // Store the password as a hash, not plain text.
  const passwordHash = bcrypt.hashSync(password, 10);
  console.log('Hash created successfully');

  // Use one transaction so both inserts succeed or fail together.
  db.transaction(trx => {
    trx
      .insert({
        hash: passwordHash,
        email: email
      })
      .into('user_auth')
      .returning('email')
      .then(authRows => {
        console.log('Login entry inserted:', authRows);

        return trx('user_profiles')
          .returning('*')
          .insert({
            email: authRows[0].email,
            name: name,
            joined: new Date()
          })
          .then(userRows => {
            console.log('User registered:', userRows[0]);
            res.json(userRows[0]);
          });
      })
      .then(trx.commit)
      .catch(err => {
        console.error('Transaction error:', err);
        trx.rollback();
        res.status(400).json('unable to register');
      });
  })
  .catch(err => {
    console.error('Outer transaction error:', err);
    res.status(400).json('unable to register');
  });
};

module.exports = {
  handleRegister
};
