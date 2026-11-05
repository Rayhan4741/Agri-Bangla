/**
 * Optional "direct AI" mode. OFF by default.
 *
 * SECURITY: the API key is typed in by the user, kept only in sessionStorage
 * (cleared when the tab closes) and sent straight from this browser to the provider.
 * Anyone with access to this browser or its network inspector can read it.
 * Never put a private key in source code, .env files or the production build.
 */
export type ProviderKind = 'openai-compatible' | 'anthropic';

export interface AiConfig {
  enabled: boolean;
  provider: ProviderKind;
  baseUrl: string;
  model: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  provider: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
};

const KEY_STORAGE = 'agribangla:aiKey';

export function getSessionKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}
export function setSessionKey(key: string) {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage blocked */
  }
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiImage {
  mediaType: string;
  base64: string;
}

export const SYSTEM_PROMPT = `তুমি "কৃষকবন্ধু", বাংলাদেশের কৃষকদের জন্য একটি সহায়ক। সহজ, সংক্ষিপ্ত বাংলায় উত্তর দাও।
নিয়ম:
১. প্রথমে নিচে দেওয়া "স্থানীয় তথ্য" ব্যবহার করো। সেখানে না থাকলে সাধারণ জ্ঞান থেকে সতর্কভাবে বলো এবং উল্লেখ করো যে এটি স্থানীয় তথ্যভান্ডারে নেই।
২. স্থানীয় তথ্যের বেশিরভাগ "নমুনা তথ্য" (illustrative) — তা উল্লেখ করো এবং প্রয়োগের আগে কৃষি কর্মকর্তার সাথে যাচাই করতে বলো।
৩. কোনো তথ্য, সূত্র, সরকারি কর্মসূচি, ফোন নম্বর, বাজারদর বা আবহাওয়া বানিয়ে বলবে না।
৪. বালাইনাশক বা ওষুধের নাম ও মাত্রা বলবে না; অনুমোদিত পণ্য ও মাত্রার জন্য কৃষি/প্রাণিসম্পদ/মৎস্য কর্মকর্তার পরামর্শ নিতে বলবে।
৫. রোগ ও পশু-পাখির অসুস্থতার প্রশ্নে অনিশ্চয়তা স্পষ্ট করো—সম্ভাব্য কারণ বলো, নিশ্চিত রোগ নির্ণয় নয়।
৬. ছবি দেওয়া থাকলে ছবিতে যা দেখা যাচ্ছে তা বর্ণনা করে সম্ভাব্য কারণগুলো বলো, এবং মনে করিয়ে দাও যে ছবি দেখে নিশ্চিত হওয়া যায় না।`;

export function buildContextBlock(snippets: { title: string; text: string; status: string }[]): string {
  if (!snippets.length) return 'স্থানীয় তথ্য: (প্রাসঙ্গিক কিছু পাওয়া যায়নি)';
  return 'স্থানীয় তথ্য:\n' + snippets.map((s, i) => `[${i + 1}] ${s.title} (${s.status === 'illustrative' ? 'নমুনা তথ্য' : s.status})\n${s.text.slice(0, 700)}`).join('\n\n');
}

export class AiError extends Error {
  constructor(
    message: string,
    public code: 'no-key' | 'no-model' | 'offline' | 'auth' | 'rate' | 'http' | 'network' | 'bad-response',
  ) {
    super(message);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function callOpenAICompatible(cfg: AiConfig, key: string, system: string, messages: AiMessage[], image?: AiImage, signal?: AbortSignal) {
  const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const msgs: any[] = [{ role: 'system', content: system }];
  messages.forEach((m, i) => {
    const isLast = i === messages.length - 1;
    if (isLast && image && m.role === 'user') {
      msgs.push({ role: 'user', content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } }] });
    } else msgs.push({ role: m.role, content: m.content });
  });
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: cfg.model, messages: msgs, temperature: 0.3, max_tokens: 800 }),
  });
  if (!res.ok) throw httpError(res.status);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new AiError('প্রত্যাশিত উত্তর পাওয়া যায়নি।', 'bad-response');
  return text;
}

async function callAnthropic(cfg: AiConfig, key: string, system: string, messages: AiMessage[], image?: AiImage, signal?: AbortSignal) {
  const url = (cfg.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '') + '/messages';
  const msgs = messages.map((m, i) => {
    const isLast = i === messages.length - 1;
    if (isLast && image && m.role === 'user') {
      return { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } }, { type: 'text', text: m.content }] };
    }
    return { role: m.role, content: m.content };
  });
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: cfg.model, system, max_tokens: 800, messages: msgs }),
  });
  if (!res.ok) throw httpError(res.status);
  const json = await res.json();
  const text = (json?.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  if (!text) throw new AiError('প্রত্যাশিত উত্তর পাওয়া যায়নি।', 'bad-response');
  return text;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function httpError(status: number) {
  if (status === 401 || status === 403) return new AiError('API কী সঠিক নয় বা অনুমতি নেই।', 'auth');
  if (status === 429) return new AiError('অনেক বেশি অনুরোধ—কিছুক্ষণ পর চেষ্টা করুন।', 'rate');
  return new AiError(`সার্ভার ত্রুটি (HTTP ${status})।`, 'http');
}

export async function askAi(
  cfg: AiConfig,
  messages: AiMessage[],
  context: { title: string; text: string; status: string }[],
  image?: AiImage,
  signal?: AbortSignal,
): Promise<string> {
  const key = getSessionKey();
  if (!key) throw new AiError('API কী দেওয়া হয়নি।', 'no-key');
  if (!cfg.model.trim()) throw new AiError('মডেলের নাম দেওয়া হয়নি।', 'no-model');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AiError('ইন্টারনেট সংযোগ নেই।', 'offline');
  const system = `${SYSTEM_PROMPT}\n\n${buildContextBlock(context)}`;
  try {
    return cfg.provider === 'anthropic'
      ? await callAnthropic(cfg, key, system, messages, image, signal)
      : await callOpenAICompatible(cfg, key, system, messages, image, signal);
  } catch (e) {
    if (e instanceof AiError) throw e;
    if ((e as Error).name === 'AbortError') throw e;
    throw new AiError('নেটওয়ার্ক ত্রুটি বা ব্রাউজার থেকে এই সার্ভারে সরাসরি অনুরোধ অনুমোদিত নয় (CORS)।', 'network');
  }
}

/** Never let a key-looking string end up in exported/stored chat history. */
export function redactSecrets(text: string): string {
  return text.replace(/\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,})\b/g, '[গোপন কী মুছে ফেলা হয়েছে]');
}

