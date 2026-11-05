# Data documentation

## Where content lives (MERN version)

- **MongoDB `contents` collection.** This is the live source. There is one document per record, `{ type, key, order, data, dataStatus, lastVerified, updatedBy }`. `type` is the JSON file name (for example `crops`) and `data` is the record exactly as in the JSON. Admins edit records in **Admin → কনটেন্ট**.
- **`client/src/data/*.json`.** This is the seed source (`npm run seed`) and the copy bundled into the client. The app shows it first, and whenever the API is unreachable. When `/api/content/bundle` loads, the live copy replaces it in place.
- Running `npm run seed` again only inserts missing records. `npm run seed -- --force` overwrites admin edits with the JSON.
- Prices are **not** content. They live in the `prices` and `priceuploads` collections; see the README's TCB section.

## Per-statement citations (`sourcedFactsBn`)

A disease record may carry `sourcedFactsBn: [{ textBn, sourceBn, url, checked }]` and `sourceUrls`. Each item is one statement checked against an official document on the `checked` date. The disease page shows these in a separate "সরকারি উৎস থেকে যাচাই করা তথ্য" box. The AI receives them labelled with their source and is told to cite them. The rest of the record keeps its own `dataStatus`. A record is marked `verified` only when *all* of it has been checked.

Checked so far (2026-10-30):

| Record | Source |
|---|---|
| `rice-blast`, `bacterial-leaf-blight` | BRRI Plant Pathology Division, urgent advisory on blast management, 19 March 2023 (brri.portal.gov.bd PDF) |
| `sheath-blight` | BRRI Rice Knowledge Bank, sheath blight (খোলপোড়া) factsheet |

Other BRRI factsheets (blast, BLB, brown spot, tungro, brown planthopper, stem borer) are image-only PDFs that could not be read in the build environment. They are good next candidates for manual review. Find them under https://knowledgebank-brri.org/.

---

All agricultural content is also bundled as JSON in `client/src/data/`. TypeScript interfaces for every file live in
`src/types/index.ts`, and every file is loaded through one data-access module (`src/lib/data.ts`).
Pages never import JSON directly. Search, filtering and the chat engine (`src/lib/search.ts`,
`src/lib/chatEngine.ts`) build on those selectors.

`src/lib/__tests__/data.test.ts` checks schema consistency. It confirms that IDs are unique, every
cross-reference resolves, required Bangla fields are present and `dataStatus` values are valid.
Run `npm test` after editing any JSON.

## Trust fields (`RecordMeta`)

Every content record carries these fields:

| Field | Meaning |
| --- | --- |
| `dataStatus` | `verified` (checked against a named official source), `link-checked` (only the URL was confirmed live), `illustrative` (educational sample written for this demo), or `unverified` |
| `lastVerified` | ISO date of the last review, or `null` if never reviewed |
| `sourceIds` | IDs in `governmentResources.json` that the content was actually derived from. Empty for illustrative content. |
| `verifyWithIds` | Organisations a farmer can contact to verify the content or get official advice |

The UI shows a badge for `dataStatus` on every guide. **To verify a record**, check it against the
official source, add that source's ID to `sourceIds`, set `dataStatus: "verified"` and set `lastVerified`
to the review date.

## Files

| File | Shape | Type | Contents |
| --- | --- | --- | --- |
| `crops.json` | array (30) | `Crop` | Crop guides: Bangla and English names, category, seasons, stages with tasks, soil types, irrigation, linked fertilizer, irrigation and disease IDs, and `growthModel` (drives the 3D growth timeline) |
| `cropCategories.json` | array (9) | `CropCategory` | Categories for the crop directory |
| `cropDiseases.json` | array (28) | `CropDisease` | Diseases, pests and deficiencies with symptom tags (`parts`, `colors`, `patterns`) used by the picture symptom finder |
| `fertilizerGuides.json` | array | `FertilizerGuide` | Soil-test, balanced-fertilizer and micronutrient guidance. **Contains no dose recommendations.** |
| `irrigationGuides.json` | array | `IrrigationGuide` | Critical stages, AWD, drainage and similar topics |
| `livestock.json` / `poultry.json` | array | `AnimalGuide` | Feeding, housing, hygiene and warning signs, each with "call a vet" guidance |
| `fisheries.json` | array | `FisheriesGuide` | Pond preparation, species selection, feeding, water quality, disease prevention and harvesting |
| `weatherGuides.json` | object | `WeatherGuidesFile` | Hazard guides, plus `riskRules` and `sprayRule` used by the rule-based planner when live weather is on |
| `marketSamples.json` | object | `MarketSamplesFile` | **Sample** prices per market and commodity, with `noticeBn` shown on every view |
| `farmingCalculators.json` | object | `FarmingCalculatorsFile` | Land units (local বিঘা and কাঠা sizes are editable), fertilizer product nutrient contents, and calculator descriptions and assumptions |
| `seasonalCalendar.json` | object | `SeasonalCalendarFile` | Seasons, month-by-month tasks and crop timelines, with a note on regional variation |
| `governmentResources.json` | array (13) | `GovernmentResource` | Official organisations with URLs. The URLs were checked to resolve on 2026-10-29. No phone numbers or scheme details. |
| `agriculturalFaq.json` | array | `FaqItem` | Q&A with keywords and intents, used by the local chat engine |
| `glossary.json` | array | `GlossaryTerm` | Bangla agricultural terms |
| `learningResources.json` | array | `LearningResource` | Learning-centre lessons with short quizzes |
| `districts.json` | array (64) | `District` | All 64 districts with division, approximate centroid coordinates (for live weather) and illustrative hazard tags |
| `upazilas.json` | array (62) | `Upazila` | **Sample only.** It does not cover all ~495 upazilas. |
| `sampleAdvisories.json` | array | `SampleAdvisory` | Example advisories shown on the home page, labelled as samples |

## Editing content

- Keep each file focused. Don't merge the dataset into one large file.
- Write Bangla in Unicode (not Bijoy).
- Keep IDs as lowercase kebab-case, and never change an ID that other records reference.
- Never add current prices, subsidy amounts, phone numbers, deadlines or eligibility rules unless you
  have an official source. If you do, cite it in `sourceIds` and set `lastVerified`.
- The `scripts/gen_*.py` files are the generators originally used to author the JSON. You can edit the
  JSON directly; the scripts are kept for reference.
