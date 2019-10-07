const CommentsService = {
  getAllComments(knex) {
    return knex.select('*').from('blogful_comments');
  },

  getCommentById(knex, id) {
    return knex
      .select('*')
      .from('blogful_comments')
      .where('id', id)
      .first();
  },

  insertComment(knex, newComment) {
    return knex
      .insert(newComment)
      .into('blogful_comments')
      .returning('*')
      .then((rows) => {
        return rows[0];
      });
  },

  updateCommentById(knex, id, newCommentFields) {
    return knex('blogful_comments')
      .where({ id })
      .update(newCommentFields);
  },

  deleteCommentById(knex, id) {
    return knex('blogful_comments')
      .where({ id })
      .delete();
  },
};

module.exports = CommentsService;
