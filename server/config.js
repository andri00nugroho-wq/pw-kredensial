import 'dotenv/config';
import path from 'node:path';

function required(name, value) {
  if (!value) throw new Error(`Variabel lingkungan ${name} wajib diisi.`);
  return value;
}

const appKeyText = required('APP_KEY', process.env.APP_KEY);
const appKey = Buffer.from(appKeyText, 'base64');
if (appKey.length !== 32 || appKey.toString('base64') !== appKeyText) {
  throw new Error('APP_KEY harus berupa Base64 canonical dari tepat 32 byte acak.');
}

export const config = {
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  appName: process.env.APP_NAME || 'Brankas Kredensial',
  companyName: process.env.COMPANY_NAME || 'IT RAJA EMAS INDONESIA',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionName: process.env.SESSION_NAME || 'rei_vault_session',
  sessionSecret: required('SESSION_SECRET', process.env.SESSION_SECRET || appKeyText),
  appKey,
  db: {
    host: required('DB_HOST', process.env.DB_HOST),
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    name: required('DB_NAME', process.env.DB_NAME),
    user: required('DB_USER', process.env.DB_USER),
    password: required('DB_PASS', process.env.DB_PASS),
    charset: process.env.DB_CHARSET || 'utf8mb4',
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    scope: process.env.GITHUB_SCOPE || 'read:user repo',
  },
  repoWorkspace: path.resolve(process.env.REPO_WORKSPACE || './storage/repos'),
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error('PORT harus berupa bilangan antara 1 dan 65535.');
}

if (!['http:', 'https:'].includes(new URL(config.appUrl).protocol)) {
  throw new Error('APP_URL harus menggunakan HTTP atau HTTPS.');
}
