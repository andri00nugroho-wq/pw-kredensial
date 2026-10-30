import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, refreshCsrf, setCsrfToken } from './api.js';
import Layout from './components/Layout.jsx';
import { LoginPage, SetupPage } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { CredentialDetail, CredentialForm, CredentialList } from './pages/Credentials.jsx';
import { AuditPage, UsersPage } from './pages/AdminPages.jsx';
import GitHubPage from './pages/GitHubPage.jsx';

function Loading() {
  return <div className="loading-screen"><span className="spinner" />Memuat Brankas Kredensial...</div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState('');
  const location = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshCsrf();
        const [auth, setup] = await Promise.all([api('/auth/me'), api('/setup/status')]);
        if (active) {
          setUser(auth.user);
          setSetupRequired(setup.required);
        }
      } catch {
        if (active) {
          setSetupRequired(false);
          setBootError('Tidak dapat terhubung ke API aplikasi. Pastikan server Node.js dan database berjalan.');
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  async function onAuthenticated(result) {
    setUser(result.user);
    setCsrfToken(result.csrfToken);
    setSetupRequired(false);
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    await refreshCsrf();
  }

  if (!ready) return <Loading />;
  if (!user) {
    if (setupRequired) return <SetupPage onAuthenticated={onAuthenticated} />;
    return <LoginPage onAuthenticated={onAuthenticated} initialError={bootError} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes location={location}>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/credentials" element={<CredentialList user={user} />} />
        <Route path="/credentials/new" element={<CredentialForm />} />
        <Route path="/credentials/:id/edit" element={<CredentialForm />} />
        <Route path="/credentials/:id" element={<CredentialDetail user={user} />} />
        <Route path="/users" element={user.role === 'admin' ? <UsersPage user={user} /> : <Navigate to="/" replace />} />
        <Route path="/audit" element={user.role === 'admin' ? <AuditPage /> : <Navigate to="/" replace />} />
        <Route path="/github" element={<GitHubPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
