import { AiError, getFetch, sseData, statusToError, type AiProvider, type GenerateOptions } from './types.js';

/** Any OpenAI-compatible Chat Completions API (Groq, OpenRouter, Together, a local LLM server …). */
export function openAiCompatProvider(baseUrl: string, apiKey: string, model: string): AiProvider {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const body = (o: GenerateOptions, stream: boolean) => {
    const msgs: Record<string, unknown>[] = [{ role: 'system', content: o.system }];
    o.messages.forEach((m, i) => {
      if (i === o.messages.length - 1 && m.role === 'user' && o.images?.length) {
        msgs.push({
          role: 'user',
          content: [{ type: 'text', text: m.text }, ...o.images.map((img) => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }))],
        });
      } else msgs.push({ role: m.role, content: m.text });
    });
    const b: Record<string, unknown> = { model, messages: msgs, temperature: o.temperature ?? 0.3, max_tokens: o.maxOutputTokens ?? 1400, stream };
    if (o.jsonSchema) b.response_format = { type: 'json_object' };
    return JSON.stringify(b);
  };
  return {
    name: 'OpenAI-compatible',
    model,
    supportsImages: false,
    async generate(o) {
      const res = await getFetch()(url, { method: 'POST', headers, body: body(o, false), signal: o.signal });
      if (!res.ok) throw statusToError(res.status, await res.text().catch(() => ''), 'Backup AI');
      const json: any = await res.json();
      const t = json?.choices?.[0]?.message?.content ?? '';
      if (!t.trim()) throw new AiError('BAD_RESPONSE', 'ফাঁকা উত্তর এসেছে।', 502);
      return t;
    },
    async *stream(o) {
      const res = await getFetch()(url, { method: 'POST', headers, body: body(o, true), signal: o.signal });
      if (!res.ok) throw statusToError(res.status, await res.text().catch(() => ''), 'Backup AI');
      for await (const data of sseData(res)) {
        if (data === '[DONE]') break;
        try {
          const t = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (t) yield t as string;
        } catch {
          /* ignore keep-alive lines */
        }
      }
    },
  };
}
