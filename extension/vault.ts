import { UserFacingError } from './network';
// The key is non-exportable, not hardware backed. Same-origin code can still use it.
const DATABASE = 'cozy-watch-vault';
let opened: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!opened) opened = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('vault');
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); opened = undefined; };
      resolve(request.result);
    };
    request.onerror = () => reject(new UserFacingError('Secure storage unavailable. Reconnect when storage is available.'));
  }).catch(error => { opened = undefined; throw error; });
  return opened;
}
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault', mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
    let value: T;
    tx.oncomplete = () => resolve(value);
    tx.onabort = tx.onerror = () => reject(new UserFacingError('Secure storage unavailable. Your credentials were not reset.'));
    work(tx.objectStore('vault'), result => { value = result; });
  });
}
interface Envelope { iv: Uint8Array; ciphertext: ArrayBuffer }
export async function readSecret<T>(name: string): Promise<T | undefined> {
  const pair = await transaction<{ key?: CryptoKey; record?: Envelope }>('readonly', (store, done) => {
    const key = store.get('key'); const record = store.get(name);
    record.onsuccess = () => done({ key: key.result, record: record.result });
  });
  if (!pair.record) return undefined;
  if (!pair.key) throw new UserFacingError('Secure storage key is missing. Reconnect GitHub; saved credentials cannot be recovered.');
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: pair.record.iv as Uint8Array<ArrayBuffer>, additionalData: new TextEncoder().encode(`cozy-watch:v1:${name}`) }, pair.key, pair.record.ciphertext);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch { throw new UserFacingError('Secure storage could not be unlocked. Your saved credentials were not reset.'); }
}
export async function writeSecret(name: string, value: unknown): Promise<void> {
  const known = await transaction<CryptoKey | undefined>('readonly', (store, done) => { const request = store.get('key'); request.onsuccess = () => done(request.result); });
  const generated = known ?? await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  // First-writer wins even if two operations initialize the vault concurrently.
  const key = await transaction<CryptoKey>('readwrite', (store, done) => {
    const existing = store.get('key');
    existing.onsuccess = () => {
      if (existing.result) { done(existing.result); return; }
      const cursor = store.count();
      cursor.onsuccess = () => {
        if (cursor.result) { store.transaction.abort(); return; } // Never replace a lost key over ciphertext.
        store.put(generated, 'key'); done(generated);
      };
    };
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`cozy-watch:v1:${name}`) }, key, new TextEncoder().encode(JSON.stringify(value)));
  await transaction<void>('readwrite', (store, done) => { store.put({ iv, ciphertext }, name); done(); });
}
export async function removeSecret(name: string): Promise<void> {
  await transaction<void>('readwrite', (store, done) => { store.delete(name); done(); });
}

// Explicit user recovery only. Cache cleanup and updates must never call this.
export async function resetVault(): Promise<void> {
  await transaction<void>('readwrite', (store, done) => { store.clear(); done(); });
}
