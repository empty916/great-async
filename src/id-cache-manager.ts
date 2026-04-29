import type { CacheData } from "./common";
import type { CacheManager } from "./cache-manager";

/**
 * Cache strategy using a module-level Map indexed by a stable string id.
 * Survives component mount/unmount because it lives outside React's tree.
 */
export class IdCacheManager<T = any> implements CacheManager<T> {
  private static store = new Map<string, Map<string, CacheData>>();
  private id: string;
  private ttl: number;

  constructor(id: string, ttl: number) {
    this.id = id;
    this.ttl = ttl;
  }

  private getMap(): Map<string, CacheData> {
    let m = IdCacheManager.store.get(this.id);
    if (!m) {
      m = new Map<string, CacheData>();
      IdCacheManager.store.set(this.id, m);
    }
    return m;
  }

  get(key: string): { value: T } | null {
    const m = IdCacheManager.store.get(this.id);
    if (!m) return null;
    const entry = m.get(key);
    if (!entry) return null;
    if (this.ttl !== -1 && Date.now() - entry.timestamp > this.ttl) {
      m.delete(key);
      return null;
    }
    return { value: entry.data as T };
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  set(key: string, data: T): void {
    this.getMap().set(key, { data, timestamp: Date.now() });
  }

  delete(key?: string): void {
    const m = IdCacheManager.store.get(this.id);
    if (!m) return;
    if (key !== undefined) {
      m.delete(key);
    } else {
      m.clear();
    }
  }

  clearExpired(): void {
    if (this.ttl === -1) return;
    const m = IdCacheManager.store.get(this.id);
    if (!m) return;
    const now = Date.now();
    m.forEach((v, k) => {
      if (now - v.timestamp > this.ttl) m.delete(k);
    });
  }
}
