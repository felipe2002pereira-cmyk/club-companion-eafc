import { readAll } from '../storage/database.js';
import { buildProviderUrl, priceTargetId, recordPriceSnapshot, savePriceTarget } from '../domain/market-prices.js';

const sourceNames = { futbin: 'FUTBIN', 'fut.gg': 'FUT.GG' };
const platformNames = { console: 'Console', pc: 'PC' };
const formatCoins = new Intl.NumberFormat('pt-BR');

export async function renderMarketView(container, message = '') {
  const [items, snapshots, targets] = await Promise.all([
    readAll('playerItems'), readAll('priceSnapshots'), readAll('priceTargets'),
  ]);
  if (location.hash !== '#precos') return;
  const current = items.filter((item) => item.status === 'club');
  container.innerHTML = `
    <div class="page-heading"><div><h1>Preços</h1>
    <p>Registre uma cotação manual para compará-la ao alvo da mesma carta, fonte e plataforma.</p></div></div>
    <p role="status">${escapeHtml(message)}</p>
    ${current.length
      ? `<section class="market-grid">${current.map((item) => renderCard(item, snapshots, targets)).join('')}</section>`
      : '<div class="empty-state"><strong>Sem cartas atuais.</strong><span>Adicione ou importe jogadores no Clube para registrar cotações.</span></div>'}
  `;

  const players = new Map(current.map((item) => [item.instanceId, item]));
  for (const form of container.querySelectorAll('[data-price-form]')) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      const player = players.get(form.dataset.instance);
      const input = { ...Object.fromEntries(new FormData(form)), instanceId: player.instanceId };
      const scope = `${sourceNames[input.source]} · ${platformNames[input.platform]}`;
      try {
        let result;
        if (form.dataset.priceForm === 'target') {
          const saved = await savePriceTarget(input);
          result = `${player.name} · ${scope}: alvo ${saved ? 'salvo' : 'removido'}.`;
        } else {
          const quote = await recordPriceSnapshot(input);
          const targetId = priceTargetId(quote.instanceId, quote.source, quote.platform);
          const target = (await readAll('priceTargets')).find((entry) => entry.id === targetId);
          result = target && quote.coins <= target.coins
            ? `Alvo atingido para ${player.name} · ${scope}. Cotação de ${formatCoins.format(quote.coins)} moedas, alvo de ${formatCoins.format(target.coins)}.`
            : `Cotação de ${player.name} registrada.`;
        }
        if (form.isConnected) await renderMarketView(container, result);
      } catch (error) {
        if (form.isConnected) form.querySelector('[role="status"]').textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }
}

function renderCard(item, snapshots, targets) {
  const history = snapshots.filter((quote) => quote.instanceId === item.instanceId)
    .sort((a, b) => String(b.checkedAt).localeCompare(String(a.checkedAt))).slice(0, 6);
  const limits = targets.filter((target) => target.instanceId === item.instanceId);
  return `
    <article class="content-panel market-card">
      <h2>${escapeHtml(item.name)} <small>${item.ovr} OVR · ${escapeHtml(item.rarity || 'item')}</small></h2>
      <p>Item ID ${escapeHtml(item.itemId)}</p>
      <div class="market-links">
        <a class="button button-quiet" href="${buildProviderUrl('futbin')}" target="_blank" rel="noopener noreferrer">Buscar no FUTBIN</a>
        <a class="button button-quiet" href="${buildProviderUrl('fut.gg')}" target="_blank" rel="noopener noreferrer">Buscar no FUT.GG</a>
      </div>
      ${renderForm(item.instanceId, 'quote', 'Cotação em moedas', 'Registrar cotação', true)}
      <details>
        <summary>Alvos de preço (${limits.length})</summary>
        ${limits.map((target) => `<p>${sourceNames[target.source]} · ${platformNames[target.platform]} · até ${formatCoins.format(target.coins)} moedas</p>`).join('')}
        ${renderForm(item.instanceId, 'target', 'Alvo em moedas', 'Salvar alvo', false)}
        <small>Para remover um alvo, selecione a fonte e a plataforma e salve com o campo vazio.</small>
      </details>
      <div class="price-history">${history.length ? history.map((quote) => `
        <p><strong>${formatCoins.format(quote.coins)} moedas</strong> · ${sourceNames[quote.source]} · ${platformNames[quote.platform]}
        <small>Registrado em ${new Date(quote.checkedAt).toLocaleString('pt-BR')}</small></p>`).join('')
        : '<p class="muted-copy">Sem cotações registradas.</p>'}</div>
    </article>`;
}

function renderForm(instanceId, kind, label, button, required) {
  return `<form class="price-form" data-price-form="${kind}" data-instance="${escapeHtml(instanceId)}">
    <label>Fonte<select name="source"><option value="futbin">FUTBIN</option><option value="fut.gg">FUT.GG</option></select></label>
    <label>Plataforma<select name="platform"><option value="console">Console</option><option value="pc">PC</option></select></label>
    <label>${label}<input name="coins" type="number" min="0" step="1" ${required ? 'required' : ''}></label>
    <button class="button-primary" type="submit">${button}</button><small role="status"></small>
  </form>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
