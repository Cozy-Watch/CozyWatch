import { indexedDB as fakeDB } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
Object.assign(globalThis, { indexedDB: fakeDB });
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const open = () => new Promise<IDBDatabase>(resolve => { const request = indexedDB.open('cozy-watch-vault', 1); request.onsuccess = () => resolve(request.result); });
async function raw(key: string): Promise<unknown> { const db = await open(); return new Promise(resolve => { db.transaction('vault').objectStore('vault').get(key).onsuccess = event => resolve((event.target as IDBRequest).result); }); }
async function corrupt(key: string, value: unknown, remove = false) {
  const db = await open(); await new Promise<void>(resolve => { const tx = db.transaction('vault', 'readwrite'); const store = tx.objectStore('vault'); if (remove) store.delete(key); else store.put(value, key); tx.oncomplete = () => resolve(); });
}
it('stores non-exportable keys and ciphertext, survives module restart, authenticates records, and never silently replaces a lost key', async () => {
  const { writeSecret, readSecret, removeSecret } = await import('./vault');
  await writeSecret('github', { token: 'synthetic-access-secret', refreshToken: 'synthetic-refresh-secret' });
  const key = await raw('key') as CryptoKey;
  expect(key.extractable).toBe(false);
  await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  const envelope = await raw('github') as { iv: Uint8Array; ciphertext: ArrayBuffer };
  expect(new TextDecoder().decode(envelope.ciphertext)).not.toContain('synthetic');
  jest.resetModules();
  const restarted = await import('./vault');
  expect(await restarted.readSecret('github')).toEqual({ token: 'synthetic-access-secret', refreshToken: 'synthetic-refresh-secret' });
  await restarted.writeSecret('github', { token: 'replacement' });
  const second = await raw('github') as typeof envelope;
  expect(second.iv).not.toEqual(envelope.iv);
  await corrupt('license', second); // Ciphertext is bound to its record name.
  await expect(readSecret('license')).rejects.toThrow('could not be unlocked');
  await removeSecret('license');
  await corrupt('github', { ...second, ciphertext: new Uint8Array([1,2,3]).buffer });
  await expect(readSecret('github')).rejects.toThrow('could not be unlocked');
  await corrupt('key', undefined, true);
  await expect(readSecret('github')).rejects.toThrow('key is missing');
  await expect(writeSecret('github', { token: 'must-not-replace' })).rejects.toThrow('not reset');
  await removeSecret('github');
  expect(await readSecret('github')).toBeUndefined();
  await writeSecret('github', { token: 'fresh-credential' });
  await restarted.resetVault();
  expect(await raw('key')).toBeUndefined();
  expect(await readSecret('github')).toBeUndefined();
  await writeSecret('github', { token: 'recovered' });
  expect(await readSecret('github')).toEqual({ token: 'recovered' });
});
