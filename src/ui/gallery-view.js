import { readAll, writeOne } from '../storage/database.js';
import { makeId } from '../domain/player-items.js';
import { planGallerySet } from '../domain/gallery-planner.js';
import { calculateItemScore, ITEM_SCORE_TABLE_VERSION } from '../domain/item-score.js';

export async function renderGalleryView(container) {
  const [items, sets, events] = await Promise.all([readAll('playerItems'),readAll('gallerySets'),readAll('events')]);
  container.innerHTML = `<div class="page-heading"><div><p class="eyebrow">SETS E HISTÓRICO</p><h1>Gallery</h1><p>Planeje usando registros do clube e do histórico. O app não altera a Gallery no jogo.</p></div></div>
    <section class="content-panel"><div class="panel-heading"><div><h2>Criar Gallery Set</h2><p>Informe as faixas de score que você verificou no jogo.</p></div></div>
      <form id="gallery-form" class="player-form"><label>Nome do Set<input name="name" required maxlength="80" /></label><label>OVR mínimo (opcional)<input name="minimumOvr" type="number" min="1" max="99" /></label><label>OVR máximo (opcional)<input name="maximumOvr" type="number" min="1" max="99" /></label><label>Raridade (opcional)<input name="rarity" maxlength="60" /></label><label>Limites D,C,B,A,S (opcional)<input name="thresholds" placeholder="50000,80000,120000" /></label><label class="check-field"><input name="includePast" type="checkbox" checked /> Incluir itens passados/usados</label><label class="check-field"><input name="includeProtected" type="checkbox" /> Incluir protegidas no planejamento da Gallery</label><div class="form-actions form-wide"><button class="button-primary" type="submit">Salvar Set</button><span>Limites de score em ordem D, C, B, A, S; deixe vazio se não souber.</span></div></form></section>
    ${sets.length ? sets.map((set)=>renderSet(set,items,events)).join('') : '<section class="empty-state"><strong>Nenhum Set cadastrado.</strong><span>Crie um Set acima com os requisitos conhecidos.</span></section>'}`;
  container.querySelector('#gallery-form').addEventListener('submit',async(event)=>{
    event.preventDefault();const form=event.currentTarget;const thresholds=String(form.elements.thresholds.value).split(',').map((x)=>x.trim()).filter(Boolean).map(Number);
    if(thresholds.some((x)=>!Number.isInteger(x)||x<1)){alert('Os limites precisam ser inteiros positivos, separados por vírgula.');return;}
    const set={id:makeId(),name:form.elements.name.value.trim(),minimumOvr:Number(form.elements.minimumOvr.value)||0,maximumOvr:Number(form.elements.maximumOvr.value)||0,rarity:form.elements.rarity.value.trim(),thresholds,includePast:form.elements.includePast.checked,includeProtected:form.elements.includeProtected.checked,scoreTableVersion:ITEM_SCORE_TABLE_VERSION,createdAt:new Date().toISOString()};
    if(set.maximumOvr&&set.minimumOvr>set.maximumOvr){alert('OVR mínimo não pode superar OVR máximo.');return;}
    await writeOne('gallerySets',set);await renderGalleryView(container);
  });
  if(container.dataset.galleryActionsBound!=='true')container.addEventListener('click',async(event)=>{
    const button=event.target.closest('[data-gallery-add]');if(!button||!container.contains(button))return;
    const [setId,instanceId]=button.dataset.galleryAdd.split('|');const [freshSets,freshItems]=await Promise.all([readAll('gallerySets'),readAll('playerItems')]);const set=freshSets.find((x)=>x.id===setId);const item=freshItems.find((x)=>x.instanceId===instanceId);if(!set||!item)return;
    if(!confirm(`Registrar localmente que ${item.name} foi adicionado à Gallery?`))return;
    await writeOne('events',{id:makeId(),instanceId,type:'gallery:added',details:setId,occurredAt:new Date().toISOString()});await renderGalleryView(container);
  });
  container.dataset.galleryActionsBound='true';
}

function renderSet(set,items,events){
  const plan=planGallerySet(items,set,events);const gradeLabels=['D','C','B','A','S'];const thresholdIndex=(set.thresholds||[]).slice().sort((a,b)=>a-b).indexOf(plan.nextThreshold);const next=plan.nextThreshold?`Próximo grau ${gradeLabels[thresholdIndex]||''}: ${plan.nextThreshold.toLocaleString('pt-BR')}`:'Nenhum próximo limite informado/alcançável.';
  const ranked=items.filter((item)=>plan.eligibleInstanceIds.includes(item.instanceId)).sort((a,b)=>a.ovr-b.ovr||a.name.localeCompare(b.name));
  const already=items.filter((item)=>plan.addedInstanceIds.includes(item.instanceId));
  return `<section class="content-panel"><div class="panel-heading"><div><h2>${escapeHtml(set.name)}</h2><p>${plan.itemCount} itens sugeridos · Score comprometido ${plan.committedScore.toLocaleString('pt-BR')} · projeção ${plan.score.toLocaleString('pt-BR')}${plan.estimated?' (estimativa: há item sem score final)':''} · ${escapeHtml(next)} · Tabela ${escapeHtml(plan.scoreTableVersion)}</p></div></div>${already.length?`<h3>Já registrados na Gallery</h3><ul class="gallery-items">${already.map((item)=>`<li><span>${escapeHtml(item.name)} · ${item.ovr} OVR</span><small>Adicionada ao Set</small></li>`).join('')}</ul>`:''}<h3>Itens sugeridos</h3><ul class="gallery-items">${ranked.map((item)=>{const score=calculateItemScore(item);return `<li><span><strong>${escapeHtml(item.name)}</strong> · ${item.ovr} OVR · ${score.score.toLocaleString('pt-BR')} Item Score${score.estimated?' (estimativa)':''} · ${escapeHtml(item.status)}${item.protected?' · protegida':''}</span><button type="button" data-gallery-add="${escapeHtml(set.id)}|${escapeHtml(item.instanceId)}">Registrar como adicionada</button></li>`}).join('')||'<li>Nenhum item restante atende aos filtros ou já foi atingido um limite.</li>'}</ul></section>`;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
