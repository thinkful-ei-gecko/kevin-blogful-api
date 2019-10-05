/*******************************************************************
  IMPORTS
*******************************************************************/
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('../config');
const validateBearerToken = require('../validateBearerToken');
const errorHandler = require('../errorHandler');
const articlesRouter = require('./articles-router');

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
// app.use(express.json());
// app.use(validateBearerToken);

/*******************************************************************
  ROUTES
*******************************************************************/
app.get('/', (req, res) => {
  return res.status(200).end();
});

app.get('/xss', (req, res) => {
  return res
    .cookie('secretToken', '1234567890')
    .sendFile(__dirname + '/xss-example.html');
});

app.use('/api/articles', articlesRouter);

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
