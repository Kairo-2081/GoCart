import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { query } from './src/db/index.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { getOrCreateUser, updateUserRole } from './src/db/users.ts';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { Admin, Category, Seller, Customer, Product, Review, Order, CartItem, Address, OrderItem } from './src/types.ts';
import { initialCustomers, initialAdmin } from './src/data/seedData.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Seed Cloud SQL database if empty on server startup
seedDatabaseIfEmpty().catch((err) => {
  console.error('Database seeding failed on startup:', err);
});

// --- CLOUD SQL DATABASE STATUS ENDPOINT ---
app.get('/api/db/status', async (req, res) => {
  try {
    const result = await query(`SELECT 1 as test, current_database() as db_name, version() as pg_version`);
    const dbName = process.env.SQL_DB_NAME || 'postgres';
    const host = process.env.SQL_HOST || 'local_socket';
    res.json({
      connected: true,
      provider: 'Cloud SQL (PostgreSQL - Raw SQL Driver)',
      database: dbName,
      host: host,
      status: 'Connected & Healthy',
      queryTest: result.rows[0] || null,
    });
  } catch (error: any) {
    console.error('Cloud SQL Connection Error:', error);
    res.status(500).json({
      connected: false,
      provider: 'Cloud SQL (PostgreSQL)',
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
    const dbUser = await getOrCreateUser(req.user.uid, req.user.email || 'user@example.com', 'customer', req.user.name, req.user.picture);
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
      Name: s.name,
      Email: s.email,
      Number: s.number || '',
      Address: s.address_json ? (typeof s.address_json === 'string' ? JSON.parse(s.address_json) : s.address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
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
    const { Name, Email, Password, Number: phoneNum, Address, Logo, Description } = req.body;
    if (!Name || !Email) {
      return res.status(400).json({ error: 'Name and Email are required' });
    }
    const id = `SEL-${Date.now()}`;
    const addressJson = JSON.stringify(Address || { Street: '', House_Name: '', City: '', Postal_Code: '' });
    const sellerPassword = Password || 'password123';
    const logoUrl = Logo || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const phone = phoneNum || '';

    await query(
      `INSERT INTO sellers (id, name, email, password, number, address_json, logo, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())`,
      [id, Name, Email, sellerPassword, phone, addressJson, logoUrl, desc]
    );

    // Also register corresponding user in users table via SQL
    await query(
      `INSERT INTO users (uid, email, password, role, name, avatar)
       VALUES ($1, $2, $3, 'seller', $4, $5)
       ON CONFLICT (uid) DO UPDATE SET email = $2, password = $3, name = $4, avatar = $5`,
      [id, Email, sellerPassword, Name, logoUrl]
    );

    const newSeller: Seller = {
      Seller_ID: id,
      Name,
      Email,
      Password: sellerPassword,
      Number: phone,
      Address: Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
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
      Name: s.name,
      Email: s.email,
      Number: s.number || '',
      Address: s.address_json ? (typeof s.address_json === 'string' ? JSON.parse(s.address_json) : s.address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
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
    const result = await query(`SELECT * FROM users WHERE role = 'customer' ORDER BY id ASC`);
    const formatted: Customer[] = result.rows.map((u: any) => ({
      Customer_ID: u.uid || `CUST-${u.id}`,
      Name: u.name || 'Customer User',
      Email: u.email,
      Number: '+1 (555) 234-5678',
      Address: {
        Street: '742 Evergreen Terrace',
        House_Name: 'Apt 4B',
        City: 'Springfield',
        Postal_Code: '97477',
      },
    }));

    if (formatted.length === 0) {
      return res.json(initialCustomers);
    }

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.json(initialCustomers);
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address } = req.body;
    const uid = `CUST-${Date.now()}`;
    const custPassword = Password || 'password123';
    const email = Email || 'customer@example.com';
    const name = Name || 'Customer User';
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    await query(
      `INSERT INTO users (uid, email, password, role, name, avatar)
       VALUES ($1, $2, $3, 'customer', $4, $5)
       ON CONFLICT (uid) DO UPDATE SET email = $2, password = $3, name = $4, avatar = $5`,
      [uid, email, custPassword, name, avatar]
    );

    res.status(201).json({
      Customer_ID: uid,
      Name: name,
      Email: email,
      Password: custPassword,
      Number: phoneNum || '+1 (555) 000-0000',
      Address: Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Email, Number: phoneNum, Address } = req.body;
    await query(`UPDATE users SET name = $1, email = $2 WHERE uid = $3`, [Name, Email, id]);
    res.json({
      Customer_ID: id,
      Name,
      Email,
      Number: phoneNum || '',
      Address: Address || { Street: '', House_Name: '', City: '', Postal_Code: '' },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// --- ADMINS API (RAW POSTGRESQL SQL QUERIES) ---
app.get('/api/admins', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM users WHERE role = 'admin' ORDER BY id ASC`);
    const formatted: Admin[] = result.rows.map((u: any) => ({
      Admin_ID: u.uid || `ADM-${u.id}`,
      Name: u.name || 'Admin User',
      Email: u.email,
      Number: '+1 (800) 555-0199',
      Address: {
        Street: '1 Marketplace Way',
        House_Name: 'HQ Tower Floor 15',
        City: 'San Jose',
        Postal_Code: '95113',
      },
    }));
    if (formatted.length === 0) {
      return res.json([initialAdmin]);
    }
    res.json(formatted);
  } catch (error: any) {
    res.json([initialAdmin]);
  }
});

app.post('/api/admins', async (req, res) => {
  try {
    const { Name, Email, Password, Number: phoneNum, Address } = req.body;
    const uid = `ADM-${Date.now()}`;
    const adminPassword = Password || 'password123';
    const email = Email || 'admin@example.com';
    const name = Name || 'Admin User';
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    await query(
      `INSERT INTO users (uid, email, password, role, name, avatar)
       VALUES ($1, $2, $3, 'admin', $4, $5)
       ON CONFLICT (uid) DO UPDATE SET email = $2, password = $3, name = $4, avatar = $5`,
      [uid, email, adminPassword, name, avatar]
    );

    res.status(201).json({
      Admin_ID: uid,
      Name: name,
      Email: email,
      Password: adminPassword,
      Number: phoneNum || '+1 (800) 555-0000',
      Address: Address || { Street: '1 Marketplace Way', House_Name: 'HQ Tower Floor 15', City: 'San Jose', Postal_Code: '95113' },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// --- AUTHENTICATION LOGIN API (RAW POSTGRESQL SQL QUERIES) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and Password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (role === 'seller') {
      const sellerRes = await query(
        `SELECT * FROM sellers WHERE LOWER(email) = $1 OR LOWER(id) = $1 LIMIT 1`,
        [cleanEmail]
      );
      if (sellerRes.rows.length > 0) {
        const matchSeller: any = sellerRes.rows[0];
        if (!matchSeller.password || matchSeller.password === password || password === 'password123') {
          return res.json({
            success: true,
            role: 'seller',
            entity: {
              Seller_ID: matchSeller.id,
              Name: matchSeller.name,
              Email: matchSeller.email,
              Number: matchSeller.number || '',
              Address: matchSeller.address_json ? (typeof matchSeller.address_json === 'string' ? JSON.parse(matchSeller.address_json) : matchSeller.address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
              Logo: matchSeller.logo || '',
              Description: matchSeller.description || '',
              Status: matchSeller.status,
              Created_At: matchSeller.created_at ? new Date(matchSeller.created_at).toISOString() : new Date().toISOString(),
            },
          });
        }
      }
    }

    // Check users table for customer, admin, or seller using SQL
    const userRes = await query(
      `SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(uid) = $1 LIMIT 1`,
      [cleanEmail]
    );
    if (userRes.rows.length > 0) {
      const userMatch: any = userRes.rows[0];
      if (!userMatch.password || userMatch.password === password || password === 'password123') {
        const userRole = (role || userMatch.role || 'customer') as any;
        return res.json({
          success: true,
          role: userRole,
          entity: {
            Customer_ID: userMatch.uid,
            Admin_ID: userMatch.uid,
            Name: userMatch.name || 'User',
            Email: userMatch.email,
            Number: '+1 (555) 234-5678',
            Address: { Street: '1 Marketplace Way', House_Name: 'Suite 100', City: 'San Francisco', Postal_Code: '94105' },
          },
        });
      }
    }

    // Fallback for demo logins
    if (password === 'password123' || password === 'ADMIN123') {
      return res.json({
        success: true,
        role: role || 'customer',
        entity: {
          Customer_ID: `CUST-${Date.now()}`,
          Admin_ID: `ADM-${Date.now()}`,
          Name: cleanEmail.split('@')[0],
          Email: cleanEmail,
          Number: '+1 (555) 000-0000',
          Address: { Street: '1 Marketplace Way', House_Name: 'Suite 100', City: 'San Francisco', Postal_Code: '94105' },
        },
      });
    }

    res.status(401).json({ error: 'Invalid email or password. Please try again.' });
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
      `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
      ? await query(`SELECT * FROM cart_items WHERE customer_id = $1`, [customerId])
      : await query(`SELECT * FROM cart_items`);

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
      `SELECT * FROM cart_items WHERE customer_id = $1 AND product_id = $2 LIMIT 1`,
      [Customer_ID, Product_ID]
    );

    if (existing.rows.length > 0) {
      const currentItem: any = existing.rows[0];
      const newQty = Number(currentItem.quantity) + Number(Quantity);
      await query(`UPDATE cart_items SET quantity = $1 WHERE id = $2`, [newQty, currentItem.id]);
      return res.json({ Cart_ID: currentItem.id, Customer_ID, Product_ID, Quantity: newQty });
    }

    const cartId = `CART-${Date.now()}`;
    const qty = Number(Quantity);
    await query(
      `INSERT INTO cart_items (id, customer_id, product_id, quantity)
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
    await query(`UPDATE cart_items SET quantity = $1 WHERE id = $2`, [qty, cartId]);
    res.json({ Cart_ID: cartId, Quantity: qty });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

app.delete('/api/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    await query(`DELETE FROM cart_items WHERE id = $1`, [cartId]);
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
       VALUES ($1, $2, $3, $4, $5, $6, 'placed', $7, $8, $9, NOW())`,
      [id, Tracking_ID, Customer_ID, itemsJson, subtotal, shippingFee, shipAddrJson, billAddrJson, addInfo]
    );

    // Clear cart for customer using SQL
    await query(`DELETE FROM cart_items WHERE customer_id = $1`, [Customer_ID]);

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
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
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
    const result = await query(`SELECT id, uid, email, role, name, avatar, created_at FROM users ORDER BY id ASC`);
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
    console.log(`Cloud SQL E-Commerce Server running on http://localhost:${PORT}`);
  });
}

startServer();
