const path = require('path');
const express = require('express');
const xss = require('xss');
const UsersService = require('./users-service');
const usersRouter = express.Router();
const jsonParser = express.json();

const sanitizedUser = (user) => ({
  id: user.id,
  fullname: xss(user.fullname),
  username: xss(user.username),
  nickname: xss(user.nickname),
  date_created: user.date_created,
});

/*****************************************************************
  /users
******************************************************************/
usersRouter
  .route('/')
  .get((req, res, next) => {
    UsersService.getAllUsers(req.app.get('db'))
      .then((users) => {
        return res.json(users.map(sanitizedUser));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { fullname, username, nickname, password} = req.body;
    const newUser = { fullname, username };

    for (const [key, value] of Object.entries(newUser)) {
      if (!value) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }

    newUser.nickname = nickname;
    newUser.password = password;

    UsersService.insertUser(req.app.get('db'), newUser)
      .then((user) => {
        return res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${user.id}`))
          .json(sanitizedUser(user));
      })
      .catch(next);
  });

/*****************************************************************
  /users/:user_id
******************************************************************/
usersRouter
  .route('/:user_id')
  .all((req, res, next) => {
    UsersService.getUserById(req.app.get('db'), req.params.user_id).then(
      (user) => {
        if (!user) {
          return res.status(404).json({
            error: { message: 'User does not exist' },
          });
        }
        res.user = user; // save the user for the next middleware
        next(); // don't forget to call next so the next middleware happens!
      }
    );
  })
  .get((req, res) => {
    return res.json(sanitizedUser(res.user));
  })
  .delete((req, res, next) => {
    UsersService.deleteUserById(req.app.get('db'), req.params.user_id)
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { fullname, username, nickname, password } = req.body;
    const userToUpdate = { fullname, username, nickname, password };

    const numberOfValues = Object.values(userToUpdate).filter((val) => !!val).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must contain either fullname, username, nickname, or password',
        },
      });
    }

    UsersService.updateUserById(
      req.app.get('db'),
      req.params.user_id,
      userToUpdate
    )
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = usersRouter;
