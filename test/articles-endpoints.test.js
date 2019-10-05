const knex = require('knex');
const app = require('../src/lib/app');
const {
  makeArticlesArray,
  makeMaliciousArticle,
} = require('./articles.fixtures');

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
            expect(
              res.body.map((article) => ({
                ...article,
                date_published: new Date(article.date_published),
              }))
            ).to.eql(testArticles);
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
            expect(res.body[0].title).to.eql(expectedArticle.title);
            expect(res.body[0].content).to.eql(expectedArticle.content);
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
            expect({
              ...res.body,
              date_published: new Date(res.body.date_published),
            }).to.eql(expectedArticle);
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
            expect(res.body.title).to.eql(expectedArticle.title);
            expect(res.body.content).to.eql(expectedArticle.content);
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
          expect(res.body.title).to.eql(newArticle.title);
          expect(res.body.style).to.eql(newArticle.style);
          expect(res.body.content).to.eql(newArticle.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`);
          const expected = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actual = new Date(res.body.date_published).toLocaleString();
          expect(actual).to.eql(expected);
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
          expect(res.body.title).to.eql(expectedArticle.title);
          expect(res.body.content).to.eql(expectedArticle.content);
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
          .then((res) => {
            return supertest(app)
              .get('/api/articles')
              .expect((res) => {
                expect(
                  res.body.map((article) => ({
                    ...article,
                    date_published: new Date(article.date_published),
                  }))
                ).to.eql(expectedArticles);
              });
          });
      });
    });
  });
});
