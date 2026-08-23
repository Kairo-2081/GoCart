import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.SQL_PORT || process.env.DB_PORT || 5432),
      user: process.env.SQL_USER || process.env.DB_USER || 'postgres',
      // Explicit String cast guarantees a string type and avoids SASL errors
      password: String(process.env.SQL_PASSWORD ?? process.env.DB_PASSWORD ?? 'postgres'),
      database: process.env.SQL_DB_NAME || process.env.DB_NAME || 'postgres',
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

// Helper to execute parameterized SQL queries directly with pure pg
// Helper to execute parameterized SQL queries directly with pure pg
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
