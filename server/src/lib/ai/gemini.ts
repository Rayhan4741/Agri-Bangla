import { AiError, getFetch, sseData, statusToError, type AiProvider, type GenerateOptions } from './types.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Google Gemini via the REST generateContent / streamGenerateContent endpoints. */
export function geminiProvider(apiKey: string, model: string): AiProvider {
  const body = (o: GenerateOptions) => {
    const contents = o.messages.map((m, i) => {
      const parts: Record<string, unknown>[] = [{ text: m.text }];
      if (i === o.messages.length - 1 && m.role === 'user' && o.images?.length) {
        for (const img of o.images) parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
    const generationConfig: Record<string, unknown> = {
      temperature: o.temperature ?? 0.3,
      maxOutputTokens: o.maxOutputTokens ?? 1400,
    };
    if (o.jsonSchema) {
      generationConfig.response_mime_type = 'application/json';
      generationConfig.response_schema = o.jsonSchema;
    }
    return JSON.stringify({ system_instruction: { parts: [{ text: o.system }] }, contents, generationConfig });
  };
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

  const extract = (json: any): string => {
    if (json?.promptFeedback?.blockReason) throw new AiError('BLOCKED', 'প্রশ্নটি নিরাপত্তা নীতির কারণে উত্তর দেওয়া যায়নি।', 422);
    const cand = json?.candidates?.[0];
    if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') {
      throw new AiError('BLOCKED', 'উত্তরটি নিরাপত্তা নীতির কারণে থামানো হয়েছে।', 422);
    }
    return (cand?.content?.parts ?? []).map((p: { text?: string; thought?: boolean }) => (p.thought ? '' : p.text ?? '')).join('');
  };

  return {
    name: 'Google Gemini',
    model,
    supportsImages: true,
    async generate(o) {
      const res = await getFetch()(`${BASE}/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers, body: body(o), signal: o.signal });
      if (!res.ok) throw statusToError(res.status, await res.text().catch(() => ''), 'Gemini');
      const text = extract(await res.json());
      if (!text.trim()) throw new AiError('BAD_RESPONSE', 'Gemini থেকে ফাঁকা উত্তর এসেছে।', 502, true);
      return text;
    },
    async *stream(o) {
      const res = await getFetch()(`${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, { method: 'POST', headers, body: body(o), signal: o.signal });
      if (!res.ok) throw statusToError(res.status, await res.text().catch(() => ''), 'Gemini');
      for await (const data of sseData(res)) {
        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const t = extract(json);
        if (t) yield t;
      }
    },
  };
}
