import { openDatabase } from './storage/database.js';
import { renderClubView } from './ui/club-view.js';
import { renderSettingsView } from './ui/settings-view.js';
import { renderSbcView } from './ui/sbc-view.js';
import { renderGalleryView } from './ui/gallery-view.js';
import { renderMarketView } from './ui/market-view.js';

const APP_VERSION = '0.2.0';
const main = document.querySelector('#main-content');
const status = document.querySelector('#save-status');
const navLinks = [...document.querySelectorAll('[data-view]')];

document.querySelector('#app-version').textContent = `v${APP_VERSION}`;
window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;
  const target = event.target;
  const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName));
  if (event.key === 'Escape') { target?.blur?.(); document.activeElement?.blur?.(); return; }
  if (localStorage.getItem('club-companion-shortcuts') !== 'enabled') return;
  if (editing || target instanceof HTMLElement && target.closest('dialog,[role="dialog"]')) return;
  const defaults = { focusSearch: '/', nextView: 'Alt+ArrowRight', exportBackup: 'Ctrl+Shift+E' };
  let shortcuts = defaults;
  try { shortcuts = { ...defaults, ...JSON.parse(localStorage.getItem('club-companion-shortcut-map') || '{}') }; } catch { /* defaults */ }
  const combo = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.metaKey ? 'Meta+' : ''}${event.key}`;
  if (combo === shortcuts.nextView) {
    const routes = ['clube','sbcs','gallery','precos','configuracoes']; const current = location.hash.slice(1) || 'clube';
    location.hash = routes[(routes.indexOf(current) + 1) % routes.length]; event.preventDefault();
  } else if (combo === shortcuts.focusSearch) {
    const search = document.querySelector('#player-search'); if (search) { search.focus(); event.preventDefault(); }
  } else if (combo.toLowerCase() === String(shortcuts.exportBackup).toLowerCase()) {
    document.querySelector('#export-backup')?.click(); event.preventDefault();
  }
});

async function start() {
  try {
    await openDatabase();
    status.textContent = 'Dados neste dispositivo';
  } catch (error) {
    status.textContent = 'Armazenamento indisponível';
    status.title = error.message;
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
  registerServiceWorker();
}

async function renderRoute() {
  const view = location.hash.slice(1) || 'clube';
  const allowedViews = new Set(['clube', 'sbcs', 'gallery', 'precos', 'configuracoes']);
  const selectedView = allowedViews.has(view) ? view : 'clube';
  for (const link of navLinks) {
    if (link.dataset.view === selectedView) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (selectedView === 'clube') {
    try { await renderClubView(main); }
    catch (error) { main.innerHTML = `<section class="error-panel"><h1>Não consegui abrir o clube</h1><p>${escapeHTML(error.message)}</p></section>`; }
    return;
  }
  if (selectedView === 'configuracoes') {
    renderSettingsView(main);
    return;
  }
  if (selectedView === 'sbcs') { try { await renderSbcView(main); } catch (error) { main.innerHTML = `<section class="error-panel"><h1>Não consegui abrir o planejador</h1><p>${escapeHTML(error.message)}</p></section>`; } return; }
  if (selectedView === 'gallery') { try { await renderGalleryView(main); } catch (error) { main.innerHTML = `<section class="error-panel"><h1>Não consegui abrir a Gallery</h1><p>${escapeHTML(error.message)}</p></section>`; } return; }
  if (selectedView === 'precos') { try { await renderMarketView(main); } catch (error) { main.innerHTML = `<section class="error-panel"><h1>Não consegui abrir os preços</h1><p>${escapeHTML(error.message)}</p></section>`; } return; }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdatePrompt(worker);
      });
    });
  } catch (error) {
    console.warn('O app segue disponível no navegador; não foi possível ativar o modo instalável.', error);
  }
}

function showUpdatePrompt(worker) {
  const prompt = document.querySelector('#update-prompt');
  prompt.innerHTML = '<strong>Atualização disponível</strong><p>O Club Companion tem uma nova versão. Seus dados locais serão preservados.</p><div class="prompt-actions"><button type="button" data-action="later">Mais tarde</button><button class="button-primary" type="button" data-action="update">Atualizar</button></div>';
  prompt.hidden = false;
  prompt.querySelector('[data-action="later"]').addEventListener('click', () => { prompt.hidden = true; });
  prompt.querySelector('[data-action="update"]').addEventListener('click', () => {
    worker.postMessage({ type: 'ACTIVATE_UPDATE' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  });
}

start();
