'use strict';

const crypto = require('crypto');
const config = require('../config');

let warned = false;

// Verifies Meta's X-Hub-Signature-256 header so only Meta can hit POST /webhook.
// Enabled when META_APP_SECRET is set (Meta App Dashboard -> Settings -> Basic -> App Secret).
function verifyMetaSignature(req, res, next) {
  if (!config.metaAppSecret) {
    if (!warned) {
      console.warn('META_APP_SECRET is not set — webhook signatures are NOT being verified.');
      warned = true;
    }
    return next();
  }

  const signature = req.get('x-hub-signature-256') || '';
  const expected =
    'sha256=' + crypto.createHmac('sha256', config.metaAppSecret).update(req.rawBody || Buffer.alloc(0)).digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('Rejected webhook call with an invalid signature.');
    return res.sendStatus(403);
  }
  next();
}

module.exports = { verifyMetaSignature };
