import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoUrl from '../../IT-LOGO.png';

const primaryNavigation = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/credentials', label: 'Kredensial', icon: '▣' },
  { to: '/github', label: 'GitHub & Repo', icon: '⌘' },
];

export default function Layout({ user, onLogout, children }) {
  const [navOpen, setNavOpen] = useState(false);
  const links = user.role === 'admin'
    ? [...primaryNavigation, { to: '/users', label: 'Pengguna', icon: '♙' }, { to: '/audit', label: 'Audit Log', icon: '◷' }]
    : primaryNavigation;

  return (
    <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
      {navOpen && <button className="sidebar-backdrop" aria-label="Tutup menu" onClick={() => setNavOpen(false)} />}
      <aside className="sidebar">
        <NavLink className="brand" to="/" onClick={() => setNavOpen(false)}>
          <img src={logoUrl} alt="Logo IT Division" />
          <span><b>Brankas</b><small>IT RAJA EMAS INDONESIA</small></span>
        </NavLink>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setNavOpen(false)}>
              <span className="nav-icon">{link.icon}</span><span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="account-name"><b>{user.name}</b><small>{user.role.toUpperCase()}</small></span>
          <button className="logout-button" onClick={onLogout} aria-label="Keluar" title="Keluar">↗</button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setNavOpen(!navOpen)} aria-label="Buka navigasi">☰</button>
          <div><b>Brankas Kredensial</b><small>Ruang kerja internal · Aman dan terkontrol</small></div>
          <span className="secure-pill"><i /> Brankas aktif</span>
        </header>
        <section className="page-content">{children}</section>
        <footer className="footer"><span>© {new Date().getFullYear()} IT RAJA EMAS INDONESIA</span><span>Brankas Kredensial · Akses terbatas</span></footer>
      </main>
    </div>
  );
}
