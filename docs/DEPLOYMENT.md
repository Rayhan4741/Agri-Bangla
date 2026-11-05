# Deployment

The app is one Node process that serves the API and the built React client, plus a MongoDB database.

## Option A: Render (free) + MongoDB Atlas (free M0)

1. **Atlas:** create a free M0 cluster and a database user. Under Network Access, allow `0.0.0.0/0` (Render's IPs change). Copy the connection string, for example `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/agribangla`.
2. **Render:** create a New → Blueprint from this repo. `render.yaml` sets up the build and start commands and the health check. Set these environment variables:
   - `MONGODB_URI`: the Atlas string.
   - `GEMINI_API_KEY`: from https://aistudio.google.com/apikey.
   - `JWT_SECRET`: Render can generate this.
3. After the first deploy, open the Render shell and run `node server/dist/scripts/seed.js`. Then run `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' node server/dist/scripts/createAdmin.js`.

Render's free instances sleep when idle, so the first request after a pause takes about 30–60 seconds. Nothing in the app depends on background timers unless `TCB_AUTOFETCH` is enabled.

## Option B: Docker on a VPS

```bash
cp server/.env.example server/.env   # set JWT_SECRET, GEMINI_API_KEY, ADMIN_*
docker compose up -d --build
docker compose exec app node server/dist/scripts/seed.js
docker compose exec app node server/dist/scripts/createAdmin.js
```

Put nginx or Caddy in front for HTTPS. **Disable proxy buffering for `/api/ai/chat`** so replies stream (the app already sends `X-Accel-Buffering: no` for nginx).

## Option C: plain Node

```bash
npm run install:all && npm run build
NODE_ENV=production node --env-file=server/.env server/dist/index.js
```

## Client on a separate static host (optional)

Build the client with `VITE_API_URL=https://your-api.example.com` and add the client's origin to the server's `CORS_ORIGINS`. Cookies then cross sites: serve both over HTTPS. For `SameSite` reasons, prefer subdomains of one domain.

## Checklist
- [ ] `JWT_SECRET` is long and random. `NODE_ENV=production`, so cookies are `Secure`.
- [ ] `npm run seed` has run, and an admin exists.
- [ ] The first TCB report is uploaded and published (Admin → বাজারদর).
- [ ] Ask কৃষকবন্ধু one question and diagnose one photo, to confirm the Gemini key and model names work (see `docs/TESTING.md`).
- [ ] Open-Meteo's free API is for non-commercial use. Check their terms if you monetise.
- [ ] Content reviewed by subject experts, with verified records marked in the admin panel.
- [ ] Database backups: Atlas has snapshots on paid tiers. Otherwise run `mongodump` on a schedule.
