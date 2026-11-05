/**
 * Builds a TCB-style price table PDF for tests, with a real Bangla font so the
 * pdf.js extraction path (including vowel-sign ordering problems) is exercised.
 * The numbers are SYNTHETIC test values, not real prices.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.resolve(here, '../../../../client/node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff');

export interface FixtureRow {
  name: string;
  unit: string;
  nums: string[]; // 8 Bangla-digit price cells
  pct: [string, string]; // ASCII percentage cells
}

export function makeTcbPdf(dateBn: string, rows: FixtureRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('bn', readFileSync(FONT));
    doc.font('bn').fontSize(13).text('ট্রেডিং কর্পোরেশন অব বাংলাদেশ', 30, 30);
    doc.fontSize(11).text(`ঢাকা মহানগরীর নিত্য প্রয়োজনীয় পণ্যের খুচরা বাজার দর ${dateBn}`, 30, 50);
    doc.fontSize(9).text('পণ্যের নাম', 30, 80).text('একক', 200, 80).text('আজকের দর', 260, 80).text('এক সপ্তাহ আগে', 360, 80).text('এক মাস আগে', 460, 80).text('এক বছর আগে', 560, 80);
    let y = 100;
    for (const r of rows) {
      doc.font('bn').fontSize(9).text(r.name, 30, y, { lineBreak: false });
      doc.text(r.unit, 200, y, { lineBreak: false });
      r.nums.forEach((n, i) => doc.text(n, 260 + i * 50, y, { lineBreak: false }));
      doc.font('Helvetica').text(r.pct[0], 670, y, { lineBreak: false }).text(r.pct[1], 730, y, { lineBreak: false });
      y += 18;
    }
    doc.end();
  });
}
