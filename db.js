// IndexedDB tipis: kv (state, playlist, handle folder), tracks (cache metadata), art (cover kecil + warna)
let dbp;
function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('putar', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('kv');
      d.createObjectStore('tracks', { keyPath: 'id' });
      d.createObjectStore('art');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}

async function tx(name, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(name, mode);
    const out = fn(t.objectStore(name));
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export const kv = {
  get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
  del: (k) => tx('kv', 'readwrite', (s) => s.delete(k)),
};

export const tracks = {
  all: () => tx('tracks', 'readonly', (s) => s.getAll()),
  putMany: (list) => tx('tracks', 'readwrite', (s) => list.forEach((t) => s.put(t))),
  replace: (list) => tx('tracks', 'readwrite', (s) => { s.clear(); list.forEach((t) => s.put(t)); }),
};

export const art = {
  get: (k) => tx('art', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('art', 'readwrite', (s) => s.put(v, k)),
  keys: () => tx('art', 'readonly', (s) => s.getAllKeys()),
  del: (k) => tx('art', 'readwrite', (s) => s.delete(k)),
};
