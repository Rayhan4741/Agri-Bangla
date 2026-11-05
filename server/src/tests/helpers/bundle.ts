import { readSeedDocs } from '../../scripts/seed.js';
import { __setBundleForTests } from '../../lib/contentStore.js';
import { FILE_TYPES } from '../../models/Content.js';

/** Loads the real client JSON content into the in-memory content store (no database needed). */
export function loadRealContent() {
  const files: Record<string, unknown> = {};
  for (const d of readSeedDocs()) {
    if ((FILE_TYPES as readonly string[]).includes(d.type)) files[d.type] = d.data;
    else ((files[d.type] ??= []) as unknown[]).push(d.data);
  }
  __setBundleForTests(files);
  return files;
}
