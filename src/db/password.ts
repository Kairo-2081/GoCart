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

/** Compares a plaintext password against a stored bcrypt hash. */
export async function comparePassword(plainTextPassword: string, storedPasswordHash: string): Promise<boolean> {
  if (!plainTextPassword || !isBcryptHash(storedPasswordHash)) {
    return false;
  }
  return await bcrypt.compare(plainTextPassword, storedPasswordHash);
}
