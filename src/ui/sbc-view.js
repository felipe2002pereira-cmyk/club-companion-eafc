import { readAll, writeOne } from '../storage/database.js';
import { makeId, updatePlayersStatus } from '../domain/player-items.js';
import { parseAttributeRules } from '../domain/sbc-requirements.js';
import { solveItemScoreSbc, solveTraditionalSbc } from '../domain/sbc-solver.js';
import { calculateItemScore, ITEM_SCORE_TABLE_VERSION } from '../domain/item-score.js';

export async function renderSbcView(container) {
  const [items, plans] = await Promise.all([readAll('playerItems'), readAll('sbcPlans')]);
  container.innerHTML = `<div class="page-heading"><div><p class="eyebrow">RECOMENDAÇÕES LOCAIS</p><h1>Planejador de SBCs</h1><p>O app sugere escalações. Você revisa e executa tudo manualmente no jogo.</p></div></div>
    <section class="content-panel"><div class="panel-heading"><div><h2>Novo planejamento</h2><p>Cartas protegidas e itens fora do clube são sempre excluídos.</p></div></div>
      <form id="sbc-form" class="player-form">
        <label>Modo<select name="mode"><option value="item-score">Item Score FC 27</option><option value="traditional">SBC tradicional (11 jogadores)</option></select></label>
        <label id="target-field">Item Score-alvo<input name="targetItemScore" type="number" min="1" value="100000" /></label>
        <label id="item-count-field">Quantidade de itens (opcional)<input name="itemCount" type="number" min="1" max="99" placeholder="Deixe vazio para sugerir" /></label>
        <label id="minimum-ovr-field" hidden>OVR mínimo individual<input name="minimumPlayerOvr" type="number" min="1" max="99" /></label>
        <label id="rating-field" hidden>Rating mínimo da escalação<input name="minimumSquadRating" type="number" min="1" max="99" /></label>
        <label id="attributes-field" class="form-wide" hidden>Limites por atributo (JSON)<textarea name="attributeRules" rows="4" placeholder='[{"field":"league","value":"Premier League","minimum":3,"maximum":11}]'></textarea></label>
        <div class="form-actions form-wide"><button class="button-primary" type="submit">Encontrar escalação</button><span>${items.filter((item) => item.status === 'club' && !item.protected).length} itens elegíveis · ${items.filter((item) => item.protected).length} protegidos excluídos</span></div>
      </form><p class="muted-copy">Tabela-base: EA FC 27, versão ${ITEM_SCORE_TABLE_VERSION}. Bônus especiais/holográficos exigem valor manual do jogo; sem ele, o score aparece como estimativa.</p><div id="sbc-result" aria-live="polite"></div>
    </section>
    <section class="content-panel"><div class="panel-heading"><div><h2>Planejamentos salvos</h2><p>Registro local. Nada é enviado à EA.</p></div></div>${plans.length ? `<div class="table-wrap"><table><thead><tr><th>Modo</th><th>Resumo</th><th>Data</th><th>Ação</th></tr></thead><tbody>${plans.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map((plan)=>`<tr><td>${plan.mode === 'item-score' ? 'Item Score' : 'Tradicional'}</td><td>${escapeHtml(plan.summary)}</td><td>${new Date(plan.createdAt).toLocaleString('pt-BR')}</td><td>${plan.status === 'used' ? 'Registrado como usado' : `<button type="button" data-use-plan="${escapeHtml(plan.id)}">Registrar como usado</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum planejamento salvo.</strong><span>Quando encontrar uma escalação, ela aparecerá aqui para conferência posterior.</span></div>'}</section>`;
  const form = container.querySelector('#sbc-form');
  const toggle = () => { const traditional = form.elements.mode.value === 'traditional'; container.querySelector('#target-field').hidden = traditional; container.querySelector('#item-count-field').hidden = traditional; container.querySelector('#minimum-ovr-field').hidden = !traditional; container.querySelector('#rating-field').hidden = !traditional; container.querySelector('#attributes-field').hidden = !traditional; };
  form.elements.mode.addEventListener('change', toggle); toggle();
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const out = container.querySelector('#sbc-result'); out.innerHTML = '';
    try {
      const mode = form.elements.mode.value;
      const requirement = mode === 'item-score'
        ? { targetItemScore: Number(form.elements.targetItemScore.value), itemCount: Number(form.elements.itemCount.value) || undefined }
        : { itemCount: 11, minimumPlayerOvr: Number(form.elements.minimumPlayerOvr.value) || 0, minimumSquadRating: Number(form.elements.minimumSquadRating.value) || 0, attributeRules: parseAttributeRules(form.elements.attributeRules.value) };
      const result = mode === 'item-score' ? solveItemScoreSbc(items, requirement) : solveTraditionalSbc(items, requirement);
      if (!result.isFeasible) { out.innerHTML = `<div class="empty-state"><strong>Não encontrei escalação viável.</strong><span>${escapeHtml(result.unmetRequirements.join(' '))}</span><span>${escapeHtml(result.explanation)}</span></div>`; return; }
      const selected = result.selectedInstanceIds.map((id) => items.find((item) => item.instanceId === id)).filter(Boolean);
      const summary = mode === 'item-score' ? `Item Score ${result.computedScore}${result.scoreIsEstimate ? ' (estimativa)' : ''}` : `Rating ${result.estimatedSquadRating.rating} (estimativa)`;
      const plan = { id: makeId(), mode, requirement, selectedInstanceIds: result.selectedInstanceIds, summary, result, status: 'planned', createdAt: new Date().toISOString() };
      await writeOne('sbcPlans', plan);
      await renderSbcView(container);
      const freshResult = container.querySelector('#sbc-result');
      freshResult.innerHTML = `<div class="sbc-result"><h3>Escalação sugerida · ${escapeHtml(summary)}</h3><p>${escapeHtml(result.explanation)}</p><ul>${selected.map((item)=>{const score=mode==='item-score'?` · ${calculateItemScore(item).score} score${calculateItemScore(item).estimated?' (base estimada)':''}`:'';const why=item.duplicate?'Duplicada priorizada':'Elegível pelas regras informadas';return `<li><strong>${escapeHtml(item.name)}</strong> · ${item.ovr} OVR · ${escapeHtml(item.rarity || 'raridade não informada')}${item.duplicate ? ' · duplicada' : ''}${score}<small>${why}</small></li>`}).join('')}</ul><button type="button" class="button-quiet" data-use-plan="${escapeHtml(plan.id)}">Registrar estes itens como usados</button></div>`;
    } catch (error) { out.innerHTML = `<div class="error-panel"><p>${escapeHtml(error.message)}</p></div>`; }
  });
  if (container.dataset.sbcActionsBound !== 'true') container.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-use-plan]'); if (!button || !container.contains(button)) return;
    const plan = (await readAll('sbcPlans')).find((item)=>item.id === button.dataset.usePlan);
    if (!plan || plan.status === 'used') return;
    if (!confirm(`Confirma que estes ${plan.selectedInstanceIds.length} itens foram enviados no jogo? O registro local mudará para “usado”.`)) return;
    try {
      await updatePlayersStatus(plan.selectedInstanceIds, 'used', `SBC registrado localmente (${plan.id})`);
      await writeOne('sbcPlans', { ...plan, status: 'used', submittedAt: new Date().toISOString() });
      await renderSbcView(container);
    } catch (error) { alert(error.message); }
  });
  container.dataset.sbcActionsBound = 'true';
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
