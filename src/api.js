let csrfToken = '';

export async function refreshCsrf() {
  const response = await fetch('/api/csrf', { credentials: 'same-origin' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Gagal memuat token keamanan.');
  csrfToken = result.token;
  return csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !csrfToken) await refreshCsrf();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (response.status === 419) {
    await refreshCsrf();
    throw new Error('Sesi keamanan diperbarui. Silakan coba kembali.');
  }
  if (!response.ok) throw new Error(data?.error || 'Permintaan gagal.');
  return data;
}

export function jsonBody(value) {
  return JSON.stringify(value);
}
