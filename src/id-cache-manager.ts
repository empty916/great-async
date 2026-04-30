import { isDev } from "./common";
import type { CacheData } from "./common";
import type { CacheManager } from "./cache-manager";
import { LRU } from "./LRU";

/**
 * Cache strategy using a module-level store keyed by a stable string `id`.
 * Survives component mount/unmount because the store lives outside React's tree.
 *
 * Use {@link IdCacheManager.forId} to obtain an instance — direct construction
 * is intentionally disabled. Same id always resolves to the same instance, so
 * sharing across components is structurally consistent (one set of ttl /
 * capacity / data per id, no drift between callers).
 *
 * Caching is OFF by default (consistent with WeakMapCacheManager): you must
 * set `ttl` or `cacheCapacity` to actually retain entries.
 */
export class IdCacheManager<T = any> implements CacheManager<T> {
  private static instances = new Map<string, IdCacheManager<any>>();

  private ttl: number;
  private cacheCapacity: number;
  private data: Map<string, CacheData> | LRU<string, CacheData>;

  private constructor(ttl: number, cacheCapacity: number) {
    this.ttl = ttl;
    this.cacheCapacity = cacheCapacity;
    this.data = cacheCapacity === -1
      ? new Map<string, CacheData>()
      : new LRU<string, CacheData>(cacheCapacity);
  }

  /**
   * Get the manager for `id`, creating it on first call.
   *
   * Subsequent calls with the same `id` return the **same instance** —
   * so two unrelated callers using the same id automatically share state.
   * If the second call passes a different `ttl` / `cacheCapacity`, the first
   * registration wins and we emit a dev warning.
   */
  static forId<T = any>(
    id: string,
    ttl: number,
    cacheCapacity: number = -1,
  ): IdCacheManager<T> {
    const existing = IdCacheManager.instances.get(id);
    if (existing) {
      if (isDev
        && (existing.ttl !== ttl || existing.cacheCapacity !== cacheCapacity)) {
        console.warn(
          `[great-async] Cache id "${id}" was first registered with ` +
          `{ttl: ${existing.ttl}, cacheCapacity: ${existing.cacheCapacity}}, ` +
          `but is now being requested with {ttl: ${ttl}, cacheCapacity: ${cacheCapacity}}. ` +
          `The first registration's settings will be used.`
        );
      }
      return existing as IdCacheManager<T>;
    }
    const m = new IdCacheManager<T>(ttl, cacheCapacity);
    IdCacheManager.instances.set(id, m);
    return m;
  }

  private get cachingDisabled(): boolean {
    return this.ttl === -1 && this.cacheCapacity === -1;
  }

  get(key: string): { value: T } | null {
    if (this.cachingDisabled) return null;
    const entry = this.data.get(key);
    if (!entry) return null;
    if (this.ttl !== -1 && Date.now() - entry.timestamp > this.ttl) {
      this.data.delete(key);
      return null;
    }
    return { value: entry.data as T };
  }

  set(key: string, data: T): void {
    if (this.cachingDisabled) return;
    if (this.data.get(key)?.data === data) return;
    this.data.set(key, { data, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  clearExpired(): void {
    if (this.ttl === -1) return;
    const now = Date.now();
    this.data.forEach((v, k) => {
      if (now - v.timestamp > this.ttl) this.data.delete(k);
    });
  }

  /**
   * Drop all cached entries for a specific id.
   *
   * The manager instance and its config are kept — re-populating the cache
   * afterwards reuses the same ttl / capacity as before.
   */
  static clear(id: string): void {
    IdCacheManager.instances.get(id)?.data.clear();
  }

  /**
   * Drop all cached entries across every id. Useful in SPAs for
   * tenant-switch / sign-out flows.
   *
   * Manager instances and their configs are kept — re-populating any id
   * afterwards reuses the same ttl / capacity as before.
   */
  static clearAll(): void {
    IdCacheManager.instances.forEach(inst => inst.data.clear());
  }
}
