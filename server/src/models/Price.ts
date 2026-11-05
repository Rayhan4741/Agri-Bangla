import { Schema, model } from 'mongoose';

/**
 * One price observation for one commodity on one date.
 * kind "daily"     → the "today" column of a TCB report (date = report date)
 * kind "reference" → the week/month/year-ago columns printed in that same report,
 *                    used to show history before daily tracking began. A daily record always wins.
 */
const priceSchema = new Schema(
  {
    commodity: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (Asia/Dhaka)
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    unitBn: { type: String, default: '' },
    kind: { type: String, enum: ['daily', 'reference'], default: 'daily' },
    reportDate: { type: String, required: true },
    source: { type: String, default: 'TCB' },
    sourceUrl: { type: String, default: '' },
    uploadId: { type: Schema.Types.ObjectId, ref: 'PriceUpload' },
  },
  { timestamps: true },
);
priceSchema.index({ commodity: 1, date: 1, kind: 1, source: 1 }, { unique: true });
priceSchema.index({ date: -1 });

export const Price = model('Price', priceSchema);

const rowSchema = new Schema(
  {
    line: String,
    rawName: String,
    commodity: { type: String, default: null },
    unitBn: String,
    today: { min: Number, max: Number },
    weekAgo: { min: Number, max: Number },
    monthAgo: { min: Number, max: Number },
    yearAgo: { min: Number, max: Number },
    confidence: { type: Number, default: 0 },
    include: { type: Boolean, default: true },
  },
  { _id: false },
);

const uploadSchema = new Schema(
  {
    reportDate: { type: String, default: null },
    fileName: String,
    fileHash: { type: String, index: true },
    format: { type: String, enum: ['pdf', 'csv', 'manual', 'autofetch'], default: 'pdf' },
    sourceUrl: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published', 'discarded'], default: 'draft' },
    rows: [rowSchema],
    warnings: [String],
    createdBy: String,
    publishedBy: String,
    publishedAt: Date,
  },
  { timestamps: true },
);

export const PriceUpload = model('PriceUpload', uploadSchema);
