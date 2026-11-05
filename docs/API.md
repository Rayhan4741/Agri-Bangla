# API reference

Base path: `/api`. Responses are JSON. Errors look like this:
`{ "error": { "code": "BAD_REQUEST", "message": "<Bangla message>", "details"?: [...] } }`.
Auth uses the httpOnly cookie `ab_token`, set by `/auth/login` and `/auth/register`.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ ok, db }` |
| GET | `/config` | AI enabled/model/vision, market source, weather provider |
| GET | `/content/bundle` | all content in the client's JSON-file shape; `ETag` with 304 support |
| GET | `/content/:type` | one content type, e.g. `crops`, `cropDiseases`, `weatherGuides` |
| GET | `/content/:type/:key` | one record |
| GET | `/content/search?q=` | knowledge search (BM25 over Bangla tokens) |
| POST | `/ai/chat` | body `{ messages:[{role,text}], cropId?, districtId?, stream? }`. Streams SSE events `meta` (sources, model), `delta` (text) and `done`, or `error`. With `stream:false` it returns `{ text, sources }`. Returns `503 AI_UNAVAILABLE` if no provider works. |
| POST | `/ai/diagnose` | multipart: `image` (jpeg/png/webp/heic, ≤ 6 MB), `cropId?`, `symptoms?`, `districtId?`. Returns `{ result:{imageQuality, summaryBn, possibilities[≤3], safeStepsBn, seeExpertBn}, matches, model, dosesRemoved, disclaimerBn }`. |
| GET | `/weather?lat=&lon=` | Open-Meteo forecast (Bangladesh bounds only); cached for 1 hour; returns provider and `retrievedAt` |
| GET | `/market/commodities` | the TCB commodity catalogue + source |
| GET | `/market/latest` | latest price per commodity with week/month/year % change; `stale` if older than 3 days |
| GET | `/market/history?commodity=&from=&to=` | points `{date,min,max,avg,kind:'daily'|'reference'}` |
| GET | `/market/compare?commodities=a,b&days=90` | several series |

## Account (cookie required unless noted)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password ≥ 8 }` (no cookie needed) |
| POST | `/auth/login` | `{ email, password }` (no cookie needed) |
| POST | `/auth/logout` | |
| GET | `/auth/me` | `{ user | null }` |
| PUT | `/auth/me/profile` | strict schema: districtId, upazilaId, language, cropIds, cropStages, favorites, farmSizeDecimal |
| DELETE | `/auth/me` | deletes the account and its diary |
| GET/POST/PUT/DELETE | `/diary[/:id]` | the owner's entries; a `clientId` makes sync idempotent |

## Admin (role `admin`)
| Method | Path | Notes |
|---|---|---|
| PUT | `/content/:type/:key` | create/replace a record (key `_file` for single-object types) |
| DELETE | `/content/:type/:key` | |
| POST | `/admin/market/uploads` | multipart `file` (PDF/CSV) **or** `text`, or nothing for an empty manual sheet; optional `reportDate`, `sourceUrl`. Creates a draft. |
| GET | `/admin/market/uploads[/:id]` | |
| PUT | `/admin/market/uploads/:id` | edit the draft's rows, date and source |
| POST | `/admin/market/uploads/:id/publish` | writes daily and reference prices; rejects future dates and unmapped rows |
| POST | `/admin/market/uploads/:id/discard` | if already published, its prices are deleted |
| GET | `/admin/stats` · `/admin/users` · PUT `/admin/users/:id/role` | |
