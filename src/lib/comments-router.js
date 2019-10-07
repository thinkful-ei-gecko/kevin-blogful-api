const path = require('path');
const express = require('express');
const xss = require('xss');
const CommentsService = require('./comments-service');
const commentsRouter = express.Router();
const jsonParser = express.json();

const sanitizedComment = (comment) => ({
  id: comment.id,
  text: xss(comment.text),
  date_commented: comment.date_commented,
  article_id: comment.article_id,
  user_id: comment.user_id,
});

/*****************************************************************
  /comments
******************************************************************/
commentsRouter
  .route('/')
  .get((req, res, next) => {
    CommentsService.getAllComments(req.app.get('db'))
      .then((comments) => {
        return res.json(comments.map(sanitizedComment));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { text, article_id, user_id, date_commented } = req.body;
    const newComment = { text, article_id, user_id };

    for (const [key, value] of Object.entries(newComment)) {
      if (!value) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }

    newComment.date_commented = date_commented;

    CommentsService.insertComment(req.app.get('db'), newComment)
      .then((comment) => {
        return res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${comment.id}`))
          .json(sanitizedComment(comment));
      })
      .catch(next);
  });

/*****************************************************************
  /comments/:comment_id
******************************************************************/
commentsRouter
  .route('/:comment_id')
  .all((req, res, next) => {
    CommentsService.getCommentById(req.app.get('db'), req.params.comment_id).then(
      (comment) => {
        if (!comment) {
          return res.status(404).json({
            error: { message: 'Comment does not exist' },
          });
        }
        res.comment = comment; // save the comment for the next middleware
        next(); // don't forget to call next so the next middleware happens!
      }
    );
  })
  .get((req, res) => {
    return res.json(sanitizedComment(res.comment));
  })
  .delete((req, res, next) => {
    CommentsService.deleteCommentById(req.app.get('db'), req.params.comment_id)
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { text, date_commented } = req.body;
    const commentToUpdate = { text, date_commented };

    const numberOfValues = Object.values(commentToUpdate).filter((val) => !!val).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message:
            'Request body must contain either text or date_commented',
        },
      });
    }

    CommentsService.updatecommentById(
      req.app.get('db'),
      req.params.comment_id,
      commentToUpdate
    )
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = commentsRouter;
