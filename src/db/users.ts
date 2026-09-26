import { query, withTransaction } from './index.ts';
import { hashPassword } from './password.ts';
import type { Address } from '../types.ts';

export async function getOrCreateUser(
  identifier: string,
  email: string,
  role: string = 'customer',
  name?: string,
  password?: string,
  contact?: { Number: string; Address: Address }
) {
  try {
    if (!password?.trim()) throw new Error('Password is required.');
    if (!contact?.Number?.trim() || !contact.Address?.Street?.trim() ||
      !contact.Address.City?.trim() || !contact.Address.Postal_Code?.trim()) {
      throw new Error('Phone, street, city, and postal code are required.');
    }
    const rawPassword = password;
    const hashedPassword = await hashPassword(rawPassword);
    const defaultName = name || email.split('@')[0];
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if user already exists
    const existing = await query(`SELECT * FROM gocart_user_find($1, $2, $3)`, [identifier, email, username]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Insert new user
    const userId = role === 'admin' ? `ADM-${Date.now()}` : role === 'seller' ? `SEL-${Date.now()}` : `CUST-${Date.now()}`;

    return await withTransaction(async (client) => {
      const result = await client.query(
        `SELECT * FROM gocart_user_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [username, hashedPassword, email, role, userId, defaultName, contact.Number.trim(), contact.Address.House_Name || '', contact.Address.Street.trim(), contact.Address.City.trim(), contact.Address.Postal_Code.trim(), contact.Address.Additional_Info || '']
      );
      return result.rows[0];
    });
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    const existing = await query(`SELECT * FROM gocart_user_find($1, $2, NULL)`, [identifier, email]);
    if (existing.rows.length > 0) return existing.rows[0];
    throw error;
  }
}
