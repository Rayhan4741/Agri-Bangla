# Testing report

## Automated (run in the build environment, 2026-10-30)

| Suite | Result | What it covers |
|---|---|---|
| `server` vitest: `market.test.ts` | 8 passed | TCB parser: Bangla digits, ranges, blanks, percent columns, header/note rejection, vowel-sign-reorder matching, legacy-font row-order fallback, CSV. **Real pdf.js extraction of a generated Bangla PDF** (Hind Siliguri font, mixed fonts per row). Price-change maths. |
| `server` vitest: `ai.test.ts` | 19 passed | Knowledge retrieval (incl. the "হলুদ" = yellow/turmeric ambiguity, BRRI-sourced facts). Gemini adapter: key sent in a header, never the URL; system prompt; fallback model on 429; no retry on safety block; NOT_CONFIGURED; backup-provider chain; JSON extraction. `/api/ai/chat` SSE stream + context + "never invent prices" + 503 path + validation. `/api/ai/diagnose`: image sent, structured result, disease matching, **dose stripping**, non-image rejection. Weather proxy bounds and provider metadata. |
| `server` vitest: `db.integration.test.ts` | **7 skipped here** | Register/login/cookie, profile schema, diary privacy between users, admin-only content edits, full TCB upload → edit → publish → latest/history → reference override → unpublish, future-date rejection, admin stats. |
| `client` vitest | 62 passed | Calculators, search, local chat engine, weather rules, data consistency. |
| TypeScript (`tsc`) server + client, ESLint client | clean | |
| Browser end-to-end (Playwright, built client served by the real Express app; content in memory, no MongoDB, **Gemini stubbed** with canned answers) | 7/7 | Account button. Chat streams token by token with numbered sources. Photo in chat → diagnosis card with guide links and the dose removed. Disease page runs the AI automatically when a photo is attached. Market/login show "database unavailable" states. Admin guard. No console errors. |

### Why the MongoDB suite was skipped

The build environment could not download a MongoDB server binary. Its network only allows package registries, and the safety rules blocked running a downloaded database binary. On your machine it runs automatically: `npm --prefix server test` downloads `mongod` through `mongodb-memory-server`. Alternatively, point it at a local server with `MONGO_TEST_URI=mongodb://127.0.0.1:27017/agribangla-test npm --prefix server test`.

## Not tested: please check after setup

1. **Live Gemini.** No real API call was made, because there was no key and no network to Google. After adding `GEMINI_API_KEY`:
   - Ask "আমার ধানের পাতা হলুদ হচ্ছে কেন?" and confirm the answer streams with [১] [২] citations.
   - Upload a leaf photo on the disease page and confirm you get 1–3 possibilities.
   - If you see "মডেল পাওয়া যায়নি (404)", set `GEMINI_MODEL` to a model listed in AI Studio.
2. **Real TCB PDFs.** The parser was tested on text in TCB's documented column layout and on a generated Bangla PDF. A real TCB file was not available here. Upload a few recent reports and check the review grid. If names come out garbled, the row-order fallback and manual mapping cover it. Send a sample if the layout differs, so the parser can be tuned.
3. **Live Open-Meteo through the server.** Turn on লাইভ আবহাওয়া, pick a district and confirm the forecast shows "Open-Meteo" with a retrieval time.
4. **MongoDB flows in the browser.** Register, log in, sync the diary, and edit a crop as admin, then confirm it changes on the crop page.
5. **TCB autofetch.** It is written but untested against tcb.gov.bd, and it is off by design.
