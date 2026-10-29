document.addEventListener('click', async (event) => {
  const toggle = event.target.closest('[data-toggle-password]');
  if (toggle) {
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (input) { input.type = input.type === 'password' ? 'text' : 'password'; toggle.textContent = input.type === 'password' ? 'Lihat' : 'Sembunyikan'; }
  }
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    const target = document.querySelector(copy.dataset.copy);
    if (!target) return;
    try { await navigator.clipboard.writeText(target.textContent); copy.textContent='Tersalin'; setTimeout(()=>copy.textContent='Salin',1200); }
    catch { alert('Clipboard tidak tersedia. Salin teks secara manual.'); }
  }
});
