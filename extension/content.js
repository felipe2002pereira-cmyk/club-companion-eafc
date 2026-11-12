(() => {
  if (window.__clubCompanionFcLoaded || !document.body) return;
  window.__clubCompanionFcLoaded = true;

  const DEFAULTS = { players: [], events: [], plans: [], prices: [], sets: [], preferences: { enabled: true, skipAnimations: false } };
  const host = document.createElement('div');
  host.id = 'club-companion-fc-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet'; stylesheet.href = chrome.runtime.getURL('content.css');
  shadow.append(stylesheet);
  const shell = document.createElement('div');
  shell.innerHTML = '<button class="cc-launcher" type="button" aria-label="Abrir Club Companion">CC</button><aside class="cc-panel" hidden><header><div><small>EA FC WEB APP</small><h1>Club Companion</h1></div><button class="cc-close" type="button" aria-label="Fechar">×</button></header><nav><button data-tab="clube">Clube</button><button data-tab="analise">Análise</button><button data-tab="sbc">SBCs</button><button data-tab="gallery">Gallery</button><button data-tab="precos">Preços</button><button data-tab="links">Links</button><button data-tab="config">Config.</button></nav><p class="cc-notice" hidden></p><main class="cc-content" aria-live="polite"></main><footer>Armazenamento local · Revisar antes de ações no jogo</footer></aside>';
  shadow.append(shell);
  document.documentElement.append(host);
  const panel = shadow.querySelector('.cc-panel');
  const content = shadow.querySelector('.cc-content');
  const notice = shadow.querySelector('.cc-notice');
  let state = structuredClone(DEFAULTS);
  let activeTab = 'clube';
  let scanMessage = 'Ainda não escaneado.';

  chrome.storage.local.get(DEFAULTS, (saved) => { state = { ...structuredClone(DEFAULTS), ...saved, preferences: { ...DEFAULTS.preferences, ...(saved.preferences || {}) } }; render(); installAnimationSkip(); });

  function save() { return new Promise((resolve) => chrome.storage.local.set(state, resolve)); }
  function openPanel(tab = activeTab) { activeTab = tab; panel.hidden = false; render(); }
  function closePanel() { panel.hidden = true; }

  shell.addEventListener('click', async (event) => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.classList.contains('cc-launcher')) { openPanel(); return; }
    if (button.classList.contains('cc-close')) { closePanel(); return; }
    if (button.dataset.tab) { openPanel(button.dataset.tab); return; }
    if (button.dataset.action === 'scan') { const result = scanVisiblePlayers(); state.players = mergeScan(state.players, result); scanMessage = `${result.length} carta(s) detectadas na tela atual. Confira antes de usar.`; await save(); render(); return; }
    if (button.dataset.action === 'solve') { solve(); return; }
    if (button.dataset.action === 'submit-plan') { submitPlan(button.dataset.id); return; }
    if (button.dataset.action === 'past') { markPlayer(button.dataset.id, 'past'); return; }
    if (button.dataset.action === 'protect') { toggleProtected(button.dataset.id); return; }
    if (button.dataset.action === 'send-club') { sendSelectedToClub(); return; }
    if (button.dataset.action === 'price-link') { window.open(button.dataset.url, '_blank', 'noopener,noreferrer'); return; }
    if (button.dataset.action === 'add-set') { addGallerySet(); return; }
    if (button.dataset.action === 'gallery-add') { addToGallery(button.dataset.set, button.dataset.player); return; }
    if (button.dataset.action === 'mark-used') { markPlanUsed(button.dataset.id); return; }
    if (button.dataset.action === 'toggle-skip') { state.preferences.skipAnimations = !state.preferences.skipAnimations; await save(); installAnimationSkip(); render(); return; }
    if (button.dataset.action === 'use-shortcut') { runShortcut(button.dataset.shortcut); return; }
  });

  shell.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form.matches('[data-form="price"]')) { event.preventDefault(); const data = new FormData(form); state.prices.unshift({ id: id(), instanceId: form.dataset.instance, source: data.get('source'), platform: data.get('platform'), coins: Number(data.get('coins')), checkedAt: new Date().toISOString() }); await save(); render(); }
    if (form.matches('[data-form="player"]')) { event.preventDefault(); const data = new FormData(form); const player={instanceId:`manual:${id()}`,itemId:String(data.get('itemId')).trim()||`manual-${id()}`,name:String(data.get('name')).trim(),ovr:Number(data.get('ovr')),position:String(data.get('position')).trim(),league:String(data.get('league')).trim(),nation:String(data.get('nation')).trim(),club:String(data.get('club')).trim(),rarity:String(data.get('rarity')).trim(),holographic:data.has('holographic'),tradeable:false,duplicate:data.has('duplicate'),protected:data.has('protected'),status:'club',scoreOverride:parseScoreOverride(data.get('scoreOverride'))}; if(!player.name||!Number.isInteger(player.ovr)||player.ovr<45||player.ovr>99){setNotice('Informe nome e OVR entre 45 e 99.');return;} state.players.unshift(player);await save();render(); }
  });

  shell.addEventListener('change', async (event) => {
    const input=event.target.closest('#cc-csv');if(!input||!input.files?.[0])return;
    try { const rows=parseCsv(await input.files[0].text());const headers=rows.shift().map((value)=>value.trim());const required=['instanceId','itemId','name','ovr','position','league','nation','club','rarity','holographic','tradeable','duplicate','protected','status','notes'];const missing=required.filter((key)=>!headers.includes(key));if(missing.length)throw new Error(`Faltam colunas: ${missing.join(', ')}.`);const index=new Map(headers.map((header,position)=>[header,position]));const known=new Set(state.players.map((player)=>player.instanceId));const additions=[];for(const row of rows){if(!row.some((value)=>value.trim()))continue;const get=(key)=>row[index.get(key)]??'';const instanceId=get('instanceId').trim();const name=get('name').trim();const ovr=Number(get('ovr'));if(!instanceId||!name||!Number.isInteger(ovr)||ovr<45||ovr>99)throw new Error(`Linha inválida: ${name||instanceId||'sem identificador'}.`);if(known.has(instanceId))continue;known.add(instanceId);additions.push({instanceId,itemId:get('itemId').trim()||instanceId,name,ovr,position:get('position'),league:get('league'),nation:get('nation'),club:get('club'),rarity:get('rarity'),holographic:truthy(get('holographic')),tradeable:truthy(get('tradeable')),duplicate:truthy(get('duplicate')),protected:truthy(get('protected')),status:['club','past','used'].includes(get('status'))?get('status'):'club',scoreOverride:parseScoreOverride(get('itemScoreOverride')||get('scoreOverride')),scannedAt:new Date().toISOString()});}state.players.push(...additions);await save();scanMessage=`${additions.length} carta(s) importadas do CSV.`;render();} catch(error) { setNotice(error.message); }
  });

  document.addEventListener('keydown', (event) => {
    const target = shadow.activeElement || event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) return;
    if (event.altKey && event.key.toLowerCase() === 'c') { event.preventDefault(); panel.hidden ? openPanel() : closePanel(); }
    else if (event.altKey && event.key.toLowerCase() === 's') { event.preventDefault(); const result = scanVisiblePlayers(); state.players = mergeScan(state.players, result); scanMessage = `${result.length} carta(s) detectadas; confira o resultado.`; void save().then(render); }
    else if (event.altKey && event.key.toLowerCase() === 'p') { event.preventDefault(); state.preferences.skipAnimations = !state.preferences.skipAnimations; void save().then(() => { installAnimationSkip(); if (!panel.hidden) render(); }); }
  }, true);

  function render() {
    const current = state.players.filter((player) => player.status === 'club');
    const protectedCount = current.filter((player) => player.protected).length;
    const tabs = {
      clube: `<section class="cc-card"><h2>Clube visível</h2><p>${escape(scanMessage)}</p><button class="cc-primary" data-action="scan">Ler cartas desta tela</button><label>Importar elenco CSV<input id="cc-csv" type="file" accept="text/csv,.csv"></label><p class="cc-note">A Web App só mostra os itens carregados na página. Para o elenco completo, importe CSV ou percorra as telas e confira a contagem.</p><div class="cc-stats"><b>${current.length}</b><span>cartas guardadas</span><b>${protectedCount}</b><span>protegidas</span></div></section><section class="cc-card"><h2>Adicionar manualmente</h2><form data-form="player"><label>Nome<input name="name" required maxlength="80"></label><div class="cc-grid"><label>OVR<input name="ovr" type="number" min="45" max="99" required></label><label>Item ID<input name="itemId" maxlength="60"></label></div><div class="cc-grid"><label>Posição<input name="position" maxlength="20"></label><label>Raridade<input name="rarity" maxlength="60"></label></div><label>Liga<input name="league" maxlength="60"></label><label>Nação<input name="nation" maxlength="60"></label><label>Clube<input name="club" maxlength="60"></label><label>Item Score final<input name="scoreOverride" type="number" min="0" step="1"></label><label class="cc-check"><input name="holographic" type="checkbox"> Carta especial/holográfica</label><label class="cc-check"><input name="duplicate" type="checkbox"> Duplicada</label><label class="cc-check"><input name="protected" type="checkbox"> Protegida</label><button class="cc-primary">Salvar carta local</button></form></section><section class="cc-card"><h2>Cartas locais</h2>${current.length ? `<ul>${current.slice(0,80).map(playerRow).join('')}</ul>` : '<p class="cc-empty">Escaneie a tela do clube para começar.</p>'}</section><section class="cc-card"><h2>Ações na tela</h2><button data-action="send-club">Enviar item selecionado ao clube</button><p class="cc-note">Só atua em cartas selecionadas visíveis e pede confirmação. A EA pode mudar o texto do botão.</p></section>`,
      sbc: `<section class="cc-card"><h2>Planejar SBC</h2><label>Modo<select id="cc-mode"><option value="item-score">Item Score</option><option value="traditional">Tradicional · 11 jogadores</option></select></label><label id="cc-target-label">Score mínimo<input id="cc-target" type="number" min="1" value="100000"></label><label id="cc-count-label">Quantidade opcional<input id="cc-count" type="number" min="1" max="99" placeholder="Auto"></label><label id="cc-rating-label" hidden>Rating mínimo<input id="cc-rating" type="number" min="1" max="99"></label><label id="cc-ovr-label" hidden>OVR mínimo individual<input id="cc-ovr" type="number" min="1" max="99"></label><label id="cc-rules-label" hidden>Limites por atributo (JSON)<textarea id="cc-rules" rows="4" placeholder='[{"field":"league","value":"Premier League","minimum":3,"maximum":11}]'></textarea></label><button class="cc-primary" data-action="solve">Encontrar escalação</button><div id="cc-sbc-result"></div><p class="cc-note">Sem química. Rating tradicional é estimativa. Cartas protegidas ficam fora.</p></section><section class="cc-card"><h2>Planos salvos</h2>${state.plans.length ? `<ul>${state.plans.slice(0,10).map((plan)=>`<li>${escape(plan.summary)}<small>${new Date(plan.createdAt).toLocaleString('pt-BR')}</small>${plan.status!=='used'?`<button data-action="mark-used" data-id="${escape(plan.id)}">Registrar como usado</button>`:'<small>Registrado como usado</small>'}</li>`).join('')}</ul>` : '<p class="cc-empty">Nenhum plano salvo.</p>'}</section>`,
      gallery: `<section class="cc-card"><h2>Novo Gallery Set</h2><label>Nome<input id="cc-set-name" maxlength="80"></label><label>Limites D,C,B,A,S<input id="cc-set-thresholds" placeholder="50000,80000,120000"></label><button data-action="add-set">Salvar Set</button></section>${state.sets.length ? state.sets.map(renderGallerySet).join('') : '<p class="cc-empty">Sets e histórico são locais.</p>'}`,
      precos: `<section class="cc-card"><h2>Pesquisar e registrar</h2><p class="cc-note">Abra a lista do provedor, procure o jogador e informe a cotação. Sem sincronização automática.</p>${current.map((player)=>`<details><summary>${escape(player.name)} · ${player.ovr}</summary><div class="cc-actions"><button data-action="price-link" data-url="https://www.futbin.com/players">FUTBIN</button><button data-action="price-link" data-url="https://www.fut.gg/players/">FUT.GG</button></div><form data-form="price" data-instance="${escape(player.instanceId)}"><label>Fonte<select name="source"><option value="futbin">FUTBIN</option><option value="fut.gg">FUT.GG</option></select></label><label>Plataforma<select name="platform"><option value="console">Console</option><option value="pc">PC</option></select></label><label>Moedas<input name="coins" type="number" min="0" step="1" required></label><button>Registrar</button></form>${state.prices.filter((price)=>price.instanceId===player.instanceId).slice(0,3).map((price)=>`<small>${price.coins.toLocaleString('pt-BR')} · ${escape(price.source)} · ${new Date(price.checkedAt).toLocaleString('pt-BR')}</small>`).join('')}</details>`).join('')||'<p class="cc-empty">Escaneie jogadores no Clube primeiro.</p>'}</section>`,
      config: `<section class="cc-card"><h2>Atalhos e automação</h2><p><kbd>Alt+C</kbd> painel · <kbd>Alt+S</kbd> ler tela · <kbd>Alt+P</kbd> alternar pulo de animação</p><button data-action="toggle-skip">Pulo automático: ${state.preferences.skipAnimations ? 'ligado' : 'desligado'}</button><p class="cc-note">Só pula controles visíveis “Pular/Continuar” após o usuário abrir o pacote. Não abre nem compra pacotes.</p><p class="cc-note">Os dados ficam em chrome.storage.local. Esta extensão altera a interface EA e pode contrariar as regras da EA.</p></section>`
    };
    tabs.analise = `<section class="cc-card"><h2>Análise do elenco ativo</h2><p>${current.length} carta(s) em estado “clube” na base local.</p><p class="cc-note">A extensão só conhece as cartas escaneadas, importadas ou cadastradas. O escaneamento lê a página carregada; percorra as páginas ou importe CSV para ampliar a cobertura.</p></section>${current.length ? `<div class="cc-breakdown-grid">${renderBreakdown(current,'position','Grupos de posição',true)}${renderBreakdown(current,'position','Posições exatas')}${renderBreakdown(current,'league','Ligas')}${renderBreakdown(current,'club','Clubes')}${renderBreakdown(current,'rarity','Raridades')}</div>` : '<section class="cc-card"><p class="cc-empty">Ainda não há cartas locais para analisar.</p></section>'}`;
    tabs.links = `<section class="cc-card"><h2>Projetos de referência</h2><p class="cc-note">Links externos; os códigos e automações desses projetos não são executados pelo Club Companion.</p><ul class="cc-reference-list"><li><span><b>FUTClubAnalyzer</b><small>Referência para análise de cartas por liga, clube e posição.</small></span><a href="https://github.com/jsbsantos/FUTClubAnalyzer" target="_blank" rel="noopener noreferrer">Abrir projeto</a></li><li><span><b>EasyFUT</b><small>Referência externa solicitada; sem integração de funcionalidades.</small></span><a href="https://github.com/Kava4/EasyFUT" target="_blank" rel="noopener noreferrer">Abrir projeto</a></li><li><span><b>FUT-Trader</b><small>Projeto arquivado com automação de mercado e CAPTCHA; incluído apenas como link. Nenhuma dessas automações está integrada.</small></span><a href="https://github.com/ckalgos/FUT-Trader" target="_blank" rel="noopener noreferrer">Abrir projeto</a></li></ul></section>`;
    content.innerHTML = tabs[activeTab] || tabs.clube;
    for (const button of shadow.querySelectorAll('nav button')) button.classList.toggle('active', button.dataset.tab === activeTab);
    const mode = shadow.querySelector('#cc-mode'); if (mode) { mode.addEventListener('change', () => { const traditional = mode.value === 'traditional'; shadow.querySelector('#cc-target-label').hidden = traditional; shadow.querySelector('#cc-count-label').hidden = traditional; shadow.querySelector('#cc-rating-label').hidden = !traditional; shadow.querySelector('#cc-ovr-label').hidden = !traditional; shadow.querySelector('#cc-rules-label').hidden = !traditional; }); }
  }

  function renderBreakdown(items, field, title, byPositionFamily = false) {
    const counts = new Map();
    for (const player of items) {
      const raw = String(player[field] || '').trim();
      const key = byPositionFamily ? positionFamily(raw) : raw || 'Sem informação';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
    return `<section class="cc-card"><h2>${escape(title)}</h2>${rows.length ? `<ul class="cc-breakdown-list">${rows.map(([label, count]) => `<li><span>${escape(label)}</span><b>${count}</b></li>`).join('')}</ul>` : '<p class="cc-empty">Sem dados.</p>'}</section>`;
  }

  function positionFamily(position) {
    const code = String(position || '').trim().toUpperCase().split(/[\s,/]+/)[0];
    if (!code) return 'Sem informação';
    if (['GL','GK'].includes(code)) return 'Goleiros';
    if (['LE','LD','ZAG','LWB','RWB','LB','RB','CB','SW'].includes(code)) return 'Defensores';
    if (['VOL','MC','MEI','ME','MD','CDM','CM','CAM','LM','RM','LCM','RCM','LDM','RDM','LAM','RAM'].includes(code)) return 'Meio-campistas';
    if (['ATA','PE','PD','SA','CF','ST','LW','RW','LF','RF','LS','RS'].includes(code)) return 'Atacantes';
    return 'Outras posições';
  }

  function scanVisiblePlayers() {
    const selectors = 'main li.listFUTItem';
    const nodes = [...document.querySelectorAll(selectors)].filter(visible);
    const scanned = []; const occurrences = new Map();
    for (const node of nodes) {
      const entity = node.querySelector('.entityContainer') || node;
      const card = entity.querySelector('.player.item');
      const raw = (node.innerText || node.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim();
      const ovr = Number(card?.querySelector('.rating')?.textContent?.trim());
      const name = entity.querySelector('.name.untradeable')?.textContent?.trim() || entity.querySelector('.main-view.name')?.textContent?.trim() || node.getAttribute('aria-label')?.trim();
      const position = card?.querySelector('.position')?.textContent?.trim() || '';
      const rarity = card?.classList.contains('specials') ? 'specials' : card?.classList.contains('common') ? 'common' : card?.classList.contains('rare') ? 'rare' : '';
      const itemId = node.dataset.futgenieItemId || entity.dataset.futgeniePlayerId || node.dataset.itemId || `${slug(name)}-${ovr}-${slug(position)}-${rarity||'unknown'}`;
      if (!name || !Number.isInteger(ovr) || ovr < 45 || ovr > 99 || raw.length > 500) continue;
      const identityKey=`${itemId}:${rarity}:${position}`;const occurrence=occurrences.get(identityKey)||0;occurrences.set(identityKey,occurrence+1);
      scanned.push({ instanceId: `${identityKey}:${occurrence}`, itemId: String(itemId), identityKey, duplicateKey: `${name.toLowerCase()}:${ovr}:${rarity}:${position}`, name: name.slice(0,80), ovr, position, league: '', nation: '', club: '', rarity, holographic: rarity==='specials', tradeable: false, duplicate: false, protected: false, status: 'club', scoreOverride: null, scannedAt: new Date().toISOString() });
    }
    return recomputeDuplicates(scanned);
  }

  function mergeScan(previous, scanned) {
    if (!scanned.length) return previous;
    const oldById = new Map(previous.map((item)=>[item.instanceId,item]));
    return recomputeDuplicates([...scanned.map((item)=>({...oldById.get(item.instanceId),...item,protected:oldById.get(item.instanceId)?.protected||false,status:oldById.get(item.instanceId)?.status||'club',scoreOverride:oldById.get(item.instanceId)?.scoreOverride??null})), ...previous.filter((item)=>!scanned.some((found)=>found.instanceId===item.instanceId))]);
  }

  function recomputeDuplicates(players){const counts=new Map();for(const player of players){const key=player.duplicateKey||`${player.name.toLowerCase()}:${player.ovr}:${player.rarity||''}:${player.position||''}`;counts.set(key,(counts.get(key)||0)+1);}return players.map((player)=>({...player,duplicate:(counts.get(player.duplicateKey||`${player.name.toLowerCase()}:${player.ovr}:${player.rarity||''}:${player.position||''}`)||0)>1}));}

  function solve() {
    const mode = shadow.querySelector('#cc-mode').value;
    const candidates = state.players.filter((player)=>player.status==='club'&&!player.protected);
    let selected = []; let summary = '';
    if (mode === 'item-score') {
      const target = Number(shadow.querySelector('#cc-target').value); const count = Number(shadow.querySelector('#cc-count').value)||0;
      if (!Number.isInteger(target)||target<1) { showResult('Informe um Item Score válido.'); return; }
      selected = solveScore(candidates,target,count); if (!selected) { showResult('Não encontrei solução com os itens elegíveis atuais.'); return; }
      summary = `Item Score estimado ${selected.reduce((sum,item)=>sum+baseScore(item),0).toLocaleString('pt-BR')}`;
    } else {
      const minOvr=Number(shadow.querySelector('#cc-ovr').value)||0; const minRating=Number(shadow.querySelector('#cc-rating').value)||0;
      let rules;try{rules=parseRules(shadow.querySelector('#cc-rules').value);}catch(error){showResult(error.message);return;}
      selected=solveTraditional(candidates.filter((item)=>item.ovr>=minOvr),rules,minRating);
      if(!selected){showResult('Não encontrei 11 cartas não protegidas que atendam aos limites informados.');return;}
      const rating=estimateRating(selected);
      summary=`Rating estimado ${rating}`;
    }
    const plan={id:id(),mode,selectedInstanceIds:selected.map((player)=>player.instanceId),summary,status:'planned',createdAt:new Date().toISOString()};
    const estimated=mode==='item-score'?selected.some((player)=>player.scoreOverride==null):true;
    summary=mode==='item-score'?`Item Score ${estimated?'estimado ':''}${selected.reduce((sum,item)=>sum+baseScore(item),0).toLocaleString('pt-BR')}`:summary;plan.summary=summary;state.plans.unshift(plan);void save();
    showResult(`<h3>${escape(summary)}</h3><ul>${selected.map((player)=>`<li><b>${escape(player.name)}</b> · ${player.ovr} OVR · ${player.duplicate?'duplicada':'carta normal'}${mode==='item-score'?` · ${baseScore(player)} score${player.scoreOverride==null?' (base estimada)':''}`:''}<small>${player.duplicate?'Duplicada priorizada':'Elegível pelos limites informados'}</small></li>`).join('')}</ul><p>O plano está salvo localmente. Confira o desafio antes de preencher a Web App.</p><button data-action="submit-plan" data-id="${plan.id}">Preencher escalação visível</button>`);
  }

  function showResult(value) { const output=shadow.querySelector('#cc-sbc-result'); if(output)output.innerHTML=value.startsWith('<')?value:`<p class="cc-error">${escape(value)}</p>`;else setNotice(value); }
  function setNotice(value){notice.hidden=false;notice.textContent=value;setTimeout(()=>{notice.hidden=true;},7000);}
  function solveScore(items,target,count) {
    const ordered=items.slice().sort((a,b)=>Number(b.duplicate)-Number(a.duplicate)||baseScore(b)-baseScore(a)||a.ovr-b.ovr);let best=null;let visits=0;
    function walk(start,chosen,score,nondup,ovr){if(++visits>80000)return;if(score>=target&&(!count||chosen.length===count)){const candidate={chosen:[...chosen],nondup,ovr,score};if(!best||nondup<best.nondup||nondup===best.nondup&&(ovr<best.ovr||ovr===best.ovr&&score<best.score))best=candidate;return;}if(count&&chosen.length>=count)return;for(let i=start;i<ordered.length;i++){const item=ordered[i];walk(i+1,[...chosen,item],score+baseScore(item),nondup+Number(!item.duplicate),ovr+item.ovr);if(visits>80000)return;}}
    walk(0,[],0,0,0);return best?.chosen||null;
  }
  function estimateRating(items){const sum=items.reduce((total,item)=>total+item.ovr,0);const mean=sum/11;const excess=items.reduce((total,item)=>total+Math.max(0,item.ovr-mean),0);return Math.floor(Math.round(sum+excess)/11);}
  function parseRules(text){if(!text.trim())return[];const rules=JSON.parse(text);if(!Array.isArray(rules))throw new Error('Limites devem ser uma lista JSON.');return rules.map((rule)=>{if(!['league','nation','club','position','rarity'].includes(rule.field)||!String(rule.value||'').trim())throw new Error('Atributo inválido ou valor vazio.');const minimum=Number(rule.minimum)||0;const maximum=rule.maximum==null?11:Number(rule.maximum);if(!Number.isInteger(minimum)||!Number.isInteger(maximum)||minimum<0||maximum<minimum||maximum>11)throw new Error('Limites inválidos (use valores entre 0 e 11).');return{field:rule.field,value:String(rule.value).toLowerCase(),minimum,maximum};});}
  function solveTraditional(items,rules,minRating){const ordered=items.slice().sort((a,b)=>Number(b.duplicate)-Number(a.duplicate)||a.ovr-b.ovr||a.instanceId.localeCompare(b.instanceId));let best=null;let visited=0;function walk(start,chosen){if(++visited>80000)return;if(chosen.length===11){if(!rules.every((rule)=>{const count=chosen.filter((item)=>String(item[rule.field]||'').trim().toLowerCase()===rule.value).length;return count>=rule.minimum&&count<=rule.maximum;}))return;const rating=estimateRating(chosen);if(minRating&&rating<minRating)return;const candidate={items:[...chosen],nondup:chosen.filter((item)=>!item.duplicate).length,ovr:chosen.reduce((sum,item)=>sum+item.ovr,0),rating};if(!best||candidate.nondup<best.nondup||candidate.nondup===best.nondup&&(candidate.ovr<best.ovr||candidate.ovr===best.ovr&&candidate.rating<best.rating))best=candidate;return;}if(chosen.length+ordered.length-start<11)return;for(let i=start;i<ordered.length;i++){walk(i+1,[...chosen,ordered[i]]);if(visited>80000)return;}}walk(0,[]);return best?.items||null;}
  function isSpecial(rarity){return Boolean(rarity)&&!['gold','rare gold','common gold','silver','rare silver','common silver','bronze','rare bronze','common bronze'].includes(String(rarity).toLowerCase());}
  function baseScore(player){if(Number.isInteger(player.scoreOverride))return player.scoreOverride;const scores={99:100000,98:90000,97:85000,96:55000,95:40000,94:30000,93:25000,92:20000,91:19000,90:14000,89:11000,88:8300,87:5500,86:4100,85:2100,84:830,83:410,82:340,81:280,80:180,79:160,78:140,77:120,76:100,75:90};return scores[player.ovr]??(player.ovr>=65?35:20);}

  function submitPlan(planId) {
    const plan=state.plans.find((entry)=>entry.id===planId);if(!plan)return;
    const cards=plan.selectedInstanceIds.map((instanceId)=>state.players.find((player)=>player.instanceId===instanceId)).filter(Boolean);
    if(cards.length!==plan.selectedInstanceIds.length||cards.some((player)=>player.protected)){showResult('O elenco mudou; refaça o planejamento antes de preencher.');return;}
    const confirmed=window.confirm(`Preparar ${cards.length} cartas na escalação SBC visível? A extensão não enviará o SBC. Confira cada slot antes de confirmar no jogo.`);if(!confirmed)return;
    const candidates=[...document.querySelectorAll('main li.listFUTItem')].filter(visible);
    let filled=0;
    if(document.querySelector('main .ut-one-click-sbc-work-area-view')){showResult('O DME usa a área “Seleção automática” com cartas sem IDs visíveis confiáveis. Não cliquei em itens; preencha pela Web App após conferir o plano.');return;}
    for(const player of cards){const node=candidates.find((candidate)=>String(candidate.dataset.futgenieItemId||candidate.dataset.itemId||'')===player.itemId&&!candidate.dataset.ccSelected);if(!node)continue;node.dataset.ccSelected='true';node.click();filled++;}
    showResult(`Enviei cliques para ${filled} de ${cards.length} controles visíveis. Confirme visualmente cada slot na Web App; o envio final continua manual.`);
  }

  async function sendSelectedToClub() {
    const selected=document.querySelectorAll('main li.listFUTItem.selected, main li.listFUTItem[aria-selected="true"]');if(!selected.length){showResult('Selecione um item na Web App primeiro.');return;}
    const button=[...document.querySelectorAll('main button, main [role="button"]')].find((node)=>visible(node)&&/send to club|enviar ao (meu )?clube/i.test(node.innerText||node.getAttribute('aria-label')||''));
    if(!button){showResult('Não encontrei o botão “Enviar ao clube” visível.');return;}
    if(!window.confirm(`Enviar ${selected.length} item(ns) selecionado(s) ao clube pela Web App?`))return;
    button.click();if(document.querySelector('[role="dialog"],dialog')){showResult('A Web App abriu uma confirmação. Confira e conclua manualmente.');return;}await new Promise((resolve)=>setTimeout(resolve,500));const remaining=[...selected].filter(isSelected);if(remaining.length){showResult('O botão foi acionado, mas a Web App ainda mostra os itens selecionados. Confira a tela; nenhum sucesso foi registrado.');return;}state.events.unshift({id:id(),type:'send-to-club',details:`${selected.length} item(ns)`,occurredAt:new Date().toISOString()});void save();showResult('A seleção mudou. Confira se os itens aparecem no clube.');
  }

  async function markPlayer(instanceId,status){state.players=state.players.map((player)=>player.instanceId===instanceId?{...player,status}:player);state.events.unshift({id:id(),instanceId,type:`status:${status}`,occurredAt:new Date().toISOString()});await save();render();}
  async function toggleProtected(instanceId){state.players=state.players.map((player)=>player.instanceId===instanceId?{...player,protected:!player.protected}:player);await save();render();}
  async function addGallerySet(){const name=shadow.querySelector('#cc-set-name').value.trim();const thresholds=shadow.querySelector('#cc-set-thresholds').value.split(',').map((value)=>value.trim()).filter(Boolean).map(Number);if(!name||thresholds.some((value)=>!Number.isInteger(value)||value<1)){setNotice('Informe o nome do Set e limites numéricos válidos.');return;}state.sets.unshift({id:id(),name,thresholds,createdAt:new Date().toISOString()});await save();render();}
  function renderGallerySet(set){const added=new Set(state.events.filter((event)=>event.type==='gallery:added'&&event.details===set.id).map((event)=>event.instanceId));const committed=state.players.filter((player)=>added.has(player.instanceId)).reduce((sum,player)=>sum+baseScore(player),0);const thresholds=(set.thresholds||[]).slice().sort((a,b)=>a-b);const target=thresholds.find((value)=>committed<value);const pool=state.players.filter((player)=>!added.has(player.instanceId));const selected=target?(solveScore(pool,target-committed,0)||pool):(thresholds.length?[]:pool);const projection=committed+selected.reduce((sum,player)=>sum+baseScore(player),0);return `<section class="cc-card"><h2>${escape(set.name)}</h2><p>Score comprometido ${committed.toLocaleString('pt-BR')} · projeção ${projection.toLocaleString('pt-BR')}${target?` · próximo limite ${target.toLocaleString('pt-BR')}`:thresholds.length?' · limites concluídos':' · sem limite informado'}</p><ul>${selected.map((player)=>`<li><span>${escape(player.name)} · ${player.ovr} OVR · ${baseScore(player)} score${player.protected?' · protegida':''}</span><button data-action="gallery-add" data-set="${escape(set.id)}" data-player="${escape(player.instanceId)}">Registrar adicionada</button></li>`).join('')||'<li>Nenhum item sugerido.</li>'}</ul></section>`;}
  async function addToGallery(setId,instanceId){if(!window.confirm('Registrar no histórico local que este item foi enviado para a Gallery?'))return;state.events.unshift({id:id(),instanceId,type:'gallery:added',details:setId,occurredAt:new Date().toISOString()});await save();render();}
  async function markPlanUsed(planId){const plan=state.plans.find((entry)=>entry.id===planId);if(!plan||!window.confirm(`Registrar ${plan.selectedInstanceIds.length} cartas como usadas em um SBC?`))return;const ids=new Set(plan.selectedInstanceIds);if(state.players.some((player)=>ids.has(player.instanceId)&&player.protected)){setNotice('O plano contém carta protegida; ele não pode ser registrado.');return;}state.players=state.players.map((player)=>ids.has(player.instanceId)?{...player,status:'used'}:player);state.events.unshift(...plan.selectedInstanceIds.map((instanceId)=>({id:id(),instanceId,type:'status:used',details:`SBC local ${plan.id}`,occurredAt:new Date().toISOString()})));state.plans=state.plans.map((entry)=>entry.id===planId?{...entry,status:'used'}:entry);await save();render();}
  function installAnimationSkip(){if(!state.preferences.skipAnimations||host.dataset.skipObserver==='true')return;let handled=false;const clickSkip=()=>{if(!state.preferences.skipAnimations)return;const scope=[...document.querySelectorAll('.ut-pack-view,.pack-opening,.pack-animation,[role="dialog"],dialog')].find((candidate)=>visible(candidate)&&(/pack|pacote/i.test(`${candidate.className||''} ${candidate.id||''}`)||/pack|pacote/i.test(candidate.innerText||'')));if(!scope){handled=false;return;}const button=[...scope.querySelectorAll('button,[role="button"]')].find((node)=>visible(node)&&/^(skip|continue|pular|continuar)$/i.test((node.innerText||node.getAttribute('aria-label')||'').trim()));if(!button){handled=false;return;}if(handled)return;handled=true;button.click();state.events.unshift({id:id(),type:'pack-animation-skipped',occurredAt:new Date().toISOString()});void save();};new MutationObserver(clickSkip).observe(document.body,{childList:true,subtree:true,attributes:true});host.dataset.skipObserver='true';}
  function runShortcut(action){if(action==='scan'){state.players=mergeScan(state.players,scanVisiblePlayers());void save().then(render);}else if(action==='panel'){panel.hidden=!panel.hidden;if(!panel.hidden)render();}}
  function playerRow(player){return `<li><span><b>${escape(player.name)}</b><small>${player.ovr} OVR · ${player.duplicate?'duplicada':'única'}${player.protected?' · protegida':''}</small></span><span class="cc-actions"><button data-action="protect" data-id="${escape(player.instanceId)}">${player.protected?'Desproteger':'Proteger'}</button><button data-action="past" data-id="${escape(player.instanceId)}">Histórico</button></span></li>`;}
  function visible(node){const rect=node.getBoundingClientRect();return rect.width>0&&rect.height>0&&getComputedStyle(node).visibility!=='hidden';}
  function isSelected(node){return node.isConnected&&visible(node)&&(node.getAttribute('aria-selected')==='true'||node.classList.contains('selected')||node.getAttribute('aria-pressed')==='true');}
  function parseCsv(source){const rows=[];let row=[],field='',quoted=false;source=source.replace(/^\uFEFF/,'');for(let index=0;index<source.length;index++){const character=source[index];if(quoted){if(character==='"'&&source[index+1]==='"'){field+='"';index++;}else if(character==='"')quoted=false;else field+=character;}else if(character==='"'&&!field.length)quoted=true;else if(character===','){row.push(field);field='';}else if(character==='\n'||character==='\r'){if(character==='\r'&&source[index+1]==='\n')index++;row.push(field);rows.push(row);row=[];field='';}else field+=character;}if(quoted)throw new Error('CSV termina dentro de aspas.');if(field.length||row.length){row.push(field);rows.push(row);}return rows;}
  function truthy(value){return ['true','1','sim','yes','holo'].includes(String(value).trim().toLowerCase());}
  function parseScoreOverride(value){if(value==null||String(value).trim()==='')return null;const score=Number(value);if(!Number.isInteger(score)||score<0)return null;return score;}
  function slug(value){return String(value||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'item';}
  function id(){return crypto.randomUUID?.()||`cc-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
  function escape(value){return String(value??'').replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
  render();
})();
