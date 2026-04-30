import { createAsync, IdCacheManager, WeakMapCacheManager } from '../src';
import { sleep } from '../src/utils';

const { cacheMap } = WeakMapCacheManager;

const uniqueId = (() => {
  let n = 0;
  return (label: string) => `${label}-${++n}-${Date.now()}`;
})();

afterEach(() => {
  IdCacheManager.clearAll();
  jest.restoreAllMocks();
});

describe('createAsync + id (v2.0 grouped options)', () => {
  test('two createAsync sharing the same id share cached results', async () => {
    const id = uniqueId('share');
    let calls = 0;
    const make = () =>
      createAsync(
        async (n: number) => {
          calls++;
          await sleep(10);
          return n * 2;
        },
        { id, cache: { ttl: 1000 } },
      );

    const fnA = make();
    const fnB = make();

    expect(await fnA(3)).toBe(6);
    expect(calls).toBe(1);

    expect(await fnB(3)).toBe(6);
    expect(calls).toBe(1);
  });

  test('clearCache on one fnProxy clears the shared store for that id', async () => {
    const id = uniqueId('share-clear');
    let calls = 0;
    const fnA = createAsync(
      async (n: number) => { calls++; await sleep(5); return n; },
      { id, cache: { ttl: 1000 } },
    );
    const fnB = createAsync(
      async (n: number) => { calls++; await sleep(5); return n; },
      { id, cache: { ttl: 1000 } },
    );

    await fnA(1);
    expect(calls).toBe(1);
    await fnB(1);
    expect(calls).toBe(1);

    fnA.clearCache();

    await fnB(1);
    expect(calls).toBe(2);
  });

  test('id without ttl/capacity does not cache (matches WeakMap default)', async () => {
    const id = uniqueId('no-cache');
    let calls = 0;
    const fn = createAsync(
      async () => { calls++; return 'x'; },
      { id },
    );

    await fn();
    await fn();
    await fn();
    expect(calls).toBe(3);
  });

  test('id + cache.capacity drives LRU eviction in the shared store', async () => {
    const id = uniqueId('lru-store');
    let calls = 0;
    const fn = createAsync(
      async (n: number) => { calls++; await sleep(5); return n; },
      { id, cache: { capacity: 2 } },
    );

    await fn(1);
    await fn(2);
    expect(calls).toBe(2);

    await fn(1);
    await fn(3);
    expect(calls).toBe(3);

    await fn(1);
    await fn(3);
    expect(calls).toBe(3);

    await fn(2);
    expect(calls).toBe(4);
  });

  test('cross-createAsync ttl mismatch warns once and uses first registration', async () => {
    const id = uniqueId('ttl-warn');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const fnA = createAsync(async () => 'a', { id, cache: { ttl: 1000 } });
    const fnB = createAsync(async () => 'b', { id, cache: { ttl: 5000 } });

    await fnA();
    await fnB();

    const mismatchWarnings = warn.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('first registered with'),
    );
    expect(mismatchWarnings.length).toBe(1);
    void fnA;
    void fnB;
  });

  test('cacheManager + id together: id is ignored, dev warning emitted', async () => {
    const id = uniqueId('cm+id');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const customStore = new Map<string, { timestamp: number; data: any }>();
    const customManager = {
      get(key: string) {
        const e = customStore.get(key);
        return e ? { value: e.data } : null;
      },
      set(key: string, data: any) {
        customStore.set(key, { data, timestamp: Date.now() });
      },
      delete(key: string) {
        customStore.delete(key);
      },
      clear() {
        customStore.clear();
      },
    };

    let calls = 0;
    const fn = createAsync(
      async () => { calls++; return 'hello'; },
      { id, cache: { ttl: 1000, manager: customManager } },
    );

    await fn();
    await fn();
    expect(calls).toBe(1);
    expect(customStore.size).toBe(1);

    const idMgr = IdCacheManager.forId(id, 1000);
    expect(idMgr.get('[]')).toBeNull();

    const coPresenceWarnings = warn.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('Both `cache.manager` and `id`'),
    );
    expect(coPresenceWarnings.length).toBe(1);
  });
});

describe('WeakMapCacheManager.set — default-off guard (problem 1)', () => {
  test('default config writes nothing into cacheMap', async () => {
    let calls = 0;
    const fn = createAsync(async () => {
      calls++;
      return { v: calls };
    });

    for (let i = 0; i < 50; i++) await fn();
    expect(calls).toBe(50);

    const stored = cacheMap.get(fn);
    expect(stored).toBeDefined();
    expect(stored?.size).toBe(0);
  });

  test('cache.capacity > 0 still caches (no ttl)', async () => {
    let calls = 0;
    const fn = createAsync(
      async (n: number) => { calls++; return n; },
      { cache: { capacity: 5 } },
    );

    await fn(1);
    await fn(1);
    expect(calls).toBe(1);

    const stored = cacheMap.get(fn);
    expect(stored?.size).toBe(1);
  });
});
