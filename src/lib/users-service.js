const UsersService = {
  getAllUsers(knex) {
    return knex.select('*').from('blogful_users');
  },

  getUserById(knex, id) {
    return knex
      .select('*')
      .from('blogful_users')
      .where('id', id)
      .first();
  },

  insertUser(knex, newUser) {
    return knex
      .insert(newUser)
      .into('blogful_users')
      .returning('*')
      .then((rows) => {
        return rows[0];
      });
  },

  updateUserById(knex, id, newUserFields) {
    return knex('blogful_users')
      .where({ id })
      .update(newUserFields);
  },

  deleteUserById(knex, id) {
    return knex('blogful_users')
      .where({ id })
      .delete();
  },
};

module.exports = UsersService;
