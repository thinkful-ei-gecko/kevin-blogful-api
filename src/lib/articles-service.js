const ArticlesService = {
  getAllArticles(knex) {
    return knex.select('*').from('blogful_articles');
  },

  getArticleById(knex, id) {
    return knex
      .select('*')
      .from('blogful_articles')
      .where('id', id)
      .first();
  },

  insertArticle(knex, newArticle) {
    return knex
      .insert(newArticle)
      .into('blogful_articles')
      .returning('*')
      .then((rows) => {
        return rows[0];
      });
  },

  updateArticleById(knex, id, newArticleFields) {
    return knex('blogful_articles')
      .where({ id })
      .update(newArticleFields);
  },

  deleteArticleById(knex, id) {
    return knex('blogful_articles')
      .where({ id })
      .delete();
  },
};

module.exports = ArticlesService;
