export interface CacheManager<T = any> {
  get(key: string): { value: T } | null;
  set(key: string, data: T): void;
  delete(key?: string): void;
  clearExpired(): void;
  has(key: string): boolean;
}
