// This file updates how many images a signed-in user has submitted for detection.
// Increases the user's image entry count after a successful detect.
const handleImage = (req, res, db) => {
  const { id } = req.body;
  const signedInUserId = String(req.auth.userId);
  const requestedUserId = String(id);

  // Regular users can only update their own entry count.
  if (req.auth.role !== 'admin' && signedInUserId !== requestedUserId) {
    return res.status(403).json('You can only update your own entry count');
  }

  db('user_profiles')
    .where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
      res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json('unable to get entries'));
};

module.exports = {
  handleImage
};
