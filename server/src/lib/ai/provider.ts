import { config as defaultConfig, type Config } from '../../config.js';
import { geminiProvider } from './gemini.js';
import { openAiCompatProvider } from './openaiCompat.js';
import { AiError, type AiProvider, type GenerateOptions } from './types.js';

/** Providers in the order they are tried. */
export function providerChain(c: Config = defaultConfig, needImages = false): AiProvider[] {
  const chain: AiProvider[] = [];
  if (c.GEMINI_API_KEY) {
    chain.push(geminiProvider(c.GEMINI_API_KEY, c.GEMINI_MODEL));
    if (c.GEMINI_FALLBACK_MODEL && c.GEMINI_FALLBACK_MODEL !== c.GEMINI_MODEL) chain.push(geminiProvider(c.GEMINI_API_KEY, c.GEMINI_FALLBACK_MODEL));
  }
  if (c.FALLBACK_AI_BASE_URL && c.FALLBACK_AI_API_KEY && c.FALLBACK_AI_MODEL) {
    chain.push(openAiCompatProvider(c.FALLBACK_AI_BASE_URL, c.FALLBACK_AI_API_KEY, c.FALLBACK_AI_MODEL));
  }
  return needImages ? chain.filter((p) => p.supportsImages) : chain;
}

export async function generateWithFallback(o: GenerateOptions, c?: Config): Promise<{ text: string; provider: AiProvider }> {
  const chain = providerChain(c, Boolean(o.images?.length));
  if (!chain.length) throw new AiError('NOT_CONFIGURED', 'AI সংযুক্ত নেই। সার্ভারে GEMINI_API_KEY দিন।', 503);
  let last: unknown;
  for (const p of chain) {
    try {
      return { text: await p.generate(o), provider: p };
    } catch (e) {
      last = e;
      if (!(e instanceof AiError) || !e.retryable) throw e;
    }
  }
  throw last;
}

/**
 * Streams from the first provider that starts successfully. Falls back only before any
 * text has been sent, so the user never sees two half answers.
 */
export async function* streamWithFallback(o: GenerateOptions, c?: Config, onProvider?: (p: AiProvider) => void): AsyncIterable<string> {
  const chain = providerChain(c, Boolean(o.images?.length));
  if (!chain.length) throw new AiError('NOT_CONFIGURED', 'AI সংযুক্ত নেই। সার্ভারে GEMINI_API_KEY দিন।', 503);
  let last: unknown;
  for (const p of chain) {
    let started = false;
    try {
      for await (const chunk of p.stream(o)) {
        if (!started) {
          started = true;
          onProvider?.(p);
        }
        yield chunk;
      }
      if (started) return;
      last = new AiError('BAD_RESPONSE', 'ফাঁকা উত্তর এসেছে।', 502, true);
    } catch (e) {
      if (started) throw e;
      last = e;
      if (!(e instanceof AiError) || !e.retryable) throw e;
    }
  }
  throw last;
}

/** Pulls the first JSON object out of a model reply (tolerates ```json fences). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(t);
  } catch {
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new AiError('BAD_RESPONSE', 'AI-এর উত্তর পড়া যায়নি।', 502, true);
  }
}
