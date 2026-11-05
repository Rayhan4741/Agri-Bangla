import { Schema, model } from 'mongoose';

/**
 * Every agricultural content record lives in one collection, keyed by (type, key).
 * `type` is the original JSON file name (crops, cropDiseases, …) and `key` the record id.
 * Single-object files (weatherGuides, seasonalCalendar, …) are stored with key "_file".
 * `data` keeps the exact record shape the client already understands.
 */
const contentSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    key: { type: String, required: true },
    order: { type: Number, default: 0 },
    data: { type: Schema.Types.Mixed, required: true },
    dataStatus: { type: String, default: 'illustrative' },
    lastVerified: { type: String, default: null },
    updatedBy: { type: String, default: 'seed' },
  },
  { timestamps: true, minimize: false },
);
contentSchema.index({ type: 1, key: 1 }, { unique: true });

export const Content = model('Content', contentSchema);

export const ARRAY_TYPES = [
  'crops',
  'cropCategories',
  'cropDiseases',
  'fertilizerGuides',
  'irrigationGuides',
  'livestock',
  'poultry',
  'fisheries',
  'governmentResources',
  'agriculturalFaq',
  'glossary',
  'learningResources',
  'districts',
  'upazilas',
  'sampleAdvisories',
] as const;
export const FILE_TYPES = ['weatherGuides', 'marketSamples', 'farmingCalculators', 'seasonalCalendar'] as const;
export const CONTENT_TYPES = [...ARRAY_TYPES, ...FILE_TYPES] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const isContentType = (t: string): t is ContentType => (CONTENT_TYPES as readonly string[]).includes(t);
export const isFileType = (t: string) => (FILE_TYPES as readonly string[]).includes(t);
