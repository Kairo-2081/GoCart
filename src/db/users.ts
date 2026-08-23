import { query } from './index.ts';

export async function getOrCreateUser(uid: string, email: string, role: string = 'customer', name?: string, avatar?: string, password?: string) {
  try {
    const defaultPassword = password || 'password123';
    const defaultName = name || email.split('@')[0];
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

    const result = await query(
      `INSERT INTO users (uid, email, password, role, name, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (uid) DO UPDATE SET
         email = $2,
         password = COALESCE($3, users.password),
         name = COALESCE($5, users.name),
         avatar = COALESCE($6, users.avatar)
       RETURNING *`,
      [uid, email, defaultPassword, role, defaultName, defaultAvatar]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    const existing = await query(`SELECT * FROM users WHERE uid = $1 LIMIT 1`, [uid]);
    if (existing.rows.length > 0) return existing.rows[0];
    throw error;
  }
}

export async function updateUserRole(uid: string, role: 'customer' | 'seller' | 'admin') {
  try {
    const result = await query(
      `UPDATE users SET role = $1 WHERE uid = $2 RETURNING *`,
      [role, uid]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}
