import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { hashPassword } from '../db/password.ts';
import { isAddress, isEmail, isOptionalText, isText, mapAddress, respondApiError } from '../utils.ts';
import { issueAppToken, requireRole, setAuthCookie, TOKEN_TTL_SECONDS, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

router.get('/api/customers', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_customers_list()`);
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
    if (!isText(Name, 255) || !isEmail(Email) || !isText(Password, 72) ||
      !isOptionalText(Username, 100) || !isText(phoneNum, 50) || !isAddress(Address)) {
      return res.status(400).json({ error: 'Name, email, password, phone, street, city, and postal code are required.' });
    }
    const id = `CUST-${Date.now()}`;
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
        `SELECT * FROM gocart_customer_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
      );
    });
    const entity = {
      Customer_ID: id, Username: username, Name: name, Email: email, Number: phone,
      Address: { House_Name: houseName, Street: street, City: city, Postal_Code: postalCode, Additional_Info: addInfo },
    };
    const token = await issueAppToken({ sub: id, role: 'customer', email, username, name });
    setAuthCookie(res, token);
    res.status(201).json({ success: true, expiresIn: TOKEN_TTL_SECONDS, role: 'customer', entity });
  } catch (error: any) {
    respondApiError(res, error, 'Error creating customer:');
  }
});

router.patch('/api/customers/:id', requireRole('customer', 'admin'), async (req: AuthRequest, res) => {
  try {
    const id = req.user!.role === 'customer' ? req.user!.sub : req.params.id;
    const { Name, Email, Number: phoneNum, Address } = req.body;
    if ((req.user!.role === 'admin' && !/^[A-Za-z0-9_-]{1,64}$/.test(id)) ||
      !isOptionalText(Name, 255) || (Email !== undefined && !isEmail(Email)) ||
      !isOptionalText(phoneNum, 50, true) || (Address !== undefined && !isAddress(Address)) ||
      (Name === undefined && Email === undefined && phoneNum === undefined && Address === undefined)) {
      return res.status(400).json({ error: 'Invalid customer profile fields.' });
    }
    const addr = Address || {};
    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `SELECT * FROM gocart_customer_update($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, Name, Email, phoneNum, addr.House_Name, addr.Street, addr.City, addr.Postal_Code, addr.Additional_Info]
      );
      return result;
    });
    if (!updated.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const c: any = updated.rows[0];
    res.json({ Customer_ID: c.id, Username: c.username, Name: c.name, Email: c.email, Number: c.number || '', Address: mapAddress(c) });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating customer:');
  }
});

export default router;
