import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword, comparePassword, isBcryptHash } from '../db/password.ts';
import { clearAuthCookie, issueAppToken, requireAuth, requireRole, revokeAuthSession, setAuthCookie, TOKEN_TTL_SECONDS, type AppRole, type AuthRequest } from '../middleware/auth.ts';
import { isText, mapAddress, respondApiError } from '../utils.ts';

const router = Router();

function profileFor(role: AppRole, row: any) {
  if (role === 'seller') return {
    Seller_ID: row.id, Username: row.username, Name: row.name, Email: row.email,
    Number: row.number || '', Address: mapAddress(row), Logo: row.logo || '',
    Description: row.description || '', Status: row.status || 'approved',
    Created_At: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
  if (role === 'admin') return {
    Admin_ID: row.id, Username: row.username, Name: row.name, Email: row.email,
    Number: row.number || '', Address: mapAddress(row),
  };
  return {
    Customer_ID: row.id, Username: row.username, Name: row.name, Email: row.email,
    Number: row.number || '', Address: mapAddress(row),
  };
}

async function loginResponse(res: any, role: AppRole, row: any) {
  const entity = profileFor(role, row);
  const token = await issueAppToken({ sub: row.id, role, email: row.email, username: row.username, name: row.name });
  setAuthCookie(res, token);
  return res.json({ success: true, expiresIn: TOKEN_TTL_SECONDS, role, entity });
}

function getEntityByRole(role: AppRole, id: string) {
  if (role === 'customer') return query(`SELECT * FROM gocart_customer_get($1)`, [id]);
  if (role === 'seller') return query(`SELECT * FROM gocart_seller_get($1)`, [id]);
  return query(`SELECT * FROM gocart_admin_get($1)`, [id]);
}

router.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const result = await getEntityByRole(user.role, user.sub);
    if (!result.rows[0]) return res.status(401).json({ authenticated: false, user: null });
    res.json({ authenticated: true, user: { role: user.role, entity: profileFor(user.role, result.rows[0]) } });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Role changes are never self-service. Kept as a protected legacy endpoint for contract clarity.
router.post('/api/auth/role', requireAuth, requireRole('admin'), (_req, res) =>
  res.status(410).json({ error: 'Role changes are not supported.' })
);

router.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    await revokeAuthSession(req.user!.jti);
    clearAuthCookie(res);
    res.sendStatus(204);
  } catch (error) {
    respondApiError(res, error, 'Error logging out:');
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isText(email, 255) || !isText(password, 72)) {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }
    const cleanInput = email.trim();
    const cleanLower = cleanInput.toLowerCase();

    const userRes = await query(`SELECT * FROM gocart_auth_user_lookup($1, $2)`, [cleanLower, cleanInput]);
    const userMatch: any = userRes.rows[0];
    if (!userMatch || !await comparePassword(password, userMatch.password)) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }
    if (userMatch.password && !isBcryptHash(userMatch.password)) {
      const newHash = await hashPassword(password);
      await withTransaction((client) => client.query(`SELECT gocart_auth_password_update('user', $1, $2)`, [userMatch.id, newHash]));
    }
    const role = userMatch.role as AppRole;
    if (!['customer', 'seller', 'admin'].includes(role)) return res.status(401).json({ error: 'Invalid account role.' });
    const entityRes = await getEntityByRole(role, userMatch.id);
    if (entityRes.rows.length > 0) return await loginResponse(res, role, entityRes.rows[0]);
    return res.status(401).json({ error: `No registered account found for "${cleanInput}". Please create an account first.` });
  } catch (error: any) {
    respondApiError(res, error, 'Error during login:');
  }
});

export default router;
