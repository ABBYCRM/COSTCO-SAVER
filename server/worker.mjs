import { pool } from './db.mjs';
import { processPendingPushes } from './push.mjs';

const intervalMs = Math.max(15_000, Number(process.env.PUSH_POLL_INTERVAL_MS || 30_000));
let stopping = false;

async function tick() {
  if (stopping) return;
  try {
    const result = await processPendingPushes(50);
    if (result.checked) console.log('push worker', result);
  } catch (error) {
    console.error('push worker failed', error);
  }
}

const timer = setInterval(() => void tick(), intervalMs);
timer.unref();
void tick();

async function stop(signal) {
  stopping = true;
  clearInterval(timer);
  console.log(`${signal}: push worker stopping`);
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
