import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { query, getDatabaseProviderInfo } from './src/db/index.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { getOrCreateUser, updateUserRole } from './src/db/users.ts';
import { hashPassword, comparePassword, isBcryptHash } from './src/db/password.ts';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { Admin, Category, Seller, Customer, Product, Review, Order, CartItem, Address, OrderItem } from './src/types.ts';
import { initialCustomers, initialAdmin, initialSellers } from './src/data/seedData.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Seed Cloud SQL database if empty on server startup
seedDatabaseIfEmpty().catch((err) => {
  console.error('Database seeding check failed on startup:', err);
});

// Helper function to construct structured Address object from SQL table columns
function mapAddress(row: any): Address {
  return {
    House_Name: row.address_house_name || '',
    Street: row.address_street || '',
    City: row.address_city || '',
    Postal_Code: row.address_postal_code || '',
    Additional_Info: row.address_additional_info || '',
  };
}

// --- DATABASE STATUS ENDPOINT (SUPABASE / POSTGRESQL) ---
app.get('/api/db/status', async (req, res) => {
  const providerInfo = getDatabaseProviderInfo();
  try {
    const result = await query(`SELECT 1 as test, current_database() as db_name, version() as pg_version`);
    res.json({
      connected: true,
      provider: providerInfo.provider,
      isSupabase: providerInfo.isSupabase,
      database: result.rows[0]?.db_name || providerInfo.database,
      host: providerInfo.host,
      status: 'Connected & Healthy',
      queryTest: result.rows[0] || null,
    });
  } catch (error: any) {
    console.error('Database Connection Error:', error);
    res.status(500).json({
      connected: false,
      provider: providerInfo.provider,
      isSupabase: providerInfo.isSupabase,
      database: providerInfo.database,
      error: error.message || 'Database connection error',
    });
  }
});

// --- AUTHENTICATION & USER ENDPOINTS ---
app.get('/api/auth/me', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }
    const dbUser = await getOrCreateUser(req.user.uid, req.user.email || 'user@example.com', 'customer', req.user.name);
    res.json({ authenticated: true, user: dbUser });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.post('/api/auth/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body; // 'customer' | 'seller' | 'admin'
    if (!['customer', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await updateUserRole(req.user!.uid, role);
    res.json(updated);
  } catch (error: any) {
    console.error('Error setting user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// --- CATEGORIES API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/categories', async (req, res) => {
  try {
    const result = await query(`SELECT id, name FROM categories ORDER BY name ASC`);
    const formatted: Category[] = result.rows.map((c: any) => ({
      Category_ID: c.id,
      Name: c.name,
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { Name } = req.body;
    if (!Name || !Name.trim()) {
      return res.status(400).json({ error: 'Category Name is required' });
    }
    const id = `CAT-${Date.now()}`;
    await query(`INSERT INTO categories (id, name) VALUES ($1, $2)`, [id, Name.trim()]);
    res.status(201).json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Name } = req.body;
    await query(`UPDATE categories SET name = $1 WHERE id = $2`, [Name.trim(), id]);
    res.json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM categories WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// --- SELLERS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/sellers', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM sellers ORDER BY created_at DESC`);
    const formatted: Seller[] = result.rows.map((s: any) => ({
      Seller_ID: s.id,
      Username: s.username,
      Name: s.name,
      Email: s.email,
      Number: s.number || '',
      Address: mapAddress(s),
      Logo: s.logo || '',
      Description: s.description || '',
      Status: s.status as any,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

app.post('/api/sellers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Logo, Description, Username } = req.body;
    if (!Name || !Email) {
      return res.status(400).json({ error: 'Name and Email are required' });
    }
    const id = `SEL-${Date.now()}`;
    const rawPassword = Password || 'seller123';
    const hashedPassword = await hashPassword(rawPassword);
    const logoUrl = Logo || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const phone = phoneNum || '';
    const username = Username || Email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    const addr = Address || {};
    const houseName = addr.House_Name || '';
    const street = addr.Street || '';
    const city = addr.City || '';
    const postalCode = addr.Postal_Code || '';
    const addInfo = addr.Additional_Info || '';

    await query(
      `INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET name = $3, email = $4, password = $5, number = $6, logo = $7, description = $8,
         address_house_name = $9, address_street = $10, address_city = $11, address_postal_code = $12, address_additional_info = $13`,
      [id, username, Name, Email, hashedPassword, phone, logoUrl, desc, houseName, street, city, postalCode, addInfo]
    );

    // Also register corresponding user in users table
    await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, 'seller', $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET email = $4, password = $3`,
      [`USR-${id}`, username, hashedPassword, Email, id]
    );

    const newSeller: Seller = {
      Seller_ID: id,
      Username: username,
      Name,
      Email,
      Number: phone,
      Address: {
        House_Name: houseName,
        Street: street,
        City: city,
        Postal_Code: postalCode,
        Additional_Info: addInfo,
      },
      Logo: logoUrl,
      Description: desc,
      Status: 'pending',
      Created_At: new Date().toISOString(),
    };
    res.status(201).json(newSeller);
  } catch (error: any) {
    console.error('Error creating seller:', error);
    res.status(500).json({ error: 'Failed to create seller' });
  }
});

app.put('/api/sellers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await query(`UPDATE sellers SET status = $1 WHERE id = $2`, [Status, id]);
    const result = await query(`SELECT * FROM sellers WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Seller not found' });
    const s: any = result.rows[0];
    res.json({
      Seller_ID: s.id,
      Username: s.username,
      Name: s.name,
      Email: s.email,
      Number: s.number || '',
      Address: mapAddress(s),
      Logo: s.logo || '',
      Description: s.description || '',
      Status: s.status,
      Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update seller status' });
  }
});

// --- CUSTOMERS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/customers', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM customers ORDER BY created_at ASC`);
    if (result.rows.length > 0) {
      return res.json(
        result.rows.map((c: any) => ({
          Customer_ID: c.id,
          Username: c.username,
          Name: c.name,
          Email: c.email,
          Number: c.number || '',
          Address: mapAddress(c),
        }))
      );
    }
    return res.json(initialCustomers);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.json(initialCustomers);
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Username } = req.body;
    const id = `CUST-${Date.now()}`;
    const rawPassword = Password || 'password123';
    const hashedPassword = await hashPassword(rawPassword);
    const email = Email || (Username ? `${Username}@gmail.com` : 'customer@gmail.com');
    const name = Name || Username || 'Customer User';
    const username = Username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const phone = phoneNum || '+8801700-000000';

    const addr = Address || {};
    const houseName = addr.House_Name || 'Apt 4B';
    const street = addr.Street || '742 Evergreen Terrace';
    const city = addr.City || 'Barishal';
    const postalCode = addr.Postal_Code || '9777';
    const addInfo = addr.Additional_Info || '';

    await query(
      `INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET name = $3, email = $4, password = $5, number = $6`,
      [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
    );

    await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, 'customer', $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET email = $4, password = $3`,
      [`USR-${id}`, username, hashedPassword, email, id]
    );

    res.status(201).json({
      Customer_ID: id,
      Username: username,
      Name: name,
      Email: email,
      Number: phone,
      Address: {
        House_Name: houseName,
        Street: street,
        City: city,
        Postal_Code: postalCode,
        Additional_Info: addInfo,
      },
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Email, Number: phoneNum, Address } = req.body;
    const addr = Address || {};

    await query(
      `UPDATE customers
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           number = COALESCE($3, number),
           address_house_name = COALESCE($4, address_house_name),
           address_street = COALESCE($5, address_street),
           address_city = COALESCE($6, address_city),
           address_postal_code = COALESCE($7, address_postal_code),
           address_additional_info = COALESCE($8, address_additional_info)
       WHERE id = $9`,
      [Name, Email, phoneNum, addr.House_Name, addr.Street, addr.City, addr.Postal_Code, addr.Additional_Info, id]
    );

    const updated = await query(`SELECT * FROM customers WHERE id = $1`, [id]);
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const c = updated.rows[0];

    res.json({
      Customer_ID: c.id,
      Username: c.username,
      Name: c.name,
      Email: c.email,
      Number: c.number || '',
      Address: mapAddress(c),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// --- ADMINS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/admins', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM admins ORDER BY created_at ASC`);
    if (result.rows.length > 0) {
      return res.json(
        result.rows.map((a: any) => ({
          Admin_ID: a.id,
          Username: a.username,
          Name: a.name,
          Email: a.email,
          Number: a.number || '',
          Address: mapAddress(a),
        }))
      );
    }
    return res.json([initialAdmin]);
  } catch (error: any) {
    res.json([initialAdmin]);
  }
});

app.post('/api/admins', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address, Username } = req.body;
    const id = `ADM-${Date.now()}`;
    const rawPassword = Password || 'admin123';
    const hashedPassword = await hashPassword(rawPassword);
    const email = Email || (Username ? `${Username}@gocart.com` : 'admin@gocart.com');
    const name = Name || Username || 'Admin User';
    const username = Username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const phone = phoneNum || '+88017555-01949';

    const addr = Address || {};
    const houseName = addr.House_Name || 'HQ Tower Floor 15';
    const street = addr.Street || '1 Marketplace Way';
    const city = addr.City || 'Dhaka';
    const postalCode = addr.Postal_Code || '9513';
    const addInfo = addr.Additional_Info || 'GoCart Operations Center';

    await query(
      `INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET name = $3, email = $4, password = $5`,
      [id, username, name, email, hashedPassword, phone, houseName, street, city, postalCode, addInfo]
    );

    await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, 'admin', $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET email = $4, password = $3`,
      [`USR-${id}`, username, hashedPassword, email, id]
    );

    res.status(201).json({
      Admin_ID: id,
      Username: username,
      Name: name,
      Email: email,
      Number: phone,
      Address: {
        House_Name: houseName,
        Street: street,
        City: city,
        Postal_Code: postalCode,
        Additional_Info: addInfo,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// --- AUTHENTICATION LOGIN API (STRICT RAW POSTGRESQL SQL QUERIES WITH BCRYPT HASHING) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !email.trim() || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }

    const cleanInput = email.trim();
    const cleanLower = cleanInput.toLowerCase();

    // 1. Check users table for global authenticated user
    const userRes = await query(
      `SELECT * FROM users 
       WHERE LOWER(username) = $1 
          OR LOWER(email) = $1 
          OR id = $2
       LIMIT 1`,
      [cleanLower, cleanInput]
    );

    if (userRes.rows.length > 0) {
      const userMatch: any = userRes.rows[0];
      const isMatch = await comparePassword(password, userMatch.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password for this account. Please try again.' });
      }

      // If password was stored as plain text, upgrade to bcrypt hash now
      if (userMatch.password && !isBcryptHash(userMatch.password)) {
        const newHash = await hashPassword(password);
        await query(`UPDATE users SET password = $1 WHERE id = $2`, [newHash, userMatch.id]);
      }

      const userRole = userMatch.role;
      const entityId = userMatch.entity_id;

      if (userRole === 'seller') {
        const sellerRes = await query(
          `SELECT * FROM sellers WHERE id = $1 OR LOWER(username) = $2 OR LOWER(email) = $2 LIMIT 1`,
          [entityId, cleanLower]
        );
        if (sellerRes.rows.length > 0) {
          const s = sellerRes.rows[0];
          return res.json({
            success: true,
            role: 'seller',
            entity: {
              Seller_ID: s.id,
              Username: s.username,
              Name: s.name,
              Email: s.email,
              Number: s.number || '',
              Address: mapAddress(s),
              Logo: s.logo || '',
              Description: s.description || '',
              Status: s.status || 'approved',
              Created_At: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
            },
          });
        }
      } else if (userRole === 'admin') {
        const adminRes = await query(
          `SELECT * FROM admins WHERE id = $1 OR LOWER(username) = $2 OR LOWER(email) = $2 LIMIT 1`,
          [entityId, cleanLower]
        );
        if (adminRes.rows.length > 0) {
          const a = adminRes.rows[0];
          return res.json({
            success: true,
            role: 'admin',
            entity: {
              Admin_ID: a.id,
              Username: a.username,
              Name: a.name,
              Email: a.email,
              Number: a.number || '',
              Address: mapAddress(a),
            },
          });
        }
      } else {
        // Customer
        const custRes = await query(
          `SELECT * FROM customers WHERE id = $1 OR LOWER(username) = $2 OR LOWER(email) = $2 LIMIT 1`,
          [entityId, cleanLower]
        );
        if (custRes.rows.length > 0) {
          const c = custRes.rows[0];
          return res.json({
            success: true,
            role: 'customer',
            entity: {
              Customer_ID: c.id,
              Username: c.username,
              Name: c.name,
              Email: c.email,
              Number: c.number || '',
              Address: mapAddress(c),
            },
          });
        }
      }
    }

    // 2. Direct lookup in admins table (exact match)
    const adminRes = await query(
      `SELECT * FROM admins 
       WHERE LOWER(email) = $1 
          OR LOWER(username) = $1
          OR id = $2
       LIMIT 1`,
      [cleanLower, cleanInput]
    );

    if (adminRes.rows.length > 0) {
      const a: any = adminRes.rows[0];
      const isMatch = await comparePassword(password, a.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password for this Admin account. Please try again.' });
      }
      if (a.password && !isBcryptHash(a.password)) {
        const newHash = await hashPassword(password);
        await query(`UPDATE admins SET password = $1 WHERE id = $2`, [newHash, a.id]);
      }
      return res.json({
        success: true,
        role: 'admin',
        entity: {
          Admin_ID: a.id,
          Username: a.username,
          Name: a.name,
          Email: a.email,
          Number: a.number || '',
          Address: mapAddress(a),
        },
      });
    }

    // 3. Direct lookup in sellers table (exact match)
    const sellerRes = await query(
      `SELECT * FROM sellers 
       WHERE LOWER(email) = $1 
          OR LOWER(username) = $1
          OR id = $2
       LIMIT 1`,
      [cleanLower, cleanInput]
    );

    if (sellerRes.rows.length > 0) {
      const matchSeller: any = sellerRes.rows[0];
      const isMatch = await comparePassword(password, matchSeller.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password for this Seller account. Please try again.' });
      }
      if (matchSeller.password && !isBcryptHash(matchSeller.password)) {
        const newHash = await hashPassword(password);
        await query(`UPDATE sellers SET password = $1 WHERE id = $2`, [newHash, matchSeller.id]);
      }
      return res.json({
        success: true,
        role: 'seller',
        entity: {
          Seller_ID: matchSeller.id,
          Username: matchSeller.username,
          Name: matchSeller.name,
          Email: matchSeller.email,
          Number: matchSeller.number || '',
          Address: mapAddress(matchSeller),
          Logo: matchSeller.logo || '',
          Description: matchSeller.description || '',
          Status: matchSeller.status || 'approved',
          Created_At: matchSeller.created_at ? new Date(matchSeller.created_at).toISOString() : new Date().toISOString(),
        },
      });
    }

    // 4. Direct lookup in customers table (exact match)
    const customerRes = await query(
      `SELECT * FROM customers 
       WHERE LOWER(email) = $1 
          OR LOWER(username) = $1
          OR id = $2
       LIMIT 1`,
      [cleanLower, cleanInput]
    );

    if (customerRes.rows.length > 0) {
      const c: any = customerRes.rows[0];
      const isMatch = await comparePassword(password, c.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password for this Customer account. Please try again.' });
      }
      if (c.password && !isBcryptHash(c.password)) {
        const newHash = await hashPassword(password);
        await query(`UPDATE customers SET password = $1 WHERE id = $2`, [newHash, c.id]);
      }
      return res.json({
        success: true,
        role: 'customer',
        entity: {
          Customer_ID: c.id,
          Username: c.username,
          Name: c.name,
          Email: c.email,
          Number: c.number || '',
          Address: mapAddress(c),
        },
      });
    }

    // 5. If no account exists with that username/email
    return res.status(401).json({
      error: `No registered account found for "${cleanInput}". Please create an account first.`,
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login authentication failed' });
  }
});

// --- PRODUCTS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/products', async (req, res) => {
  try {
    const { sellerId, categoryId, search, status } = req.query;

    const result = await query(`SELECT * FROM products ORDER BY id DESC`);
    let rows: any[] = result.rows;

    let formatted: Product[] = rows.map((p) => ({
      Product_ID: p.id,
      Name: p.name,
      Image: p.image || '',
      Description: p.description || '',
      Price: Number(p.price),
      Voucher: p.voucher || '',
      Stock: Number(p.stock),
      Product_Status: p.product_status as any,
      Category_ID: p.category_id,
      Seller_ID: p.seller_id,
      Review_ID: p.review_id || undefined,
    }));

    if (sellerId) {
      formatted = formatted.filter((p) => p.Seller_ID === sellerId);
    }
    if (categoryId && categoryId !== 'all') {
      formatted = formatted.filter((p) => p.Category_ID === categoryId);
    }
    if (status) {
      formatted = formatted.filter((p) => p.Product_Status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      formatted = formatted.filter(
        (p) => p.Name.toLowerCase().includes(q) || p.Description.toLowerCase().includes(q)
      );
    }

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { Name, Image, Description, Price, Voucher, Stock, Category_ID, Seller_ID, Product_Status } = req.body;
    if (!Name || Price === undefined || !Category_ID || !Seller_ID) {
      return res.status(400).json({ error: 'Name, Price, Category, and Seller are required' });
    }

    const sellerCheck = await query(`SELECT * FROM sellers WHERE id = $1`, [Seller_ID]);
    if (sellerCheck.rows.length === 0 || (sellerCheck.rows[0] as any).status !== 'approved') {
      return res.status(403).json({ error: 'Only approved sellers can publish products' });
    }

    const id = `PROD-${Date.now()}`;
    const img = Image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const priceNum = Number(Price);
    const vouch = Voucher || '';
    const stockNum = Number(Stock) || 0;
    const prodStat = Product_Status || 'active';

    await query(
      `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [id, Name, img, desc, priceNum, vouch, stockNum, prodStat, Category_ID, Seller_ID]
    );

    const newProd: Product = {
      Product_ID: id,
      Name,
      Image: img,
      Description: desc,
      Price: priceNum,
      Voucher: vouch,
      Stock: stockNum,
      Product_Status: prodStat,
      Category_ID,
      Seller_ID,
    };
    res.status(201).json(newProd);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const current: any = existing.rows[0];
    const name = req.body.Name ?? current.name;
    const image = req.body.Image ?? current.image;
    const description = req.body.Description ?? current.description;
    const price = req.body.Price !== undefined ? Number(req.body.Price) : Number(current.price);
    const voucher = req.body.Voucher ?? current.voucher;
    const stock = req.body.Stock !== undefined ? Number(req.body.Stock) : Number(current.stock);
    const productStatus = req.body.Product_Status ?? current.product_status;
    const categoryId = req.body.Category_ID ?? current.category_id;

    await query(
      `UPDATE products
       SET name = $1,
           image = $2,
           description = $3,
           price = $4,
           voucher = $5,
           stock = $6,
           product_status = $7,
           category_id = $8
       WHERE id = $9`,
      [name, image, description, price, voucher, stock, productStatus, categoryId, id]
    );

    res.json({
      Product_ID: id,
      Name: name,
      Image: image,
      Description: description,
      Price: price,
      Voucher: voucher,
      Stock: stock,
      Product_Status: productStatus,
      Category_ID: categoryId,
      Seller_ID: current.seller_id,
      Review_ID: current.review_id || undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.put('/api/products/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { Product_Status } = req.body;
    await query(`UPDATE products SET product_status = $1 WHERE id = $2`, [Product_Status, id]);
    res.json({ success: true, id, Product_Status });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM products WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- CART API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/cart', async (req, res) => {
  try {
    const { customerId } = req.query;
    const itemsRes = customerId && typeof customerId === 'string'
      ? await query(`SELECT * FROM cart WHERE customer_id = $1`, [customerId])
      : await query(`SELECT * FROM cart`);

    const productsRes = await query(`SELECT * FROM products`);
    const allProducts: any[] = productsRes.rows;

    const enriched = itemsRes.rows.map((item: any) => {
      const p = allProducts.find((prod) => prod.id === item.product_id);
      return {
        Cart_ID: item.id,
        Customer_ID: item.customer_id,
        Product_ID: item.product_id,
        Quantity: item.quantity,
        Product: p
          ? {
              Product_ID: p.id,
              Name: p.name,
              Image: p.image || '',
              Description: p.description || '',
              Price: Number(p.price),
              Voucher: p.voucher || '',
              Stock: Number(p.stock),
              Product_Status: p.product_status as any,
              Category_ID: p.category_id,
              Seller_ID: p.seller_id,
            }
          : undefined,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const { Customer_ID, Product_ID, Quantity = 1 } = req.body;
    if (!Customer_ID || !Product_ID) {
      return res.status(400).json({ error: 'Customer_ID and Product_ID are required' });
    }

    const existing = await query(
      `SELECT * FROM cart WHERE customer_id = $1 AND product_id = $2 LIMIT 1`,
      [Customer_ID, Product_ID]
    );

    if (existing.rows.length > 0) {
      const currentItem: any = existing.rows[0];
      const newQty = Number(currentItem.quantity) + Number(Quantity);
      await query(`UPDATE cart SET quantity = $1 WHERE id = $2`, [newQty, currentItem.id]);
      return res.json({ Cart_ID: currentItem.id, Customer_ID, Product_ID, Quantity: newQty });
    }

    const cartId = `CART-${Date.now()}`;
    const qty = Number(Quantity);
    await query(
      `INSERT INTO cart (id, customer_id, product_id, quantity)
       VALUES ($1, $2, $3, $4)`,
      [cartId, Customer_ID, Product_ID, qty]
    );

    res.status(201).json({ Cart_ID: cartId, Customer_ID, Product_ID, Quantity: qty });
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

app.put('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const { Quantity } = req.body;
    const qty = Math.max(1, Number(Quantity));
    await query(`UPDATE cart SET quantity = $1 WHERE id = $2`, [qty, cartId]);
    res.json({ Cart_ID: cartId, Quantity: qty });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

app.delete('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    await query(`DELETE FROM cart WHERE id = $1`, [cartId]);
    res.json({ success: true, message: 'Cart item removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// --- ORDERS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/orders', async (req, res) => {
  try {
    const { customerId, sellerId } = req.query;
    const result = await query(`SELECT * FROM orders ORDER BY order_placed_at DESC`);

    let formatted: Order[] = result.rows.map((o: any) => ({
      Order_ID: o.id,
      Tracking_ID: o.tracking_id || '',
      Customer_ID: o.customer_id,
      Items: typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json,
      Subtotal: Number(o.subtotal),
      Shipping_Fee: Number(o.shipping_fee),
      Status: o.status as any,
      Shipping_Address: o.shipping_address_json ? (typeof o.shipping_address_json === 'string' ? JSON.parse(o.shipping_address_json) : o.shipping_address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
      Billing_Address: o.billing_address_json ? (typeof o.billing_address_json === 'string' ? JSON.parse(o.billing_address_json) : o.billing_address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
      Order_Placed_At: o.order_placed_at ? new Date(o.order_placed_at).toISOString() : new Date().toISOString(),
      Additional_Info: o.additional_info || '',
    }));

    if (customerId) {
      formatted = formatted.filter((o) => o.Customer_ID === customerId);
    }
    if (sellerId) {
      formatted = formatted.filter((o) => o.Items.some((item: any) => item.Seller_ID === sellerId));
    }

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { Customer_ID, Items, Shipping_Address, Billing_Address, Subtotal, Shipping_Fee, Additional_Info } = req.body;
    if (!Customer_ID || !Items || !Items.length || !Shipping_Address) {
      return res.status(400).json({ error: 'Customer_ID, Items, and Shipping Address are required' });
    }

    const trackNum1 = Math.floor(1000 + Math.random() * 9000);
    const trackNum2 = Math.floor(1000 + Math.random() * 9000);
    const Tracking_ID = `TRK-${trackNum1}-${trackNum2}`;
    const id = `ORD-${Date.now()}`;
    const itemsJson = JSON.stringify(Items);
    const subtotal = Number(Subtotal) || 0;
    const shippingFee = Number(Shipping_Fee) || 5.0;
    const shipAddrJson = JSON.stringify(Shipping_Address);
    const billAddrJson = JSON.stringify(Billing_Address || Shipping_Address);
    const addInfo = Additional_Info || '';

    await query(
      `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, additional_info, order_placed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'placed', $7, $8, $9, CURRENT_TIMESTAMP)`,
      [id, Tracking_ID, Customer_ID, itemsJson, subtotal, shippingFee, shipAddrJson, billAddrJson, addInfo]
    );

    // Clear cart for customer in PostgreSQL
    await query(`DELETE FROM cart WHERE customer_id = $1`, [Customer_ID]);

    const newOrder: Order = {
      Order_ID: id,
      Tracking_ID,
      Customer_ID,
      Items,
      Subtotal: subtotal,
      Shipping_Fee: shippingFee,
      Status: 'placed',
      Shipping_Address,
      Billing_Address: Billing_Address || Shipping_Address,
      Order_Placed_At: new Date().toISOString(),
      Additional_Info: addInfo,
    };

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    await query(`UPDATE orders SET status = $1 WHERE id = $2`, [Status, id]);
    res.json({ Order_ID: id, Status });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// --- REVIEWS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/reviews', async (req, res) => {
  try {
    const { productId } = req.query;
    const result = productId && typeof productId === 'string'
      ? await query(`SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`, [productId])
      : await query(`SELECT * FROM reviews ORDER BY created_at DESC`);

    const formatted: Review[] = result.rows.map((r: any) => ({
      Review_ID: r.id,
      Product_ID: r.product_id,
      Customer_ID: r.customer_id,
      Customer_Name: r.customer_name,
      Review_text: r.review_text,
      Rating: Number(r.rating),
      Created_At: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { Product_ID, Customer_ID, Customer_Name, Review_text, Rating } = req.body;
    if (!Product_ID || !Customer_ID || !Rating) {
      return res.status(400).json({ error: 'Product_ID, Customer_ID, and Rating are required' });
    }

    const id = `REV-${Date.now()}`;
    const custName = Customer_Name || 'Verified Customer';
    const revText = Review_text || '';
    const ratingNum = Number(Rating);

    await query(
      `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [id, Product_ID, Customer_ID, custName, revText, ratingNum]
    );

    await query(`UPDATE products SET review_id = $1 WHERE id = $2`, [id, Product_ID]);

    res.status(201).json({
      Review_ID: id,
      Product_ID,
      Customer_ID,
      Customer_Name: custName,
      Review_text: revText,
      Rating: ratingNum,
      Created_At: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// --- ADMIN STATS API (RAW POSTGRESQL AGGREGATION QUERIES) ---
app.get('/api/stats', async (req, res) => {
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
      totalCustomers: Math.max(1, Number(custRow.count || 0)),
      totalSellers: Number(sellerRow.total || 0),
      approvedSellers: Number(sellerRow.approved || 0),
      pendingSellers: Number(sellerRow.pending || 0),
      totalProducts: Number(prodRow.total || 0),
      activeProducts: Number(prodRow.active || 0),
      totalOrders: Number(orderRow.total || 0),
      totalRevenue: Number(orderRow.revenue || 0),
      dbProvider: 'Cloud SQL (PostgreSQL - Raw SQL Driver)',
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Admin Users List API (Raw SQL Query)
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await query(`SELECT id, username, email, role, entity_id, created_at FROM users ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Reset Seed API (Raw SQL Query)
app.post('/api/reset-seed', async (req, res) => {
  try {
    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Database seed completed.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset seed' });
  }
});

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`E-Commerce Server running on http://localhost:${PORT}`);
  });
}

startServer();
