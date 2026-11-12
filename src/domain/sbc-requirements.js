export function parseAttributeRules(value) {
  if (!String(value || '').trim()) return [];
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('Regras por atributo precisam estar em JSON válido.'); }
  if (!Array.isArray(parsed)) throw new Error('Regras por atributo devem ser uma lista JSON.');
  return parsed.map((rule) => {
    const field = String(rule.field || '').trim();
    if (!['league', 'nation', 'club', 'rarity', 'position'].includes(field)) throw new Error(`Atributo não suportado: ${field || '(vazio)'}.`);
    const value = String(rule.value || '').trim();
    if (!value) throw new Error('Cada regra precisa de um valor.');
    const minimum = rule.minimum == null ? 0 : Number(rule.minimum);
    const maximum = rule.maximum == null ? Infinity : Number(rule.maximum);
    if (!Number.isInteger(minimum) || minimum < 0 || !(maximum === Infinity || (Number.isInteger(maximum) && maximum >= minimum))) throw new Error(`Limites inválidos para ${field}: ${value}.`);
    return { field, value, minimum, maximum };
  });
}

export function validateSquad(items, requirement) {
  const errors = [];
  if (items.length !== requirement.itemCount) errors.push(`Quantidade: ${items.length}/${requirement.itemCount}.`);
  if (requirement.minimumPlayerOvr && items.some((item) => item.ovr < requirement.minimumPlayerOvr)) errors.push(`Há carta abaixo do OVR mínimo ${requirement.minimumPlayerOvr}.`);
  for (const rule of requirement.attributeRules || []) {
    const count = items.filter((item) => normalize(item[rule.field]) === normalize(rule.value)).length;
    if (count < rule.minimum) errors.push(`${rule.field} “${rule.value}”: ${count}, mínimo ${rule.minimum}.`);
    if (count > rule.maximum) errors.push(`${rule.field} “${rule.value}”: ${count}, máximo ${rule.maximum}.`);
  }
  return errors;
}

export function estimateTraditionalSbcRating(items) {
  if (items.length !== 11) throw new Error('A estimativa de rating exige 11 itens.');
  const sum = items.reduce((total, item) => total + Number(item.ovr), 0);
  const mean = sum / 11;
  const excess = items.reduce((total, item) => total + Math.max(0, Number(item.ovr) - mean), 0);
  return { rating: Math.floor(Math.round(sum + excess) / 11), label: 'estimativa', formulaVersion: 'community-11-v1' };
}

function normalize(value) { return String(value || '').trim().toLocaleLowerCase('pt-BR'); }
