const path = require('path');
const express = require('express');
const xss = require('xss');
const ArticlesService = require('./articles-service');
const articlesRouter = express.Router();
const jsonParser = express.json();

const sanitizedArticle = (article) => ({
  id: article.id,
  style: article.style,
  title: xss(article.title),
  content: xss(article.content),
  date_published: article.date_published,
});

/*****************************************************************
  /articles
******************************************************************/
articlesRouter
  .route('/')
  .get((req, res, next) => {
    ArticlesService.getAllArticles(req.app.get('db'))
      .then((articles) => {
        return res.json(articles.map(sanitizedArticle));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body;
    const newArticle = { title, content, style };

    for (const [key, value] of Object.entries(newArticle)) {
      if (!value) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }

    ArticlesService.insertArticle(req.app.get('db'), newArticle)
      .then((article) => {
        return res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${article.id}`))
          .json(sanitizedArticle(article));
      })
      .catch(next);
  });

/*****************************************************************
  /articles/:article_id
******************************************************************/
articlesRouter
  .route('/:article_id')
  .all((req, res, next) => {
    ArticlesService.getArticleById(
      req.app.get('db'),
      req.params.article_id
    ).then((article) => {
      if (!article) {
        return res.status(404).json({
          error: { message: 'Article does not exist' },
        });
      }
      res.article = article; // save the article for the next middleware
      next(); // don't forget to call next so the next middleware happens!
    });
  })
  .get((req, res, next) => {
    return res.json(sanitizedArticle(res.article));
  })
  .delete((req, res, next) => {
    ArticlesService.deleteArticleById(req.app.get('db'), req.params.article_id)
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = articlesRouter;
