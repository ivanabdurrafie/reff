// IndexedDB store for downloaded packs (lyrics + pre-built search index).
const DB_NAME = 'reff';
const STORE = 'packs';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqP(request) {
  return new Promise((res, rej) => {
    request.onsuccess = () => res(request.result);
    request.onerror = () => rej(request.error);
  });
}

function done(t) {
  return new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('transaction aborted'));
  });
}

export async function putPack(record) {
  const db = await open();
  const t = db.transaction(STORE, 'readwrite');
  t.objectStore(STORE).put(record);
  return done(t);
}

export async function getPack(id) {
  const db = await open();
  const t = db.transaction(STORE, 'readonly');
  return reqP(t.objectStore(STORE).get(id));
}

export async function getAllPacks() {
  const db = await open();
  const t = db.transaction(STORE, 'readonly');
  return reqP(t.objectStore(STORE).getAll());
}

export async function deletePack(id) {
  const db = await open();
  const t = db.transaction(STORE, 'readwrite');
  t.objectStore(STORE).delete(id);
  return done(t);
}
