import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jsonBody } from '../api.js';

const serviceTypes = ['website', 'application', 'server', 'database', 'other'];

export function CredentialList({ user }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/credentials?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`)
      .then((result) => { if (active) setRows(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, type]);

  return (
    <>
      <div className="welcome-row">
        <div><p className="eyebrow">VAULT</p><h1>Brankas kredensial</h1><p className="muted">Kelola login website, aplikasi, server, dan layanan.</p></div>
        {user.role !== 'viewer' && <Link className="btn btn-primary" to="/credentials/new">＋ Tambah kredensial</Link>}
      </div>
      {error && <div className="alert error">{error}</div>}
      <section className="panel">
        <div className="filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, URL, username, email..." aria-label="Cari kredensial" />
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter tipe">
            <option value="">Semua tipe</option>{serviceTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        {loading ? <div className="loading-inline"><span className="spinner" />Memuat data...</div> : rows.length === 0 ? <div className="empty-state"><span>▣</span><b>Belum ada data</b><p>Coba ubah kata pencarian atau filter.</p></div> : (
          <div className="table-wrap"><table><thead><tr><th>Nama layanan</th><th>Tipe</th><th>Kategori</th><th>Username</th><th>URL</th><th>Dibuat oleh</th></tr></thead><tbody>
            {rows.map((row) => <tr key={row.id}>
              <td><Link className="table-title" to={`/credentials/${row.id}`}>{row.title}</Link></td>
              <td><span className="tag">{row.service_type}</span></td><td>{row.category_name || '—'}</td><td>{row.username || '—'}</td>
              <td>{row.url ? <a className="truncate-link" href={row.url} target="_blank" rel="noreferrer">{row.url}</a> : '—'}</td><td>{row.creator_name || '—'}</td>
            </tr>)}
          </tbody></table></div>
        )}
        {!loading && rows.length === 300 && <p className="table-foot">Menampilkan maksimal 300 hasil. Tambahkan filter untuk mempersempit pencarian.</p>}
      </section>
    </>
  );
}

export function CredentialForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(id);

  useEffect(() => {
    let active = true;
    Promise.all([api('/categories'), editing ? api(`/credentials/${id}`) : Promise.resolve(null)])
      .then(([categoryList, credential]) => {
        if (active) {
          setCategories(categoryList);
          setInitial(credential || {});
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [editing, id]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      if (editing) await api(`/credentials/${id}`, { method: 'PUT', body: jsonBody(payload) });
      else {
        const result = await api('/credentials', { method: 'POST', body: jsonBody(payload) });
        navigate(`/credentials/${result.id}`);
        return;
      }
      navigate(`/credentials/${id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!initial && !error) return <div className="panel loading-inline"><span className="spinner" />Memuat formulir...</div>;

  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">VAULT</p><h1>{editing ? 'Edit kredensial' : 'Tambah kredensial'}</h1><p className="muted">Informasi disimpan dengan enkripsi untuk password.</p></div></div>
      {error && <div className="alert error">{error}</div>}
      <section className="panel form-panel">
        <form className="form-grid" onSubmit={submit}>
          <label>Nama layanan<input name="title" required maxLength="160" defaultValue={initial?.title || ''} /></label>
          <label>Tipe layanan<select name="service_type" defaultValue={initial?.service_type || 'website'}>{serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>URL<input name="url" type="url" maxLength="2048" placeholder="https://" defaultValue={initial?.url || ''} /></label>
          <label>Kategori<select name="category_id" defaultValue={initial?.category_id || ''}><option value="">Tanpa kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Username<input name="username" maxLength="190" defaultValue={initial?.username || ''} /></label>
          <label>Email<input name="email" type="email" maxLength="190" defaultValue={initial?.email || ''} /></label>
          <label className="span-2">Password {editing && <span className="field-help">Kosongkan untuk mempertahankan password sebelumnya.</span>}<input name="password" type="password" autoComplete="new-password" maxLength="4000" /></label>
          <label className="span-2">Catatan<textarea name="notes" rows="5" maxLength="10000" defaultValue={initial?.notes || ''} /></label>
          <div className="form-actions span-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan kredensial'}</button><Link className="btn btn-ghost" to={editing ? `/credentials/${id}` : '/credentials'}>Batal</Link></div>
        </form>
      </section>
    </>
  );
}

export function CredentialDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credential, setCredential] = useState(null);
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canEdit = user.role === 'admin' || user.role === 'it';

  useEffect(() => {
    api(`/credentials/${id}`).then(setCredential).catch((requestError) => setError(requestError.message));
  }, [id]);

  async function reveal() {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/credentials/${id}/reveal`, { method: 'POST' });
      setSecret(result.password);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Hapus kredensial ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await api(`/credentials/${id}`, { method: 'DELETE' });
      navigate('/credentials');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError('Clipboard tidak tersedia. Salin teks secara manual.');
    }
  }

  const fields = useMemo(() => credential ? [
    ['Tipe layanan', credential.service_type],
    ['Kategori', credential.category_name || '—'],
    ['URL', credential.url || '—'],
    ['Username', credential.username || '—'],
    ['Email', credential.email || '—'],
    ['Catatan', credential.notes || '—'],
    ['Dibuat oleh', credential.creator_name || '—'],
  ] : [], [credential]);

  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">DETAIL VAULT</p><h1>{credential?.title || 'Detail kredensial'}</h1><p className="muted">Informasi akses tersimpan dengan aman.</p></div>
        {credential && <div className="button-row">{canEdit && <Link className="btn btn-secondary" to={`/credentials/${id}/edit`}>Edit</Link>}{user.role === 'admin' && <button className="btn btn-danger" onClick={remove}>Hapus</button>}</div>}
      </div>
      {error && <div className="alert error">{error}</div>}
      {!credential ? <div className="panel loading-inline"><span className="spinner" />Memuat kredensial...</div> : (
        <div className="detail-grid">
          <section className="panel"><div className="panel-heading"><div><h2>Informasi layanan</h2><p>Detail kredensial dan akses</p></div></div>
            <dl className="detail-list">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'URL' && value !== '—' ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : value}</dd></div>)}
              <div><dt>Password</dt><dd>{canEdit ? <div className="secret-row"><code>{secret === null ? '••••••••••••' : secret || '(kosong)'}</code>{secret === null ? <button className="btn btn-small btn-secondary" onClick={reveal} disabled={busy}>{busy ? 'Memuat...' : 'Lihat'}</button> : <button className="btn btn-small btn-secondary" onClick={() => copy(secret)}>Salin</button>}</div> : <span className="muted">Tidak memiliki izin untuk membuka password.</span>}</dd></div>
            </dl>
          </section>
          <aside className="panel"><div className="panel-heading"><div><h2>Keamanan</h2><p>Gunakan data dengan bijak</p></div></div><div className="security-note"><b>◈ Enkripsi aktif</b><p>Password terenkripsi saat disimpan. Membukanya akan dicatat pada audit log.</p></div><Link className="btn btn-ghost btn-block back-link" to="/credentials">← Kembali ke daftar</Link></aside>
        </div>
      )}
    </>
  );
}
