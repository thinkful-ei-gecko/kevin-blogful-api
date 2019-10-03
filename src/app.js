/*******************************************************************
  IMPORTS
*******************************************************************/
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const validateBearerToken = require('./validateBearerToken');
const errorHandler = require('./errorHandler');
const ArticlesService = require('./articles-service');

/*******************************************************************
  INIT
*******************************************************************/
const app = express();

/*******************************************************************
  MIDDLEWARE
*******************************************************************/
app.use(morgan(NODE_ENV === 'production' ? 'tiny' : 'common'));
app.use(cors());
app.use(helmet());
//app.use(express.json()); //parses JSON data of req body
//app.use(validateBearerToken);

/*******************************************************************
  ROUTES
*******************************************************************/
app.get('/', (req, res) => {
  return res.status(200).end();
});

app.get('/articles', (req, res, next) => {
  const knexInstance = req.app.get('db');
  ArticlesService.getAllArticles(knexInstance)
    .then((articles) => {
      return res.json(articles);
    })
    .catch(next);
});

app.get('/articles/:article_id', (req, res, next) => {
  const knexInstance = req.app.get('db');
  ArticlesService.getArticleById(knexInstance, req.params.article_id)
    .then((article) => {
      if (!article) {
        return res.status(404).json({
          error: { message: `Article doesn't exist` },
        });
      }
      return res.json(article);
    })
    .catch(next);
});

/*******************************************************************
  ERROR HANDLING
*******************************************************************/
// Catch-all 404 handler
app.use((req, res, next) => {
  const err = new Error('Path Not Found');
  err.status = 404;
  next(err); // goes to errorHandler
});
app.use(errorHandler);

/*******************************************************************
  EXPORTS
*******************************************************************/
module.exports = app;
