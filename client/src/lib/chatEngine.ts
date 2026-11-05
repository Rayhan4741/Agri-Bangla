/**
 * কৃষকবন্ধু local engine — a knowledge-based demo (NOT a live AI or diagnosis system).
 * It detects simple intents, retrieves matching guidance from local JSON and composes an answer.
 * The same retrieval is reused to ground the optional direct-AI mode.
 */
import type { DataStatus, GovernmentResource, SearchDoc } from '@/types';
import { crops, faqs, getCrop, resourcesFor } from './data';
import { normalize, search, type SearchHit } from './search';

export type Intent =
  | 'greeting'
  | 'disease'
  | 'fertilizer'
  | 'irrigation'
  | 'livestock'
  | 'poultry'
  | 'fisheries'
  | 'weather'
  | 'market'
  | 'calculator'
  | 'crop'
  | 'general';

const INTENT_WORDS: Record<Exclude<Intent, 'general' | 'crop'>, string[]> = {
  greeting: ['হ্যালো', 'হাই', 'আসসালামু', 'সালাম', 'নমস্কার', 'শুভ সকাল', 'hello', 'hi'],
  disease: ['রোগ', 'দাগ', 'পোকা', 'হলুদ', 'পচা', 'পচে', 'শুকিয়ে', 'কোঁকড়', 'কুঁকড়', 'ছিদ্র', 'ঝরে', 'মরে', 'ধসা', 'ব্লাস্ট', 'ভাইরাস', 'সাদা', 'কালো', 'নুয়ে', 'ঢলে'],
  fertilizer: ['সার', 'ইউরিয়া', 'টিএসপি', 'পটাশ', 'জিপসাম', 'দস্তা', 'কম্পোস্ট', 'মাটি পরীক্ষা'],
  irrigation: ['সেচ', 'পানি দেব', 'এডব্লিউডি', 'awd', 'নিষ্কাশন'],
  livestock: ['গরু', 'গাভী', 'বাছুর', 'ছাগল', 'ভেড়া', 'মহিষ', 'জাবর', 'পশু'],
  poultry: ['মুরগি', 'হাঁস', 'ডিম', 'ব্রয়লার', 'লেয়ার', 'বাচ্চা মুরগি'],
  fisheries: ['মাছ', 'পুকুর', 'পোনা', 'চুন', 'রুই', 'কাতলা', 'তেলাপিয়া', 'পাঙ্গাস'],
  weather: ['আবহাওয়া', 'বৃষ্টি', 'বন্যা', 'খরা', 'ঝড়', 'কুয়াশা', 'শীত', 'গরম', 'তাপ', 'ঘূর্ণিঝড়'],
  market: ['দাম', 'বাজার', 'দর', 'বিক্রি', 'price'],
  calculator: ['হিসাব', 'কত কেজি', 'রূপান্তর', 'শতাংশ', 'বিঘা', 'একর', 'হেক্টর', 'লাভ', 'খরচ'],
};

const VET_INTENTS: Intent[] = ['livestock', 'poultry'];

export function detectIntents(text: string): Intent[] {
  const q = normalize(text);
  const found: Intent[] = [];
  for (const [intent, words] of Object.entries(INTENT_WORDS) as [Intent, string[]][]) {
    if (words.some((w) => q.includes(normalize(w)))) found.push(intent);
  }
  if (detectCrop(text)) found.push('crop');
  return found.length ? found : ['general'];
}

// Crop names that are also everyday symptom words ("হলুদ" = turmeric / yellow).
const AMBIGUOUS_CROP_WORDS = new Set(['হলুদ'].map((w) => normalize(w)));

export function detectCrop(text: string): string | undefined {
  const q = normalize(text);
  let best: { id: string; len: number } | undefined;
  for (const c of crops) {
    for (const k of [c.nameBn, ...c.keywords]) {
      const nk = normalize(k);
      if (AMBIGUOUS_CROP_WORDS.has(nk)) continue;
      if (nk.length >= 2 && q.includes(nk) && (!best || nk.length > best.len)) best = { id: c.id, len: nk.length };
    }
  }
  return best?.id;
}

export interface ChatCard {
  title: string;
  href: string;
  snippet: string;
  kind: SearchDoc['kind'];
  status: DataStatus;
}

export interface ChatAnswer {
  matched: boolean;
  intents: Intent[];
  text: string;
  steps?: string[];
  cards: ChatCard[];
  sources: GovernmentResource[];
  followUps: string[];
  status: DataStatus;
  uncertainty?: string;
  cropId?: string;
}

const KIND_KINDS: Partial<Record<Intent, SearchDoc['kind'][]>> = {
  disease: ['disease', 'faq', 'crop'],
  fertilizer: ['fertilizer', 'faq', 'crop'],
  irrigation: ['irrigation', 'faq', 'crop', 'weather'],
  livestock: ['livestock', 'faq'],
  poultry: ['poultry', 'faq'],
  fisheries: ['fisheries', 'faq'],
  weather: ['weather', 'faq'],
  market: ['faq'],
};

const UNCERTAIN_PLANT = 'এটি শুধুমাত্র লক্ষণভিত্তিক সম্ভাব্য কারণ, নিশ্চিত রোগ নির্ণয় নয়। একই ধরনের লক্ষণ ভিন্ন কারণেও হতে পারে। নিশ্চিত হতে উপসহকারী কৃষি কর্মকর্তা বা উপজেলা কৃষি অফিসের পরামর্শ নিন।';
const UNCERTAIN_VET = 'আমি পশু চিকিৎসক নই এবং এটি রোগ নির্ণয় নয়। পশু-পাখি অসুস্থ হলে দেরি না করে উপজেলা প্রাণিসম্পদ অফিস বা রেজিস্টার্ড পশু চিকিৎসকের সাথে যোগাযোগ করুন।';

export const DEFAULT_FOLLOWUPS = ['আমার ধানের পাতা হলুদ হচ্ছে কেন?', 'টমেটোর পাতায় দাগ পড়েছে।', 'এক বিঘা জমিতে কী পরিমাণ সার প্রয়োজন?', 'গরু খাবার খাচ্ছে না, কী করব?', 'পুকুরের মাছ পানির ওপরে উঠে আসছে কেন?'];

function toCard(h: SearchHit): ChatCard {
  return { title: h.doc.titleBn, href: h.doc.href, snippet: h.doc.snippetBn, kind: h.doc.kind, status: h.doc.dataStatus };
}

/** Retrieval used both by the local engine and to ground optional direct-AI answers. */
export function retrieve(question: string, cropId?: string, limit = 6): SearchHit[] {
  const crop = getCrop(cropId ?? detectCrop(question));
  const q = crop && !normalize(question).includes(normalize(crop.nameBn)) ? `${question} ${crop.nameBn}` : question;
  const intents = detectIntents(q);
  const kinds = [...new Set(intents.flatMap((i) => KIND_KINDS[i] ?? []))];
  const boostIds = crop ? [crop.id, ...crop.diseaseIds] : [];
  const hits = search(q, { kinds: kinds.length ? kinds : undefined, limit, boostIds });
  return hits.length ? hits : search(q, { limit, boostIds });
}

export function answer(question: string, ctx: { cropId?: string } = {}): ChatAnswer {
  const intents = detectIntents(question);
  const cropId = ctx.cropId || detectCrop(question);
  const isVet = intents.some((i) => VET_INTENTS.includes(i));
  const isPlant = intents.includes('disease') && !isVet;

  if (intents.length === 1 && intents[0] === 'greeting') {
    return {
      matched: true,
      intents,
      text: 'আসসালামু আলাইকুম! আমি কৃষকবন্ধু — কৃষিবাংলার স্থানীয় তথ্যভান্ডার থেকে উত্তর খুঁজে দিই। ফসল, রোগ-পোকা, সার, সেচ, গবাদিপশু, হাঁস-মুরগি বা মাছ নিয়ে প্রশ্ন করুন।',
      cards: [],
      sources: [],
      followUps: DEFAULT_FOLLOWUPS.slice(0, 3),
      status: 'illustrative',
    };
  }

  // Exact/near FAQ first: it carries curated steps and follow-ups.
  const faqHits = search(question, { kinds: ['faq'], limit: 3, boostIds: cropId ? [] : undefined });
  const hits = retrieve(question, cropId, 8);
  const topFaq = faqHits[0];
  const faq = topFaq && topFaq.score >= 6 ? faqs.find((f) => f.id === topFaq.doc.id) : undefined;

  if (!faq && hits.length === 0) {
    return {
      matched: false,
      intents,
      text: 'দুঃখিত, এই প্রশ্নের উত্তর আমার স্থানীয় তথ্যভান্ডারে খুঁজে পাইনি। প্রশ্নটি অন্যভাবে লিখে দেখুন (যেমন ফসলের নাম ও লক্ষণ উল্লেখ করে), অথবা নিচের সরকারি সেবায় যোগাযোগ করুন।',
      cards: [],
      sources: resourcesFor(isVet ? ['dls'] : intents.includes('fisheries') ? ['dof'] : ['dae']),
      followUps: DEFAULT_FOLLOWUPS.slice(0, 3),
      status: 'illustrative',
      uncertainty: isVet ? UNCERTAIN_VET : undefined,
    };
  }

  // Keep cards on-topic: other crops' pages and off-domain FAQs are noise.
  const domain = intents.find((i): i is 'livestock' | 'poultry' | 'fisheries' => i === 'livestock' || i === 'poultry' || i === 'fisheries');
  const faqCategory = new Map(faqs.map((f) => [f.id, f.category]));
  const cards = hits
    .filter((h) => !faq || h.doc.id !== faq.id)
    .filter((h) => h.doc.kind !== 'crop' || !cropId || h.doc.id === cropId)
    .filter((h) => h.doc.kind !== 'crop' || cropId)
    .filter((h) => {
      if (!domain) return true;
      if (h.doc.kind === 'faq') return faqCategory.get(h.doc.id) === domain;
      return h.doc.kind === domain;
    })
    .slice(0, 4)
    .map(toCard);
  const relatedIds = faq?.relatedIds ?? [];
  const verify = new Set<string>([...(faq?.verifyWithIds ?? []), ...hits.slice(0, 3).flatMap((h) => h.doc.verifyWithIds)]);
  if (isVet) verify.add('dls');
  const crop = getCrop(cropId);

  let text: string;
  if (faq) {
    text = faq.answerBn;
  } else {
    const top = hits[0].doc;
    text = `${crop ? `${crop.nameBn} সম্পর্কে ` : ''}আপনার প্রশ্নের সাথে সবচেয়ে মিল পাওয়া তথ্য: “${top.titleBn}”। ${top.snippetBn}`;
    if (hits.length > 1) text += ' নিচে সম্পর্কিত আরও নির্দেশিকা দেওয়া হলো।';
  }

  const followUps = faq?.followUpsBn.length
    ? faq.followUpsBn
    : crop
      ? [`${crop.nameBn} চাষের ধাপগুলো কী?`, `${crop.nameBn}-এর প্রধান রোগ কী কী?`]
      : DEFAULT_FOLLOWUPS.filter((f) => f !== question).slice(0, 3);

  return {
    matched: true,
    intents,
    text,
    steps: faq?.stepsBn,
    cards: relatedIds.length ? [...cards.filter((c) => relatedIds.some((r) => c.href.includes(r))), ...cards.filter((c) => !relatedIds.some((r) => c.href.includes(r)))].slice(0, 4) : cards,
    sources: resourcesFor([...verify]).slice(0, 3),
    followUps,
    status: faq?.dataStatus ?? hits[0].doc.dataStatus,
    uncertainty: isVet || faq?.needsExpert && faq.category.match(/livestock|poultry/) ? UNCERTAIN_VET : isPlant || faq?.needsExpert ? UNCERTAIN_PLANT : undefined,
    cropId,
  };
}

/** Plain-text rendering of an answer (used for read-aloud and sharing). */
export function answerToPlainText(a: ChatAnswer): string {
  return [a.text, ...(a.steps ?? []).map((s, i) => `${i + 1}. ${s}`), a.uncertainty ?? ''].filter(Boolean).join('\n');
}
