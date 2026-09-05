import { query } from './index.ts';
import { hashPassword } from './password.ts';

export async function getOrCreateUser(
  identifier: string,
  email: string,
  role: string = 'customer',
  name?: string,
  password?: string
) {
  try {
    const rawPassword = password || 'password123';
    const hashedPassword = await hashPassword(rawPassword);
    const defaultName = name || email.split('@')[0];
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if user already exists
    const existing = await query(
      `SELECT * FROM users WHERE id = $1 OR email = $2 OR username = $3 LIMIT 1`,
      [identifier, email, username]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Insert new user
    const entityId = role === 'admin' ? `ADM-${Date.now()}` : role === 'seller' ? `SEL-${Date.now()}` : `CUST-${Date.now()}`;
    const userId = `USR-${identifier.startsWith('USR-') ? identifier.replace('USR-', '') : identifier}`;

    const result = await query(
      `INSERT INTO users (id, username, password, email, role, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         email = $4,
         password = COALESCE($3, users.password)
       RETURNING *`,
      [userId, username, hashedPassword, email, role, entityId]
    );

    if (role === 'customer') {
      await query(
        `INSERT INTO customers (id, username, name, email, password, address_house_name, address_street, address_city, address_postal_code)
         VALUES ($1, $2, $3, $4, $5, 'Apt 4B', '742 Evergreen Terrace', 'Barishal', '9777')
         ON CONFLICT (id) DO NOTHING`,
        [entityId, username, defaultName, email, hashedPassword]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    const existing = await query(`SELECT * FROM users WHERE id = $1 OR email = $2 LIMIT 1`, [identifier, email]);
    if (existing.rows.length > 0) return existing.rows[0];
    throw error;
  }
}

export async function updateUserRole(uid: string, role: 'customer' | 'seller' | 'admin') {
  try {
    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 OR entity_id = $2 RETURNING *`,
      [role, uid]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}
