export function isEaWebApp(value) {
  if (typeof value !== 'string') return false;
  const url = URL.parse(value);
  return url?.origin === 'https://www.ea.com'
    && /^\/ea-sports-fc\/ultimate-team\/web-app(?:\/|$)/.test(url.pathname);
}

// Chrome executes this function in an isolated world, without module imports.
export function captureClubCards() {
  if (location.origin !== 'https://www.ea.com'
    || !/^\/ea-sports-fc\/ultimate-team\/web-app(?:\/|$)/.test(location.pathname)) {
    return { club: false, cards: [] };
  }

  const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
  const visible = (element) => element.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const clubHeadings = ['club', 'my club', 'club players', 'clube', 'meu clube', 'jogadores do clube'];
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
