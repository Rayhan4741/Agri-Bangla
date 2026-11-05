/**
 * Thin client for the AgriBangla Express API.
 * Same origin in production (the server also serves this app); in development Vite proxies /api.
 * Set VITE_API_URL only when the API lives on another domain (it must list this site in CORS_ORIGINS).
 */
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '') + '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function toError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  return new ApiError(res.status, body.error?.code ?? `HTTP_${res.status}`, body.error?.message ?? 'সার্ভার থেকে উত্তর পাওয়া যায়নি।', body.error?.details);
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const { json, timeoutMs = 20000, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError' && rest.signal?.aborted) throw e;
    throw new ApiError(0, 'NETWORK', 'সার্ভারে সংযোগ করা যায়নি।');
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiStream(path: string, json: unknown, signal: AbortSignal, onEvent: (event: string, data: unknown) => void): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(json), signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'সার্ভারে সংযোগ করা যায়নি।');
  }
  if (!res.ok) throw await toError(res);
  if (!res.body) throw new ApiError(0, 'NO_STREAM', 'উত্তর পাওয়া যায়নি।');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data) {
        try {
          onEvent(ev, JSON.parse(data));
        } catch {
          /* ignore malformed event */
        }
      }
    }
  }
}

// ── types shared with the server ─────────────────────────────────────────────
export interface ServerConfig {
  ai: { enabled: boolean; provider: string | null; model: string | null; vision: boolean };
  market: { source: string; autofetch: boolean };
  weather: { provider: string };
}
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'admin';
  profile: Record<string, unknown>;
}
export interface ChatSource {
  n: number;
  id: string;
  kind: string;
  titleBn: string;
  href: string;
  dataStatus: string;
  sourceUrls: string[];
}
export interface DiagnosePossibility {
  nameBn: string;
  nameEn: string;
  likelihood: 'high' | 'medium' | 'low';
  reasonsBn: string[];
  checkBn: string[];
}
export interface DiagnoseResponse {
  result: {
    imageQuality: 'good' | 'unclear' | 'not-a-plant';
    cropSeenBn: string;
    summaryBn: string;
    possibilities: DiagnosePossibility[];
    safeStepsBn: string[];
    seeExpertBn: string;
  };
  matches: ({ diseaseId: string; href: string } | null)[];
  provider: string;
  model: string;
  dosesRemoved: boolean;
  disclaimerBn: string;
}

export function diagnose(image: Blob, fields: { cropId?: string; symptoms?: string; districtId?: string }, signal?: AbortSignal) {
  const fd = new FormData();
  fd.append('image', image, 'photo.jpg');
  for (const [k, v] of Object.entries(fields)) if (v) fd.append(k, v);
  return api<DiagnoseResponse>('/ai/diagnose', { method: 'POST', body: fd, signal, timeoutMs: 60000 });
}

export const LIKELIHOOD_BN = { high: 'বেশি সম্ভাবনা', medium: 'মাঝারি সম্ভাবনা', low: 'কম সম্ভাবনা' } as const;
