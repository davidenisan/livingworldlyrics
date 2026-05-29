const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'lyrics_admin_token';

function readAuthToken(req) {
  if (req.cookies?.[AUTH_COOKIE_NAME]) return req.cookies[AUTH_COOKIE_NAME];

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

function verifyToken(token) {
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const payload = verifyToken(readAuthToken(req));

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = payload;
  return next();
}

module.exports = {
  AUTH_COOKIE_NAME,
  readAuthToken,
  verifyToken,
  requireAuth,
};
