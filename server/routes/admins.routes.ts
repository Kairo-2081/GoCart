import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { seedDatabaseIfEmpty } from '../db/seed.ts';
import { isAddress, isEmail, isOptionalText, isText, mapAddress, respondApiError } from '../utils.ts';
import { issueAppToken, requireRole, setAuthCookie, TOKEN_TTL_SECONDS } from '../middleware/auth.ts';

const router = Router();

router.get('/api/admins', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_admins_list()`);
    res.json(result.rows.map((a: any) => ({
      Admin_ID: a.id, Username: a.username, Name: a.name, Email: a.email,
      Number: a.number || '', Address: mapAddress(a),
    })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

router.post('/api/admins', requireRole('admin'), async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Username } = req.body;
    if (!isText(Name, 255) || !isEmail(Email) || !isText(Password, 72) ||
      !isOptionalText(Username, 100) || !isText(phoneNum, 50) || !isAddress(Address)) {
      return res.status(400).json({ error: 'Name, email, password, phone, street, city, and postal code are required.' });
    }
    const id = `ADM-${Date.now()}`;
    const hashedPassword = await hashPassword(Password);
    const email = String(Email).trim();
    const name = String(Name).trim();
    const username = String(Username || email.split('@')[0]).trim().toLowerCase();
    const phone = phoneNum.trim();
    const addr = Address;
    const houseName = addr.House_Name || '';
    const street = addr.Street || '';
    const city = addr.City || '';
    const postalCode = addr.Postal_Code || '';
    const addInfo = addr.Additional_Info || '';
    await withTransaction(async (client) => {
      await client.query(
        `SELECT * FROM gocart_admin_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
      );
    });
    const entity = {
      Admin_ID: id, Username: username, Name: name, Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
    };
    const token = await issueAppToken({ sub: id, role: 'admin', email, username, name });
    setAuthCookie(res, token);
    res.status(201).json({ success: true, expiresIn: TOKEN_TTL_SECONDS, role: 'admin', entity });
  } catch (error: any) {
    respondApiError(res, error, 'Error creating administrator:');
  }
});

router.get('/api/stats', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_admin_dashboard_stats()`);
    const row: any = result.rows[0] || {};
    res.json({
      totalCustomers: Number(row.total_customers || 0),
      totalSellers: Number(row.total_sellers || 0), approvedSellers: Number(row.approved_sellers || 0),
      pendingSellers: Number(row.pending_sellers || 0), totalProducts: Number(row.total_products || 0),
      activeProducts: Number(row.active_products || 0), totalOrders: Number(row.total_orders || 0),
      totalRevenue: Number(row.total_revenue || 0), dbProvider: 'Cloud SQL (PostgreSQL - Raw SQL Driver)',
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/api/admin/users', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_admins_users_list()`);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/api/reset-seed', requireRole('admin'), async (_req, res) => {
  try {
    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Database seed completed.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset seed' });
  }
});

export default router;
