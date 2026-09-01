import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_PRIVATE_URL or DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 12),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: 'costco-saver-api',
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function userTransaction(userId, fn) {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    await client.query("SELECT set_config('app.internal', 'false', true)");
    return fn(client);
  });
}

export async function internalTransaction(fn) {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.internal', 'true', true)");
    return fn(client);
  });
}
