const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AUTH_COOKIE_NAME, readAuthToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const envUser = process.env.ADMIN_USERNAME;
    const envHash = process.env.ADMIN_PASSWORD_HASH;
    const jwtSecret = process.env.JWT_SECRET;

    if (!envUser || !envHash || !jwtSecret) {
      return res.status(500).json({ error: 'Auth environment variables are not configured' });
    }

    const isValidPassword = await bcrypt.compare(password, envHash);
    if (username !== envUser || !isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: envUser }, jwtSecret, { expiresIn: '7d' });
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());

    return res.json({ user: { username: envUser } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return res.json({ success: true });
});

router.get('/me', (req, res) => {
  const payload = verifyToken(readAuthToken(req));
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  return res.json({ user: { username: payload.username } });
});

module.exports = router;
