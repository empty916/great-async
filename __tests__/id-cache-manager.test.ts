import { IdCacheManager } from '../src/id-cache-manager';
import { sleep } from '../src/utils';

// Each test gets its own id namespace to keep state isolated within the
// module-level registry. clearAll resets data but keeps configs — that's
// intentional, so we just use a fresh id per test.
const uniqueId = (() => {
  let n = 0;
  return (label: string) => `${label}-${++n}-${Date.now()}`;
})();

afterEach(() => {
  IdCacheManager.clearAll();
  jest.restoreAllMocks();
});

describe('IdCacheManager.forId — factory', () => {
  test('same id returns the same instance', () => {
    const id = uniqueId('factory-same');
    const a = IdCacheManager.forId(id, 1000);
    const b = IdCacheManager.forId(id, 1000);
    expect(a).toBe(b);
  });

  test('different ids return different instances', () => {
    const a = IdCacheManager.forId(uniqueId('factory-diff-a'), 1000);
    const b = IdCacheManager.forId(uniqueId('factory-diff-b'), 1000);
    expect(a).not.toBe(b);
  });

  test('first registration wins on config mismatch + dev warning', () => {
    const id = uniqueId('factory-mismatch');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const a = IdCacheManager.forId(id, 1000, -1);
    const b = IdCacheManager.forId(id, 5000, 10); // different ttl + capacity

    expect(a).toBe(b);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/first registered with/);
    expect(warn.mock.calls[0][0]).toMatch(/ttl: 1000/);
  });

  test('matching config does not warn', () => {
    const id = uniqueId('factory-match');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    IdCacheManager.forId(id, 1000, 5);
    IdCacheManager.forId(id, 1000, 5);
    IdCacheManager.forId(id, 1000, 5);

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('IdCacheManager — caching semantics', () => {
  test('default config (no ttl, no cacheCapacity) does NOT cache', () => {
    const id = uniqueId('default-off');
    const m = IdCacheManager.forId<number>(id, -1, -1);

    m.set('k', 42);
    expect(m.get('k')).toBeNull();
  });

  test('ttl-only cache returns until expiry, then drops the entry', async () => {
    const id = uniqueId('ttl-only');
    const m = IdCacheManager.forId<number>(id, 50);

    m.set('k', 1);
    expect(m.get('k')).toEqual({ value: 1 });

    await sleep(80);
    expect(m.get('k')).toBeNull();
  });

  test('cacheCapacity-only cache uses LRU and never expires by time', async () => {
    const id = uniqueId('cap-only');
    const m = IdCacheManager.forId<number>(id, -1, 2);

    m.set('a', 1);
    m.set('b', 2);
    expect(m.get('a')).toEqual({ value: 1 });
    expect(m.get('b')).toEqual({ value: 2 });

    // ttl is off, so even waiting doesn't matter
    await sleep(20);
    expect(m.get('a')).toEqual({ value: 1 });
  });

  test('LRU eviction on cacheCapacity overflow', () => {
    const id = uniqueId('lru');
    const m = IdCacheManager.forId<number>(id, -1, 2);

    m.set('a', 1);
    m.set('b', 2);
    // Touch 'a' to refresh recency, then add 'c' — 'b' should be evicted
    m.get('a');
    m.set('c', 3);

    expect(m.get('a')).toEqual({ value: 1 });
    expect(m.get('b')).toBeNull();
    expect(m.get('c')).toEqual({ value: 3 });
  });

  test('set with same value does not refresh timestamp (dedupe)', async () => {
    const id = uniqueId('dedupe');
    const m = IdCacheManager.forId<{ x: number }>(id, 100);

    const obj = { x: 1 };
    m.set('k', obj);
    await sleep(60);
    m.set('k', obj); // same reference — should be a no-op
    await sleep(60); // total elapsed > ttl

    expect(m.get('k')).toBeNull();
  });

  test('clearExpired removes only past-ttl entries', async () => {
    const id = uniqueId('clearExpired');
    const m = IdCacheManager.forId<number>(id, 50);

    m.set('old', 1);
    await sleep(80);
    m.set('fresh', 2);

    m.clearExpired();
    expect(m.get('old')).toBeNull();
    expect(m.get('fresh')).toEqual({ value: 2 });
  });

  test('delete(key) removes a single entry; clear() drops all', () => {
    const id = uniqueId('delete');
    const m = IdCacheManager.forId<number>(id, 1000);

    m.set('a', 1);
    m.set('b', 2);
    m.delete('a');
    expect(m.get('a')).toBeNull();
    expect(m.get('b')).toEqual({ value: 2 });

    m.clear();
    expect(m.get('b')).toBeNull();
  });
});

describe('IdCacheManager.clear / clearAll — bulk reset', () => {
  test('clear(id) wipes data but preserves the instance', () => {
    const id = uniqueId('clearAll-one');
    const m = IdCacheManager.forId<number>(id, 1000);
    m.set('k', 7);

    IdCacheManager.clear(id);
    expect(m.get('k')).toBeNull();

    // Same instance is reused — config (ttl) is preserved
    const same = IdCacheManager.forId<number>(id, 1000);
    expect(same).toBe(m);
    same.set('k', 8);
    expect(same.get('k')).toEqual({ value: 8 });
  });

  test('clearAll() wipes every id but does not touch config', () => {
    const idA = uniqueId('clearAll-all-a');
    const idB = uniqueId('clearAll-all-b');
    const a = IdCacheManager.forId<number>(idA, 1000);
    const b = IdCacheManager.forId<number>(idB, 1000);
    a.set('x', 1);
    b.set('y', 2);

    IdCacheManager.clearAll();

    expect(a.get('x')).toBeNull();
    expect(b.get('y')).toBeNull();
    // Config preserved: re-registering with same config doesn't warn
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    IdCacheManager.forId(idA, 1000);
    expect(warn).not.toHaveBeenCalled();
  });
});
