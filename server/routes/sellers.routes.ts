import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { isAddress, isEmail, isIdentifier, isOptionalText, isText, mapAddress, respondApiError } from '../utils.ts';
import { issueAppToken, requireRole, setAuthCookie, TOKEN_TTL_SECONDS } from '../middleware/auth.ts';
import type { Seller } from '../../src/types.ts';

const router = Router();

router.get('/api/sellers', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_sellers_list()`);
    const formatted: Seller[] = result.rows.map((s: any) => ({
      Seller_ID: s.id, Username: s.username, Name: s.name, Email: s.email,
      Number: s.number || '', Address: mapAddress(s), Logo: s.logo || '',
      Description: s.description || '', Status: s.status as any,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    respondApiError(res, error, 'Error fetching sellers:');
  }
});

router.post('/api/sellers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Logo, Description, Username } = req.body;
    if (!isText(Name, 255) || !isEmail(Email) || !isText(Password, 72) ||
      !isOptionalText(Username, 100) || !isText(phoneNum, 50) ||
      !isOptionalText(Logo, 2048, true) || !isOptionalText(Description, 10000, true) ||
      !isAddress(Address)) {
      return res.status(400).json({ error: 'Name, email, password, phone, street, city, and postal code are required.' });
    }
    const id = `SEL-${Date.now()}`;
    const hashedPassword = await hashPassword(Password);
    const logoUrl = Logo || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const phone = phoneNum.trim();
    const username = String(Username || Email.split('@')[0]).trim().toLowerCase();
    const addr = Address;
    const houseName = addr.House_Name || '';
    const street = addr.Street || '';
    const city = addr.City || '';
    const postalCode = addr.Postal_Code || '';
    const addInfo = addr.Additional_Info || '';
    const email = String(Email).trim();

    await withTransaction(async (client) => {
      await client.query(
        `SELECT * FROM gocart_seller_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, username, Name.trim(), email, hashedPassword, phone, logoUrl, desc, houseName, street, city, postalCode, addInfo]
      );
    });
    const entity: Seller = {
      Seller_ID: id, Username: username, Name: Name.trim(), Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
      Logo: logoUrl, Description: desc, Status: 'pending', Created_At: new Date().toISOString(),
    };
    const token = await issueAppToken({ sub: id, role: 'seller', email, username, name: entity.Name });
    setAuthCookie(res, token);
    res.status(201).json({ success: true, expiresIn: TOKEN_TTL_SECONDS, role: 'seller', entity });
  } catch (error: any) {
    respondApiError(res, error, 'Error creating seller:');
  }
});

router.put('/api/sellers/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid seller ID.' });
    if (!['pending', 'approved', 'rejected', 'suspended'].includes(Status)) return res.status(400).json({ error: 'Invalid seller status' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_seller_status_update($1, $2)`, [id, Status]));
    if (!result.rows.length) return res.status(404).json({ error: 'Seller not found' });
    const s: any = result.rows[0];
    res.json({
      Seller_ID: s.id, Username: s.username, Name: s.name, Email: s.email,
      Number: s.number || '', Address: mapAddress(s), Logo: s.logo || '',
      Description: s.description || '', Status: s.status,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating seller status:');
  }
});

export default router;
