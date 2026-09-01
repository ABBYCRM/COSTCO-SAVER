import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool, transaction } from './db.mjs';

const dir = path.resolve('db/migrations');
const files = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

for (const name of files) {
  const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  if (exists.rowCount) continue;
  const sql = await readFile(path.join(dir, name), 'utf8');
  console.log(`Applying ${name}`);
  await transaction(async (client) => {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
  });
}

console.log('Database migrations complete');
await pool.end();
