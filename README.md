# WA Automation – WhatsApp product intake + Reselling Admin Panel

One Vercel project serves both parts from the same domain:

| Path | What it is |
|---|---|
| `/` | Admin panel (static files in `public/`) |
| `/api/products/:code` | Admin API (GET / PATCH), protected by `ADMIN_API_KEY` |
| `/webhook` | WhatsApp Cloud API webhook (GET verify, POST messages) |
| `/health` | Health check |

```
api/index.js            Vercel entry (loads the Express app)
src/createApp.js        Express app: middleware + routes
src/config.js           Env vars (fails fast with a clear message if any are missing)
src/clients.js          Supabase, R2, Redis clients
src/routes/             webhook.js, products.js
src/middleware/         adminAuth.js, webhookSignature.js
src/services/           whatsapp, imageStamp, storage, productParser, messageHandlers
public/                 index.html, styles.css, app.js, config.js
scripts/dev.js          local server (API + frontend on :3000)
tests/                  test-parser.js, test-stamp.js
```

## Deploy to Vercel

1. Push this folder to GitHub (`.env` is git-ignored) and import it in Vercel.
   Framework preset: **Other**. No build command needed.
2. Project Settings → Environment Variables: add everything from `.env.example`.
   Generate the admin key with `openssl rand -hex 32`.
3. Deploy. Open `https://<project>.vercel.app/`; the panel asks for your access key on first use.
4. Meta Developer Dashboard → WhatsApp → Configuration:
   Callback URL `https://<project>.vercel.app/webhook`, Verify token = your `VERIFY_TOKEN`.
   Put the App Secret in `META_APP_SECRET` to enable signature checking.
5. **R2 CORS (required for the Share button).** The panel downloads the images from your R2 public URL
   in the browser, so the bucket must allow your domain. Cloudflare → R2 → bucket → Settings → CORS:

```json
[
  {
    "AllowedOrigins": ["https://<project>.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAge": 86400
  }
]
```

## Run locally

```
cp .env.example .env    # fill it in
npm ci
npm run dev             # http://localhost:3000
```

## Notes

- Vercel's filesystem is read-only, so images are stamped in memory instead of `temp_images/` (same output).
- `vercel.json` sets a 60 s function limit; the webhook processes all images before replying, as before.
- The old `ngrok-skip-browser-warning` header and hard-coded ngrok URL are gone; the frontend uses relative URLs.
