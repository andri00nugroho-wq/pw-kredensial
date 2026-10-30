import test from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';

const [{ encryptSecret, decryptSecret }, { credentialSchema, emailSchema, userSchema }] = await Promise.all([
  import('./crypto.js'),
  import('./validation.js'),
]);
const bcrypt = (await import('bcryptjs')).default;

test('encrypted secrets round-trip in the legacy PHP-compatible payload format', () => {
  const ciphertext = encryptSecret('shared-vault-password');
  const payload = Buffer.from(ciphertext, 'base64');

  assert.equal(payload.length, 12 + 16 + Buffer.byteLength('shared-vault-password'));
  assert.equal(decryptSecret(ciphertext), 'shared-vault-password');
  assert.equal(decryptSecret('AQEBAQEBAQEBAQEBERStt5dpMpEwNI1tMBR14BklpAsZ8FWOB9WW488='), 'legacy-secret');
  assert.equal(encryptSecret(''), null);
});

test('bcrypt verifies PHP password_hash values using the $2y$ prefix', async () => {
  const hash = await bcrypt.hash('legacy-password-123', 4);
  const phpHash = `$2y$${hash.slice(4)}`;
  assert.equal(await bcrypt.compare('legacy-password-123', phpHash), true);
});

test('email addresses are normalized and invalid email is rejected', () => {
  assert.equal(emailSchema.parse('  OWNER@example.com '), 'owner@example.com');
  assert.equal(emailSchema.safeParse('not-an-email').success, false);
});

test('user password minimum and role are enforced', () => {
  const base = { name: 'Admin User', email: 'admin@example.com', password: 'a'.repeat(12), role: 'admin' };
  assert.equal(userSchema.safeParse(base).success, true);
  assert.equal(userSchema.safeParse({ ...base, password: 'short' }).success, false);
  assert.equal(userSchema.safeParse({ ...base, role: 'owner' }).success, false);
});

test('credential URLs only allow HTTP and HTTPS', () => {
  const base = { title: 'Portal', service_type: 'website' };
  assert.equal(credentialSchema.safeParse({ ...base, url: 'https://example.com' }).success, true);
  assert.equal(credentialSchema.safeParse({ ...base, url: 'javascript:alert(1)' }).success, false);
});
