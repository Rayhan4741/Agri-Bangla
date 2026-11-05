import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './httpError.js';

/** Parses `data` with a zod schema and throws a 400 with readable issues on failure. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw badRequest(
      'ইনপুট সঠিক নয়।',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}
