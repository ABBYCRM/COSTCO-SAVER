import { readFile } from 'node:fs/promises';
import { pool, transaction } from './db.mjs';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Test seed is forbidden in production');
}

const sql = await readFile(new URL('../db/seed/test.sql', import.meta.url), 'utf8');
await transaction((client) => client.query(sql));
console.log('Test seed applied');
await pool.end();
