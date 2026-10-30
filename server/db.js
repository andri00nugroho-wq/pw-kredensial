import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  charset: config.db.charset,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
});

export async function audit(req, action, entityType, entityId = null, details = '') {
  await pool.execute(
    'INSERT INTO audit_logs(user_id, action, entity_type, entity_id, ip_address, details) VALUES(?,?,?,?,?,?)',
    [req.session.user?.id ?? null, action, entityType, entityId, req.ip || null, details.slice(0, 500)],
  );
}
