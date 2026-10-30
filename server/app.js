import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import bcrypt from 'bcryptjs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { config } from './config.js';
import { audit, pool } from './db.js';
import { decryptSecret, encryptSecret } from './crypto.js';
import { credentialSchema, emailSchema, passwordSchema, serviceTypes, userSchema } from './validation.js';
import { getConnection, getGitHubToken, githubRequest, operateRepository, validRepo } from './github.js';

const app = express();
const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  charset: config.db.charset,
  createDatabaseTable: true,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
});

app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: config.sessionName,
  secret: config.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validate(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw httpError(400, parsed.error.issues[0]?.message || 'Data tidak valid.');
  return parsed.data;
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Silakan login kembali.' });
  next();
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Silakan login kembali.' });
    if (!allowed.includes(req.session.user.role)) return res.status(403).json({ error: 'Anda tidak memiliki izin.' });
    next();
  };
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.get('x-csrf-token') || '';
  const expected = req.session.csrfToken || '';
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  if (!token || actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return res.status(419).json({ error: 'Token keamanan kedaluwarsa. Muat ulang halaman.' });
  }
  next();
}

function csrfToken(req) {
  req.session.csrfToken ||= randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function userView(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    last_login_at: user.last_login_at,
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
});

app.use('/api', requireCsrf);

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'pw-kredensial' });
}));

app.get('/api/csrf', (req, res) => res.json({ token: csrfToken(req) }));

app.get('/api/setup/status', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  res.json({ required: Number(rows[0].count) === 0 });
}));

app.post('/api/setup', loginLimiter, asyncRoute(async (req, res) => {
  const input = validate(z.object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
  }), req.body);
  const connection = await pool.getConnection();
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK('pw_kred_first_admin', 10) AS acquired");
    if (Number(lockRows[0].acquired) !== 1) throw httpError(503, 'Setup sedang digunakan. Coba lagi.');
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (Number(rows[0].count) > 0) throw httpError(403, 'Setup sudah ditutup karena pengguna telah dibuat.');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const [result] = await connection.execute(
      'INSERT INTO users(name, email, password, role) VALUES(?,?,?,?)',
      [input.name, input.email, passwordHash, 'admin'],
    );
    await audit({ session: { user: { id: result.insertId } }, ip: req.ip }, 'user.create', 'user', result.insertId, 'Admin awal dibuat');
    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.user = { id: result.insertId, name: input.name, email: input.email, role: 'admin' };
    req.session.csrfToken = randomBytes(32).toString('hex');
    res.status(201).json({ user: req.session.user, csrfToken: req.session.csrfToken });
  } finally {
    await connection.query("SELECT RELEASE_LOCK('pw_kred_first_admin')");
    connection.release();
  }
}));

app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
  const input = validate(z.object({ email: emailSchema, password: z.string().min(1).max(200) }), req.body);
  const [rows] = await pool.execute(
    'SELECT id, name, email, password, role, is_active FROM users WHERE email = ? LIMIT 1',
    [input.email],
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(input.password, user.password))) {
    return res.status(401).json({ error: 'Email atau password salah, atau akun tidak aktif.' });
  }
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.user = userView(user);
  req.session.csrfToken = randomBytes(32).toString('hex');
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  await audit(req, 'login', 'user', user.id, 'Login berhasil');
  res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
}));

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));

app.post('/api/auth/logout', requireLogin, asyncRoute(async (req, res) => {
  await audit(req, 'logout', 'user', req.session.user.id, 'Logout');
  await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
  res.clearCookie(config.sessionName, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production' });
  res.json({ ok: true });
}));

app.get('/api/dashboard', requireLogin, asyncRoute(async (req, res) => {
  const [credentialCount] = await pool.query('SELECT COUNT(*) AS count FROM credentials');
  const [userCount] = await pool.query('SELECT COUNT(*) AS count FROM users');
  const [categoryCount] = await pool.query('SELECT COUNT(*) AS count FROM categories');
  const [recent] = await pool.query(
    `SELECT c.id, c.title, c.service_type, c.url, c.updated_at, c.created_at, u.name AS owner
     FROM credentials c LEFT JOIN users u ON u.id = c.updated_by
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC LIMIT 6`,
  );
  const github = await getConnection(req.session.user.id);
  res.json({
    counts: {
      credentials: Number(credentialCount[0].count),
      users: Number(userCount[0].count),
      categories: Number(categoryCount[0].count),
    },
    recent,
    github,
  });
}));

app.get('/api/categories', requireLogin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name');
  res.json(rows);
}));

app.get('/api/credentials', requireLogin, asyncRoute(async (req, res) => {
  const search = String(req.query.q || '').trim().slice(0, 190);
  const serviceType = String(req.query.type || '');
  if (serviceType && !serviceTypes.includes(serviceType)) throw httpError(400, 'Tipe kredensial tidak valid.');
  const filters = [];
  const values = [];
  if (search) {
    const term = `%${search}%`;
    filters.push('(c.title LIKE ? OR c.url LIKE ? OR c.username LIKE ? OR c.email LIKE ?)');
    values.push(term, term, term, term);
  }
  if (serviceType) {
    filters.push('c.service_type = ?');
    values.push(serviceType);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT c.id, c.title, c.service_type, c.url, c.username, c.email, c.notes, c.category_id,
            c.created_at, c.updated_at, cat.name AS category_name, creator.name AS creator_name
     FROM credentials c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users creator ON creator.id = c.created_by
     ${where}
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC LIMIT 300`,
    values,
  );
  res.json(rows);
}));

app.get('/api/credentials/:id', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT c.id, c.title, c.service_type, c.url, c.username, c.email, c.notes, c.category_id,
            c.created_at, c.updated_at, cat.name AS category_name, creator.name AS creator_name
     FROM credentials c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users creator ON creator.id = c.created_by
     WHERE c.id = ? LIMIT 1`,
    [req.params.id],
  );
  if (!rows[0]) throw httpError(404, 'Kredensial tidak ditemukan.');
  res.json(rows[0]);
}));

app.post('/api/credentials', requireRole('admin', 'it'), asyncRoute(async (req, res) => {
  const input = validate(credentialSchema, req.body);
  if (input.category_id) {
    const [categories] = await pool.execute('SELECT id FROM categories WHERE id = ?', [input.category_id]);
    if (!categories.length) throw httpError(400, 'Kategori tidak ditemukan.');
  }
  const [result] = await pool.execute(
    `INSERT INTO credentials(title, service_type, url, username, email, password_ciphertext, notes, category_id, created_by)
     VALUES(?,?,?,?,?,?,?,?,?)`,
    [input.title, input.service_type, input.url || null, input.username || null, input.email || null, encryptSecret(input.password), input.notes || null, input.category_id, req.session.user.id],
  );
  await audit(req, 'credential.create', 'credential', result.insertId, `Kredensial: ${input.title}`);
  res.status(201).json({ id: result.insertId });
}));

app.put('/api/credentials/:id', requireRole('admin', 'it'), asyncRoute(async (req, res) => {
  const input = validate(credentialSchema, req.body);
  const [rows] = await pool.execute('SELECT password_ciphertext FROM credentials WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Kredensial tidak ditemukan.');
  if (input.category_id) {
    const [categories] = await pool.execute('SELECT id FROM categories WHERE id = ?', [input.category_id]);
    if (!categories.length) throw httpError(400, 'Kategori tidak ditemukan.');
  }
  const ciphertext = input.password ? encryptSecret(input.password) : rows[0].password_ciphertext;
  await pool.execute(
    `UPDATE credentials SET title = ?, service_type = ?, url = ?, username = ?, email = ?,
     password_ciphertext = ?, notes = ?, category_id = ?, updated_by = ? WHERE id = ?`,
    [input.title, input.service_type, input.url || null, input.username || null, input.email || null, ciphertext, input.notes || null, input.category_id, req.session.user.id, req.params.id],
  );
  await audit(req, 'credential.update', 'credential', req.params.id, `Kredensial: ${input.title}`);
  res.json({ ok: true });
}));

app.post('/api/credentials/:id/reveal', requireRole('admin', 'it'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT password_ciphertext, title FROM credentials WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Kredensial tidak ditemukan.');
  await audit(req, 'credential.reveal', 'credential', req.params.id, `Password dibuka: ${rows[0].title}`);
  res.json({ password: decryptSecret(rows[0].password_ciphertext) });
}));

app.delete('/api/credentials/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT title FROM credentials WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows[0]) throw httpError(404, 'Kredensial tidak ditemukan.');
  await pool.execute('DELETE FROM credentials WHERE id = ?', [req.params.id]);
  await audit(req, 'credential.delete', 'credential', req.params.id, `Kredensial: ${rows[0].title}`);
  res.json({ ok: true });
}));

app.get('/api/users', requireRole('admin'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_active, last_login_at, created_at FROM users ORDER BY name',
  );
  res.json(rows.map(userView));
}));

app.post('/api/users', requireRole('admin'), asyncRoute(async (req, res) => {
  const input = validate(userSchema, req.body);
  const hash = await bcrypt.hash(input.password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users(name, email, password, role) VALUES(?,?,?,?)',
    [input.name, input.email, hash, input.role],
  );
  await audit(req, 'user.create', 'user', result.insertId, `Pengguna dibuat: ${input.email}`);
  res.status(201).json({ id: result.insertId });
}));

app.patch('/api/users/:id/status', requireRole('admin'), asyncRoute(async (req, res) => {
  const active = validate(z.object({ is_active: z.boolean() }), req.body).is_active;
  if (String(req.params.id) === String(req.session.user.id)) {
    throw httpError(400, 'Anda tidak dapat mengubah status akun sendiri.');
  }
  const [result] = await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id]);
  if (!result.affectedRows) throw httpError(404, 'Pengguna tidak ditemukan.');
  await audit(req, 'user.status', 'user', req.params.id, active ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
  res.json({ ok: true });
}));

app.get('/api/audit', requireRole('admin'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.ip_address, a.details, a.created_at, u.name AS user_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT 250`,
  );
  res.json(rows);
}));

app.get('/api/github/status', requireLogin, asyncRoute(async (req, res) => {
  res.json({ configured: Boolean(config.github.clientId && config.github.clientSecret), connection: await getConnection(req.session.user.id) });
}));

app.get('/api/github/connect', requireLogin, (req, res) => {
  if (!config.github.clientId || !config.github.clientSecret) throw httpError(503, 'GitHub OAuth belum dikonfigurasi.');
  const state = randomBytes(32).toString('hex');
  req.session.githubOAuthState = state;
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: `${config.appUrl}/api/github/callback`,
    scope: config.github.scope,
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get('/api/github/callback', requireLogin, asyncRoute(async (req, res) => {
  const state = String(req.query.state || '');
  const expected = req.session.githubOAuthState || '';
  delete req.session.githubOAuthState;
  if (!state || state !== expected || !req.query.code) return res.redirect(`${config.appUrl}/github?error=oauth`);
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.github.clientId, client_secret: config.github.clientSecret, code: req.query.code, redirect_uri: `${config.appUrl}/api/github/callback`, state }),
      signal: AbortSignal.timeout(20000),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'OAuth GitHub gagal.');
    const githubUser = await githubRequest(tokenData.access_token, '/user');
    await pool.execute(
      `INSERT INTO github_connections(user_id, github_user_id, github_login, access_token_ciphertext, scope_text)
       VALUES(?,?,?,?,?)
       ON DUPLICATE KEY UPDATE github_user_id = VALUES(github_user_id), github_login = VALUES(github_login),
       access_token_ciphertext = VALUES(access_token_ciphertext), scope_text = VALUES(scope_text)`,
      [req.session.user.id, githubUser.id, githubUser.login, encryptSecret(tokenData.access_token), tokenData.scope || config.github.scope],
    );
    await audit(req, 'github.connect', 'github_connection', req.session.user.id, `Terhubung sebagai ${githubUser.login}`);
    res.redirect(`${config.appUrl}/github?connected=1`);
  } catch (error) {
    console.error('GitHub OAuth callback failed:', error.message);
    res.redirect(`${config.appUrl}/github?error=oauth`);
  }
}));

app.delete('/api/github/connection', requireLogin, asyncRoute(async (req, res) => {
  await pool.execute('DELETE FROM github_connections WHERE user_id = ?', [req.session.user.id]);
  await audit(req, 'github.disconnect', 'github_connection', req.session.user.id, 'Koneksi GitHub dihapus');
  res.json({ ok: true });
}));

app.get('/api/github/repos', requireLogin, asyncRoute(async (req, res) => {
  const token = await getGitHubToken(req.session.user.id);
  if (!token) throw httpError(409, 'Hubungkan GitHub terlebih dahulu.');
  const repositories = await githubRequest(token, '/user/repos?per_page=100&sort=updated');
  res.json(repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    description: repo.description,
    html_url: repo.html_url,
    default_branch: repo.default_branch,
    updated_at: repo.updated_at,
  })));
}));

app.post('/api/github/repos/:owner/:repo/operations', requireRole('admin', 'it'), asyncRoute(async (req, res) => {
  const { operation, branch } = validate(z.object({
    operation: z.enum(['clone', 'pull', 'status', 'push']),
    branch: z.string().max(200).optional(),
  }), req.body);
  if (!validRepo(req.params.owner, req.params.repo)) throw httpError(400, 'Nama repository tidak valid.');
  const token = await getGitHubToken(req.session.user.id);
  if (!token) throw httpError(409, 'Hubungkan GitHub terlebih dahulu.');
  const output = await operateRepository({ owner: req.params.owner, repo: req.params.repo, operation, branch, token });
  await audit(req, `github.repo.${operation}`, 'github_repository', null, `${req.params.owner}/${req.params.repo} (${branch || 'default'})`);
  res.json({ output: output || 'Operasi selesai tanpa output.' });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use(express.static(distPath, { index: false, maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
app.get('*path', (_req, res, next) => {
  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = Number(error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500));
  const message = status >= 500 ? 'Terjadi kesalahan server. Periksa konfigurasi dan log aplikasi.' : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: message });
});

export default app;
