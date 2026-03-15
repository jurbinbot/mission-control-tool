const logger = require('../utils/logger');

function errorLogger(err, req, res, next) {
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  next(err);
}

module.exports = errorLogger;