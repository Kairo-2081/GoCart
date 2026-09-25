import { Router } from 'express';
import { query } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { mapAddress } from '../utils.ts';
import { issueAppToken, requireRole, TOKEN_TTL_SECONDS, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

router.get('/api/customers', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM customers ORDER BY created_at ASC`);
    res.json(result.rows.map((c: any) => ({
      Customer_ID: c.id, Username: c.username, Name: c.name, Email: c.email,
      Number: c.number || '', Address: mapAddress(c),
    })));
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/api/customers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Username } = req.body;
    if (!Name || !Email || !Password || typeof Password !== 'string') return res.status(400).json({ error: 'Name, Email, and Password are required' });
    const id = `CUST-${Date.now()}`;
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
      `INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
      [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
    );
    await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, 'customer', $5, CURRENT_TIMESTAMP)`,
      [`USR-${id}`, username, hashedPassword, email, id]
    );
    const entity = {
      Customer_ID: id, Username: username, Name: name, Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
    };
    const token = issueAppToken({ sub: id, role: 'customer', email, username, name });
    res.status(201).json({ success: true, token, expiresIn: TOKEN_TTL_SECONDS, role: 'customer', entity });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/api/customers/:id', requireRole('customer', 'admin'), async (req: AuthRequest, res) => {
  try {
    const id = req.user!.role === 'customer' ? req.user!.sub : req.params.id;
    const { Name, Email, Number: phoneNum, Address } = req.body;
    const addr = Address || {};
    const updated = await query(
      `UPDATE customers
       SET name = COALESCE($1, name), email = COALESCE($2, email), number = COALESCE($3, number),
           address_house_name = COALESCE($4, address_house_name), address_street = COALESCE($5, address_street),
           address_city = COALESCE($6, address_city), address_postal_code = COALESCE($7, address_postal_code),
           address_additional_info = COALESCE($8, address_additional_info)
       WHERE id = $9 RETURNING *`,
      [Name, Email, phoneNum, addr.House_Name, addr.Street, addr.City, addr.Postal_Code, addr.Additional_Info, id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const c: any = updated.rows[0];
    if (Email) await query(`UPDATE users SET email = $1 WHERE entity_id = $2 AND role = 'customer'`, [Email, id]);
    res.json({ Customer_ID: c.id, Username: c.username, Name: c.name, Email: c.email, Number: c.number || '', Address: mapAddress(c) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

export default router;
