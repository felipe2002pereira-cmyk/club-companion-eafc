import { calculateItemScore, ITEM_SCORE_TABLE_VERSION } from './item-score.js';
import { estimateTraditionalSbcRating, validateSquad } from './sbc-requirements.js';

const SEARCH_LIMIT = 180000;

export function solveItemScoreSbc(items, requirement) {
  const candidates = eligible(items).sort((a,b) => Number(b.duplicate)-Number(a.duplicate) || calculateItemScore(b).score-calculateItemScore(a).score || a.ovr-b.ovr || a.instanceId.localeCompare(b.instanceId));
  if (!Number.isInteger(requirement.targetItemScore) || requirement.targetItemScore < 1) throw new Error('Informe um Item Score-alvo válido.');
  const requiredCount = requirement.itemCount ? Number(requirement.itemCount) : null;
  if (requiredCount !== null && (!Number.isInteger(requiredCount) || requiredCount < 1)) throw new Error('Quantidade de itens precisa ser um inteiro positivo.');
  const scored = candidates.map((item) => ({ item, ...calculateItemScore(item) }));
  let best = null; let visited = 0;
  function walk(start, chosen, score, nonDuplicates, totalOvr) {
    visited += 1;
    if (visited > SEARCH_LIMIT) return;
    if (score + scored.slice(start).reduce((sum, entry)=>sum+entry.score,0) < requirement.targetItemScore) return;
    if (requiredCount !== null && chosen.length + scored.length - start < requiredCount) return;
    if (score >= requirement.targetItemScore && (requiredCount === null || chosen.length === requiredCount)) {
      const candidate = { chosen: [...chosen], score, nonDuplicates, totalOvr };
      if (!best || compareScorePlan(candidate, best) < 0) best = candidate;
      return;
    }
    if (requiredCount !== null && chosen.length >= requiredCount) return;
    for (let index = start; index < scored.length; index += 1) {
      if (best && nonDuplicates + Number(!scored[index].item.duplicate) > best.nonDuplicates) continue;
      const entry = scored[index];
      walk(index + 1, [...chosen, entry], score + entry.score, nonDuplicates + Number(!entry.item.duplicate), totalOvr + entry.item.ovr);
      if (visited > SEARCH_LIMIT) return;
    }
  }
  walk(0, [], 0, 0, 0);
  if (!best) return { isFeasible: false, selectedInstanceIds: [], unmetRequirements: [`Não encontrei combinação com os ${candidates.length} itens elegíveis. ${items.filter((item) => item.protected).length} protegida(s) foram excluída(s).`], explanation: `Busca ${visited > SEARCH_LIMIT ? 'limitada; o resultado pode não cobrir todas as combinações' : 'concluída'}; atualize o clube ou revise o alvo.`, scoreTableVersion: ITEM_SCORE_TABLE_VERSION };
  const estimated = best.chosen.some((entry) => entry.estimated);
  return { isFeasible: true, selectedInstanceIds: best.chosen.map((entry) => entry.item.instanceId), computedScore: best.score, scoreIsEstimate: estimated, optimizationLimited: visited > SEARCH_LIMIT, scoreTableVersion: ITEM_SCORE_TABLE_VERSION, unmetRequirements: [], explanation: `Usa ${best.nonDuplicates} carta(s) não duplicada(s), menor OVR total possível entre as opções encontradas. ${visited > SEARCH_LIMIT ? 'A busca atingiu o limite de combinações; pode existir uma opção melhor.' : ''} ${estimated ? 'Parte do score usa pontuação-base estimada; informe o valor final exibido no jogo para precisão.' : 'Pontuação final informada manualmente para todos os itens especiais/holográficos.'}` };
}

export function solveTraditionalSbc(items, requirement) {
  const requiredCount = requirement.itemCount ?? 11;
  if (requiredCount !== 11) throw new Error('SBC tradicional requer 11 jogadores.');
  const candidates = eligible(items).filter((item) => !requirement.minimumPlayerOvr || item.ovr >= requirement.minimumPlayerOvr).sort((a,b) => Number(b.duplicate)-Number(a.duplicate) || a.ovr-b.ovr || a.instanceId.localeCompare(b.instanceId));
  let best = null; let visited = 0;
  function walk(start, chosen) {
    visited += 1;
    if (visited > SEARCH_LIMIT) return;
    if (!rulesRemainPossible(chosen, candidates.slice(start), requirement.attributeRules || [])) return;
    if (chosen.length === 11) {
      const violations = validateSquad(chosen, { ...requirement, itemCount: 11 });
      if (violations.length) return;
      const rating = estimateTraditionalSbcRating(chosen);
      if (requirement.minimumSquadRating && rating.rating < requirement.minimumSquadRating) return;
      const candidate = { chosen: [...chosen], nonDuplicates: chosen.filter((item) => !item.duplicate).length, totalOvr: chosen.reduce((sum,item)=>sum+item.ovr,0), rating: rating.rating };
      if (!best || compareTraditional(candidate,best) < 0) best = candidate;
      return;
    }
    if (chosen.length + candidates.length - start < 11) return;
    for (let index = start; index < candidates.length; index += 1) {
      if (best && chosen.filter((item) => !item.duplicate).length > best.nonDuplicates) break;
      walk(index + 1, [...chosen, candidates[index]]);
      if (visited > SEARCH_LIMIT) return;
    }
  }
  walk(0, []);
  if (!best) return { isFeasible: false, selectedInstanceIds: [], unmetRequirements: ['Não encontrei 11 itens que atendam aos limites informados. Revise os requisitos ou complete o inventário.'], explanation: `Busca ${visited > SEARCH_LIMIT ? 'limitada; o resultado pode não cobrir todas as combinações' : 'concluída'}; cartas protegidas excluídas.` };
  return { isFeasible: true, selectedInstanceIds: best.chosen.map((item) => item.instanceId), optimizationLimited: visited > SEARCH_LIMIT, estimatedSquadRating: { rating: best.rating, label: 'estimativa', formulaVersion: 'community-11-v1' }, unmetRequirements: [], explanation: `Usa ${best.nonDuplicates} carta(s) não duplicada(s); não calcula química. O rating é uma estimativa comunitária.${visited > SEARCH_LIMIT ? ' A busca atingiu o limite de combinações; pode existir uma opção melhor.' : ''}` };
}

function eligible(items) { return items.filter((item) => item.status === 'club' && !item.protected); }
function compareScorePlan(a,b) { return a.nonDuplicates-b.nonDuplicates || a.totalOvr-b.totalOvr || (a.score-b.score); }
function compareTraditional(a,b) { return a.nonDuplicates-b.nonDuplicates || a.totalOvr-b.totalOvr || a.rating-b.rating || a.chosen.map(x=>x.instanceId).sort().join('|').localeCompare(b.chosen.map(x=>x.instanceId).sort().join('|')); }
function rulesRemainPossible(chosen, remaining, rules) {
  for (const rule of rules) {
    const current = chosen.filter((item)=>String(item[rule.field]||'').trim().toLowerCase()===String(rule.value).trim().toLowerCase()).length;
    const available = remaining.filter((item)=>String(item[rule.field]||'').trim().toLowerCase()===String(rule.value).trim().toLowerCase()).length;
    if (current > rule.maximum || current + Math.min(11 - chosen.length, available) < rule.minimum) return false;
  }
  return true;
}
