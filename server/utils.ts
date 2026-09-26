import type { Response } from 'express';
import type { Address } from '../src/types.ts';

const addressFieldLimits: Record<string, number> = {
  House_Name: 255,
  Street: 255,
  City: 100,
  Postal_Code: 50,
  Additional_Info: 2000,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= maxLength && (allowEmpty || value.trim().length > 0);
}

export function isOptionalText(value: unknown, maxLength: number, allowEmpty = false): boolean {
  return value === undefined || isText(value, maxLength, allowEmpty);
}

export function isOptionalIdentifier(value: unknown): boolean {
  return value === undefined || isIdentifier(value);
}

export function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function isEmail(value: unknown): value is string {
  return isText(value, 255) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isAddress(value: unknown): value is Address {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  const entries = Object.entries(value);
  const requiredFields = ['Street', 'City', 'Postal_Code'];
  return isText(value.House_Name, addressFieldLimits.House_Name, true) &&
    requiredFields.every((key) => isText(value[key], addressFieldLimits[key])) &&
    isOptionalText(value.Additional_Info, addressFieldLimits.Additional_Info, true) && entries.every(([key, field]) => {
    const limit = addressFieldLimits[key];
    return limit !== undefined && isText(field, limit, true);
  });
}

export function respondApiError(res: Response, error: unknown, message: string) {
  const dbError = error as { code?: string; message?: string };
  console.error(message, error);

  if (dbError?.code === '23505') return res.status(409).json({ error: 'A resource with these unique values already exists.' });
  if (dbError?.code === '23503') return res.status(409).json({ error: 'The request conflicts with a related resource.' });
  if (dbError?.code === '23502' || dbError?.code === '23514' || dbError?.code?.startsWith('22')) {
    return res.status(400).json({ error: 'The request contains invalid data.' });
  }
  if (dbError?.code === 'P0001' && /^(Checkout Failed|Inventory Error):/.test(dbError.message || '')) {
    return res.status(409).json({ error: dbError.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

export function mapAddress(row: any): Address {
  return {
    House_Name: row.address_house_name || '',
    Street: row.address_street || '',
    City: row.address_city || '',
    Postal_Code: row.address_postal_code || '',
    Additional_Info: row.address_additional_info || '',
  };
}
