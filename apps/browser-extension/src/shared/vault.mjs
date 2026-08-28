import { mergeConversation } from "./model.mjs";

const DB_NAME = "kin-conversation-vault";
const DB_VERSION = 1;
const STORE = "conversations";
const LEGACY_KEY = "kinConversations";
const MIGRATED_KEY = "kinVaultMigratedV1";

const api = globalThis.browser || globalThis.chrome;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
  });
}

export function openVault() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("source", "source");
      store.createIndex("updatedAt", "updatedAt");
      store.createIndex("ignored", "ignored");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function migrateLegacy() {
  const settings = await api.storage.local.get([LEGACY_KEY, MIGRATED_KEY]);
  if (settings[MIGRATED_KEY]) return { migrated: 0 };
  const legacy = Object.values(settings[LEGACY_KEY] || {});
  if (legacy.length) await putMany(legacy);
  await api.storage.local.set({ [MIGRATED_KEY]: true });
  // Keep the legacy object through V0.3 rollback compatibility. New writes use IndexedDB only.
  return { migrated: legacy.length };
}

export async function putMany(items) {
  if (!items.length) return [];
  const db = await openVault();
  const merged = [];
  for (const item of items.filter(Boolean)) {
    const readTx = db.transaction(STORE, "readonly");
    const previous = await requestResult(readTx.objectStore(STORE).get(item.id));
    await transactionDone(readTx);
    const next = mergeConversation(previous, item);
    const writeTx = db.transaction(STORE, "readwrite");
    writeTx.objectStore(STORE).put(next);
    await transactionDone(writeTx);
    merged.push(next);
  }
  db.close();
  return merged;
}

export async function getAll() {
  const db = await openVault();
  const tx = db.transaction(STORE, "readonly");
  const result = await requestResult(tx.objectStore(STORE).getAll());
  await transactionDone(tx);
  db.close();
  return result;
}

export async function listMetadata() {
  const records = await getAll();
  return records.map(({ messages, ...item }) => ({ ...item, messageCount: messages?.length || 0 }));
}

export async function setIgnored(id, ignored) {
  const db = await openVault();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const item = await requestResult(store.get(id));
  if (item) store.put({ ...item, ignored: Boolean(ignored), updatedAt: new Date().toISOString() });
  await transactionDone(tx);
  db.close();
  return item ? { ...item, ignored: Boolean(ignored) } : null;
}

export async function clearVault() {
  const db = await openVault();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await transactionDone(tx);
  db.close();
}
