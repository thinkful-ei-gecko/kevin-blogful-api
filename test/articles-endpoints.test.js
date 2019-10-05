const knex = require('knex');
const app = require('../src/lib/app');
const { makeArticlesArray, makeMaliciousArticle } = require('./articles.fixtures');

describe('Articles Endpoints', () => {
  let db;
  const tableName = 'blogful_articles';

  /*****************************************************************
    SETUP
  ******************************************************************/
  before('make knex instance', () => {
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

  after('disconnect from db', () => {
    return db.destroy();
  });

  /*****************************************************************
    GET /api/articles
  ******************************************************************/
  describe('GET /api/articles', () => {
    context('Given no articles', () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/articles')
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
          .get('/api/articles')
          .expect(200)
          .expect((res) => {
            chai
              .expect(
                res.body.map((article) => ({
                  ...article,
                  date_published: new Date(article.date_published),
                }))
              )
              .to.eql(testArticles);
          });
      });
    });

    context('Given an XSS attack article', () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle();

      beforeEach('insert malicious article', () => {
        return db.insert([maliciousArticle]).into(`${tableName}`);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/articles')
          .expect(200)
          .expect((res) => {
            chai.expect(res.body[0].title).to.eql(expectedArticle.title);
            chai.expect(res.body[0].content).to.eql(expectedArticle.content);
          });
      });
    });
  });

  /*****************************************************************
    GET /api/articles/:article_id
  ******************************************************************/
  describe('GET /api/articles/:article_id', () => {
    context('Given no articles', () => {
      it('responds with 404', () => {
        const articleId = 123456;
        return supertest(app)
          .get(`/api/articles/${articleId}`)
          .expect(404, { error: { message: 'Article does not exist' } });
      });
    });

    context(`given there are articles in ${tableName}`, () => {
      const testArticles = makeArticlesArray();

      beforeEach(`insert articles into ${tableName}`, () => {
        return db.insert(testArticles).into(`${tableName}`);
      });

      it('responds with 200 and the specified article', () => {
        const articleId = 2;
        const expectedArticle = testArticles[articleId - 1];
        return supertest(app)
          .get(`/api/articles/${articleId}`)
          .expect(200)
          .expect((res) => {
            chai
              .expect({
                ...res.body,
                date_published: new Date(res.body.date_published),
              })
              .to.eql(expectedArticle);
          });
      });
    });

    context('Given an XSS attack article', () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle();

      beforeEach('insert malicious article', () => {
        return db.insert([maliciousArticle]).into(`${tableName}`);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/articles/${maliciousArticle.id}`)
          .expect(200)
          .expect((res) => {
            chai.expect(res.body.title).to.eql(expectedArticle.title);
            chai.expect(res.body.content).to.eql(expectedArticle.content);
          });
      });
    });
  });

  /*****************************************************************
    POST /api/articles
  ******************************************************************/
  describe('POST /api/articles', () => {
    it('creates an article, responding with 201 and the new article', function() {
      this.retries(3); // this references the it-block
      const newArticle = {
        title: 'Test new article',
        style: 'Listicle',
        content: 'Test new article content...',
      };

      return supertest(app)
        .post('/api/articles')
        .send(newArticle)
        .expect(201)
        .expect((res) => {
          chai.expect(res.body.title).to.eql(newArticle.title);
          chai.expect(res.body.style).to.eql(newArticle.style);
          chai.expect(res.body.content).to.eql(newArticle.content);
          chai.expect(res.body).to.have.property('id');
          chai.expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`);
          const expected = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actual = new Date(res.body.date_published).toLocaleString();
          chai.expect(actual).to.eql(expected);
        })
        .then((res) => {
          return supertest(app)
            .get(`/api/articles/${res.body.id}`)
            .expect(res.body);
        });
    });

    const requiredFields = ['title', 'style', 'content'];
    requiredFields.forEach((field) => {
      const newArticle = {
        title: 'Test new article',
        style: 'Listicle',
        content: 'Test new article content...',
      };
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newArticle[field];
        return supertest(app)
          .post('/api/articles')
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` },
          });
      });
    });

    it('removes XSS attack content from response', () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
      return supertest(app)
        .post('/api/articles')
        .send(maliciousArticle)
        .expect(201)
        .expect((res) => {
          chai.expect(res.body.title).to.eql(expectedArticle.title);
          chai.expect(res.body.content).to.eql(expectedArticle.content);
        });
    });
  });

  /*****************************************************************
    DELETE /api/articles/:article_id
  ******************************************************************/
  describe('DELETE /api/articles/:article_id', () => {
    context('Given no articles', () => {
      it('responds with 404', () => {
        const articleId = 123456;
        return supertest(app)
          .delete(`/api/articles/${articleId}`)
          .expect(404, { error: { message: 'Article does not exist' } });
      });
    });

    context('Given there are articles in the database', () => {
      const testArticles = makeArticlesArray();

      beforeEach(`insert articles into ${tableName}`, () => {
        return db.insert(testArticles).into(`${tableName}`);
      });

      it('responds with 204 and removes the article', () => {
        const idToRemove = 2;
        const expectedArticles = testArticles.filter(
          (article) => article.id !== idToRemove
        );
        return supertest(app)
          .delete(`/api/articles/${idToRemove}`)
          .expect(204)
          .then(() => {
            return supertest(app)
              .get('/api/articles')
              .expect((res) => {
                chai
                  .expect(
                    res.body.map((article) => ({
                      ...article,
                      date_published: new Date(article.date_published),
                    }))
                  )
                  .to.eql(expectedArticles);
              });
          });
      });
    });
  });

  /*****************************************************************
    PATCH /api/articles/:article_id
  ******************************************************************/
  describe('PATCH /api/articles/:article_id', () => {
    context('Given no articles', () => {
      it('responds with 404', () => {
        const articleId = 123456;
        return supertest(app)
          .patch(`/api/articles/${articleId}`)
          .expect(404, { error: { message: 'Article does not exist' } });
      });
    });

    context('Given there are articles in the database', () => {
      const testArticles = makeArticlesArray();

      beforeEach(`insert articles into ${tableName}`, () => {
        return db.insert(testArticles).into(`${tableName}`);
      });

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: 'Request body must contain either title, style or content',
            },
          });
      });

      it('responds with 204 and updates the article', () => {
        const idToUpdate = 2;
        const updateArticle = {
          title: 'updated article title',
          style: 'Interview',
          content: 'updated article content',
        };
        const expectedArticle = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle,
        };
        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send(updateArticle)
          .expect(204)
          .then(() => {
            return supertest(app)
              .get(`/api/articles/${idToUpdate}`)
              .expect((res) => {
                chai
                  .expect({
                    ...res.body,
                    date_published: new Date(res.body.date_published),
                  })
                  .to.eql(expectedArticle);
              });
          });
      });

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2;
        const updateArticle = {
          title: 'updated article title',
        };
        const expectedArticle = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle,
        };
        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send({
            ...updateArticle,
            fieldToIgnore: 'should not be in GET response',
          })
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/articles/${idToUpdate}`)
              .expect((res) => {
                chai
                  .expect({
                    ...res.body,
                    date_published: new Date(res.body.date_published),
                  })
                  .to.eql(expectedArticle);
              })
          );
      });
    });
  });
});
