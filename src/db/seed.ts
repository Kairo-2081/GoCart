import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { withTransaction } from './index.ts';
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
    await withTransaction(async (client) => {
      const passwords = await client.query(`SELECT * FROM gocart_passwords_list()`);
      for (const account of passwords.rows) {
        if (account.password && !isBcryptHash(account.password)) {
          const hashed = await hashPassword(account.password);
          await client.query(
            `SELECT gocart_auth_password_update($1, $2, $3)`,
            [account.account_type, account.id, hashed]
          );
        }
      }
    });
  } catch (err) {
    console.error('Password hash migration error:', err);
  }
}

export async function ensureDatabaseSchema() {
  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');
  await withTransaction((client) => client.query(schemaSql));
  console.log('Database schema applied from schema.sql.');
}

export async function seedDatabaseIfEmpty() {
  try {
    // 0. Ensure all tables exist first (for fresh Supabase instances)
    await ensureDatabaseSchema();

    await withTransaction(async (client) => {
    const countRows = async (table: string) => {
      const result = await client.query(`SELECT gocart_table_count($1) AS count`, [table]);
      return Number(result.rows[0]?.count || 0);
    };
    const seedRow = async (table: string, row: Record<string, unknown>) => {
      await client.query(`SELECT gocart_seed_row($1, $2::jsonb)`, [table, JSON.stringify(row)]);
    };

    // 1. Seed Categories
    if (await countRows('categories') === 0) {
      console.log('Seeding initial categories via SQL queries...');
      for (const cat of initialCategories) {
        await seedRow('categories', { id: cat.Category_ID, name: cat.Name });
      }
    }

    // 2. Seed Admins & Users
    if (await countRows('admins') === 0) {
      console.log('Seeding initial admin...');
      const adminPassHash = await hashPassword(initialAdmin.Password || 'admin123');
      await seedRow('admins', {
        id: initialAdmin.Admin_ID,
        username: initialAdmin.Username || 'admin',
        name: initialAdmin.Name,
        email: initialAdmin.Email,
        password: adminPassHash,
        number: initialAdmin.Number,
        address_house_name: initialAdmin.Address.House_Name,
        address_street: initialAdmin.Address.Street,
        address_city: initialAdmin.Address.City,
        address_postal_code: initialAdmin.Address.Postal_Code,
        address_additional_info: initialAdmin.Address.Additional_Info || '',
        created_at: new Date().toISOString(),
      });
    }

    // 3. Seed Sellers & Users
    if (await countRows('sellers') === 0) {
      console.log('Seeding initial sellers to Cloud SQL...');
      for (const sel of initialSellers) {
        const sellerPassHash = await hashPassword(sel.Password || 'seller123');
        await seedRow('sellers', {
          id: sel.Seller_ID,
          username: sel.Username || sel.Seller_ID.toLowerCase(),
          name: sel.Name,
          email: sel.Email,
          password: sellerPassHash,
          number: sel.Number,
          logo: sel.Logo,
          description: sel.Description,
          status: sel.Status,
          address_house_name: sel.Address.House_Name,
          address_street: sel.Address.Street,
          address_city: sel.Address.City,
          address_postal_code: sel.Address.Postal_Code,
          address_additional_info: sel.Address.Additional_Info || '',
          created_at: sel.Created_At || new Date().toISOString(),
        });
      }
    }

    // 4. Seed Customers & Users
    if (await countRows('customers') === 0) {
      console.log('Seeding initial customers to Cloud SQL...');
      for (const cust of initialCustomers) {
        const custPassHash = await hashPassword(cust.Password || 'password123');
        await seedRow('customers', {
          id: cust.Customer_ID,
          username: cust.Username || cust.Customer_ID.toLowerCase(),
          name: cust.Name,
          email: cust.Email,
          password: custPassHash,
          number: cust.Number,
          address_house_name: cust.Address.House_Name,
          address_street: cust.Address.Street,
          address_city: cust.Address.City,
          address_postal_code: cust.Address.Postal_Code,
          address_additional_info: cust.Address.Additional_Info || '',
          created_at: new Date().toISOString(),
        });
      }
    }

    // 5. Seed Products
    if (await countRows('products') === 0) {
      console.log('Seeding initial products to Cloud SQL...');
      for (const prod of initialProducts) {
        await seedRow('products', {
          id: prod.Product_ID,
          name: prod.Name,
          image: prod.Image || '',
          description: prod.Description || '',
          price: Number(prod.Price),
          voucher: prod.Voucher || '',
          stock: Number(prod.Stock),
          product_status: prod.Product_Status,
          category_id: prod.Category_ID,
          seller_id: prod.Seller_ID,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 6. Seed Reviews
    if (await countRows('reviews') === 0) {
      console.log('Seeding initial reviews to Cloud SQL...');
      for (const rev of initialReviews) {
        await seedRow('reviews', {
          id: rev.Review_ID,
          product_id: rev.Product_ID,
          customer_id: rev.Customer_ID,
          customer_name: rev.Customer_Name,
          review_text: rev.Review_text,
          rating: Number(rev.Rating),
          created_at: rev.Created_At || new Date().toISOString(),
        });
      }
    }

    // 7. Seed Orders
    if (await countRows('orders') === 0) {
      console.log('Seeding initial orders to Cloud SQL...');
      for (const ord of initialOrders) {
        await seedRow('orders', {
          id: ord.Order_ID,
          tracking_id: ord.Tracking_ID,
          customer_id: ord.Customer_ID,
          items_json: JSON.stringify(ord.Items),
          subtotal: Number(ord.Subtotal),
          shipping_fee: Number(ord.Shipping_Fee),
          status: ord.Status,
          shipping_address_json: JSON.stringify(ord.Shipping_Address),
          billing_address_json: JSON.stringify(ord.Billing_Address),
          additional_info: ord.Additional_Info || '',
          order_placed_at: ord.Order_Placed_At || new Date().toISOString(),
        });
      }
    }

    });
    await migrateExistingPasswordsToBcrypt();
    console.log('database seeding check complete');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
