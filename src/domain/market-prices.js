import { makeId } from './player-items.js';
import { deleteOne, writeOne } from '../storage/database.js';

export function buildProviderUrl(source) {
  if (source === 'futbin') return 'https://www.futbin.com/players';
  if (source === 'fut.gg') return 'https://www.fut.gg/players/';
  throw new Error('Fonte de preço desconhecida.');
}

export async function recordPriceSnapshot({ instanceId, source, platform, coins }) {
  const value = readCoins(coins);
  if (!validScope(instanceId, source, platform) || value === null) {
    throw new Error('Confira a carta, a fonte, a plataforma e o preço em moedas inteiras.');
  }
  const snapshot = { id: makeId(), instanceId, source, platform, coins: value, checkedAt: new Date().toISOString(), enteredManually: true };
  await writeOne('priceSnapshots', snapshot);
  return snapshot;
}

export function priceTargetId(instanceId, source, platform) {
  return JSON.stringify([instanceId, source, platform]);
}

export function isPriceTarget(target) {
  return target !== null && typeof target === 'object'
    && validScope(target.instanceId, target.source, target.platform)
    && Number.isSafeInteger(target.coins) && target.coins >= 0
    && target.id === priceTargetId(target.instanceId, target.source, target.platform);
}

export async function savePriceTarget({ instanceId, source, platform, coins }) {
  if (!validScope(instanceId, source, platform)) throw new Error('Confira a carta, a fonte e a plataforma.');
  const id = priceTargetId(instanceId, source, platform);
  if (coins === '') {
    await deleteOne('priceTargets', id);
    return false;
  }
  const value = readCoins(coins);
  if (value === null) throw new Error('Informe um alvo inteiro e não negativo em moedas.');
  await writeOne('priceTargets', { id, instanceId, source, platform, coins: value });
  return true;
}

function validScope(instanceId, source, platform) {
  return typeof instanceId === 'string' && Boolean(instanceId)
    && ['futbin', 'fut.gg'].includes(source) && ['console', 'pc'].includes(platform);
}

function readCoins(coins) {
  if (typeof coins === 'string' && !coins.trim()) return null;
  if (typeof coins !== 'number' && typeof coins !== 'string') return null;
  const value = Number(coins);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
