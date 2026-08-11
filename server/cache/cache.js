const store = new Map();
const TTL_MS = 30 * 60 * 1000;

export function getCache(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() - item.time > TTL_MS) {
    store.delete(key);
    return null;
  }
  return item.value;
}

export function setCache(key, value) {
  store.set(key, { value, time: Date.now() });
}

export function getStats() {
  return { entries: store.size };
}
