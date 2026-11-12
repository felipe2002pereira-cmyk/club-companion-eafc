export const ITEM_SCORE_TABLE_VERSION = 'fc27-base-launch-update-2026-11';

const GOLD = new Map([[99,100000],[98,90000],[97,85000],[96,55000],[95,40000],[94,30000],[93,25000],[92,20000],[91,19000],[90,14000],[89,11000],[88,8300],[87,5500],[86,4100],[85,2100],[84,830],[83,410],[82,340],[81,280],[80,180],[79,160],[78,140],[77,120],[76,100],[75,90]]);

export function calculateItemScore(item) {
  if (Number.isInteger(item.itemScoreOverride) && item.itemScoreOverride >= 0) {
    return { score: item.itemScoreOverride, estimated: false, source: 'manual' };
  }
  let baseScore;
  let estimated = Boolean(item.holographic) || !item.rarity || isSpecialRarity(item.rarity);
  if (GOLD.has(Number(item.ovr))) baseScore = GOLD.get(Number(item.ovr));
  else if (Number(item.ovr) >= 65 && Number(item.ovr) <= 74) baseScore = 35;
  else if (Number(item.ovr) >= 45 && Number(item.ovr) <= 64) baseScore = 20;
  else { baseScore = 0; estimated = true; }
  return { score: baseScore, estimated, source: 'base-table', needsManualValue: estimated };
}

function isSpecialRarity(rarity = '') {
  const normalized = String(rarity).trim().toLowerCase();
  return Boolean(normalized && !['gold', 'rare gold', 'common gold', 'silver', 'rare silver', 'common silver', 'bronze', 'rare bronze', 'common bronze'].includes(normalized));
}
