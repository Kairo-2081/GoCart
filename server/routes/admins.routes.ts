import { Router } from 'express';
import { query } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { seedDatabaseIfEmpty } from '../db/seed.ts';
import { mapAddress } from '../utils.ts';
import { issueAppToken, requireRole, TOKEN_TTL_SECONDS } from '../middleware/auth.ts';

const router = Router();

router.get('/api/admins', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM admins ORDER BY created_at ASC`);
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
    if (!Name || !Email || !Password || typeof Password !== 'string') return res.status(400).json({ error: 'Name, Email, and Password are required' });
    const id = `ADM-${Date.now()}`;
    const hashedPassword = await hashPassword(Password);
    const email = String(Email).trim();
    const name = String(Name).trim();
    const username = String(Username || email.split('@')[0]).trim().toLowerCase();
    const phone = phoneNum || '';
    const addr = Address || {};
    const houseName = addr.House_Name || '';
    const street = addr.Street || '';
    const city = addr.City || '';
    const postalCode = addr.Postal_Code || '';
    const addInfo = addr.Additional_Info || '';
    await query(
      `INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
      [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
    );
    await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, 'admin', $5, CURRENT_TIMESTAMP)`,
      [`USR-${id}`, username, hashedPassword, email, id]
    );
    const entity = {
      Admin_ID: id, Username: username, Name: name, Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
    };
    const token = issueAppToken({ sub: id, role: 'admin', email, username, name });
    res.status(201).json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS, role: 'admin', entity });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

router.get('/api/stats', requireRole('admin'), async (_req, res) => {
  try {
    const [custRes, sellersRes, prodsRes, ordersRes] = await Promise.all([
      query(`SELECT count(*) as count FROM users WHERE role = 'customer'`),
      query(`SELECT count(*) as total, count(*) FILTER (WHERE status = 'approved') as approved, count(*) FILTER (WHERE status = 'pending') as pending FROM sellers`),
      query(`SELECT count(*) as total, count(*) FILTER (WHERE product_status = 'active') as active FROM products`),
      query(`SELECT count(*) as total, coalesce(sum(subtotal), 0) as revenue FROM orders`),
    ]);
    const custRow: any = custRes.rows[0] || {};
    const sellerRow: any = sellersRes.rows[0] || {};
    const prodRow: any = prodsRes.rows[0] || {};
    const orderRow: any = ordersRes.rows[0] || {};
    res.json({
      totalCustomers: Number(custRow.count || 0),
      totalSellers: Number(sellerRow.total || 0), approvedSellers: Number(sellerRow.approved || 0),
      pendingSellers: Number(sellerRow.pending || 0), totalProducts: Number(prodRow.total || 0),
      activeProducts: Number(prodRow.active || 0), totalOrders: Number(orderRow.total || 0),
      totalRevenue: Number(orderRow.revenue || 0), dbProvider: 'Cloud SQL (PostgreSQL - Raw SQL Driver)',
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/api/admin/users', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT id, username, email, role, entity_id, created_at FROM users ORDER BY created_at DESC`);
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
