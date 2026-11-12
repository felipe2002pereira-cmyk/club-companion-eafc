import { makeId } from './player-items.js';
import { writeOne } from '../storage/database.js';

export function buildProviderUrl(source) {
  if (source === 'futbin') return 'https://www.futbin.com/players';
  if (source === 'fut.gg') return 'https://www.fut.gg/players/';
  throw new Error('Fonte de preço desconhecida.');
}

export async function recordPriceSnapshot({ instanceId, source, platform, coins }) {
  const value = Number(coins);
  if (!instanceId || !['futbin','fut.gg'].includes(source) || !['console','pc'].includes(platform) || !Number.isSafeInteger(value) || value < 0) throw new Error('Confira jogador, fonte, plataforma e preço em moedas inteiras.');
  const snapshot = { id: makeId(), instanceId, source, platform, coins: value, checkedAt: new Date().toISOString(), enteredManually: true };
  await writeOne('priceSnapshots', snapshot);
  return snapshot;
}
