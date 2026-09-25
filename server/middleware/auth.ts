import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

export type AppRole = 'customer' | 'seller' | 'admin';

export interface AppUser extends JwtPayload {
  sub: string;
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

export function issueAppToken(user: Pick<AppUser, 'sub' | 'role' | 'email' | 'username' | 'name'>): string {
  const options: SignOptions = { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS, subject: user.sub };
  return jwt.sign(
    { role: user.role, email: user.email, username: user.username, name: user.name },
    assertJwtSecret(),
    options
  );
}

function decodeBearer(req: AuthRequest): AppUser | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, assertJwtSecret(), { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub ||
      !['customer', 'seller', 'admin'].includes(String(decoded.role)) ||
      typeof decoded.email !== 'string' || typeof decoded.username !== 'string' || typeof decoded.name !== 'string') {
      return undefined;
    }
    return decoded as AppUser;
  } catch {
    return undefined;
  }
}

const PUBLIC_API_REQUESTS = new Set([
  'GET /api/db/status',
  'GET /api/categories',
  'GET /api/sellers',
  'GET /api/products',
  'GET /api/reviews',
  'POST /api/auth/login',
  'POST /api/customers',
  'POST /api/sellers',
]);

/**
 * Validate credentials before any API handler or body parser runs.
 * Only the login/registration endpoints and public storefront reads are open
 * to guests; all other API requests require a valid app-issued JWT.
 */
export function authenticateApiRequest(req: AuthRequest, res: Response, next: NextFunction) {
  const apiPath = req.path.replace(/\/+$/, '') || '/';
  if (apiPath !== '/api' && !apiPath.startsWith('/api/')) return next();
  if (req.method === 'OPTIONS') return next();

  const isPublic = PUBLIC_API_REQUESTS.has(`${req.method.toUpperCase()} ${apiPath}`);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (isPublic) return next();
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const user = decodeBearer(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  req.user = user;
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = req.user || decodeBearer(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  req.user = user;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  req.user = decodeBearer(req);
  next();
}

export function requireRole(...roles: AppRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    req.user = req.user || decodeBearer(req);
    if (!req.user) return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    next();
  };
}
