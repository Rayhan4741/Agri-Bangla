/**
 * Lightweight Bangla-aware full-text search over the local JSON data.
 * Normalises text, strips common Bangla inflections and scores keyword/title/body matches.
 */
import type { SearchDoc } from '@/types';
import {
  animals,
  crops,
  diseases,
  faqs,
  fertilizerGuides,
  fisheriesGuides,
  glossary,
  hrefFor,
  irrigationGuides,
  learningResources,
  weatherData,
} from './data';

const SUFFIXES = [
  'গুলোর', 'গুলোতে', 'গুলো', 'গুলি', 'দের', 'েরা', 'ের', 'এর', 'য়ের', 'তে', 'টায়', 'টার', 'টির', 'টা', 'টি', 'কে', 'রা', 'য়', 'র', 'ে',
].map((s) => s.normalize('NFC'));
const STOP = new Set(['কী', 'কি', 'কেন', 'কীভাবে', 'কিভাবে', 'কোন', 'কোনো', 'আমার', 'আমি', 'আমাদের', 'হচ্ছে', 'হয়', 'হয়েছে', 'করব', 'করবো', 'করে', 'করা', 'এবং', 'ও', 'বা', 'না', 'এই', 'সেই', 'একটি', 'এক', 'জন্য', 'দিয়ে', 'থেকে', 'পড়েছে', 'যাচ্ছে', 'আছে', 'কত', 'কতটুকু', 'তে', 'the', 'a', 'is', 'my', 'what', 'why', 'how'].map((s) => s.normalize('NFC')));

export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[।,.!?;:"'()[\]{}<>\-–—/\\|+*=#%&৳…“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stem(token: string): string {
  if (/^[a-z0-9]+$/.test(token)) return token.replace(/(ing|es|s)$/, '');
  for (const s of SUFFIXES) {
    if (token.length > s.length + 1 && token.endsWith(s)) return token.slice(0, -s.length);
  }
  return token;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOP.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
}

function doc(d: Omit<SearchDoc, 'text'> & { body: string[] }): SearchDoc {
  return { ...d, text: normalize([d.titleBn, ...d.body].join(' ')) };
}

let INDEX: { doc: SearchDoc; tokens: Set<string>; titleTokens: Set<string>; kw: string[] }[] | null = null;

/** Called after live content replaces the bundled copy. */
export function resetSearchIndex() {
  INDEX = null;
}

export function buildDocs(): SearchDoc[] {
  return [
    ...crops.map((c) =>
      doc({ id: c.id, kind: 'crop', titleBn: c.nameBn, snippetBn: c.descriptionBn, href: hrefFor.crop(c.id), keywords: [...c.keywords, c.nameEn], dataStatus: c.dataStatus, verifyWithIds: c.verifyWithIds,
        body: [c.descriptionBn, ...c.stages.flatMap((s) => [s.nameBn, ...s.tasksBn]), ...c.tipsBn] }),
    ),
    ...diseases.map((d) =>
      doc({ id: d.id, kind: 'disease', titleBn: d.nameBn, snippetBn: d.symptomsBn[0], href: hrefFor.disease(d.id), keywords: [...d.keywords, d.nameEn], dataStatus: d.dataStatus, verifyWithIds: d.verifyWithIds,
        body: [...d.symptomsBn, d.causeBn, d.favorableConditionsBn] }),
    ),
    ...faqs.map((f) =>
      doc({ id: f.id, kind: 'faq', titleBn: f.questionBn, snippetBn: f.answerBn, href: hrefFor.faq(f.id), keywords: f.keywords, dataStatus: f.dataStatus, verifyWithIds: f.verifyWithIds,
        body: [f.answerBn, ...(f.stepsBn ?? [])] }),
    ),
    ...fertilizerGuides.map((g) =>
      doc({ id: g.id, kind: 'fertilizer', titleBn: g.titleBn, snippetBn: g.summaryBn, href: hrefFor.fertilizer(g.id), keywords: g.keywords, dataStatus: g.dataStatus, verifyWithIds: g.verifyWithIds, body: [g.summaryBn, ...g.pointsBn] }),
    ),
    ...irrigationGuides.map((g) =>
      doc({ id: g.id, kind: 'irrigation', titleBn: g.titleBn, snippetBn: g.summaryBn, href: hrefFor.irrigation(g.id), keywords: g.keywords, dataStatus: g.dataStatus, verifyWithIds: g.verifyWithIds, body: [g.summaryBn, ...g.pointsBn] }),
    ),
    ...animals.map((a) =>
      doc({ id: a.id, kind: a.kind, titleBn: a.nameBn, snippetBn: a.overviewBn, href: hrefFor.animal(a.id), keywords: [...a.keywords, a.nameEn], dataStatus: a.dataStatus, verifyWithIds: a.verifyWithIds,
        body: [a.overviewBn, ...a.warningSignsBn, ...a.diseases.map((x) => `${x.nameBn} ${x.signsBn}`), ...a.feedingBn] }),
    ),
    ...fisheriesGuides.map((g) =>
      doc({ id: g.id, kind: 'fisheries', titleBn: g.titleBn, snippetBn: g.summaryBn, href: hrefFor.fisheries(g.id), keywords: g.keywords, dataStatus: g.dataStatus, verifyWithIds: g.verifyWithIds, body: [g.summaryBn, ...g.pointsBn] }),
    ),
    ...weatherData.guides.map((g) =>
      doc({ id: g.id, kind: 'weather', titleBn: g.titleBn, snippetBn: g.summaryBn, href: hrefFor.weather(g.id), keywords: g.keywords, dataStatus: g.dataStatus, verifyWithIds: g.verifyWithIds, body: [g.summaryBn, ...g.beforeBn, ...g.duringBn, ...g.afterBn] }),
    ),
    ...learningResources.map((l) =>
      doc({ id: l.id, kind: 'learn', titleBn: l.titleBn, snippetBn: l.summaryBn, href: hrefFor.learn(l.id), keywords: [l.topic], dataStatus: l.dataStatus, verifyWithIds: l.verifyWithIds, body: [l.summaryBn, ...l.contentBn] }),
    ),
    ...glossary.map((g) =>
      doc({ id: g.id, kind: 'glossary', titleBn: g.termBn, snippetBn: g.definitionBn, href: `/learn#glossary`, keywords: [g.termEn], dataStatus: 'illustrative', verifyWithIds: [], body: [g.definitionBn] }),
    ),
  ];
}

function getIndex() {
  if (!INDEX) {
    INDEX = buildDocs().map((d) => ({
      doc: d,
      tokens: new Set(tokenize(d.text)),
      titleTokens: new Set(tokenize(d.titleBn)),
      kw: d.keywords.map((k) => normalize(k)),
    }));
  }
  return INDEX;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

export function search(query: string, opts: { kinds?: SearchDoc['kind'][]; limit?: number; boostIds?: string[] } = {}): SearchHit[] {
  const q = normalize(query);
  const qTokens = tokenize(query);
  if (!q || qTokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const entry of getIndex()) {
    if (opts.kinds && !opts.kinds.includes(entry.doc.kind)) continue;
    let score = 0;
    for (const k of entry.kw) {
      if (k && q.includes(k)) score += 3 + Math.min(k.length / 4, 3);
    }
    for (const t of qTokens) {
      if (entry.titleTokens.has(t)) score += 3;
      else if (entry.tokens.has(t)) score += 1;
      else if (t.length >= 3) {
        for (const dt of entry.tokens) {
          if (dt.length >= 3 && (dt.startsWith(t) || t.startsWith(dt))) {
            score += 0.5;
            break;
          }
        }
      }
    }
    if (opts.boostIds?.includes(entry.doc.id)) score += 2;
    if (score > 0) hits.push({ doc: entry.doc, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, opts.limit ?? 10);
}
