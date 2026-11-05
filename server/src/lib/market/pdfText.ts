/**
 * Extracts text lines from a PDF buffer with pdf.js (pure JavaScript, no native deps).
 * Text items are grouped into lines by their baseline (y) and ordered left→right, with
 * extra spaces where the horizontal gap suggests a new table cell.
 */
export async function pdfToLines(data: Uint8Array): Promise<{ lines: string[]; pages: number; hasText: boolean }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: false, disableFontFace: true, verbosity: 0 }).promise;
  const lines: string[] = [];
  let chars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    type Item = { str: string; x: number; y: number; w: number; h: number };
    const items: Item[] = [];
    for (const it of content.items as { str?: string; transform?: number[]; width?: number }[]) {
      if (!it.str || !it.transform) continue;
      items.push({ str: it.str.replace(/\u0000/g, ' '), x: it.transform[4], y: it.transform[5], w: it.width ?? 0, h: Math.abs(it.transform[3]) || 10 });
      chars += it.str.trim().length;
    }
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Item[][] = [];
    // cells of one table row can sit on slightly different baselines (mixed fonts),
    // so the tolerance scales with the font size
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r[0].y - it.y) < Math.max(3, 0.6 * Math.min(r[0].h, it.h)));
      if (row) row.push(it);
      else rows.push([it]);
    }
    for (const r of rows) {
      r.sort((a, b) => a.x - b.x);
      let s = '';
      let end = -Infinity;
      for (const it of r) {
        const gap = it.x - end;
        s += s && gap > 4 ? '  ' + it.str : it.str;
        end = it.x + it.w;
      }
      if (s.trim()) lines.push(s.trim());
    }
    page.cleanup();
  }
  await doc.destroy();
  return { lines, pages: doc.numPages, hasText: chars > 20 };
}
