import { useState } from 'react';
import { api, jsonBody } from '../api.js';
import logoUrl from '../../IT-LOGO.png';

function AuthShell({ children }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-logo" src={logoUrl} alt="Logo IT Division" />
        {children}
        <div className="auth-foot"><span>◈ Enkripsi aktif</span><span>• Akses terbatas</span></div>
      </section>
    </main>
  );
}

export function LoginPage({ onAuthenticated, initialError = '' }) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: jsonBody({ email: form.get('email'), password: form.get('password') }),
      });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <p className="eyebrow">IT RAJA EMAS INDONESIA</p>
      <h1>Brankas Kredensial</h1>
      <p className="auth-subtitle">Satu tempat aman untuk mengelola akses digital tim.</p>
      {error && <div className="alert error">{error}</div>}
      <form className="form-stack" onSubmit={submit}>
        <label>Email kantor<input name="email" type="email" autoComplete="username" required placeholder="nama@rajaemas.co.id" /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan password" /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk ke brankas →'}</button>
      </form>
    </AuthShell>
  );
}

export function SetupPage({ onAuthenticated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/setup', {
        method: 'POST',
        body: jsonBody({ name: form.get('name'), email: form.get('email'), password: form.get('password') }),
      });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <p className="eyebrow">SETUP AWAL</p>
      <h1>Buat admin pertama</h1>
      <p className="auth-subtitle">Buat akun administrator untuk mulai mengelola brankas.</p>
      {error && <div className="alert error">{error}</div>}
      <form className="form-stack" onSubmit={submit}>
        <label>Nama lengkap<input name="name" minLength="2" maxLength="120" required /></label>
        <label>Email<input name="email" type="email" maxLength="190" required /></label>
        <label>Password (minimal 12 karakter)<input name="password" type="password" minLength="12" maxLength="200" required /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Membuat akun...' : 'Buat admin'}</button>
      </form>
    </AuthShell>
  );
}
