import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');
const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : def));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: int(5000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/agribangla'),
  JWT_SECRET: z.string().default(''),
  CORS_ORIGINS: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-3.5-flash'),
  FALLBACK_AI_BASE_URL: z.string().default(''),
  FALLBACK_AI_API_KEY: z.string().default(''),
  FALLBACK_AI_MODEL: z.string().default(''),
  AI_CHAT_PER_MINUTE: int(12),
  AI_CHAT_PER_DAY: int(150),
  AI_DIAGNOSE_PER_MINUTE: int(4),
  AI_DIAGNOSE_PER_DAY: int(30),
  TCB_AUTOFETCH: bool,
  TCB_LIST_URL: z.string().default('https://tcb.gov.bd/pages/daily-rmps'),
  TCB_FETCH_HOUR_BD: int(15),
  CLIENT_DIST: z.string().default(''),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = schema.parse(env);
  if (!cfg.JWT_SECRET) {
    if (cfg.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production.');
    cfg.JWT_SECRET = 'dev-only-insecure-secret-change-me';
  }
  return cfg;
}

export const config = loadConfig();

export const aiConfigured = (c: Config = config) => Boolean(c.GEMINI_API_KEY || (c.FALLBACK_AI_BASE_URL && c.FALLBACK_AI_API_KEY && c.FALLBACK_AI_MODEL));
