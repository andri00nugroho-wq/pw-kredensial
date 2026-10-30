import { useEffect, useState } from 'react';
import { api, jsonBody } from '../api.js';

export function UsersPage({ user }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadUsers() {
    try {
      setUsers(await api('/users'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/users', {
        method: 'POST',
        body: jsonBody(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset();
      setNotice('Pengguna berhasil dibuat.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(account) {
    setError('');
    try {
      await api(`/users/${account.id}/status`, {
        method: 'PATCH',
        body: jsonBody({ is_active: !account.is_active }),
      });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">ACCESS CONTROL</p><h1>Pengguna sistem</h1><p className="muted">Buat akun dan tentukan hak akses minimum yang diperlukan.</p></div></div>
      {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
      <div className="user-layout">
        <section className="panel"><div className="panel-heading"><div><h2>Daftar pengguna</h2><p>{users.length} akun</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Login terakhir</th><th>Aksi</th></tr></thead><tbody>
            {users.map((account) => <tr key={account.id}>
              <td><b className="table-title">{account.name}</b><span className="cell-sub">{account.email}</span></td>
              <td><span className="tag">{account.role}</span></td>
              <td><span className={`status-tag ${account.is_active ? 'active' : 'inactive'}`}>{account.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
              <td>{account.last_login_at || 'Belum pernah'}</td>
              <td>{String(account.id) === String(user.id) ? <span className="muted">Anda</span> : <button className="btn btn-small btn-ghost" onClick={() => toggleStatus(account)}>{account.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>}</td>
            </tr>)}
          </tbody></table></div>
        </section>
        <aside className="panel"><div className="panel-heading"><div><h2>Tambah pengguna</h2><p>Password minimal 12 karakter</p></div></div>
          <form className="form-stack" onSubmit={createUser}>
            <label>Nama<input name="name" minLength="2" maxLength="120" required /></label>
            <label>Email<input name="email" type="email" maxLength="190" required /></label>
            <label>Password<input name="password" type="password" minLength="12" maxLength="200" autoComplete="new-password" required /></label>
            <label>Role<select name="role" defaultValue="viewer"><option value="viewer">Viewer — hanya lihat</option><option value="it">IT — kelola kredensial</option><option value="admin">Admin — semua akses</option></select></label>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Membuat...' : 'Buat pengguna'}</button>
          </form>
        </aside>
      </div>
    </>
  );
}

export function AuditPage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/audit').then(setEvents).catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <>
      <div className="welcome-row"><div><p className="eyebrow">SECURITY</p><h1>Audit log</h1><p className="muted">Aktivitas terbaru pada aplikasi.</p></div></div>
      {error && <div className="alert error">{error}</div>}
      <section className="panel">
        <div className="panel-heading"><div><h2>Aktivitas terbaru</h2><p>Menampilkan maksimal 250 aktivitas</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>Detail</th><th>Alamat IP</th></tr></thead><tbody>
          {events.map((event) => <tr key={event.id}><td>{event.created_at}</td><td>{event.user_name || 'System'}</td><td><span className="tag">{event.action}</span></td><td>{event.entity_type}{event.entity_id ? ` #${event.entity_id}` : ''}</td><td>{event.details || '—'}</td><td>{event.ip_address || '—'}</td></tr>)}
          {!events.length && !error && <tr><td colSpan="6">Belum ada aktivitas.</td></tr>}
        </tbody></table></div>
      </section>
    </>
  );
}
