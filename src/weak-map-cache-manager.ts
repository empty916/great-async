import type { CacheData, AnyFn } from "./common";
import { LRU } from "./LRU";
import type { CacheManager } from "./cache-manager";

/**
 * Default cache strategy using WeakMap keyed by fnProxy.
 * Cache lives as long as the fnProxy reference is alive.
 *
 * The underlying store and read helper are encapsulated as static members
 * (`WeakMapCacheManager.cacheMap` / `WeakMapCacheManager.peek`). External
 * code should go through these rather than reaching into a separately
 * exported module-level reference.
 */
export class WeakMapCacheManager<T = any> implements CacheManager<T> {
  /**
   * Module-level WeakMap shared across all instances. Keyed by fnProxy —
   * cache entries live as long as the fnProxy reference is alive.
   */
  static readonly cacheMap: WeakMap<AnyFn, Map<string, CacheData>>
    | Map<AnyFn, Map<string, CacheData>> =
    typeof WeakMap !== "undefined"
      ? new WeakMap<AnyFn, Map<string, CacheData>>()
      : new Map<AnyFn, Map<string, CacheData>>();

  /**
   * Read cached value for `fn` / `key` without going through an instance.
   * Honors the same ttl / cacheCapacity guards as the instance `.get(key)`.
   *
   * Used by `useAsync` to peek the cache before deciding whether to flip into
   * the loading state on SWR mode (avoids the loading flash).
   */
  static peek<U = any>(
    fn: AnyFn,
    key: string,
    opts: { ttl: number; cacheCapacity: number },
  ): { value: U } | null {
    if (opts.ttl !== -1) {
      const m = WeakMapCacheManager.cacheMap.get(fn);
      const entry = m?.get(key);
      if (entry && Date.now() - entry.timestamp < opts.ttl) {
        return { value: entry.data as U };
      }
    }
    if (opts.cacheCapacity !== -1) {
      const m = WeakMapCacheManager.cacheMap.get(fn);
      const entry = m?.get(key);
      if (entry) return { value: entry.data as U };
    }
    return null;
  }

  private fn: AnyFn;
  private ttl: number;
  private cacheCapacity: number;

  constructor(fn: AnyFn, ttl: number, cacheCapacity: number) {
    this.fn = fn;
    this.ttl = ttl;
    this.cacheCapacity = cacheCapacity;
    if (!WeakMapCacheManager.cacheMap.has(fn)) {
      WeakMapCacheManager.cacheMap.set(
        fn,
        cacheCapacity === -1
          ? new Map<string, CacheData>()
          : new LRU<string, CacheData>(cacheCapacity)
      );
    }
  }

  get(key: string): { value: T } | null {
    return WeakMapCacheManager.peek<T>(this.fn, key, {
      ttl: this.ttl,
      cacheCapacity: this.cacheCapacity,
    });
  }

  set(key: string, data: T): void {
    if (this.ttl === -1 && this.cacheCapacity === -1) return;
    const m = WeakMapCacheManager.cacheMap.get(this.fn);
    if (!m) return;
    if (m.get(key)?.data === data) return;
    m.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  delete(key: string): void {
    WeakMapCacheManager.cacheMap.get(this.fn)?.delete(key);
  }

  clear(): void {
    WeakMapCacheManager.cacheMap.get(this.fn)?.clear();
  }

  clearExpired(): void {
    if (this.ttl === -1) return;
    const m = WeakMapCacheManager.cacheMap.get(this.fn);
    if (!m) return;
    const now = Date.now();
    m.forEach((v, k) => {
      if (now - v.timestamp > this.ttl) m.delete(k);
    });
  }
}
