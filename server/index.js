import { mkdir } from 'node:fs/promises';
import { config } from './config.js';
import { pool } from './db.js';
import app from './app.js';

await mkdir(config.repoWorkspace, { recursive: true });
await pool.query('SELECT 1');

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Brankas Kredensial API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
