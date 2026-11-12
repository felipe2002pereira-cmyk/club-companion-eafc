export function isEaWebApp(value) {
  if (typeof value !== 'string') return false;
  const url = URL.parse(value);
  return url?.origin === 'https://www.ea.com'
    && /^\/ea-sports-fc\/ultimate-team\/web-app(?:\/|$)/.test(url.pathname);
}

// Chrome executes this function in an isolated world, without module imports.
export function captureClubCards(live = false) {
  const allowedPage = () => location.origin === 'https://www.ea.com'
    && /^\/ea-sports-fc\/ultimate-team\/web-app(?:\/|$)/.test(location.pathname);
  if (!allowedPage()) return { club: false, cards: [] };

  const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
  const visible = (element) => element.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const clubHeadings = ['club', 'my club', 'club players', 'clube', 'meu clube', 'jogadores do clube'];

  function readVisibleCards() {
    const headings = document.querySelectorAll('main h1, main h2, main [role="heading"]');
    const club = [...headings].some((heading) => (
      visible(heading) && clubHeadings.includes(normalize(heading.textContent).toLowerCase())
    ));
    if (!club) return { club: false, cards: [] };

    const cards = [];
    for (const row of document.querySelectorAll('main li.listFUTItem')) {
      if (cards.length >= 250) break;
      if (!visible(row)) continue;
      const entity = row.querySelector('.entityContainer') ?? row;
      const card = entity.querySelector('.player.item');
      const name = normalize(entity.querySelector('.main-view.name, .name.untradeable')?.textContent);
      const ovr = Number(card?.querySelector('.rating')?.textContent?.trim());
      if (!name || name.length > 80 || !Number.isInteger(ovr) || ovr < 45 || ovr > 99) continue;
      const position = normalize(card.querySelector('.position')?.textContent).slice(0, 20);
      const rarity = ['specials', 'rare', 'common'].find((kind) => card.classList.contains(kind)) ?? '';
      const candidateId = row.dataset.itemId ?? '';
      const itemId = /^[a-z0-9_-]{1,60}$/i.test(candidateId) ? candidateId : '';
      cards.push({ name, ovr, position, rarity, itemId });
    }
    return { club: true, cards };
  }

  if (!live) return readVisibleCards();

  // This state belongs to the extension's isolated world, not to the page.
  const panelKey = Symbol.for('club-companion-live-panel');
  if (globalThis[panelKey]?.isConnected) return { live: true };
  const host = document.createElement('div');
  host.setAttribute('data-club-companion-live', '');
  const shadow = host.attachShadow({ mode: 'closed' });
  const stylesheet = new CSSStyleSheet();
  stylesheet.replaceSync(`
    :host { all: initial !important; display: block !important; position: fixed !important;
      bottom: 16px !important; right: 16px !important; z-index: 2147483645 !important;
      width: min(310px, calc(100vw - 32px)) !important; color: #edf4ef !important;
      font: 13px/1.45 system-ui, sans-serif !important; }
    aside { box-sizing: border-box; max-height: 55vh; overflow: auto; padding: 12px;
      border: 1px solid #445552; border-radius: 12px; background: #101719; box-shadow: 0 10px 30px #0008; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    button { padding: 4px 8px; border: 1px solid #647771; border-radius: 6px;
      color: inherit; background: #263331; cursor: pointer; font: inherit; }
    p { margin: 8px 0 0; } ul { margin: 8px 0 0; padding-left: 18px; overflow-wrap: anywhere; }
    small { display: block; margin-top: 8px; color: #bfcec7; }
    [hidden] { display: none !important; }
  `);
  shadow.adoptedStyleSheets = [stylesheet];
  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Club Companion — clube ao vivo');
  const header = document.createElement('header');
  const title = document.createElement('strong');
  title.textContent = 'Club Companion · Clube ao vivo';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Fechar';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const list = document.createElement('ul');
  const hint = document.createElement('small');
  hint.textContent = 'Para guardar as cartas, use Importar cartas desta tela no menu da extensão.';
  header.append(title, closeButton);
  panel.append(header, status, list, hint);
  shadow.append(panel);

  let pendingUpdate;
  let previousSignature;
  const observer = new MutationObserver(scheduleUpdate);

  function closePanel() {
    observer.disconnect();
    clearTimeout(pendingUpdate);
    window.removeEventListener('pagehide', closePanel);
    window.removeEventListener('popstate', scheduleUpdate);
    window.removeEventListener('hashchange', scheduleUpdate);
    if (globalThis[panelKey] === host) delete globalThis[panelKey];
    host.remove();
  }

  function scheduleUpdate() {
    if (pendingUpdate !== undefined) return;
    pendingUpdate = setTimeout(() => {
      pendingUpdate = undefined;
      update();
    }, 160);
  }

  function update() {
    if (!host.isConnected || !allowedPage()) {
      closePanel();
      return;
    }
    const { club, cards } = readVisibleCards();
    const labels = cards.slice(0, 8).map(({ name, ovr, position }) => (
      [name, `${ovr} OVR`, position].filter(Boolean).join(' · ')
    ));
    const summary = club
      ? `${cards.length === 250 ? 'Pelo menos ' : ''}${cards.length} carta(s) reconhecida(s) nesta tela.`
      : 'Abra a lista de cartas do Clube para acompanhar a tela.';
    const signature = JSON.stringify([summary, labels]);
    if (signature === previousSignature) return;
    previousSignature = signature;
    if (status.textContent !== summary) status.textContent = summary;
    list.replaceChildren(...labels.map((label) => {
      const item = document.createElement('li');
      item.textContent = label;
      return item;
    }));
    list.hidden = !labels.length;
    hint.hidden = !club || !cards.length;
  }

  globalThis[panelKey] = host;
  closeButton.addEventListener('click', closePanel);
  window.addEventListener('pagehide', closePanel, { once: true });
  window.addEventListener('popstate', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  document.documentElement.append(host);
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
  });
  update();
  return { live: true };
}

export function toPlayerItems(cards) {
  const copies = new Map();
  for (const { name, ovr, position, rarity, itemId } of cards) {
    const version = JSON.stringify([itemId, name.toLowerCase(), ovr, position, rarity]);
    const group = copies.get(version) ?? [];
    group.push({ name, ovr, position, rarity, itemId });
    copies.set(version, group);
  }
  return [...copies].flatMap(([version, group]) => group.map((card, index) => ({
    ...card,
    instanceId: `ea-visible:${version}:${index + 1}`,
    itemId: card.itemId || `${card.name} · ${card.ovr} · ${card.position} · ${card.rarity}`,
    league: '', nation: '', club: '',
    holographic: card.rarity === 'specials', tradeable: false, duplicate: group.length > 1,
    protected: false, status: 'club', itemScoreOverride: null, notes: '',
  })));
}
