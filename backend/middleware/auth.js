const config = require('../config');
const logger = require('../utils/logger');

/**
 * Basic Authentication middleware for Mission Control
 * 
 * When AUTH_ENABLED=true, protects all non-health endpoints
 * with HTTP Basic Authentication using AUTH_USERNAME and AUTH_PASSWORD.
 */
function basicAuth(req, res, next) {
  // Skip if auth is disabled
  if (!config.getBoolean('AUTH_ENABLED')) {
    return next();
  }

  // Always allow health endpoint without auth
  if (req.path === '/health' || req.path === '/health/') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    logger.warn(`Auth required for ${req.path} - no credentials provided`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Mission Control"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Decode credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const colonIndex = credentials.indexOf(':');
  const username = colonIndex >= 0 ? credentials.substring(0, colonIndex) : credentials;
  const password = colonIndex >= 0 ? credentials.substring(colonIndex + 1) : '';

  const expectedUsername = config.get('AUTH_USERNAME');
  const expectedPassword = config.get('AUTH_PASSWORD');

  // Verify credentials
  if (username !== expectedUsername || password !== expectedPassword) {
    logger.warn(`Auth failed for ${req.path} - invalid credentials for user: ${username}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Mission Control"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  logger.debug(`Auth successful for ${req.path} - user: ${username}`);
  next();
}

module.exports = basicAuth;