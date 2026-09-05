import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Checks if a string is already a valid bcrypt hash
 */
export function isBcryptHash(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(str);
}

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  if (!plainTextPassword) {
    throw new Error('Password cannot be empty');
  }
  // If already hashed, return as is
  if (isBcryptHash(plainTextPassword)) {
    return plainTextPassword;
  }
  return await bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored password (hashed or legacy plaintext)
 */
export async function comparePassword(plainTextPassword: string, storedPasswordHashOrPlain: string): Promise<boolean> {
  if (!plainTextPassword || !storedPasswordHashOrPlain) {
    return false;
  }

  // If the stored string is a valid bcrypt hash, compare using bcrypt
  if (isBcryptHash(storedPasswordHashOrPlain)) {
    return await bcrypt.compare(plainTextPassword, storedPasswordHashOrPlain);
  }

  // Fallback for legacy plain text passwords during migration
  return plainTextPassword === storedPasswordHashOrPlain;
}
