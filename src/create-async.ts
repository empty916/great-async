import type { CacheData, PickPromiseType, PromiseFunction, T_SCOPE, AsyncError, T_DIMENSIONS } from "./common";
import { cacheMap, defaultGenKeyByParams, SCOPE, DIMENSIONS, FalsyValue, getCache } from "./common";
import { LRU } from "./LRU";
import { createTakeLatestPromiseFn } from "./take-latest-promise";

export { SCOPE, DIMENSIONS, cacheMap, CacheData };

type Timer = ReturnType<typeof setTimeout>;

function createClearExpiredCache(fn: PromiseFunction, ttl: number) {
  let timer: Timer | null = null;
  return function clearExpiredCache() {
    if (timer) {
      clearTimeout(timer);
    }
    // put operation into micro event loop, so it will not impact the main process
    timer = setTimeout(() => {
      const fnCache = cacheMap.get(fn);
      if (!fnCache) {
        return;
      }
      const now = Date.now();
      fnCache.forEach((value, key) => {
        if (now - value.timestamp > ttl) {
          fnCache.delete(key);
        }
      });
    });
  };
}

function clearCache(fn: PromiseFunction, key?: string) {
  const fnCache = cacheMap.get(fn);
  if (!fnCache) {
    return;
  }
  if (key) {
    fnCache.delete(key);
  } else {
    fnCache.clear();
  }
}

// Cache configuration group
export interface CacheConfig<F extends PromiseFunction = PromiseFunction> {
  /**
   * Time to live of cache in milliseconds
   * @default -1 (no expiration)
   */
  ttl?: number;
  /**
   * Cache capacity, cache removal strategy using LRU algorithm
   * @default -1 (no size limit)
   */
  capacity?: number;
  /**
   * Strategy to generate cache key from function parameters
   */
  keyGenerator?: (params: Parameters<F>) => string;
  /**
   * Enable stale-while-revalidate pattern
   * When true, if cache exists, return cached data immediately and update cache in background
   * @default false
   */
  swr?: boolean;
}

// Debounce configuration group
export interface DebounceConfig {
  /**
   * Debounce time in milliseconds
   * @default -1 (no debounce)
   */
  time?: number;
  /**
   * Debounce scope
   * - FUNCTION: Debounce ignores parameters
   * - PARAMETERS: Debounce per unique parameters
   * @default SCOPE.FUNCTION
   */
  scope?: T_SCOPE;
  /**
   * Enable take-latest behavior for promises
   * When multiple calls are made with the same key, all calls will resolve with the result of the latest call
   * @default false
   */
  takeLatest?: boolean;
}

// Single mode configuration group
export interface SingleConfig {
  /**
   * Enable single mode - only one call can be active at a time
   * @default false
   */
  enabled?: boolean;
  /**
   * Single mode scope
   * - FUNCTION: Single mode ignores parameters
   * - PARAMETERS: Single mode per unique parameters
   * @default SCOPE.FUNCTION
   */
  scope?: T_SCOPE;
}

// Lifecycle hooks group
export interface HooksConfig<F extends PromiseFunction = PromiseFunction> {
  /**
   * Callback executed before function runs
   */
  beforeRun?: () => any;
  /**
   * Callback when background update starts (SWR mode)
   * @param cachedData The cached data being returned immediately
   */
  onBackgroundUpdateStart?: (cachedData: PickPromiseType<F>) => void;
  /**
   * Callback when background update completes (SWR mode)
   * @param data The updated data (undefined if error occurred)
   * @param error The error if update failed (undefined if successful)
   */
  onBackgroundUpdate?: (data: PickPromiseType<F> | undefined, error: AsyncError | undefined) => void;
}

/**
 * Legacy flat options structure (v1.x compatibility)
 * @deprecated Use the new grouped structure instead. Will be removed in v3.0.0
 */
export interface LegacyCreateAsyncOptions<F extends PromiseFunction> {
  /**
   * @deprecated Use cache.ttl instead
   */
  ttl?: number;
  /**
   * @deprecated Use cache.capacity instead
   */
  cacheCapacity?: number;
  /**
   * @deprecated Use cache.keyGenerator instead
   */
  genKeyByParams?: (params: Parameters<F>) => string;
  /**
   * @deprecated Use cache.swr instead
   */
  swr?: boolean;
  /**
   * @deprecated Use debounce.time instead
   */
  debounceTime?: number;
  /**
   * @deprecated Use debounce.scope instead
   */
  debounceDimension?: T_SCOPE;
  /**
   * @deprecated Use debounce.takeLatest instead
   */
  takeLatest?: boolean;
  /**
   * @deprecated Use single.enabled instead
   */
  single?: boolean;
  /**
   * @deprecated Use single.scope instead
   */
  singleDimension?: T_SCOPE;
  /**
   * @deprecated Use retry function instead
   */
  retryCount?: number;
  /**
   * @deprecated Use retry function instead
   */
  retryStrategy?: (error: AsyncError, currentRetryCount: number) => boolean;
  /**
   * @deprecated Use hooks.beforeRun instead
   */
  beforeRun?: () => void;
  /**
   * @deprecated Use hooks.onBackgroundUpdateStart instead
   */
  onBackgroundUpdateStart?: (cachedData: PickPromiseType<F>) => void;
  /**
   * @deprecated Use hooks.onBackgroundUpdate instead
   */
  onBackgroundUpdate?: (data: PickPromiseType<F> | undefined, error: AsyncError | undefined) => void;
}

// Main options interface with grouped parameters
export interface CreateAsyncOptions<
  F extends PromiseFunction = PromiseFunction
> {
  /**
   * Cache configuration
   */
  cache?: CacheConfig<F>;
  /**
   * Debounce configuration
   */
  debounce?: DebounceConfig;
  /**
   * Single mode configuration
   */
  single?: SingleConfig;
  /**
   * Retry strategy function
   * @param error - the error that occurred
   * @param currentRetryCount - current retry attempt number (1-based)
   * @returns true to retry, false to stop
   */
  retry?: (error: AsyncError, currentRetryCount: number) => boolean;
  /**
   * Lifecycle hooks
   */
  hooks?: HooksConfig<F>;
}

export interface ClearCache<F extends PromiseFunction> {
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (...params: Parameters<F>): void;
  (): void;
}

export type ReturnTypeOfCreateAsync<F extends PromiseFunction> = {
  (...arg: Parameters<F>): ReturnType<F>;
  clearCache: ClearCache<F>;
};

export const DEFAULT_TIMER_KEY = Symbol('DEFAULT_TIMER_KEY');
export const DEFAULT_SINGLE_KEY = Symbol('DEFAULT_SINGLE_KEY');
export const DEFAULT_PROMISE_DEBOUNCE_KEY = Symbol('DEFAULT_PROMISE_DEBOUNCE_KEY');

/**
 * Converts legacy flat options to modern grouped options
 */
function normalizeLegacyOptions<F extends PromiseFunction>(
  options: CreateAsyncOptions<F> | LegacyCreateAsyncOptions<F>
): CreateAsyncOptions<F> {
  // If it's already in the new format, return as-is
  if ('cache' in options || 'debounce' in options || 'single' in options || 'hooks' in options || 'retry' in options) {
    return options as CreateAsyncOptions<F>;
  }

  // Convert legacy flat options to grouped options
  const legacyOptions = options as LegacyCreateAsyncOptions<F>;
  const normalizedOptions: CreateAsyncOptions<F> = {};

  // Convert cache options
  if (legacyOptions.ttl !== undefined ||
      legacyOptions.cacheCapacity !== undefined ||
      legacyOptions.genKeyByParams !== undefined ||
      legacyOptions.swr !== undefined) {
    normalizedOptions.cache = {};
    if (legacyOptions.ttl !== undefined) normalizedOptions.cache.ttl = legacyOptions.ttl;
    if (legacyOptions.cacheCapacity !== undefined) normalizedOptions.cache.capacity = legacyOptions.cacheCapacity;
    if (legacyOptions.genKeyByParams !== undefined) normalizedOptions.cache.keyGenerator = legacyOptions.genKeyByParams;
    if (legacyOptions.swr !== undefined) normalizedOptions.cache.swr = legacyOptions.swr;
  }

  // Convert debounce options
  if (legacyOptions.debounceTime !== undefined ||
      legacyOptions.debounceDimension !== undefined ||
      legacyOptions.takeLatest !== undefined) {
    normalizedOptions.debounce = {};
    if (legacyOptions.debounceTime !== undefined) normalizedOptions.debounce.time = legacyOptions.debounceTime;
    if (legacyOptions.debounceDimension !== undefined) normalizedOptions.debounce.scope = legacyOptions.debounceDimension;
    if (legacyOptions.takeLatest !== undefined) normalizedOptions.debounce.takeLatest = legacyOptions.takeLatest;
  }

  // Convert single options
  if (legacyOptions.single !== undefined || legacyOptions.singleDimension !== undefined) {
    normalizedOptions.single = {};
    if (legacyOptions.single !== undefined) normalizedOptions.single.enabled = legacyOptions.single;
    if (legacyOptions.singleDimension !== undefined) normalizedOptions.single.scope = legacyOptions.singleDimension;
  }

  // Convert retry options
  if (legacyOptions.retryStrategy !== undefined || legacyOptions.retryCount !== undefined) {
    if (legacyOptions.retryStrategy !== undefined) {
      // If both retryStrategy and retryCount are provided, combine them
      if (legacyOptions.retryCount !== undefined) {
        normalizedOptions.retry = (error: AsyncError, currentRetryCount: number) => {
          return legacyOptions.retryStrategy!(error, currentRetryCount) && currentRetryCount <= legacyOptions.retryCount!;
        };
      } else {
        normalizedOptions.retry = legacyOptions.retryStrategy;
      }
    } else if (legacyOptions.retryCount !== undefined) {
      // Only retryCount provided, create a simple retry function
      normalizedOptions.retry = (error: AsyncError, currentRetryCount: number) => {
        return currentRetryCount <= legacyOptions.retryCount!;
      };
    }
  }

  // Convert hooks options
  if (legacyOptions.beforeRun !== undefined ||
      legacyOptions.onBackgroundUpdateStart !== undefined ||
      legacyOptions.onBackgroundUpdate !== undefined) {
    normalizedOptions.hooks = {};
    if (legacyOptions.beforeRun !== undefined) normalizedOptions.hooks.beforeRun = legacyOptions.beforeRun;
    if (legacyOptions.onBackgroundUpdateStart !== undefined) normalizedOptions.hooks.onBackgroundUpdateStart = legacyOptions.onBackgroundUpdateStart;
    if (legacyOptions.onBackgroundUpdate !== undefined) normalizedOptions.hooks.onBackgroundUpdate = legacyOptions.onBackgroundUpdate;
  }

  return normalizedOptions;
}

// Function overloads for type safety and backward compatibility

/**
 * Creates an enhanced async function with modern grouped options (v2.0+)
 */
export function createAsync<F extends PromiseFunction>(
  fn: F,
  options?: CreateAsyncOptions<F>
): ReturnTypeOfCreateAsync<F>;

/**
 * Creates an enhanced async function with legacy flat options (v1.x compatibility)
 * @deprecated Use the grouped options structure instead
 */
export function createAsync<F extends PromiseFunction>(
  fn: F,
  options: LegacyCreateAsyncOptions<F>
): ReturnTypeOfCreateAsync<F>;

/**
 * Create async controller with enhanced features like caching, debouncing, SWR, etc.
 * This is the main implementation function.
 *
 * @param fn A function and it's return type must be Promise
 * @param options createAsync options (supports both v1.x flat and v2.0 grouped structures)
 * @returns Enhanced function with additional methods
 *
 * @example Modern grouped structure (v2.0+):
 * ```typescript
 * const enhancedFetch = createAsync(fetchUser, {
 *   cache: {
 *     ttl: 60000, // Cache for 1 minute
 *     swr: true,  // Enable stale-while-revalidate
 *   },
 *   debounce: {
 *     time: 300,  // Debounce for 300ms
 *   },
 *   retry: (error, count) => count <= 3 && error.status >= 500
 * });
 * ```
 *
 * @example Legacy flat structure (v1.x compatibility):
 * ```typescript
 * const legacyAPI = createAsync(fetchData, {
 *   ttl: 60000,
 *   swr: true,
 *   debounceTime: 300,
 * });
 * ```
 */
export function createAsync<F extends PromiseFunction>(
  fn: F,
  options: CreateAsyncOptions<F> | LegacyCreateAsyncOptions<F> = {}
): ReturnTypeOfCreateAsync<F> {
  // Convert legacy flat options to modern grouped options
  const normalizedOptions = normalizeLegacyOptions(options);

  // Extract and set defaults for grouped options
  const {
    cache = {},
    debounce = {},
    single = {},
    retry,
    hooks = {}
  } = normalizedOptions;

  // Cache configuration with defaults
  const {
    ttl = -1,
    capacity: cacheCapacity = -1,
    keyGenerator: genKeyByParams = defaultGenKeyByParams,
    swr = false
  } = cache;

  // Debounce configuration with defaults
  const {
    time: debounceTime = -1,
    scope: debounceDimension = SCOPE.FUNCTION,
    takeLatest = false
  } = debounce;

  // Single configuration with defaults
  const {
    enabled: singleEnabled = false,
    scope: singleDimension = SCOPE.FUNCTION
  } = single;

  // Hooks configuration with defaults
  const {
    beforeRun,
    onBackgroundUpdateStart,
    onBackgroundUpdate
  } = hooks;

  // Default retry strategy
  const retryStrategy = retry || (() => false);
  let timerMapOfDebounce = new Map<string | symbol, any>();
  let promiseHandlerMap = new Map<string | symbol, Promise<any>>();
  const clearExpiredCache = createClearExpiredCache(fnProxy, ttl);

  let listener: {
    resolve: (arg?: any) => any;
    reject: (arg?: any) => any;
  }[] = [];

  async function retryFn(
    params: Parameters<F>,
    currentAttempt: number = 1
  ): Promise<ReturnType<F>> {
    try {
      const res = await fn(...(params as any[]));
      return res;
    } catch (error) {
      // Check if we should retry based on retryStrategy
      const shouldRetry = retryStrategy(error, currentAttempt);

      if (shouldRetry) {
        return retryFn(params, currentAttempt + 1);
      }
      throw error;
    }
  }

  let finalFn = retryFn;

  if (takeLatest) {
    if (debounceDimension === SCOPE.FUNCTION) {
      finalFn = createTakeLatestPromiseFn(retryFn as any, () => DEFAULT_PROMISE_DEBOUNCE_KEY);
    } else if (debounceDimension === SCOPE.PARAMETERS) {
      finalFn = createTakeLatestPromiseFn(retryFn as any, genKeyByParams, true);
    }
  }

  function fnProxy(...params: Parameters<F>): ReturnType<F> {
    const key = genKeyByParams(params);
    if (ttl !== -1) {
      // Check and delete expired caches on each call to prevent out of memory error
      clearExpiredCache();
    }
    const cache = getCache({ttl, fn: fnProxy, key, cacheCapacity});

    // Stale-while-revalidate pattern
    if (swr && cache) {
      // Return cached data immediately
      const cachedPromise = Promise.resolve(cache.value) as ReturnType<F>;

      // Notify that background update is starting
      onBackgroundUpdateStart?.(cache.value);

      // Start background update
      const backgroundUpdate = async () => {
        try {
          const freshData = await finalFn(params);
          // Update cache with fresh data
          const thisCache = cacheMap.get(fnProxy);
          if (thisCache && (ttl !== -1 || cacheCapacity !== -1)) {
            thisCache.set(key, {
              data: freshData,
              timestamp: Date.now(),
            });
          }
          onBackgroundUpdate?.(freshData, undefined);
        } catch (error) {
          onBackgroundUpdate?.(undefined, error);
        }
      };

      // Start background update without blocking
      backgroundUpdate();

      return cachedPromise;
    }

    if (cache) {
      return Promise.resolve(cache.value) as ReturnType<F>;
    }
    if (singleEnabled && debounceTime === -1) {
      if (singleDimension === SCOPE.FUNCTION && promiseHandlerMap.get(DEFAULT_SINGLE_KEY)) {
        return promiseHandlerMap.get(DEFAULT_SINGLE_KEY)! as ReturnType<F>;
      }
      if (singleDimension === SCOPE.PARAMETERS && promiseHandlerMap.get(key)) {
        return promiseHandlerMap.get(key)! as ReturnType<F>;
      }
    }
    const promiseHandler = new Promise<void>((resolve, reject) => {
      if (debounceTime === -1) {
        return resolve();
      }
      listener.push({
        resolve,
        reject,
      });
      if (debounceDimension === SCOPE.FUNCTION) {
        clearTimeout(timerMapOfDebounce.get(DEFAULT_TIMER_KEY));
        timerMapOfDebounce.set(DEFAULT_TIMER_KEY, setTimeout(resolve, debounceTime));
      }
      if (debounceDimension === SCOPE.PARAMETERS) {
        clearTimeout(timerMapOfDebounce.get(key));
        timerMapOfDebounce.set(key, setTimeout(resolve, debounceTime));
      }
    })
      .then((arg: any) => {
        if (arg === undefined) {
          beforeRun?.();
          const runFnPromise = finalFn(params);
          return runFnPromise
            .then((res) => {
              // eslint-disable-next-line @typescript-eslint/no-shadow
              const thisCache = cacheMap.get(fnProxy);
              const composeRes = res || new FalsyValue(res);
              if (
                thisCache &&
                (ttl !== -1 || cacheCapacity !== -1) &&
                thisCache.get(key)?.data !== res
              ) {
                thisCache.set(key, {
                  data: res,
                  timestamp: Date.now(),
                });
              }
              listener.forEach((i) => {
                i.resolve(composeRes);
              });
              return res;
            })
            .catch((e) => {
              listener.forEach((i) => {
                i.reject(e);
              });

              throw e;
            });
        }
        return arg instanceof FalsyValue ? arg.getValue() : arg;
      })
      .finally(() => {
        timerMapOfDebounce.delete(DEFAULT_TIMER_KEY);
        timerMapOfDebounce.delete(key);
        promiseHandlerMap.delete(DEFAULT_SINGLE_KEY);
        promiseHandlerMap.delete(key);
        listener = [];
      });
    if (singleDimension === SCOPE.FUNCTION) {
      promiseHandlerMap.set(DEFAULT_SINGLE_KEY, promiseHandler);
    } else {
      promiseHandlerMap.set(key, promiseHandler);
    }
    return promiseHandler as ReturnType<F>;
  }

  cacheMap.set(
    fnProxy,
    cacheCapacity === -1
      ? new Map<string, CacheData>()
      : new LRU<string, CacheData>(cacheCapacity)
  );

  function fnClearCache(...params: Parameters<F>): void;
  function fnClearCache(): void;
  function fnClearCache(...params: Parameters<F>) {
    clearCache(fnProxy, params.length ? genKeyByParams(params) : undefined);
  }
  fnProxy.clearCache = fnClearCache;
  return fnProxy;
}
