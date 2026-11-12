import { readAll, replaceAll, writeMany } from './database.js';
import { validatePlayerItem } from '../domain/player-items.js';

const BACKUP_VERSION = 1;
const STORE_NAMES = ['playerItems', 'events', 'sbcPlans', 'gallerySets', 'priceSnapshots'];
const CSV_COLUMNS = ['instanceId', 'itemId', 'name', 'ovr', 'position', 'league', 'nation', 'club', 'rarity', 'holographic', 'tradeable', 'duplicate', 'protected', 'status', 'notes'];
const OPTIONAL_CSV_COLUMNS = ['itemScoreOverride'];

export async function exportBackup() {
  const stores = {};
  for (const name of STORE_NAMES) stores[name] = await readAll(name);
  const payload = { format: 'club-companion-backup', schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...stores };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function inspectBackup(file) {
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { return { ok: false, errors: ['O arquivo não contém JSON válido.'], counts: {}, data: null }; }

  if (payload?.format !== 'club-companion-backup' || !Number.isInteger(payload.schemaVersion) || payload.schemaVersion > BACKUP_VERSION) {
    return { ok: false, errors: ['Formato de backup desconhecido ou mais novo que esta versão do app.'], counts: {}, data: null };
  }

  const errors = [];
  const data = Object.fromEntries(STORE_NAMES.map((name) => {
    if (!Array.isArray(payload[name])) errors.push(`O backup não contém uma lista válida para ${name}.`);
    return [name, Array.isArray(payload[name]) ? payload[name] : []];
  }));
  const validItems = [];
  const seen = new Set();
  data.playerItems.forEach((item, index) => {
    const result = validatePlayerItem(item);
    if (!result.ok) errors.push(`Jogador ${index + 1}: ${result.errors.join(' ')}`);
    else if (seen.has(result.value.instanceId)) errors.push(`Jogador ${index + 1}: instanceId repetido (${result.value.instanceId}).`);
    else { seen.add(result.value.instanceId); validItems.push(result.value); }
  });
  data.playerItems = validItems;
  for (const storeName of STORE_NAMES.slice(1)) {
    const valid = [];
    const seenIds = new Set();
    data[storeName].forEach((item, index) => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id) errors.push(`${storeName} ${index + 1}: registro inválido ou sem id.`);
      else if (seenIds.has(item.id)) errors.push(`${storeName} ${index + 1}: id repetido (${item.id}).`);
      else if (storeName === 'events' && (!item.instanceId || !item.type || !item.occurredAt)) errors.push(`Evento ${index + 1}: falta instanceId, type ou occurredAt.`);
      else if (storeName === 'sbcPlans' && (!Array.isArray(item.selectedInstanceIds) || !item.mode)) errors.push(`Plano SBC ${index + 1}: estrutura inválida.`);
      else if (storeName === 'gallerySets' && !item.name) errors.push(`Gallery Set ${index + 1}: nome obrigatório.`);
      else if (storeName === 'priceSnapshots' && (!item.instanceId || !['futbin','fut.gg'].includes(item.source) || !['console','pc'].includes(item.platform) || !Number.isSafeInteger(item.coins) || item.coins < 0 || !Number.isFinite(Date.parse(item.checkedAt)))) errors.push(`Cotação ${index + 1}: estrutura inválida.`);
      else { seenIds.add(item.id); valid.push(item); }
    });
    data[storeName] = valid;
  }
  return { ok: errors.length === 0, errors, counts: Object.fromEntries(STORE_NAMES.map((name) => [name, data[name].length])), data };
}

export async function importBackup(file, mode = 'preview') {
  const report = await inspectBackup(file);
  if (!report.ok || mode === 'preview') return report;
  if (!['merge', 'replace'].includes(mode)) return { ...report, ok: false, errors: [...report.errors, 'Modo de importação inválido.'] };

  if (mode === 'replace') {
    await replaceAll(report.data);
    return { ...report, applied: true, mode };
  }

  const skipped = {};
  for (const storeName of STORE_NAMES) {
    const existing = await readAll(storeName);
    const key = storeName === 'playerItems' ? 'instanceId' : 'id';
    const known = new Set(existing.map((item) => item[key]));
    const additions = report.data[storeName].filter((item) => {
      if (known.has(item[key])) return false;
      known.add(item[key]);
      return true;
    });
    skipped[storeName] = report.data[storeName].length - additions.length;
    if (additions.length) await writeMany(storeName, additions);
  }
  return { ...report, applied: true, mode, skipped };
}

export async function importPlayersCsv(file) {
  const text = await file.text();
  let rows;
  try { rows = parseCsv(text); }
  catch (error) { return { ok: false, players: [], errors: [error.message], headers: [] }; }
  if (!rows.length) return { ok: false, players: [], errors: ['O CSV está vazio.'], headers: [] };
  const headers = rows[0].map((header) => header.trim());
  const missing = CSV_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) return { ok: false, players: [], errors: [`Cabeçalho CSV incompleto. Colunas esperadas: ${CSV_COLUMNS.join(', ')}. Faltam: ${missing.join(', ')}.`], headers };

  const index = new Map([...headers, ...OPTIONAL_CSV_COLUMNS.filter((column)=>!headers.includes(column))].map((header, position) => [header, headers.indexOf(header)]));
  const players = [];
  const errors = [];
  const seen = new Set();
  rows.slice(1).forEach((row, rowIndex) => {
    if (row.every((value) => !value.trim())) return;
    const input = Object.fromEntries([...CSV_COLUMNS, ...OPTIONAL_CSV_COLUMNS].map((column) => [column, index.has(column) ? (row[index.get(column)] ?? '') : '']));
    const result = validatePlayerItem(input);
    const label = `Linha ${rowIndex + 2}`;
    if (!result.ok) errors.push(`${label}: ${result.errors.join(' ')}`);
    else if (seen.has(result.value.instanceId)) errors.push(`${label}: instanceId repetido (${result.value.instanceId}).`);
    else { seen.add(result.value.instanceId); players.push(result.value); }
  });
  return { ok: errors.length === 0, players, errors, headers, previewOnly: true };
}

export async function applyPlayerImport(report, mode = 'merge') {
  if (!report?.previewOnly || !['merge', 'replace'].includes(mode)) throw new Error('Gere uma prévia válida antes de importar o CSV.');
  if (report.errors.length) throw new Error('Corrija os erros do CSV antes de importar os registros válidos.');
  if (mode === 'replace') {
    const data = Object.fromEntries(STORE_NAMES.map((name) => [name, []]));
    data.playerItems = report.players;
    await replaceAll(data);
  } else {
    const current = await readAll('playerItems');
    const known = new Set(current.map((item) => item.instanceId));
    const additions = report.players.filter((item) => !known.has(item.instanceId));
    if (additions.length) await writeMany('playerItems', additions);
    return { ...report, applied: true, mode, skipped: report.players.length - additions.length };
  }
  return { ...report, applied: true, mode };
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = input.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('O CSV termina dentro de um campo entre aspas.');
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export { CSV_COLUMNS };
