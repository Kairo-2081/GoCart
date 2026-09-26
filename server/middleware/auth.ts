import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { query, withTransaction } from '../db/index.ts';

export type AppRole = 'customer' | 'seller' | 'admin';

export interface AppUser extends JwtPayload {
  sub: string;
  jti: string;
  role: AppRole;
  email: string;
  username: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AppUser;
}

export const TOKEN_TTL_SECONDS = 60 * 60;

export function assertJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured and contain at least 32 characters.');
  }
  return secret;
}

export async function issueAppToken(user: Pick<AppUser, 'sub' | 'role' | 'email' | 'username' | 'name'>): Promise<string> {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  await withTransaction((client) => client.query(
    `SELECT gocart_session_create($1, $2, $3)`,
    [jti, user.sub, expiresAt]
  ));
  const options: SignOptions = { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS, subject: user.sub, jwtid: jti };
  return jwt.sign(
    { role: user.role, email: user.email, username: user.username, name: user.name },
    assertJwtSecret(),
    options
  );
}

const AUTH_COOKIE_NAME = 'gocart_session';

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

export function revokeAuthSession(jti: string) {
  return withTransaction((client) => client.query(`SELECT gocart_session_revoke($1)`, [jti]));
}

function requestToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader) return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return undefined;
  }
}

function decodeToken(token?: string): AppUser | undefined {
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, assertJwtSecret(), { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub || typeof decoded.jti !== 'string' ||
      !['customer', 'seller', 'admin'].includes(String(decoded.role)) ||
      typeof decoded.email !== 'string' || typeof decoded.username !== 'string' || typeof decoded.name !== 'string') {
      return undefined;
    }

    return decoded as AppUser;
  } catch {
    return undefined;
  }
}

async function hasActiveSession(jti: string): Promise<boolean> {
  const result = await query(`SELECT gocart_session_active($1) AS active`, [jti]);
  return result.rows[0]?.active === true;
}

const PUBLIC_API_REQUESTS = new Set([
  'POST /api/auth/login',
  'POST /api/customers',
  'POST /api/sellers',
]);

/**
 * Validate credentials before any API handler or body parser runs.
 * Login and customer/seller registration are the only guest API endpoints;
 * every other API request requires a valid app-issued JWT.
 */
export async function authenticateApiRequest(req: AuthRequest, res: Response, next: NextFunction) {
  const apiPath = req.path.replace(/\/+$/, '') || '/';
  if (apiPath !== '/api' && !apiPath.startsWith('/api/')) return next();
  if (req.method === 'OPTIONS') return next();

  const isPublic = PUBLIC_API_REQUESTS.has(`${req.method.toUpperCase()} ${apiPath}`);
  const token = requestToken(req);
  if (!token) {
    if (isPublic) return next();
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const user = decodeToken(token);
  if (!user) {
    if (isPublic) {
      clearAuthCookie(res);
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  try {
    if (!await hasActiveSession(user.jti)) {
      if (isPublic) {
        clearAuthCookie(res);
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized: Session is expired or revoked' });
    }
  } catch (error) {
    return next(error);
  }
  req.user = user;
  return next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = req.user || decodeToken(requestToken(req));
  if (!user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  req.user = user;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  req.user = decodeToken(requestToken(req));
  next();
}

export function requireRole(...roles: AppRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    req.user = req.user || decodeToken(requestToken(req));
    if (!req.user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    next();
  };
}
