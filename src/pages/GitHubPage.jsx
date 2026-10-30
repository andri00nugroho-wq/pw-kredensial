import { useCallback, useEffect, useState } from 'react';
import { api, jsonBody } from '../api.js';

export default function GitHubPage({ user }) {
  const [status, setStatus] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [branches, setBranches] = useState({});
  const [output, setOutput] = useState({});
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const canOperate = user.role === 'admin' || user.role === 'it';

  const loadStatus = useCallback(async () => {
    const result = await api('/github/status');
    setStatus(result);
    if (result.connection) setRepositories(await api('/github/repos'));
    else setRepositories([]);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('error')) setError('Koneksi GitHub gagal. Periksa konfigurasi OAuth lalu coba lagi.');
    loadStatus().catch((requestError) => setError(requestError.message));
  }, [loadStatus]);

  async function disconnect() {
    setError('');
    try {
      await api('/github/connection', { method: 'DELETE' });
      setRepositories([]);
      await loadStatus();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function operate(repo, operation) {
    const key = `${repo.full_name}:${operation}`;
    setError('');
    setBusyKey(key);
    try {
      const branch = branches[repo.full_name] || repo.default_branch;
      const result = await api(`/github/repos/${encodeURIComponent(repo.owner?.login || repo.full_name.split('/')[0])}/${encodeURIComponent(repo.name)}/operations`, {
        method: 'POST',
        body: jsonBody({ operation, branch }),
      });
      setOutput((current) => ({ ...current, [repo.full_name]: result.output }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyKey('');
    }
  }

  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">INTEGRATIONS</p><h1>GitHub & Repository</h1><p className="muted">Hubungkan akun dan kelola sinkronisasi repository.</p></div></div>
      {error && <div className="alert error">{error}</div>}
      {!status ? <div className="panel loading-inline"><span className="spinner" />Memuat koneksi...</div> : (
        <>
          <section className="panel github-hero">
            <span className="github-mark">⌘</span>
            <div className="github-info"><h2>{status.connection ? `Terhubung sebagai @${status.connection.github_login}` : 'Hubungkan akun GitHub'}</h2><p>{status.connection ? 'Repository yang dapat diakses akun ini akan ditampilkan.' : 'Gunakan OAuth untuk melihat repository yang Anda miliki atau akses.'}</p></div>
            {status.connection ? <button className="btn btn-ghost" onClick={disconnect}>Putuskan koneksi</button> : status.configured ? <a className="btn btn-primary" href="/api/github/connect">Hubungkan GitHub</a> : <span className="tag">OAuth belum dikonfigurasi</span>}
          </section>
          {status.connection && <section className="repo-grid">
            {repositories.map((repo) => (
              <article className="panel repo-card" key={repo.id}>
                <div className="repo-heading"><span className="repo-icon">⌘</span><div><h2><a href={repo.html_url} target="_blank" rel="noreferrer">{repo.full_name}</a></h2><span className="repo-meta">{repo.private ? 'Private' : 'Public'} · {repo.default_branch}</span></div></div>
                <p className="repo-description">{repo.description || 'Tidak ada deskripsi repository.'}</p>
                {canOperate && <label>Branch operasi<input value={branches[repo.full_name] ?? repo.default_branch} onChange={(event) => setBranches((current) => ({ ...current, [repo.full_name]: event.target.value }))} maxLength="200" /></label>}
                {canOperate && <div className="repo-actions">
                  <button className="btn btn-small btn-secondary" disabled={Boolean(busyKey)} onClick={() => operate(repo, 'clone')}>Clone</button>
                  <button className="btn btn-small btn-ghost" disabled={Boolean(busyKey)} onClick={() => operate(repo, 'pull')}>Pull</button>
                  <button className="btn btn-small btn-ghost" disabled={Boolean(busyKey)} onClick={() => operate(repo, 'status')}>Status</button>
                  <button className="btn btn-small btn-primary" disabled={Boolean(busyKey)} onClick={() => operate(repo, 'push')}>Push</button>
                </div>}
                {busyKey.startsWith(repo.full_name) && <p className="repo-meta">Operasi sedang berjalan...</p>}
                {output[repo.full_name] && <pre className="repo-output">{output[repo.full_name]}</pre>}
              </article>
            ))}
            {!repositories.length && <div className="panel empty-state"><span>⌘</span><b>Repository tidak ditemukan</b><p>Akun ini belum memiliki repository yang dapat ditampilkan.</p></div>}
          </section>}
          {canOperate && <p className="security-note warning-note"><b>Perhatian sebelum push</b><br />Push mengubah repository GitHub sungguhan. Pastikan branch dan perubahan sudah benar.</p>}
        </>
      )}
    </>
  );
}
