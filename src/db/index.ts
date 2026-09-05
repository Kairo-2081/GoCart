import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _supabaseClient: SupabaseClient | undefined;
}

export interface ParsedConnectionConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
}

export function parsePostgresUrl(raw?: string): ParsedConnectionConfig | null {
  if (!raw || typeof raw !== 'string') return null;
  // Match protocol, optional user:password (preserving unencoded special characters like # in password), host, optional port, optional database
  const regex = /^(?:postgres(?:ql)?:\/\/)?(?:([^:@]+)(?::([^@]+))?@)?([^/?#:]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?(.*))?$/;
  const match = raw.match(regex);
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return {
    user: user ? decodeURIComponent(user) : undefined,
    password: password ? (password.includes('%') ? decodeURIComponent(password) : password) : undefined,
    host,
    port: port ? parseInt(port, 10) : 5432,
    database: database || 'postgres',
  };
}

export function isUsingSupabase(): boolean {
  return Boolean(
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DB_HOST ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase'))
  );
}

export function getDatabaseProviderInfo() {
  const usingSupabase = isUsingSupabase();
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  const parsed = dbUrl ? parsePostgresUrl(dbUrl) : null;
  const host = parsed?.host || process.env.SUPABASE_DB_HOST || process.env.SQL_HOST || (dbUrl ? 'supabase-cluster' : 'local_socket');
  const dbName = parsed?.database || process.env.SUPABASE_DB_NAME || process.env.SQL_DB_NAME || 'postgres';

  return {
    provider: usingSupabase ? 'Supabase (PostgreSQL)' : 'Cloud SQL (PostgreSQL)',
    isSupabase: usingSupabase,
    host,
    database: dbName,
  };
}

export const createPool = () => {
  if (!global._postgresPool) {
    const supabaseUrl = process.env.SUPABASE_DB_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? process.env.DATABASE_URL : undefined);
    const genericDbUrl = process.env.DATABASE_URL;
    const connStr = supabaseUrl || genericDbUrl;

    if (connStr) {
      const parsed = parsePostgresUrl(connStr);
      if (parsed) {
        console.log(`Connecting to PostgreSQL database at ${parsed.host}:${parsed.port} (database: ${parsed.database})`);
        global._postgresPool = new Pool({
          host: parsed.host,
          user: parsed.user,
          password: parsed.password,
          port: parsed.port,
          database: parsed.database,
          ssl: {
            rejectUnauthorized: false,
          },
          max: 10,
          connectionTimeoutMillis: 15000,
        });
      } else {
        global._postgresPool = new Pool({
          connectionString: connStr,
          ssl: {
            rejectUnauthorized: false,
          },
          max: 10,
          connectionTimeoutMillis: 15000,
        });
      }
    } else if (process.env.SUPABASE_DB_HOST) {
      console.log('Connecting to Supabase PostgreSQL at host:', process.env.SUPABASE_DB_HOST);
      global._postgresPool = new Pool({
        host: process.env.SUPABASE_DB_HOST,
        user: process.env.SUPABASE_DB_USER || 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD,
        database: process.env.SUPABASE_DB_NAME || 'postgres',
        port: Number(process.env.SUPABASE_DB_PORT) || 5432,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      // Fallback to Cloud SQL configuration
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

// Helper to execute parameterized SQL queries directly with pure pg
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Optional lazy Supabase JS Client
export function getSupabaseClient(): SupabaseClient | null {
  if (global._supabaseClient) return global._supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  global._supabaseClient = createClient(url, key);
  return global._supabaseClient;
}

