import { getBundle } from './contentStore.js';
import { normalizeText, tokens } from './bn.js';

/**
 * Knowledge retrieval for কৃষকবন্ধু AI and site search.
 * Turns every content record into a flat document, then ranks with a simple
 * BM25-style score on Bangla/English tokens. A few hundred records → no index needed.
 */
export interface KnowledgeDoc {
  id: string;
  kind: 'crop' | 'disease' | 'faq' | 'fertilizer' | 'irrigation' | 'animal' | 'fisheries' | 'weather' | 'learn' | 'glossary';
  titleBn: string;
  href: string;
  dataStatus: string;
  lastVerified: string | null;
  sourceUrls: string[];
  cropIds: string[];
  /** Plain text given to the AI model as context. */
  text: string;
}

type R = Record<string, any>;
const join = (...parts: (string | string[] | undefined | null)[]) =>
  parts
    .flat()
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join('\n');
const bullets = (label: string, items?: string[]) => (items?.length ? `${label}:\n- ${items.join('\n- ')}` : '');

function resourceUrls(ids: string[] | undefined, resources: R[]): string[] {
  return (ids ?? []).map((id) => resources.find((r) => r.id === id)?.url).filter(Boolean);
}

export function buildDocs(files: Record<string, unknown>): KnowledgeDoc[] {
  const list = (t: string) => (Array.isArray(files[t]) ? (files[t] as R[]) : []);
  const resources = list('governmentResources');
  const meta = (r: R) => ({
    dataStatus: r.dataStatus ?? 'illustrative',
    lastVerified: r.lastVerified ?? null,
    sourceUrls: [...resourceUrls(r.sourceIds, resources), ...((r.sourceUrls as string[]) ?? [])],
  });
  const docs: KnowledgeDoc[] = [];

  for (const c of list('crops')) {
    docs.push({
      id: c.id, kind: 'crop', titleBn: `${c.nameBn} (${c.nameEn})`, href: `/crops/${c.id}`, cropIds: [c.id], ...meta(c),
      text: join(
        `ফসল: ${c.nameBn} / ${c.nameEn}`, c.descriptionBn, c.durationBn && `মেয়াদ: ${c.durationBn}`,
        (c.stages ?? []).map((s: R) => `ধাপ — ${s.nameBn}${s.durationBn ? ` (${s.durationBn})` : ''}: ${(s.tasksBn ?? []).join('; ')}`),
        bullets('মাটি', c.soilTypes), bullets('সেচ', c.irrigation), bullets('পরামর্শ', c.tipsBn),
        c.harvestBn && `সংগ্রহ: ${c.harvestBn}`, c.storageBn && `সংরক্ষণ: ${c.storageBn}`, (c.keywords ?? []).join(' '),
      ),
    });
  }
  for (const d of list('cropDiseases')) {
    docs.push({
      id: d.id, kind: 'disease', titleBn: `${d.nameBn} (${d.nameEn})`, href: `/diseases?d=${d.id}`, cropIds: d.cropIds ?? [], ...meta(d),
      text: join(
        `রোগ/সমস্যা: ${d.nameBn} / ${d.nameEn}`, bullets('লক্ষণ', d.symptomsBn), d.causeBn && `কারণ: ${d.causeBn}`,
        d.favorableConditionsBn && `অনুকূল অবস্থা: ${d.favorableConditionsBn}`, bullets('প্রতিরোধ', d.preventionBn),
        bullets('নিরাপদ পরবর্তী পদক্ষেপ', d.safeNextStepsBn), d.whenToSeekHelpBn && `কখন বিশেষজ্ঞ দেখাবেন: ${d.whenToSeekHelpBn}`,
        bullets(
          'সরকারি উৎস থেকে যাচাই করা তথ্য (উৎস উল্লেখ করে বলবে)',
          (d.sourcedFactsBn as R[] | undefined)?.map((f) => `${f.textBn} — উৎস: ${f.sourceBn} (যাচাই ${f.checked})`),
        ),
        (d.keywords ?? []).join(' '),
      ),
    });
  }
  for (const f of list('agriculturalFaq')) {
    docs.push({
      id: f.id, kind: 'faq', titleBn: f.questionBn, href: `/ai-assistant?q=${f.id}`, cropIds: [], ...meta(f),
      text: join(`প্রশ্ন: ${f.questionBn}`, `উত্তর: ${f.answerBn}`, bullets('ধাপ', f.stepsBn), (f.keywords ?? []).join(' ')),
    });
  }
  const topic = (t: string, kind: KnowledgeDoc['kind'], href: (id: string) => string) => {
    for (const g of list(t)) {
      docs.push({
        id: g.id, kind, titleBn: g.titleBn, href: href(g.id), cropIds: g.cropIds ?? [], ...meta(g),
        text: join(g.titleBn, g.summaryBn, bullets('মূল কথা', g.pointsBn), g.cautionBn && `সতর্কতা: ${g.cautionBn}`, (g.keywords ?? []).join(' ')),
      });
    }
  };
  topic('fertilizerGuides', 'fertilizer', (id) => `/fertilizer#${id}`);
  topic('irrigationGuides', 'irrigation', (id) => `/fertilizer#${id}`);
  topic('fisheries', 'fisheries', (id) => `/fisheries#${id}`);
  for (const a of [...list('livestock'), ...list('poultry')]) {
    docs.push({
      id: a.id, kind: 'animal', titleBn: `${a.nameBn} (${a.nameEn})`, href: `/livestock#${a.id}`, cropIds: [], ...meta(a),
      text: join(
        `প্রাণী: ${a.nameBn}`, a.overviewBn, bullets('খাদ্য', a.feedingBn), bullets('পরিচর্যা', a.careBn), bullets('স্বাস্থ্যবিধি', a.hygieneBn),
        bullets('বাসস্থান', a.housingBn), bullets('বিপদসংকেত', a.warningSignsBn),
        (a.diseases ?? []).map((x: R) => `রোগ — ${x.nameBn}: লক্ষণ ${x.signsBn}; করণীয় ${x.actionBn}`), (a.keywords ?? []).join(' '),
      ),
    });
  }
  const wg = files.weatherGuides as R | undefined;
  for (const w of (wg?.guides as R[]) ?? []) {
    docs.push({
      id: w.id, kind: 'weather', titleBn: w.titleBn, href: `/weather#${w.id}`, cropIds: [], ...meta(w),
      text: join(w.titleBn, w.summaryBn, bullets('আগে', w.beforeBn), bullets('চলাকালীন', w.duringBn), bullets('পরে', w.afterBn), (w.keywords ?? []).join(' ')),
    });
  }
  for (const l of list('learningResources')) {
    docs.push({ id: l.id, kind: 'learn', titleBn: l.titleBn, href: `/learn#${l.id}`, cropIds: [], ...meta(l), text: join(l.titleBn, l.summaryBn, l.contentBn) });
  }
  for (const g of list('glossary')) {
    docs.push({
      id: g.id, kind: 'glossary', titleBn: g.termBn, href: `/learn#glossary`, cropIds: [], dataStatus: 'illustrative', lastVerified: null, sourceUrls: [],
      text: `${g.termBn} (${g.termEn}): ${g.definitionBn}`,
    });
  }
  return docs;
}

interface Indexed {
  version: string;
  docs: KnowledgeDoc[];
  tf: Map<string, number>[];
  titleTokens: Set<string>[];
  df: Map<string, number>;
  avgLen: number;
  lens: number[];
}
let indexed: Indexed | null = null;

async function getIndex(): Promise<Indexed> {
  const b = await getBundle();
  if (indexed && indexed.version === b.version) return indexed;
  const docs = buildDocs(b.files);
  const tf: Map<string, number>[] = [];
  const titleTokens: Set<string>[] = [];
  const df = new Map<string, number>();
  const lens: number[] = [];
  for (const d of docs) {
    const m = new Map<string, number>();
    const toks = tokens(d.text);
    for (const t of toks) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(m);
    lens.push(toks.length);
    titleTokens.push(new Set(tokens(d.titleBn)));
  }
  const avgLen = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  indexed = { version: b.version, docs, tf, titleTokens, df, avgLen, lens };
  return indexed;
}

/** Words that are also crop names: "হলুদ" = yellow and turmeric. Never boost a title on them alone. */
const AMBIGUOUS = new Set(['হলুদ', 'হলু']);

export interface Hit {
  doc: KnowledgeDoc;
  score: number;
}

export async function searchKnowledge(query: string, opts: { limit?: number; cropId?: string; kinds?: KnowledgeDoc['kind'][] } = {}): Promise<Hit[]> {
  const idx = await getIndex();
  const q = tokens(query);
  if (!q.length) return [];
  const N = idx.docs.length;
  const k1 = 1.4;
  const b = 0.7;
  const hits: Hit[] = [];
  idx.docs.forEach((doc, i) => {
    if (opts.kinds && !opts.kinds.includes(doc.kind)) return;
    let s = 0;
    for (const t of q) {
      const f = idx.tf[i].get(t);
      if (!f) continue;
      const n = idx.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * idx.lens[i]) / idx.avgLen));
      if (idx.titleTokens[i].has(t) && !AMBIGUOUS.has(t)) s += idf * 0.8;
    }
    if (s <= 0) return;
    if (opts.cropId && doc.cropIds.includes(opts.cropId)) s *= 1.6;
    hits.push({ doc, score: Number(s.toFixed(3)) });
  });
  hits.sort((a, b2) => b2.score - a.score);
  // drop weak tail matches so the AI isn't given off-topic context
  const top = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= top * 0.35).slice(0, opts.limit ?? 6);
}

/** True when the question is about prices, so current TCB prices are added to the AI context. */
export function isPriceQuestion(q: string) {
  return /দাম|দর|বাজার|মূল্য|price|rate|market|টাকা কেজি/.test(normalizeText(q));
}
