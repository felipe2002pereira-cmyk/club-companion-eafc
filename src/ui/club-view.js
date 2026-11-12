import { readAll, writeOne } from '../storage/database.js';
import { makeId, recordPlayerEvent, updatePlayerStatus, validatePlayerItem } from '../domain/player-items.js';

export async function renderClubView(container) {
  const [players, events] = await Promise.all([readAll('playerItems'), readAll('events')]);
  const current = players.filter((player) => player.status === 'club');
  const past = players.filter((player) => player.status !== 'club');
  container.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">SEU ELENCO</p><h1>Clube</h1><p>Registre cartas manualmente. Cada cópia tem seu próprio histórico.</p></div><a class="button button-quiet" href="#configuracoes">Importar ou exportar</a></div>
    <section class="summary-grid" aria-label="Resumo do clube"><article class="summary-card"><span>Cartas no clube</span><strong>${current.length}</strong></article><article class="summary-card"><span>Protegidas</span><strong>${current.filter((player) => player.protected).length}</strong></article><article class="summary-card"><span>Histórico</span><strong>${past.length}</strong></article></section>
    ${current.length ? renderBreakdown(current) : ''}
    <section class="content-panel"><div class="panel-heading"><div><h2>Adicionar carta</h2><p>Dados registrados aqui não são enviados à EA.</p></div></div>
      <form id="player-form" class="player-form">
        <label>Nome<input name="name" required maxlength="80" autocomplete="off" /></label>
        <label>OVR<input name="ovr" type="number" min="1" max="99" required /></label>
        <label>Item ID<input name="itemId" required maxlength="60" /></label>
        <label>Posição<input name="position" maxlength="20" placeholder="ST" /></label>
        <label>Liga<input name="league" maxlength="60" /></label>
        <label>Nação<input name="nation" maxlength="60" /></label>
        <label>Clube<input name="club" maxlength="60" /></label>
        <label>Raridade<input name="rarity" maxlength="60" placeholder="Gold / TOTW" /></label>
        <label class="check-field"><input name="holographic" type="checkbox" /> Holográfica</label>
        <label>Pontuação Item Score (opcional)<input name="itemScoreOverride" type="number" min="0" step="1" placeholder="Valor exibido no jogo" /></label>
        <label class="check-field"><input name="tradeable" type="checkbox" /> Negociável</label>
        <label class="check-field"><input name="duplicate" type="checkbox" /> Duplicada</label>
        <label class="check-field"><input name="protected" type="checkbox" /> Protegida</label>
        <label class="form-wide">Notas<textarea name="notes" rows="2" maxlength="300"></textarea></label>
        <div class="form-actions form-wide"><button class="button-primary" type="submit">Salvar carta</button><span id="player-form-message" role="status"></span></div>
      </form>
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Cartas atuais</h2><p>${current.length} registradas · protegidas nunca entram nas sugestões de SBC</p></div><input id="player-search" class="search-input" type="search" placeholder="Buscar jogador…" aria-label="Buscar jogador" /></div>
      ${renderPlayerTable(current, events)}
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Histórico de cartas</h2><p>Itens marcados como passados pelo clube ou usados em SBC ficam preservados aqui.</p></div></div>${renderPlayerTable(past, events, true)}</section>`;
  bindPlayerForm(container, current);
  if (container.dataset.clubActionsBound !== 'true') {
    bindPlayerActions(container);
    container.dataset.clubActionsBound = 'true';
  }
  container.querySelector('#player-search').addEventListener('input', (event) => {
    const query = event.target.value.toLocaleLowerCase('pt-BR');
    for (const card of container.querySelectorAll('[data-player-row]')) card.hidden = !card.dataset.playerRow.includes(query);
  });
}

function renderBreakdown(players) {
  const fields = { position: 'Posição', league: 'Liga', club: 'Clube', rarity: 'Raridade' };
  return `<details class="content-panel"><summary>Análise do elenco atual</summary>
    <div class="summary-grid">${Object.entries(fields).map(([field, label]) => {
      const counts = new Map();
      for (const player of players) {
        const group = player[field]?.trim() || 'Sem informação';
        counts.set(group, (counts.get(group) ?? 0) + 1);
      }
      const groups = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
      return `<div><h3>${label}</h3><ul>${groups.map(([group, count]) => (
        `<li>${escapeHTML(group)} · ${count}</li>`
      )).join('')}</ul></div>`;
    }).join('')}</div></details>`;
}

function renderPlayerTable(players, events, historical = false) {
  if (!players.length) return '<div class="empty-state"><strong>Nenhuma carta registrada nesta lista.</strong><span>Adicione uma carta ou importe um arquivo em Configurações.</span></div>';
  return `<div class="table-wrap"><table><thead><tr><th>Jogador</th><th>OVR</th><th>Versão</th><th>Item Score</th><th>Estado</th><th>Histórico</th><th>Ação</th></tr></thead><tbody>${players.map((player) => {
    const recentEvents = events.filter((event) => event.instanceId === player.instanceId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 2);
    const haystack = `${player.name} ${player.itemId} ${player.position} ${player.league} ${player.club}`.toLocaleLowerCase('pt-BR');
    const state = [player.protected ? 'Protegida' : '', player.duplicate ? 'Duplicada' : '', player.tradeable ? 'Negociável' : 'Intransferível'].filter(Boolean).join(' · ');
    return `<tr data-player-row="${escapeHTML(haystack)}"><td><strong>${escapeHTML(player.name)}</strong><small>${escapeHTML(player.position || '—')} · ${escapeHTML(player.club || 'Clube não informado')}</small></td><td>${player.ovr}</td><td>${escapeHTML(player.rarity || '—')}${player.holographic ? ' · Holo' : ''}</td><td><form data-score-form="${escapeHTML(player.instanceId)}"><input aria-label="Item Score final de ${escapeHTML(player.name)}" name="score" type="number" min="0" step="1" value="${player.itemScoreOverride ?? ''}" placeholder="Base estimada" /><button type="submit">Salvar</button></form></td><td>${escapeHTML(state)}</td><td>${recentEvents.map((event) => `<small>${escapeHTML(event.type.replace('status:', ''))} · ${new Date(event.occurredAt).toLocaleDateString('pt-BR')}</small>`).join('') || '<small>Sem eventos</small>'}</td><td>${historical ? `<button type="button" data-action="return" data-id="${escapeHTML(player.instanceId)}">Marcar no clube</button>` : `<button type="button" data-action="past" data-id="${escapeHTML(player.instanceId)}">Marcar como passado</button>`}<button type="button" data-action="protect" data-id="${escapeHTML(player.instanceId)}" data-protected="${player.protected}">${player.protected ? 'Desproteger' : 'Proteger'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function bindPlayerForm(container, current) {
  const form = container.querySelector('#player-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = container.querySelector('#player-form-message');
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const itemId = String(data.get('itemId')).trim();
    const result = validatePlayerItem({
      instanceId: makeId(), itemId, name, ovr: data.get('ovr'), position: data.get('position'), league: data.get('league'), nation: data.get('nation'), club: data.get('club'), rarity: data.get('rarity'),
      holographic: data.has('holographic'), itemScoreOverride: data.get('itemScoreOverride'), tradeable: data.has('tradeable'), duplicate: data.has('duplicate'), protected: data.has('protected'), status: 'club', notes: data.get('notes'),
    });
    if (!result.ok) { message.textContent = result.errors.join(' '); return; }
    const duplicateMatch = current.some((player) => player.itemId === itemId);
    if (duplicateMatch && !result.value.duplicate && !confirm('Já existe uma carta com este Item ID. Registrar outra cópia?')) return;
    try {
      await writeOne('playerItems', result.value);
      await recordPlayerEvent(result.value.instanceId, 'adicionado', 'Registro manual');
      await renderClubView(container);
    } catch (error) { message.textContent = error.message; }
  });
}

function bindPlayerActions(container) {
  container.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-score-form]'); if (!form) return;
    event.preventDefault();
    const players = await readAll('playerItems'); const player = players.find((item)=>item.instanceId===form.dataset.scoreForm); if (!player) return;
    const raw = new FormData(form).get('score'); const score = raw === '' ? null : Number(raw);
    if (score !== null && (!Number.isSafeInteger(score) || score < 0)) { alert('Informe um Item Score inteiro não negativo.'); return; }
    await writeOne('playerItems', { ...player, itemScoreOverride: score });
    await recordPlayerEvent(player.instanceId, 'item-score:manual', score === null ? 'Pontuação final removida' : `Pontuação final registrada: ${score}`);
    await renderClubView(container);
  });
  container.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !container.contains(button)) return;
    try {
      if (button.dataset.action === 'past') await updatePlayerStatus(button.dataset.id, 'past', 'Atualização manual');
      if (button.dataset.action === 'return') await updatePlayerStatus(button.dataset.id, 'club', 'Atualização manual');
      if (button.dataset.action === 'protect') {
        const players = await readAll('playerItems');
        const player = players.find((item) => item.instanceId === button.dataset.id);
        if (!player) throw new Error('Não encontrei essa carta.');
        await writeOne('playerItems', { ...player, protected: button.dataset.protected !== 'true' });
        await recordPlayerEvent(player.instanceId, button.dataset.protected === 'true' ? 'desprotegido' : 'protegido', 'Atualização manual');
      }
      await renderClubView(container);
    } catch (error) { alert(error.message); }
  });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
