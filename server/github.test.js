import test from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';

const { validRepo } = await import('./github.js');

test('repository identifiers reject path traversal and malformed names', () => {
  assert.equal(validRepo('octocat', 'hello-world'), true);
  assert.equal(validRepo('team-name', 'repo.name_1'), true);
  assert.equal(validRepo('../outside', 'repo'), false);
  assert.equal(validRepo('owner', '..'), false);
  assert.equal(validRepo('owner', 'repo/name'), false);
});
