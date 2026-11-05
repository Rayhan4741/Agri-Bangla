# কৃষিবাংলা · AgriBangla — MERN stack

A Bangla-first agricultural guidance web app for farmers in Bangladesh. It is built on the MERN stack:
**MongoDB, Express, React and Node.js**.

| | |
|---|---|
| **কৃষকবন্ধু AI** | Google Gemini via the server, with answers grounded in the app's knowledge base and numbered citations. Replies stream in Bangla. |
| **Photo diagnosis** | A leaf photo goes to Gemini's vision model. It returns up to 3 *possible* causes, with field checks, and links each to a guide. Chemical doses are filtered out, and photos are never stored. |
| **বাজারদর** | TCB (Trading Corporation of Bangladesh) daily retail prices for Dhaka. History grows day by day; changes are shown per week, month and year. An admin uploads and reviews each report before it goes live (see below). |
| **Weather** | Open-Meteo forecasts, fetched by the server and cached per district for an hour. Rule-based risk and spray-window advice. |
| **Content** | About 30 crops, 28 diseases and pests, livestock, poultry and fisheries guides, FAQ, glossary, calendar, all 64 districts. Stored in MongoDB and edited from the admin panel. |
| **Accounts** | Optional farmer accounts (email and password, httpOnly cookie). Profile and farm-diary sync. Admin role. |
| **Still works without the server** | The client ships with a copy of all content, a service worker for offline use, a local answer engine and the 3D hero. If the API is down, every page still works in read-only mode. |

```
agribangla/
├── client/            React 18 + Vite + TypeScript + Tailwind + React Three Fiber (the existing app)
│   └── src/data/      content JSON — the seed source for MongoDB and the offline fallback
├── server/            Express 5 + Mongoose 8 + TypeScript
│   ├── src/routes/    auth, content, ai (chat + diagnose), market, weather, diary, admin
│   ├── src/lib/       ai/ (Gemini + fallback adapters, prompts), market/ (TCB parser, PDF text), knowledge search
│   ├── src/models/    User, Content, Price, PriceUpload, DiaryEntry, ApiCache, Usage
│   └── src/tests/     vitest + supertest (+ MongoDB integration suite)
├── docs/              API.md · DEPLOYMENT.md · DATA.md · TESTING.md
├── Dockerfile · docker-compose.yml · render.yaml
```

## Quick start (local)

Requirements: Node 22+ and MongoDB, either local, Docker (`docker run -d -p 27017:27017 mongo:7`) or a free Atlas cluster.

```bash
npm run install:all                    # root + server + client
cp server/.env.example server/.env     # set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, ADMIN_*
npm run seed                           # load content JSON into MongoDB
npm run create-admin                   # create the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                            # API on :5000, web on :5173 (Vite proxies /api)
```

Open http://localhost:5173. Sign in with the admin account and go to **সব সেবা → অ্যাডমিন**.

**Production build:** `npm run build && npm start`. Express then serves the built client and the API on one port (5000).
**Docker:** `docker compose up --build` (MongoDB + app). See `docs/DEPLOYMENT.md`.

## Getting the AI key (free)

1. Go to https://aistudio.google.com/apikey and create an API key.
2. Put it in `server/.env` as `GEMINI_API_KEY=...`. The key never reaches browsers.
3. The defaults are `GEMINI_MODEL=gemini-3.5-flash` with `GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite`. These were the current stable Flash models when this was built (October 2026). If Google retires them, change the names in `.env`.
4. Optional: add a backup provider with `FALLBACK_AI_BASE_URL`, `FALLBACK_AI_API_KEY` and `FALLBACK_AI_MODEL`. Any OpenAI-compatible API works, such as Groq or OpenRouter. It handles text only.

The free Gemini tier has per-project quotas, which you can see in AI Studio. Google may also use free-tier inputs to improve its models, so the UI asks farmers not to type personal details. Per-IP limits in `.env` protect the quota.

## TCB market prices: why an admin uploads them

The TCB site's `robots.txt` disallows automated access, and so does DAM's (checked October 2026). So the app does **not** scrape them. The daily workflow takes about 2 minutes:

1. An admin downloads the day's PDF from https://tcb.gov.bd/pages/daily-rmps.
2. They open **Admin → বাজারদর (TCB)** and upload the PDF. They can also paste its text, upload a CSV or type the prices by hand.
3. The server reads the table with pdf.js. It recognises commodities by a consonant "skeleton", which survives the Bangla vowel-sign reordering that PDF extraction causes. It also falls back to the previous report's row order when the PDF uses legacy (Bijoy) fonts.
4. The admin checks the highlighted rows against the PDF and clicks **প্রকাশ**.

Each report also prints prices from 1 week, 1 month and 1 year earlier. Those are stored as *reference* points, so the charts show history from the first upload. A daily value always replaces a reference value for the same date. Every price keeps its report date and source link. If a report turns out to be wrong, unpublishing it removes its prices.

An automatic fetcher exists (`TCB_AUTOFETCH`) but is **off**. Turn it on only if TCB gives permission. It checks `robots.txt` before every request and only creates drafts for review.

## Content and trust labels

Every record carries `dataStatus` (`verified`, `link-checked`, `illustrative` or `unverified`) and `lastVerified`, and the UI shows both. Most agricultural content is still **illustrative** educational text. Some disease records also carry `sourcedFactsBn`: individual statements checked against official BRRI documents, each with its own link and check date. For example, blast and bacterial leaf blight cite BRRI's March 2023 advisory, and sheath blight cites the BRRI Rice Knowledge Bank factsheet. The AI is told to cite these. See `docs/DATA.md`.

**Before a public launch**, an agronomist, veterinarian or fisheries officer should review the content and mark it verified in the admin panel.

## Security notes

- Passwords are hashed with bcrypt (12 rounds). Sessions use a JWT in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production).
- Inputs are validated with zod. Helmet sets the security headers and a strict CSP (scripts from self only). Mutating requests from unknown origins are rejected (CSRF guard).
- There are rate limits on login and on both AI endpoints. The weather proxy only accepts coordinates inside Bangladesh.
- AI keys live only in `server/.env`. Images sent for diagnosis are processed in memory and dropped.
- Profiles store only district, crops and favourites. The diary stores text the user chooses to sync; photos stay on the device.

## Scripts

| Root | |
|---|---|
| `npm run dev` | API + client with hot reload |
| `npm run build` / `npm start` | production build / serve both on :5000 |
| `npm test` | server tests (27 + 7 MongoDB integration) and client tests (62) |
| `npm run seed` | load content JSON into MongoDB (`-- --force` overwrites admin edits) |
| `npm run create-admin` | create or reset the admin account |

See `docs/TESTING.md` for what has and hasn't been tested, including the live checks to run after you add a real key.
