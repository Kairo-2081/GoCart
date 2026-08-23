
import 'dotenv/config';
import { query } from './index.ts';
import {
  initialCategories,
  initialSellers,
  initialProducts,
  initialReviews,
  initialOrders,
} from '../data/seedData.ts';

export async function seedDatabaseIfEmpty() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255),
        number VARCHAR(255),
        address_json TEXT,
        logo TEXT,
        description TEXT,
        status VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        image TEXT,
        description TEXT,
        price NUMERIC,
        voucher VARCHAR(255),
        stock INT,
        product_status VARCHAR(255),
        category_id VARCHAR(255),
        seller_id VARCHAR(255),
        review_id VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255),
        customer_id VARCHAR(255),
        customer_name VARCHAR(255),
        review_text TEXT,
        rating NUMERIC
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        tracking_id VARCHAR(255),
        customer_id VARCHAR(255),
        items_json TEXT,
        subtotal NUMERIC,
        shipping_fee NUMERIC,
        status VARCHAR(255),
        shipping_address_json TEXT,
        billing_address_json TEXT,
        additional_info TEXT
      );
    `);
    const existingCats = await query(`SELECT count(*) as count FROM categories`);
    if (Number(existingCats.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial categories to Cloud SQL via SQL queries...');
      for (const cat of initialCategories) {
        await query(
          `INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [cat.Category_ID, cat.Name]
        );
      }
    }

    const existingSellers = await query(`SELECT count(*) as count FROM sellers`);
    if (Number(existingSellers.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial sellers to Cloud SQL via SQL queries...');
      for (const sel of initialSellers) {
        const addressJson = JSON.stringify(sel.Address);
        const pass = sel.Password || 'password123';
        const num = sel.Number || '';
        const logo = sel.Logo || '';
        const desc = sel.Description || '';
        await query(
          `INSERT INTO sellers (id, name, email, password, number, address_json, logo, description, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [sel.Seller_ID, sel.Name, sel.Email, pass, num, addressJson, logo, desc, sel.Status]
        );
      }
    }

    const existingProducts = await query(`SELECT count(*) as count FROM products`);
    if (Number(existingProducts.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial products to Cloud SQL via SQL queries...');
      for (const prod of initialProducts) {
        const img = prod.Image || '';
        const desc = prod.Description || '';
        const price = Number(prod.Price);
        const voucher = prod.Voucher || '';
        const stock = Number(prod.Stock);
        const reviewId = prod.Review_ID || null;
        await query(
          `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, review_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [prod.Product_ID, prod.Name, img, desc, price, voucher, stock, prod.Product_Status, prod.Category_ID, prod.Seller_ID, reviewId]
        );
      }
    }

    const existingReviews = await query(`SELECT count(*) as count FROM reviews`);
    if (Number(existingReviews.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial reviews to Cloud SQL via SQL queries...');
      for (const rev of initialReviews) {
        const custName = rev.Customer_Name || 'Verified Customer';
        const revText = rev.Review_text || '';
        const rating = Number(rev.Rating);
        await query(
          `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [rev.Review_ID, rev.Product_ID, rev.Customer_ID, custName, revText, rating]
        );
      }
    }

    const existingOrders = await query(`SELECT count(*) as count FROM orders`);
    if (Number(existingOrders.rows[0]?.count || 0) === 0) {
      console.log('Seeding initial orders to Cloud SQL via SQL queries...');
      for (const ord of initialOrders) {
        const itemsJson = JSON.stringify(ord.Items);
        const subtotal = Number(ord.Subtotal);
        const shippingFee = Number(ord.Shipping_Fee);
        const shipAddrJson = JSON.stringify(ord.Shipping_Address);
        const billAddrJson = JSON.stringify(ord.Billing_Address);
        const addInfo = ord.Additional_Info || '';
        await query(
          `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, additional_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [ord.Order_ID, ord.Tracking_ID, ord.Customer_ID, itemsJson, subtotal, shippingFee, ord.Status, shipAddrJson, billAddrJson, addInfo]
        );
      }
    }

    console.log('Cloud SQL database seeding check complete via raw SQL pg queries.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
