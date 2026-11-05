export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, 'BAD_REQUEST', msg, details);
export const unauthorized = (msg = 'লগইন করা প্রয়োজন।') => new HttpError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'এই কাজের অনুমতি নেই।') => new HttpError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'পাওয়া যায়নি।') => new HttpError(404, 'NOT_FOUND', msg);
