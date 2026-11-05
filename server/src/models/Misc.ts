import { Schema, model } from 'mongoose';

/** Farm diary entries for signed-in farmers (photos stay on the device). */
const diarySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    kind: { type: String, enum: ['task', 'expense', 'note', 'income'], default: 'note' },
    text: { type: String, required: true, maxlength: 500 },
    amount: { type: Number, default: null },
    cropId: { type: String, default: null },
    done: { type: Boolean, default: false },
    /** id of the entry in the browser's local store, so repeated syncs don't duplicate it */
    clientId: { type: String, default: null },
  },
  { timestamps: true },
);
diarySchema.index({ userId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });
export const DiaryEntry = model('DiaryEntry', diarySchema);

/** Cached third-party responses (weather). TTL index removes stale entries automatically. */
const cacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  payload: { type: Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true, default: () => new Date() },
});
cacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 6 * 3600 });
export const ApiCache = model('ApiCache', cacheSchema);

/** Anonymous usage counters for the admin dashboard (no message text, no IPs). */
const usageSchema = new Schema({
  day: { type: String, required: true },
  kind: { type: String, required: true },
  count: { type: Number, default: 0 },
});
usageSchema.index({ day: 1, kind: 1 }, { unique: true });
export const Usage = model('Usage', usageSchema);

export async function countUsage(kind: string) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    await Usage.updateOne({ day, kind }, { $inc: { count: 1 } }, { upsert: true });
  } catch {
    /* metrics are best-effort */
  }
}
