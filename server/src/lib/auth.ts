import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { forbidden, unauthorized } from './httpError.js';

export const COOKIE = 'ab_token';
const MAX_AGE_S = 30 * 24 * 3600;

export interface AuthUser {
  id: string;
  role: 'farmer' | 'admin';
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(u: AuthUser) {
  return jwt.sign({ sub: u.id, role: u.role, name: u.name }, config.JWT_SECRET, { expiresIn: MAX_AGE_S });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: MAX_AGE_S * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

/** Reads the cookie (or a Bearer token) when present; never fails. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = (req.cookies?.[COOKIE] as string | undefined) ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (token) {
    try {
      const p = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
      req.user = { id: String(p.sub), role: p.role === 'admin' ? 'admin' : 'farmer', name: String(p.name ?? '') };
    } catch {
      /* expired or tampered token → treated as signed out */
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden());
  next();
}
