import { applyPlayerImport, exportBackup, importBackup, importPlayersCsv } from '../storage/backup.js';

export function renderSettingsView(container) {
  container.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">CONTROLE LOCAL</p><h1>Configurações</h1><p>Importe um arquivo e revise os dados antes de gravá-los.</p></div></div>
    <section class="content-panel"><div class="panel-heading"><div><h2>Backup completo</h2><p>Elenco, histórico, planos, Sets e cotações ficam no arquivo exportado.</p></div></div>
      <button id="export-backup" class="button-primary" type="button">Exportar backup JSON</button>
      <div class="import-block"><label>Selecionar backup JSON<input id="backup-file" type="file" accept="application/json,.json" /></label><div id="backup-preview" class="import-preview" aria-live="polite"><span>Escolha um arquivo para ver a prévia.</span></div><div class="form-actions"><button id="backup-merge" type="button" disabled>Adicionar registros novos</button><button id="backup-replace" class="danger-button" type="button" disabled>Substituir todos os dados</button></div></div>
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Importar elenco CSV</h2><p>Colunas obrigatórias: instanceId, itemId, name, ovr, position, league, nation, club, rarity, holographic, tradeable, duplicate, protected, status, notes. itemScoreOverride é opcional.</p></div></div>
      <label>Selecionar arquivo CSV<input id="csv-file" type="file" accept="text/csv,.csv" /></label><div id="csv-preview" class="import-preview" aria-live="polite"><span>O CSV será pré-visualizado sem alterar o elenco.</span></div><div class="form-actions"><button id="csv-merge" type="button" disabled>Adicionar cartas novas</button><button id="csv-replace" class="danger-button" type="button" disabled>Substituir todos os dados</button></div>
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Privacidade e dados</h2><p>O app não pede login EA. O elenco e o histórico permanecem neste navegador até você exportar ou limpar os dados do site.</p></div></div><p class="muted-copy">A importação não envia arquivos para um servidor. Trocar de navegador ou dispositivo exige usar o backup.</p></section>`;

  container.querySelector('.page-heading p:not(.eyebrow)').textContent = 'Importação, backup e atalhos que atuam somente dentro deste companion.';
  container.insertAdjacentHTML('beforeend', `<section class="content-panel"><div class="panel-heading"><div><h2>Atalhos de teclado</h2><p>Clique em cada campo e pressione a combinação desejada. Atuam somente no companion.</p></div></div><div class="shortcut-editor"><label>Focar busca<input data-shortcut="focusSearch" readonly /></label><label>Próxima tela<input data-shortcut="nextView" readonly /></label><label>Exportar backup<input data-shortcut="exportBackup" readonly /></label></div><label class="check-field"><input id="shortcuts-enabled" type="checkbox" /> Ativar atalhos</label><p class="muted-copy">Esc desfoca o controle ativo. Não há atalhos para ações na EA.</p></section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Versão</h2><p id="release-status">Versão atual 0.2.0</p></div></div><button id="check-release" type="button">Verificar atualizações</button><div id="release-result" class="import-preview" aria-live="polite"></div></section>`);

  let backupReport;
  let csvReport;
  const backupFile = container.querySelector('#backup-file');
  const csvFile = container.querySelector('#csv-file');
  const shortcuts = container.querySelector('#shortcuts-enabled');
  shortcuts.checked = localStorage.getItem('club-companion-shortcuts') === 'enabled';
  shortcuts.addEventListener('change', () => localStorage.setItem('club-companion-shortcuts', shortcuts.checked ? 'enabled' : 'disabled'));
  const defaultMap = { focusSearch: '/', nextView: 'Alt+ArrowRight', exportBackup: 'Ctrl+Shift+E' };
  let shortcutMap = { ...defaultMap };
  try { shortcutMap = { ...defaultMap, ...JSON.parse(localStorage.getItem('club-companion-shortcut-map') || '{}') }; } catch { /* defaults */ }
  for (const input of container.querySelectorAll('[data-shortcut]')) {
    const action = input.dataset.shortcut; input.value = shortcutMap[action];
    input.addEventListener('keydown', (event) => {
      event.preventDefault();
      if (event.key === 'Escape') { input.blur(); return; }
      const combo = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.metaKey ? 'Meta+' : ''}${event.key}`;
      if (['Ctrl+','Alt+','Shift+','Meta+'].includes(combo)) return;
      shortcutMap[action] = combo; input.value = combo;
      localStorage.setItem('club-companion-shortcut-map', JSON.stringify(shortcutMap));
    });
  }
  container.querySelector('#check-release').addEventListener('click', async () => {
    const result = container.querySelector('#release-result'); result.textContent = 'Consultando versão publicada…';
    try {
      const response = await fetch('./release.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível consultar o arquivo de versão.');
      const release = await response.json();
      const current = document.querySelector('#app-version')?.textContent?.replace(/^v/, '') || '0.0.0';
      result.innerHTML = `<strong>${release.version === current ? 'O app está atualizado' : `Versão publicada: ${escapeHTML(release.version)}`}</strong><p>${escapeHTML(release.changelog || '')}</p><span>Versão neste dispositivo: ${escapeHTML(current)}. Quando o navegador detectar arquivos novos, o app pedirá confirmação antes de ativá-los.</span>`;
    } catch (error) { result.textContent = error.message; }
  });

  container.querySelector('#export-backup').addEventListener('click', async () => {
    const blob = await exportBackup();
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `club-companion-backup-${new Date().toISOString().slice(0, 10)}.json` });
    link.click();
    URL.revokeObjectURL(url);
  });

  backupFile.addEventListener('change', async () => {
    backupReport = undefined;
    setImportButtons(container, 'backup', false);
    const file = backupFile.files?.[0];
    if (!file) return;
    try {
      backupReport = await importBackup(file, 'preview');
      showReport(container.querySelector('#backup-preview'), backupReport);
      setImportButtons(container, 'backup', backupReport.ok);
    } catch (error) { showError(container.querySelector('#backup-preview'), error.message); }
  });

  csvFile.addEventListener('change', async () => {
    csvReport = undefined;
    setImportButtons(container, 'csv', false);
    const file = csvFile.files?.[0];
    if (!file) return;
    try {
      csvReport = await importPlayersCsv(file);
      showCsvReport(container.querySelector('#csv-preview'), csvReport);
      setImportButtons(container, 'csv', csvReport.ok);
    } catch (error) { showError(container.querySelector('#csv-preview'), error.message); }
  });

  container.querySelector('#backup-merge').addEventListener('click', () => applyBackup('merge'));
  container.querySelector('#backup-replace').addEventListener('click', () => applyBackup('replace'));
  container.querySelector('#csv-merge').addEventListener('click', () => applyCsv('merge'));
  container.querySelector('#csv-replace').addEventListener('click', () => applyCsv('replace'));

  async function applyBackup(mode) {
    if (!backupReport?.ok || !backupFile.files?.[0]) return;
    if (mode === 'replace' && !confirm('Isso vai substituir o elenco, histórico, planos, Gallery Sets e preços locais por este backup. Continuar?')) return;
    try {
      const result = await importBackup(backupFile.files[0], mode);
      showReport(container.querySelector('#backup-preview'), result);
      setImportButtons(container, 'backup', false);
    } catch (error) { showError(container.querySelector('#backup-preview'), error.message); }
  }

  async function applyCsv(mode) {
    if (!csvReport?.ok) return;
    if (mode === 'replace' && !confirm('Isso vai apagar todos os dados locais e importar apenas as cartas deste CSV. Exporte um backup antes se quiser preservá-los. Continuar?')) return;
    try {
      const result = await applyPlayerImport(csvReport, mode);
      showCsvReport(container.querySelector('#csv-preview'), result);
      setImportButtons(container, 'csv', false);
    } catch (error) { showError(container.querySelector('#csv-preview'), error.message); }
  }
}

function setImportButtons(container, kind, enabled) {
  for (const action of ['merge', 'replace']) container.querySelector(`#${kind}-${action}`).disabled = !enabled;
}

function showReport(target, report) {
  const counts = Object.entries(report.counts || {}).map(([name, count]) => `<span><strong>${escapeHTML(name)}</strong>: ${count}</span>`).join('');
  const errors = (report.errors || []).map((error) => `<li>${escapeHTML(error)}</li>`).join('');
  const skipped = Object.entries(report.skipped || {}).map(([name, count]) => `<span>${escapeHTML(name)} repetidos ignorados: ${count}</span>`).join('');
  target.innerHTML = `<strong>${report.applied ? 'Importação concluída.' : report.ok ? 'Prévia válida.' : 'Revise os erros antes de importar.'}</strong><div class="report-counts">${counts}</div>${skipped ? `<div class="report-counts">${skipped}</div>` : ''}${errors ? `<ul class="error-list">${errors}</ul>` : ''}`;
}

function showCsvReport(target, report) {
  const errors = (report.errors || []).map((error) => `<li>${escapeHTML(error)}</li>`).join('');
  target.innerHTML = `<strong>${report.applied ? `Importação concluída: ${report.players?.length ?? 0} cartas.` : report.ok ? `${report.players.length} cartas prontas para importar.` : 'Revise os erros antes de importar.'}</strong>${report.skipped ? `<p>${report.skipped} registros repetidos foram ignorados.</p>` : ''}${errors ? `<ul class="error-list">${errors}</ul>` : ''}`;
}

function showError(target, message) {
  target.innerHTML = `<strong>Não foi possível ler o arquivo.</strong><p>${escapeHTML(message)}</p>`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
