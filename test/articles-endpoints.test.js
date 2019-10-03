const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray } = require('./articles.fixtures');

describe.only(`Articles Endpoints`, () => {
  let db;
  const tableName = 'blogful_articles';

  /*****************************************************************
    SETUP
  ******************************************************************/
  before(`make knex instance`, () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  before(`clean ${tableName}`, () => {
    return db(`${tableName}`).truncate();
  });

  afterEach(() => {
    return db(`${tableName}`).truncate();
  });

  after(`disconnect from db`, () => {
    return db.destroy();
  });

  /*****************************************************************
    GET /articles
  ******************************************************************/
  describe(`GET /articles`, () => {
    context(`Given no articles`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/articles')
          .expect(200, []);
      });
    });

    context(`given there are articles in ${tableName}`, () => {
      const testArticles = makeArticlesArray();

      beforeEach(`insert articles into ${tableName}`, () => {
        return db.insert(testArticles).into(`${tableName}`);
      });

      it(`responds with 200 and all articles of ${tableName}`, () => {
        return supertest(app)
          .get('/articles')
          .expect(200)
          .expect((res) => {
            expect(
              res.body.map((article) => ({
                ...article,
                date_published: new Date(article.date_published),
              }))
            ).to.eql(testArticles);
          });
      });
    });
  });

  /*****************************************************************
    GET /articles/:article_id
  ******************************************************************/
  describe(`GET /articles/:article_id`, () => {
    context(`Given no articles`, () => {
      it(`responds with 404`, () => {
        const articleId = 123456;
        return supertest(app)
          .get(`/articles/${articleId}`)
          .expect(404, { error: { message: `Article doesn't exist` } });
      });
    });

    context(`given there are articles in ${tableName}`, () => {
      const testArticles = makeArticlesArray();

      beforeEach(`insert articles into ${tableName}`, () => {
        return db.insert(testArticles).into(`${tableName}`);
      });

      it(`responds with 200 and the specified article`, () => {
        const articleId = 2;
        const expectedArticle = testArticles[articleId - 1];
        return supertest(app)
          .get(`/articles/${articleId}`)
          .expect(200)
          .expect((res) => {
            expect({
              ...res.body,
              date_published: new Date(res.body.date_published),
            }).to.eql(expectedArticle);
          });
      });
    });
  });
});
