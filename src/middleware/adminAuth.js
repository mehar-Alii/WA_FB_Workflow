'use strict';

const crypto = require('crypto');
const config = require('../config');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Protects the admin API (cost prices, product edits). The frontend sends
// "Authorization: Bearer <ADMIN_API_KEY>". Fails closed if no key is configured.
function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    console.error('ADMIN_API_KEY is not set — refusing admin API request.');
    return res.status(503).json({ error: 'Server is not configured (missing ADMIN_API_KEY).' });
  }

  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  // Hash both sides so the comparison is constant-time and length-safe.
  if (!token || !crypto.timingSafeEqual(sha256(token), sha256(config.adminApiKey))) {
    return res.status(401).json({ error: 'Invalid or missing access key.' });
  }
  next();
}

module.exports = { requireAdmin };
