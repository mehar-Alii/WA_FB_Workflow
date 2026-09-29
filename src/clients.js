'use strict';

const { createClient } = require('@supabase/supabase-js');
const { S3Client } = require('@aws-sdk/client-s3');
const { Redis } = require('@upstash/redis');
const config = require('./config');

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Cloudflare R2 (S3-compatible)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

// Upstash Redis (REST-based: works from serverless, no persistent socket)
const redis = new Redis({ url: config.redis.url, token: config.redis.token });

module.exports = { supabase, s3, redis };
