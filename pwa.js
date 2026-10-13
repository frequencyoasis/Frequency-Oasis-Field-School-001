/* Frequency Oasis — PWA glue: service worker, install prompt, connection status, update toast. */
(() => {
  'use strict';
  const FO = window.FO;
  const $ = (id) => document.getElementById(id);
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let offlineReady = false;
  let deferred = null;

  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

  function status() {
    const el = $('connStatus'); if (!el) return;
    el.textContent = !navigator.onLine ? 'Offline · running from this device' : offlineReady ? 'Offline-ready' : 'Prototype / local browser';
  }
  function installUI() {
    const can = !!deferred && !standalone();
    ['installBtn', 'installBtn2'].forEach((id) => { const b = $(id); if (!b) return; b.classList.toggle('hidden', id === 'installBtn' && !can); b.disabled = !can; });
    const st = $('installState'); if (!st) return;
    st.textContent = standalone() ? 'Running as an installed app.'
      : can ? 'Ready to install on this device.'
      : offlineReady ? 'Works offline already. Use your browser’s menu (Install app or Add to Home Screen) to add an icon.'
      : secure ? 'Loading offline support… reload once if this does not change.' : 'Offline install needs https or localhost. Opened as a local file, the app still runs but cannot install.';
  }
  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) { /* dismissed */ }
    deferred = null; installUI();
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; installUI(); });
  window.addEventListener('appinstalled', () => { deferred = null; installUI(); FO && FO.toast('Installed. Find Frequency Oasis with your apps.'); });
  ['installBtn', 'installBtn2'].forEach((id) => $(id) && $(id).addEventListener('click', install));
  window.addEventListener('online', status);
  window.addEventListener('offline', status);

  if ('serviceWorker' in navigator && secure) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const watch = (sw) => sw && sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          FO && FO.toast('A new version is ready.', 0, { label: 'Reload', run: () => sw.postMessage({ type: 'SKIP_WAITING' }) });
        }
      });
      if (reg.waiting && navigator.serviceWorker.controller) watch(reg.waiting);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch((err) => console.warn('Service worker registration failed', err));
    navigator.serviceWorker.ready.then(() => { offlineReady = true; status(); installUI(); });
  }
  status(); installUI();
})();
