/**
 * Loads the agricultural content JSON files (client/src/data/*.json) into MongoDB.
 *   npm run seed            → inserts records that don't exist yet (keeps admin edits)
 *   npm run seed -- --force → overwrites every record with the JSON version
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { connectDb, disconnectDb } from '../db.js';
import { ARRAY_TYPES, Content, FILE_TYPES } from '../models/Content.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.SEED_DATA_DIR || path.resolve(here, '../../../client/src/data');

export function readSeedDocs(dir = dataDir) {
  const docs: { type: string; key: string; order: number; data: Record<string, unknown> }[] = [];
  for (const type of ARRAY_TYPES) {
    const arr = JSON.parse(readFileSync(path.join(dir, `${type}.json`), 'utf8')) as Record<string, unknown>[];
    arr.forEach((data, order) => docs.push({ type, key: String(data.id), order, data }));
  }
  for (const type of FILE_TYPES) {
    docs.push({ type, key: '_file', order: 0, data: JSON.parse(readFileSync(path.join(dir, `${type}.json`), 'utf8')) });
  }
  return docs;
}

async function main() {
  const force = process.argv.includes('--force');
  await connectDb(config.MONGODB_URI);
  const docs = readSeedDocs();
  let inserted = 0;
  let updated = 0;
  for (const d of docs) {
    const status = (d.data.dataStatus ?? d.data.verificationStatus ?? 'illustrative') as string;
    const set = { order: d.order, data: d.data, dataStatus: status, lastVerified: (d.data.lastVerified as string) ?? null, updatedBy: 'seed' };
    if (force) {
      const r = await Content.updateOne({ type: d.type, key: d.key }, { $set: set }, { upsert: true });
      if (r.upsertedCount) inserted++;
      else updated++;
    } else {
      const r = await Content.updateOne({ type: d.type, key: d.key }, { $setOnInsert: set }, { upsert: true });
      if (r.upsertedCount) inserted++;
    }
  }
  console.log(`Seed done: ${inserted} inserted, ${updated} overwritten, ${docs.length} total records from ${dataDir}`);
  await disconnectDb();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
