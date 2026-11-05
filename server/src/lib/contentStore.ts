import { createHash } from 'node:crypto';
import { ARRAY_TYPES, Content, FILE_TYPES, type ContentType } from '../models/Content.js';

/**
 * In-memory snapshot of all content (a few hundred records), rebuilt from MongoDB
 * when an admin edits something or after `TTL_MS`. Serves the client bundle and the
 * AI knowledge search without hitting the database on every request.
 */
export interface Bundle {
  version: string;
  generatedAt: string;
  files: Record<string, unknown>;
}

const TTL_MS = 60_000;
let cache: { bundle: Bundle; at: number } | null = null;
let building: Promise<Bundle> | null = null;

async function build(): Promise<Bundle> {
  const docs = await Content.find({}).sort({ type: 1, order: 1, key: 1 }).lean();
  const files: Record<string, unknown> = {};
  for (const t of ARRAY_TYPES) files[t] = [];
  let latest = 0;
  for (const d of docs) {
    latest = Math.max(latest, new Date(d.updatedAt as unknown as string).getTime() || 0);
    if ((FILE_TYPES as readonly string[]).includes(d.type)) files[d.type] = d.data;
    else if (Array.isArray(files[d.type])) (files[d.type] as unknown[]).push(d.data);
  }
  const version = createHash('sha1').update(`${docs.length}:${latest}`).digest('hex').slice(0, 16);
  return { version, generatedAt: new Date().toISOString(), files };
}

export async function getBundle(): Promise<Bundle> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.bundle;
  if (!building) {
    building = build()
      .then((b) => {
        cache = { bundle: b, at: Date.now() };
        return b;
      })
      .finally(() => {
        building = null;
      });
  }
  return building;
}

export function invalidateBundle() {
  cache = null;
}

export async function getList<T = Record<string, unknown>>(type: ContentType): Promise<T[]> {
  const b = await getBundle();
  const v = b.files[type];
  return (Array.isArray(v) ? v : []) as T[];
}

export async function getFile<T = Record<string, unknown>>(type: ContentType): Promise<T | null> {
  const b = await getBundle();
  return (b.files[type] as T) ?? null;
}

/** Test hook: inject a bundle without a database. */
export function __setBundleForTests(files: Record<string, unknown>) {
  cache = { bundle: { version: 'test', generatedAt: new Date().toISOString(), files }, at: Date.now() + 1e12 };
}
