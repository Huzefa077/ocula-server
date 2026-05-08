// This file returns one user's profile data when the frontend asks for it by id.
// Returns one user profile by id.
const handleProfileGet = (req, res, db) => {
  const { id } = req.params; 
  const signedInUserId = String(req.auth.userId);
  const requestedUserId = String(id);

  // Non-admin users should only read their own profile.
  if (req.auth.role !== 'admin' && signedInUserId !== requestedUserId) {
    return res.status(403).json('You can only access your own profile');
  }

  db.select('*').from('user_profiles').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
}

module.exports = {
  handleProfileGet
}
