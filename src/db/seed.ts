import { query } from './index.ts';
import { hashPassword, isBcryptHash } from './password.ts';
import {
  initialCategories,
  initialSellers,
  initialProducts,
  initialReviews,
  initialOrders,
  initialCustomers,
  initialAdmin,
} from '../data/seedData.ts';

export async function migrateExistingPasswordsToBcrypt() {
  try {
    // 1. Migrate Users table
    const usersRes = await query(`SELECT id, password FROM users`);
    for (const u of usersRes.rows) {
      if (u.password && !isBcryptHash(u.password)) {
        const hashed = await hashPassword(u.password);
        await query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, u.id]);
      }
    }

    // 2. Migrate Admins table
    const adminsRes = await query(`SELECT id, password FROM admins`);
    for (const a of adminsRes.rows) {
      if (a.password && !isBcryptHash(a.password)) {
        const hashed = await hashPassword(a.password);
        await query(`UPDATE admins SET password = $1 WHERE id = $2`, [hashed, a.id]);
      }
    }

    // 3. Migrate Sellers table
    const sellersRes = await query(`SELECT id, password FROM sellers`);
    for (const s of sellersRes.rows) {
      if (s.password && !isBcryptHash(s.password)) {
        const hashed = await hashPassword(s.password);
        await query(`UPDATE sellers SET password = $1 WHERE id = $2`, [hashed, s.id]);
      }
    }

    // 4. Migrate Customers table
    const custsRes = await query(`SELECT id, password FROM customers`);
    for (const c of custsRes.rows) {
      if (c.password && !isBcryptHash(c.password)) {
        const hashed = await hashPassword(c.password);
        await query(`UPDATE customers SET password = $1 WHERE id = $2`, [hashed, c.id]);
      }
    }
  } catch (err) {
    console.error('Password hash migration error:', err);
  }
}

export async function ensureDatabaseSchema() {
  try {
    // Bootstrap tables if connecting to a fresh database like Supabase
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        logo TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        email TEXT,
        password TEXT,
        number TEXT,
        address_house_name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        password TEXT,
        email TEXT,
        role TEXT,
        entity_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT,
        description TEXT,
        price NUMERIC NOT NULL,
        voucher TEXT,
        stock INTEGER DEFAULT 0,
        product_status TEXT DEFAULT 'active',
        category_id TEXT,
        seller_id TEXT,
        review_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        customer_id TEXT,
        customer_name TEXT,
        review_text TEXT,
        rating NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tracking_id TEXT,
        customer_id TEXT,
        items_json TEXT,
        subtotal NUMERIC,
        shipping_fee NUMERIC,
        status TEXT,
        shipping_address_json TEXT,
        billing_address_json TEXT,
        additional_info TEXT,
        order_placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cart (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        product_id TEXT,
        quantity INTEGER DEFAULT 1
      );
    `);
    console.log('Database schema verified/created successfully.');
  } catch (err) {
    console.error('Error verifying database schema:', err);
  }
}

export async function seedDatabaseIfEmpty() {
  try {
    // 0. Ensure all tables exist first (for fresh Supabase instances)
    await ensureDatabaseSchema();

    // 1. Seed Categories
    const existingCats = await query(`SELECT count(*) as count FROM categories`);
    if (Number(existingCats.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial categories via SQL queries...');
      for (const cat of initialCategories) {
        await query(
          `INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [cat.Category_ID, cat.Name]
        );
      }
    }

    // 2. Seed Admins & Users
    const existingAdmins = await query(`SELECT count(*) as count FROM admins`);
    if (Number(existingAdmins.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial admin...');
      const adminPassHash = await hashPassword(initialAdmin.Password || 'admin123');
      await query(
        `INSERT INTO admins (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          initialAdmin.Admin_ID,
          initialAdmin.Username || 'admin',
          initialAdmin.Name,
          initialAdmin.Email,
          adminPassHash,
          initialAdmin.Number,
          initialAdmin.Address.House_Name,
          initialAdmin.Address.Street,
          initialAdmin.Address.City,
          initialAdmin.Address.Postal_Code,
          initialAdmin.Address.Additional_Info || '',
        ]
      );

      await query(
        `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
         VALUES ($1, $2, $3, $4, 'admin', $5, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [
          `USR-${initialAdmin.Admin_ID}`,
          initialAdmin.Username || 'admin',
          adminPassHash,
          initialAdmin.Email,
          initialAdmin.Admin_ID,
        ]
      );
    }

    // 3. Seed Sellers & Users
    const existingSellers = await query(`SELECT count(*) as count FROM sellers`);
    if (Number(existingSellers.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial sellers to Cloud SQL...');
      for (const sel of initialSellers) {
        const sellerPassHash = await hashPassword(sel.Password || 'seller123');
        await query(
          `INSERT INTO sellers (id, username, name, email, password, number, logo, description, status, address_house_name, address_street, address_city, address_postal_code, address_additional_info, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO NOTHING`,
          [
            sel.Seller_ID,
            sel.Username || sel.Seller_ID.toLowerCase(),
            sel.Name,
            sel.Email,
            sellerPassHash,
            sel.Number,
            sel.Logo,
            sel.Description,
            sel.Status,
            sel.Address.House_Name,
            sel.Address.Street,
            sel.Address.City,
            sel.Address.Postal_Code,
            sel.Address.Additional_Info || '',
            sel.Created_At || new Date().toISOString(),
          ]
        );

        await query(
          `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
           VALUES ($1, $2, $3, $4, 'seller', $5, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [
            `USR-${sel.Seller_ID}`,
            sel.Username || sel.Seller_ID.toLowerCase(),
            sellerPassHash,
            sel.Email,
            sel.Seller_ID,
          ]
        );
      }
    }

    // 4. Seed Customers & Users
    const existingCusts = await query(`SELECT count(*) as count FROM customers`);
    if (Number(existingCusts.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial customers to Cloud SQL...');
      for (const cust of initialCustomers) {
        const custPassHash = await hashPassword(cust.Password || 'password123');
        await query(
          `INSERT INTO customers (id, username, name, email, password, number, address_house_name, address_street, address_city, address_postal_code, address_additional_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            cust.Customer_ID,
            cust.Username || cust.Customer_ID.toLowerCase(),
            cust.Name,
            cust.Email,
            custPassHash,
            cust.Number,
            cust.Address.House_Name,
            cust.Address.Street,
            cust.Address.City,
            cust.Address.Postal_Code,
            cust.Address.Additional_Info || '',
          ]
        );

        await query(
          `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
           VALUES ($1, $2, $3, $4, 'customer', $5, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [
            `USR-${cust.Customer_ID}`,
            cust.Username || cust.Customer_ID.toLowerCase(),
            custPassHash,
            cust.Email,
            cust.Customer_ID,
          ]
        );
      }
    }

    // Migrate any remaining unhashed legacy passwords to bcrypt
    await migrateExistingPasswordsToBcrypt();

    // 5. Seed Products
    const existingProducts = await query(`SELECT count(*) as count FROM products`);
    if (Number(existingProducts.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial products to Cloud SQL...');
      for (const prod of initialProducts) {
        await query(
          `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, review_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [
            prod.Product_ID,
            prod.Name,
            prod.Image || '',
            prod.Description || '',
            Number(prod.Price),
            prod.Voucher || '',
            Number(prod.Stock),
            prod.Product_Status,
            prod.Category_ID,
            prod.Seller_ID,
            prod.Review_ID || null,
          ]
        );
      }
    }

    // 6. Seed Reviews
    const existingReviews = await query(`SELECT count(*) as count FROM reviews`);
    if (Number(existingReviews.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial reviews to Cloud SQL...');
      for (const rev of initialReviews) {
        await query(
          `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            rev.Review_ID,
            rev.Product_ID,
            rev.Customer_ID,
            rev.Customer_Name,
            rev.Review_text,
            Number(rev.Rating),
            rev.Created_At || new Date().toISOString(),
          ]
        );
      }
    }

    // 7. Seed Orders
    const existingOrders = await query(`SELECT count(*) as count FROM orders`);
    if (Number(existingOrders.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial orders to Cloud SQL...');
      for (const ord of initialOrders) {
        await query(
          `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, additional_info, order_placed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            ord.Order_ID,
            ord.Tracking_ID,
            ord.Customer_ID,
            JSON.stringify(ord.Items),
            Number(ord.Subtotal),
            Number(ord.Shipping_Fee),
            ord.Status,
            JSON.stringify(ord.Shipping_Address),
            JSON.stringify(ord.Billing_Address),
            ord.Additional_Info || '',
            ord.Order_Placed_At || new Date().toISOString(),
          ]
        );
      }
    }

    console.log('database seeding check complete');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
