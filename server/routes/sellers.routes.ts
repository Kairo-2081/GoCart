import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { mapAddress } from '../utils.ts';
import { issueAppToken, requireRole, TOKEN_TTL_SECONDS } from '../middleware/auth.ts';
import type { Seller } from '../../src/types.ts';

const router = Router();

router.get('/api/sellers', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM sellers ORDER BY created_at DESC`);
    const formatted: Seller[] = result.rows.map((s: any) => ({
      Seller_ID: s.id, Username: s.username, Name: s.name, Email: s.email,
      Number: s.number || '', Address: mapAddress(s), Logo: s.logo || '',
      Description: s.description || '', Status: s.status as any,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

router.post('/api/sellers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Logo, Description, Username } = req.body;
    if (!Name || !Email || !Password || typeof Password !== 'string') return res.status(400).json({ error: 'Name, Email, and Password are required' });
    const id = `SEL-${Date.now()}`;
    const hashedPassword = await hashPassword(Password);
    const logoUrl = Logo || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const phone = phoneNum || '';
    const username = String(Username || Email.split('@')[0]).trim().toLowerCase();
    const addr = Address || {};
    const houseName = addr.House_Name || '';
    const street = addr.Street || '';
    const city = addr.City || '';
    const postalCode = addr.Postal_Code || '';
    const addInfo = addr.Additional_Info || '';
    const email = String(Email).trim();

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
        [id, username, Name.trim(), email, hashedPassword, phone, logoUrl, desc, houseName, street, city, postalCode, addInfo]
      );
      await client.query(
        `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
         VALUES ($1, $2, $3, $4, 'seller', $5, CURRENT_TIMESTAMP)`,
        [`USR-${id}`, username, hashedPassword, email, id]
      );
    });
    const entity: Seller = {
      Seller_ID: id, Username: username, Name: Name.trim(), Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
      Logo: logoUrl, Description: desc, Status: 'pending', Created_At: new Date().toISOString(),
    };
    const token = issueAppToken({ sub: id, role: 'seller', email, username, name: entity.Name });
    res.status(201).json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS, role: 'seller', entity });
  } catch (error: any) {
    console.error('Error creating seller:', error);
    res.status(500).json({ error: 'Failed to create seller' });
  }
});

router.put('/api/sellers/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    if (!['pending', 'approved', 'rejected', 'suspended'].includes(Status)) return res.status(400).json({ error: 'Invalid seller status' });
    const result = await withTransaction((client) => client.query(`UPDATE sellers SET status = $1 WHERE id = $2 RETURNING *`, [Status, id]));
    if (!result.rows.length) return res.status(404).json({ error: 'Seller not found' });
    const s: any = result.rows[0];
    res.json({
      Seller_ID: s.id, Username: s.username, Name: s.name, Email: s.email,
      Number: s.number || '', Address: mapAddress(s), Logo: s.logo || '',
      Description: s.description || '', Status: s.status,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update seller status' });
  }
});

export default router;
