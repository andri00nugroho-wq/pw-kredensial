import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { mkdir, realpath } from 'node:fs/promises';
import { config } from './config.js';
import { decryptSecret } from './crypto.js';
import { pool } from './db.js';

const execFile = promisify(execFileCallback);
const ownerName = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const repoName = /^[A-Za-z0-9_.-]{1,100}$/;
const branchName = /^(?!-)(?!.*\.\.)(?!.*\/\.)(?!.*\.lock$)[A-Za-z0-9._/-]{1,200}$/;

export async function githubRequest(token, endpoint, options = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'REI-Credential-Vault',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub API HTTP ${response.status}`);
  return data;
}

export async function getConnection(userId) {
  const [rows] = await pool.execute(
    'SELECT github_login, github_user_id, scope_text FROM github_connections WHERE user_id = ?',
    [userId],
  );
  return rows[0] || null;
}

export async function getGitHubToken(userId) {
  const [rows] = await pool.execute(
    'SELECT access_token_ciphertext FROM github_connections WHERE user_id = ?',
    [userId],
  );
  return rows[0] ? decryptSecret(rows[0].access_token_ciphertext) : null;
}

export function validRepo(owner, repo) {
  return ownerName.test(owner) && repoName.test(repo) && repo !== '.' && repo !== '..';
}

function commandEnvironment(token) {
  if (!token) return process.env;
  return {
    ...process.env,
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
  };
}

async function runGit(args, cwd, token) {
  const { stdout, stderr } = await execFile('git', args, {
    cwd,
    env: commandEnvironment(token),
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return `${stdout}${stderr}`.trim().slice(0, 5000);
}

async function repositoryPath(owner, repo, mustExist = true) {
  if (!validRepo(owner, repo)) throw Object.assign(new Error('Nama repository tidak valid.'), { status: 400 });
  const workspace = path.resolve(config.repoWorkspace);
  const target = path.resolve(workspace, owner, repo);
  if (target !== path.join(workspace, owner, repo) && !target.startsWith(`${workspace}${path.sep}`)) {
    throw Object.assign(new Error('Path repository tidak valid.'), { status: 400 });
  }
  if (!mustExist) return { workspace, target };
  const resolvedWorkspace = await realpath(workspace);
  const resolvedTarget = await realpath(target);
  if (!resolvedTarget.startsWith(`${resolvedWorkspace}${path.sep}`)) {
    throw Object.assign(new Error('Path repository berada di luar workspace.'), { status: 400 });
  }
  return { workspace: resolvedWorkspace, target: resolvedTarget };
}

export async function operateRepository({ owner, repo, operation, branch, token }) {
  const { workspace, target } = await repositoryPath(owner, repo, operation !== 'clone');
  if (operation === 'clone') {
    await mkdir(path.dirname(target), { recursive: true });
    const output = await runGit(['clone', '--', `https://github.com/${owner}/${repo}.git`, target], workspace, token);
    return output || 'Repository berhasil di-clone.';
  }
  const remote = (await runGit(['-C', target, 'remote', 'get-url', 'origin'], workspace, token)).split(/\r?\n/)[0];
  const expectedRemotePath = `/${owner}/${repo}`;
  let validRemote = false;
  try {
    const remoteUrl = new URL(remote);
    validRemote = remoteUrl.protocol === 'https:'
      && remoteUrl.hostname.toLowerCase() === 'github.com'
      && remoteUrl.username === ''
      && remoteUrl.password === ''
      && remoteUrl.pathname.replace(/\.git$/, '') === expectedRemotePath;
  } catch {
    validRemote = false;
  }
  if (!validRemote) {
    throw Object.assign(new Error('Remote Git tidak valid. Operasi repository dibatalkan.'), { status: 400 });
  }
  if (!['status', 'pull', 'push'].includes(operation)) {
    throw Object.assign(new Error('Operasi repository tidak dikenal.'), { status: 400 });
  }
  if (operation === 'status') return runGit(['-C', target, 'status', '--short', '--branch'], workspace);
  if (!branch || !branchName.test(branch) || branch.split('/').some((part) => !part || part.startsWith('.'))) {
    throw Object.assign(new Error('Nama branch tidak valid.'), { status: 400 });
  }
  if (operation === 'pull') return runGit(['-C', target, 'pull', '--ff-only', 'origin', branch], workspace, token);
  return runGit(['-C', target, 'push', 'origin', `HEAD:refs/heads/${branch}`], workspace, token);
}
