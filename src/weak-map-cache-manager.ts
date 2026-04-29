import type { CacheData, AnyFn } from "./common";
import { LRU } from "./LRU";
import type { CacheManager } from "./cache-manager";

/**
 * Module-level WeakMap used by the default cache strategy.
 * Keyed by fnProxy — cache lives as long as the fnProxy reference is alive.
 */
export const cacheMap =
  typeof WeakMap !== "undefined"
    ? new WeakMap<AnyFn, Map<string, CacheData>>()
    : new Map<AnyFn, Map<string, CacheData>>();

/**
 * Read cache from the default (fnProxy-based) strategy.
 */
export function getCache({
  ttl,
  cacheCapacity,
  fn,
  key,
}: {
  ttl: number;
  cacheCapacity: number;
  fn: AnyFn;
  key: string;
}) {
  if (ttl !== -1) {
    const thisCache = cacheMap.get(fn);
    const cacheObj = thisCache?.get(key);
    if (cacheObj && Date.now() - cacheObj.timestamp < ttl) {
      return { value: cacheObj.data };
    }
  }
  if (cacheCapacity !== -1) {
    const thisCache = cacheMap.get(fn);
    const cacheObj = thisCache?.get(key);
    if (cacheObj) {
      return { value: cacheObj.data };
    }
  }
  return null;
}


/**
 * Default cache strategy using WeakMap keyed by fnProxy.
 * Cache lives as long as the fnProxy reference is alive.
 */
export class WeakMapCacheManager<T = any> implements CacheManager<T> {
  private fn: AnyFn;
  private ttl: number;
  private cacheCapacity: number;

  constructor(fn: AnyFn, ttl: number, cacheCapacity: number) {
    this.fn = fn;
    this.ttl = ttl;
    this.cacheCapacity = cacheCapacity;
    if (!cacheMap.has(fn)) {
      cacheMap.set(
        fn,
        cacheCapacity === -1
          ? new Map<string, CacheData>()
          : new LRU<string, CacheData>(cacheCapacity)
      );
    }
  }

  get(key: string): { value: T } | null {
    return getCache({
      ttl: this.ttl,
      fn: this.fn,
      key,
      cacheCapacity: this.cacheCapacity,
    }) as { value: T } | null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  set(key: string, data: T): void {
    const m = cacheMap.get(this.fn);
    if (m) {
      m.set(key, { data, timestamp: Date.now() });
    }
  }

  delete(key?: string): void {
    const m = cacheMap.get(this.fn);
    if (!m) return;
    if (key !== undefined) {
      m.delete(key);
    } else {
      m.clear();
    }
  }

  clearExpired(): void {
    if (this.ttl === -1) return;
    const m = cacheMap.get(this.fn);
    if (!m) return;
    const now = Date.now();
    m.forEach((v, k) => {
      if (now - v.timestamp > this.ttl) m.delete(k);
    });
  }
}
