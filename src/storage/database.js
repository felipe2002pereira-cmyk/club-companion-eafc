const DATABASE_NAME = 'club-companion';
const DATABASE_VERSION = 2;
const STORE_NAMES = ['playerItems', 'events', 'sbcPlans', 'gallerySets', 'priceSnapshots', 'priceTargets'];

let databasePromise;

export function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('Este navegador não oferece armazenamento local compatível.'));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('playerItems')) {
        const store = db.createObjectStore('playerItems', { keyPath: 'instanceId' });
        store.createIndex('itemId', 'itemId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('protected', 'protected', { unique: false });
      }
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('instanceId', 'instanceId', { unique: false });
        store.createIndex('occurredAt', 'occurredAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('sbcPlans')) db.createObjectStore('sbcPlans', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('gallerySets')) db.createObjectStore('gallerySets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('priceTargets')) db.createObjectStore('priceTargets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('priceSnapshots')) {
        const store = db.createObjectStore('priceSnapshots', { keyPath: 'id' });
        store.createIndex('instanceId', 'instanceId', { unique: false });
        store.createIndex('checkedAt', 'checkedAt', { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error || new Error('Não foi possível abrir o banco local.'));
    };
    request.onblocked = () => {
      databasePromise = undefined;
      reject(new Error('Feche outras abas do companion para atualizar o armazenamento local.'));
    };
  });
  return databasePromise;
}

export async function readAll(storeName) {
  assertStore(storeName);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Falha ao ler ${storeName}.`));
  });
}

export async function writeOne(storeName, value) {
  assertStore(storeName);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error(`Falha ao salvar em ${storeName}.`));
    transaction.onabort = () => reject(transaction.error || new Error(`A gravação em ${storeName} foi cancelada.`));
  });
}

export async function deleteOne(storeName, id) {
  assertStore(storeName);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Não foi possível remover o registro.'));
  });
}

export async function importObservedPlayers(players) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['playerItems', 'events'], 'readwrite');
    const store = transaction.objectStore('playerItems');
    const events = transaction.objectStore('events');
    let added = 0;
    for (const player of players) {
      const lookup = store.get(player.instanceId);
      lookup.onsuccess = () => {
        const existing = lookup.result;
        if (existing) {
          if (player.duplicate && !existing.duplicate && existing.status === 'club') {
            store.put({ ...existing, duplicate: true });
          }
          return;
        }
        store.add(player);
        events.add({
          id: crypto.randomUUID(),
          instanceId: player.instanceId,
          type: 'importado',
          details: 'Carta visível na Web App',
          occurredAt: new Date().toISOString(),
        });
        added += 1;
      };
    }
    transaction.oncomplete = () => resolve(added);
    transaction.onabort = () => reject(transaction.error || new Error('Não foi possível importar as cartas.'));
  });
}

export async function writeMany(storeName, values) {
  assertStore(storeName);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    for (const value of values) store.put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error(`Falha ao salvar em ${storeName}.`));
    transaction.onabort = () => reject(transaction.error || new Error(`A gravação em ${storeName} foi cancelada.`));
  });
}

export async function writePlayersWithEvents(players, events) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['playerItems', 'events'], 'readwrite');
    const playerStore = transaction.objectStore('playerItems');
    const eventStore = transaction.objectStore('events');
    for (const player of players) playerStore.put(player);
    for (const event of events) eventStore.put(event);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Não foi possível atualizar as cartas e o histórico.'));
    transaction.onabort = () => reject(transaction.error || new Error('A atualização das cartas e do histórico foi cancelada.'));
  });
}

export async function replaceAll(data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES, 'readwrite');
    for (const storeName of STORE_NAMES) {
      const store = transaction.objectStore(storeName);
      store.clear();
      for (const value of data[storeName] || []) store.put(value);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Não foi possível substituir o backup.'));
    transaction.onabort = () => reject(transaction.error || new Error('A substituição do backup foi cancelada.'));
  });
}

export async function clearStore(storeName) {
  assertStore(storeName);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error(`Falha ao limpar ${storeName}.`));
  });
}

function assertStore(storeName) {
  if (!STORE_NAMES.includes(storeName)) throw new Error(`Armazenamento desconhecido: ${storeName}`);
}
