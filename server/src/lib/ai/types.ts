export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}
export interface ImagePart {
  mimeType: string;
  base64: string;
}
export interface GenerateOptions {
  system: string;
  messages: ChatMsg[];
  /** Attached to the last user message. */
  images?: ImagePart[];
  /** Ask for JSON matching this (Gemini OpenAPI-subset) schema. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}
export interface AiProvider {
  name: string;
  model: string;
  supportsImages: boolean;
  generate(o: GenerateOptions): Promise<string>;
  stream(o: GenerateOptions): AsyncIterable<string>;
}

export class AiError extends Error {
  constructor(
    public code: 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'BLOCKED' | 'UPSTREAM' | 'BAD_RESPONSE',
    message: string,
    public status = 502,
    /** Whether trying another model/provider might help. */
    public retryable = false,
  ) {
    super(message);
  }
}

export type FetchLike = typeof fetch;
let fetchImpl: FetchLike = (...a) => globalThis.fetch(...a);
export const getFetch = () => fetchImpl;
/** Tests replace the network with a stub. */
export function __setFetch(f: FetchLike | null) {
  fetchImpl = f ?? ((...a) => globalThis.fetch(...a));
}

/** Reads a fetch Response body as Server-Sent Events and yields each `data:` payload. */
export async function* sseData(res: Response): AsyncIterable<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.search(/\r?\n\r?\n/)) >= 0) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx).replace(/^\r?\n\r?\n/, '');
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) yield data;
    }
  }
  const rest = buf.trim();
  if (rest.startsWith('data:')) yield rest.slice(5).trimStart();
}

export function statusToError(status: number, body: string, who: string): AiError {
  if (status === 429) return new AiError('RATE_LIMITED', `${who}: ব্যবহারের সীমা শেষ (429)।`, 429, true);
  if (status === 401 || status === 403) return new AiError('NOT_CONFIGURED', `${who}: API কী সঠিক নয় বা অনুমতি নেই (${status})।`, 502, true);
  if (status === 404) return new AiError('UPSTREAM', `${who}: মডেল পাওয়া যায়নি (404)। মডেলের নাম যাচাই করুন।`, 502, true);
  return new AiError('UPSTREAM', `${who}: সার্ভার ত্রুটি (${status}) ${body.slice(0, 160)}`, 502, status >= 500);
}
