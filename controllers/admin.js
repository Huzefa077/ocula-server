const handleListUsers = (req, res, db) => {
  db('user_profiles')
    .select('id', 'name', 'email', 'entries', 'joined')
    .orderBy('id', 'asc')
    .then((users) => res.json(users))
    .catch((error) => {
      console.error('Admin list users error:', error);
      res.status(500).json('unable to fetch users');
    });
};

const handleDeleteUser = async (req, res, db) => {
  const { id } = req.params;

  // Prevent the current admin from deleting the account tied to the active token.
  if (String(req.auth.userId) === String(id)) {
    return res.status(400).json('Admin cannot delete the currently signed-in account');
  }

  try {
    const deletedUser = await db.transaction(async (trx) => {
      const userRows = await trx('user_profiles')
        .select('id', 'email', 'name')
        .where({ id });

      if (!userRows.length) {
        return null;
      }

      const userToDelete = userRows[0];

      // Delete auth first, then profile, so the user cannot sign in again.
      await trx('user_auth')
        .where({ email: userToDelete.email })
        .del();

      await trx('user_profiles')
        .where({ id })
        .del();

      return userToDelete;
    });

    if (!deletedUser) {
      return res.status(404).json('User not found');
    }

    return res.json({
      message: 'User deleted successfully',
      deletedUser
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json('unable to delete user');
  }
};

module.exports = {
  handleListUsers,
  handleDeleteUser
};
