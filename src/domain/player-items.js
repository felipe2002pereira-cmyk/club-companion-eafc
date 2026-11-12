import { readAll, writeOne, writePlayersWithEvents } from '../storage/database.js';

export const PLAYER_STATUSES = Object.freeze(['club', 'past', 'used']);

export function validatePlayerItem(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Registro de jogador inválido.'] };
  }

  const value = {
    instanceId: text(input.instanceId),
    itemId: text(input.itemId),
    name: text(input.name),
    ovr: Number(input.ovr),
    position: text(input.position),
    league: text(input.league),
    nation: text(input.nation),
    club: text(input.club),
    rarity: text(input.rarity),
    holographic: booleanValue(input.holographic),
    itemScoreOverride: input.itemScoreOverride === '' || input.itemScoreOverride == null ? null : Number(input.itemScoreOverride),
    tradeable: booleanValue(input.tradeable),
    duplicate: booleanValue(input.duplicate),
    protected: booleanValue(input.protected),
    status: text(input.status) || 'club',
    notes: text(input.notes),
  };

  if (!value.instanceId) errors.push('instanceId é obrigatório e precisa ser único para cada carta física.');
  if (!value.itemId) errors.push('itemId é obrigatório.');
  if (!value.name) errors.push('Nome do jogador é obrigatório.');
  if (!Number.isInteger(value.ovr) || value.ovr < 1 || value.ovr > 99) errors.push('OVR precisa ser um número inteiro de 1 a 99.');
  if (value.itemScoreOverride !== null && (!Number.isInteger(value.itemScoreOverride) || value.itemScoreOverride < 0)) errors.push('Pontuação Item Score manual precisa ser um inteiro não negativo.');
  if (!PLAYER_STATUSES.includes(value.status)) errors.push(`Status inválido: ${value.status}.`);
  if (value.status === 'used' && value.protected) errors.push('Uma carta protegida não pode estar marcada como usada.');

  return errors.length ? { ok: false, errors } : { ok: true, value, errors: [] };
}

export async function updatePlayerStatus(instanceId, status, details = '') {
  if (!PLAYER_STATUSES.includes(status)) throw new Error(`Status inválido: ${status}`);
  const players = await readAll('playerItems');
  const current = players.find((player) => player.instanceId === instanceId);
  if (!current) throw new Error('Não encontrei essa carta no registro local.');
  if (current.protected && status === 'used') throw new Error('Desproteja a carta manualmente antes de registrar seu uso.');

  const next = { ...current, status };
  await writePlayersWithEvents([next], [{ id: makeId(), instanceId, type: `status:${status}`, details: text(details), occurredAt: new Date().toISOString() }]);
  return next;
}

export async function updatePlayersStatus(instanceIds, status, details = '') {
  if (!PLAYER_STATUSES.includes(status)) throw new Error(`Status inválido: ${status}`);
  const ids = [...new Set(instanceIds)];
  const all = await readAll('playerItems');
  const current = ids.map((id)=>all.find((player)=>player.instanceId===id));
  if (current.some((player)=>!player)) throw new Error('Uma das cartas deste planejamento não existe mais no inventário local.');
  if (status === 'used' && current.some((player)=>player.status !== 'club')) throw new Error('Uma das cartas não está mais marcada como disponível no clube; atualize ou refaça o planejamento.');
  if (status === 'used' && current.some((player)=>player.protected)) throw new Error('Desproteja manualmente as cartas antes de registrar o uso.');
  const occurredAt = new Date().toISOString();
  const players = current.map((player)=>({...player,status}));
  const events = players.map((player)=>({id:makeId(),instanceId:player.instanceId,type:`status:${status}`,details:text(details),occurredAt}));
  await writePlayersWithEvents(players,events);
  return players;
}

export async function recordPlayerEvent(instanceId, type, details = '') {
  const players = await readAll('playerItems');
  if (!players.some((player) => player.instanceId === instanceId)) throw new Error('Não encontrei essa carta no registro local.');
  const event = { id: makeId(), instanceId, type: text(type), details: text(details), occurredAt: new Date().toISOString() };
  await writeOne('events', event);
  return event;
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function text(value) {
  return String(value ?? '').trim();
}

function booleanValue(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'sim', 'yes', 'holographic', 'holo'].includes(text(value).toLowerCase());
}
