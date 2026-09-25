import type { Address } from '../src/types.ts';

export function mapAddress(row: any): Address {
  return {
    House_Name: row.address_house_name || '',
    Street: row.address_street || '',
    City: row.address_city || '',
    Postal_Code: row.address_postal_code || '',
    Additional_Info: row.address_additional_info || '',
  };
}
