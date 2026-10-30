import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function StatCard({ icon, label, value, note, tone }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard').then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <>
      <div className="welcome-row">
        <div><p className="eyebrow">OVERVIEW</p><h1>Selamat datang, {user.name}.</h1><p className="muted">Kelola akses digital perusahaan dalam satu tempat yang terkontrol.</p></div>
        {user.role !== 'viewer' && <Link className="btn btn-primary" to="/credentials/new">＋ Tambah kredensial</Link>}
      </div>
      {error && <div className="alert error">{error}</div>}
      {!data ? <div className="panel loading-inline"><span className="spinner" />Memuat ringkasan...</div> : (
        <>
          <div className="stats-grid">
            <StatCard icon="▣" tone="violet" label="Total kredensial" value={data.counts.credentials} note="Data akses tersimpan" />
            <StatCard icon="♙" tone="gold" label="Pengguna sistem" value={data.counts.users} note="Akun terdaftar" />
            <StatCard icon="▤" tone="blue" label="Kategori" value={data.counts.categories} note="Kelompok layanan" />
            <StatCard icon="⌘" tone="green" label="GitHub" value={data.github ? 'Terhubung' : 'Belum'} note={data.github ? `@${data.github.github_login}` : 'Hubungkan repository'} />
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading"><div><h2>Kredensial terbaru</h2><p>Terakhir dibuat atau diperbarui</p></div><Link className="text-link" to="/credentials">Lihat semua →</Link></div>
              {data.recent.length === 0 ? <div className="empty-state"><span>▣</span><b>Belum ada kredensial</b><p>Tambahkan website atau aplikasi pertama.</p>{user.role !== 'viewer' && <Link className="btn btn-secondary" to="/credentials/new">Tambah data</Link>}</div> : (
                <div className="table-wrap"><table><thead><tr><th>Nama layanan</th><th>Tipe</th><th>URL</th><th>Terakhir diubah</th></tr></thead><tbody>
                  {data.recent.map((row) => <tr key={row.id}><td><Link className="table-title" to={`/credentials/${row.id}`}>{row.title}</Link></td><td><span className="tag">{row.service_type}</span></td><td>{row.url ? <a className="truncate-link" href={row.url} target="_blank" rel="noreferrer">{row.url}</a> : '—'}</td><td>{row.updated_at || row.created_at || 'Baru dibuat'}</td></tr>)}
                </tbody></table></div>
              )}
            </section>
            <aside className="panel quick-panel"><div className="panel-heading"><div><h2>Akses cepat</h2><p>Shortcut operasional</p></div></div>
              <Link className="quick-link" to="/credentials"><span className="quick-icon">▣</span><span><b>Brankas kredensial</b><small>Cari dan kelola akses</small></span><span>→</span></Link>
              <Link className="quick-link" to="/github"><span className="quick-icon gold-bg">⌘</span><span><b>GitHub repository</b><small>Kelola koneksi dan sinkronisasi</small></span><span>→</span></Link>
              {user.role === 'admin' && <Link className="quick-link" to="/users"><span className="quick-icon">♙</span><span><b>Pengguna sistem</b><small>Atur role dan akses</small></span><span>→</span></Link>}
              <div className="security-note"><b>◈ Tips keamanan</b><p>Jangan bagikan password melalui chat. Gunakan fitur salin hanya saat diperlukan dan logout setelah selesai.</p></div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
