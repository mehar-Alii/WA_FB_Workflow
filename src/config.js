'use strict';

// Loads .env locally; on Vercel the variables come from project settings.
require('dotenv').config({ quiet: true });

const REQUIRED_ENV = [
  'TOKEN',
  'VERIFY_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  // Shows up clearly in Vercel function logs instead of a cryptic SDK error.
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const list = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

module.exports = {
  // WhatsApp Cloud API
  whatsappToken: process.env.TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID || '1417650544755090',
  apiVersion: 'v21.0',
  metaAppSecret: process.env.META_APP_SECRET || '', // optional: enables webhook signature check

  // Admin API protection
  adminApiKey: process.env.ADMIN_API_KEY || '',
  allowedOrigins: list(process.env.ALLOWED_ORIGINS), // empty = same-origin only

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // Cloudflare R2
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL.replace(/\/+$/, ''),
  },

  // Upstash Redis
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  // Optional: Gemini fallback (parser degrades gracefully without it)
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // How long an image buffer can wait for its closing text.
  pendingTtlSeconds: 15 * 60,
  // How long a processed message ID is remembered (survives Meta retries).
  dedupeTtlSeconds: 24 * 60 * 60,
};
