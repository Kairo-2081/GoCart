import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword, comparePassword, isBcryptHash } from '../db/password.ts';
import { issueAppToken, requireAuth, requireRole, TOKEN_TTL_SECONDS, type AppRole, type AuthRequest } from '../middleware/auth.ts';
import { mapAddress } from '../utils.ts';

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

function loginResponse(res: any, role: AppRole, row: any) {
  const entity = profileFor(role, row);
  const token = issueAppToken({ sub: row.id, role, email: row.email, username: row.username, name: row.name });
  return res.json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS, role, entity });
}

router.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const table = user.role === 'customer' ? 'customers' : user.role === 'seller' ? 'sellers' : 'admins';
    const result = await query(`SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [user.sub]);
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

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !email.trim() || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }
    const cleanInput = email.trim();
    const cleanLower = cleanInput.toLowerCase();

    const userRes = await query(
      `SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1 OR id = $2 LIMIT 1`,
      [cleanLower, cleanInput]
    );
    if (userRes.rows.length > 0) {
      const userMatch: any = userRes.rows[0];
      const isMatch = await comparePassword(password, userMatch.password);
      if (!isMatch) return res.status(401).json({ error: 'Incorrect password for this account. Please try again.' });
      if (userMatch.password && !isBcryptHash(userMatch.password)) {
        const newHash = await hashPassword(password);
        await withTransaction((client) => client.query(`UPDATE users SET password = $1 WHERE id = $2`, [newHash, userMatch.id]));
      }
      const role = userMatch.role as AppRole;
      if (!['customer', 'seller', 'admin'].includes(role)) return res.status(401).json({ error: 'Invalid account role.' });
      const table = role === 'seller' ? 'sellers' : role === 'admin' ? 'admins' : 'customers';
      const entityRes = await query(`SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [userMatch.entity_id]);
      if (entityRes.rows.length > 0) return loginResponse(res, role, entityRes.rows[0]);
    }

    // Legacy databases may have entity accounts but no matching row in users.
    const adminRes = await query(
      `SELECT * FROM admins WHERE LOWER(email) = $1 OR LOWER(username) = $1 OR id = $2 LIMIT 1`,
      [cleanLower, cleanInput]
    );
    if (adminRes.rows.length > 0) {
      const row: any = adminRes.rows[0];
      if (!await comparePassword(password, row.password)) return res.status(401).json({ error: 'Incorrect password for this Admin account. Please try again.' });
      if (row.password && !isBcryptHash(row.password)) await withTransaction(async (client) => client.query(`UPDATE admins SET password = $1 WHERE id = $2`, [await hashPassword(password), row.id]));
      return loginResponse(res, 'admin', row);
    }

    const sellerRes = await query(
      `SELECT * FROM sellers WHERE LOWER(email) = $1 OR LOWER(username) = $1 OR id = $2 LIMIT 1`,
      [cleanLower, cleanInput]
    );
    if (sellerRes.rows.length > 0) {
      const row: any = sellerRes.rows[0];
      if (!await comparePassword(password, row.password)) return res.status(401).json({ error: 'Incorrect password for this Seller account. Please try again.' });
      if (row.password && !isBcryptHash(row.password)) await withTransaction(async (client) => client.query(`UPDATE sellers SET password = $1 WHERE id = $2`, [await hashPassword(password), row.id]));
      return loginResponse(res, 'seller', row);
    }

    const customerRes = await query(
      `SELECT * FROM customers WHERE LOWER(email) = $1 OR LOWER(username) = $1 OR id = $2 LIMIT 1`,
      [cleanLower, cleanInput]
    );
    if (customerRes.rows.length > 0) {
      const row: any = customerRes.rows[0];
      if (!await comparePassword(password, row.password)) return res.status(401).json({ error: 'Incorrect password for this Customer account. Please try again.' });
      if (row.password && !isBcryptHash(row.password)) await withTransaction(async (client) => client.query(`UPDATE customers SET password = $1 WHERE id = $2`, [await hashPassword(password), row.id]));
      return loginResponse(res, 'customer', row);
    }
    return res.status(401).json({ error: `No registered account found for "${cleanInput}". Please create an account first.` });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login authentication failed' });
  }
});

export default router;
