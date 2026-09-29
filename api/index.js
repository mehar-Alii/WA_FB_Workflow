'use strict';

// Vercel serverless entry point. vercel.json rewrites /api/*, /webhook and
// /health to this function; Express handles the routing from there.
module.exports = require('../src/createApp');
