import type { PickPromiseType, PromiseFunction, AsyncError } from "./common";
import { AsyncResolveResult, AsyncResolveToken, defaultGenKeyByParams } from "./common";
import { DEFAULT_PROMISE_DEBOUNCE_KEY, DEFAULT_SINGLE_KEY, DEFAULT_TIMER_KEY, DIMENSIONS, TokenManager } from "./token-manager";
import type { T_DIMENSIONS } from "./token-manager";
import { createTakeLatestPromiseFn } from "./take-latest-promise";
import type { CacheManager } from "./cache-manager";
import { WeakMapCacheManager } from "./weak-map-cache-manager";
import { IdCacheManager } from "./id-cache-manager";

export { DIMENSIONS } from "./token-manager";
// Re-export for backward compatibility
export { CacheData } from "./common";
export { cacheMap } from "./weak-map-cache-manager";

type Timer = ReturnType<typeof setTimeout>;

function createClearExpiredCache(cm: CacheManager) {
  let timer: Timer | null = null;
  return function clearExpiredCache() {
    if (timer) {
      clearTimeout(timer);
    }
    // put operation into micro event loop, so it will not impact the main process
    timer = setTimeout(() => {
      cm.clearExpired();
    });
  };
}



export interface CreateAsyncOptions<
  F extends PromiseFunction = PromiseFunction
> {
  /**
   * debounce time config. default value is -1 which means no debounce feature,
   */
  debounceTime?: number;
  /**
   * dimension of debounce, default is DIMENSIONS.FUNCTION
   */
  debounceDimension?: T_DIMENSIONS;
  /**
   * time to live of cache, default is -1
   */
  ttl?: number;
  /**
   * the fn function can only be called once at a time，default is false
   */
  single?: boolean;
  /**
   * dimension of single, default is DIMENSIONS.FUNCTION
   */
  singleDimension?: T_DIMENSIONS;
  /**
   * a strategy to genrate key of cache
   */
  genKeyByParams?: (params: Parameters<F>) => string;
  /**
   * retry count of call function when error occur
   * @deprecated Use retryStrategy instead for more flexible retry control.
   * retryStrategy can handle both retry count and custom retry logic.
   * Example: retryStrategy: (error, currentRetryCount) => currentRetryCount <= 3
   */
  retryCount?: number;
  /**
   * retry strategy, if return value is true, it will retry to call function
   * @param error - the error that occurred
   * @param currentRetryCount - current retry attempt number (1-based)
   * @returns
   */
  retryStrategy?: (error: AsyncError, currentRetryCount: number) => boolean;
  /**
   * cache capacity, cache removal strategy using LRU algorithm
   * default value is -1, means no cache size limit
   */
  cacheCapacity?: number;

  beforeRun?: () => any;
  /**
   * Enable take-latest behavior for promises.
   * When multiple calls are made with the same key, all calls will resolve with the result of the latest call.
   * Similar to RxJS's takeLatest operator.
   * @default false
   */
  takeLatest?: boolean;
  /**
   * Enable stale-while-revalidate pattern
   * When true, if cache exists, return cached data immediately and update cache in background
   * @default false
   */
  swr?: boolean;
  /**
   * Callback when background update starts
   * @param cachedData The cached data being returned immediately
   */
  onBackgroundUpdateStart?: (cachedData: PickPromiseType<F>) => void;
  /**
   * Callback when background update completes
   * @param data The updated data (undefined if error occurred)
   * @param error The error if update failed (undefined if successful)
   */
  onBackgroundUpdate?: (data: PickPromiseType<F> | undefined, error: AsyncError | undefined) => void;
  /**
   * Stable cache identifier. When provided, the cache uses a module-level store
   * keyed by this id instead of the default WeakMap<fnProxy> strategy.
   * This allows cache to survive component mount/unmount cycles (e.g. page navigation).
   */
  id?: string;
  /**
   * Custom cache manager instance. When provided, all cache operations are
   * delegated to this manager. Takes precedence over `id`.
   */
  cacheManager?: CacheManager<PickPromiseType<F>>;
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

/**
 * Create async controller with enhanced features like caching, debouncing, SWR, etc.
 * This is the main implementation function.
 *
 * @param fn A function and it's return type must be Promise
 * @param options createAsync options
 * @returns Enhanced function with additional methods
 *
 * @example
 * ```typescript
 * import { createAsync } from 'great-async/createAsync';
 *
 * const fetchUser = async (id: string) => {
 *   const response = await fetch(`/api/users/${id}`);
 *   return response.json();
 * };
 *
 * const enhancedFetch = createAsync(fetchUser, {
 *   ttl: 5 * 60 * 1000,
 *   swr: true,
 *   debounceTime: 300,
 * });
 * ```
 */
export function createAsync<F extends PromiseFunction>(
  fn: F,
  {
    debounceTime = -1,
    takeLatest = false,
    debounceDimension = DIMENSIONS.FUNCTION,
    ttl = -1,
    single = false,
    singleDimension = DIMENSIONS.FUNCTION,
    retryCount = 0,
    retryStrategy = (error, currentRetryCount) => {
      // Default behavior: if retryCount is specified, use it; otherwise don't retry
      return retryCount > 0 ? currentRetryCount <= retryCount : false;
    },
    genKeyByParams = defaultGenKeyByParams,
    cacheCapacity = -1,
    beforeRun,
    swr = false,
    onBackgroundUpdateStart,
    onBackgroundUpdate,
    id,
    cacheManager: customCacheManager,
  }: CreateAsyncOptions<F> = {}
): ReturnTypeOfCreateAsync<F> {
  let timerMapOfDebounce = new Map<string | symbol, any>();
  let promiseHandlerMap = new Map<string | symbol, Promise<any>>();

  // Pick cache strategy: custom > id-based > default (fnProxy-based).
  // For the default strategy we need fnProxy first, so we defer creation.
  let cacheManager: CacheManager<PickPromiseType<F>> | null =
    customCacheManager || (id ? new IdCacheManager<PickPromiseType<F>>(id, ttl) : null);

  let clearExpiredCache: () => void;

  let listener: {
    resolve: (arg?: any) => any;
    reject: (arg?: any) => any;
    token: string | symbol;
    key: string | symbol;
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

      // If retryCount is specified (deprecated), also check against it
      const withinRetryCountLimit = retryCount === 0 || currentAttempt <= retryCount;

      if (shouldRetry && withinRetryCountLimit) {
        return retryFn(params, currentAttempt + 1);
      }
      throw error;
    }
  }

  let finalFn = retryFn;

  if (takeLatest) {
    if (debounceDimension === DIMENSIONS.FUNCTION) {
      finalFn = createTakeLatestPromiseFn(retryFn as any, () => DEFAULT_PROMISE_DEBOUNCE_KEY);
    } else if (debounceDimension === DIMENSIONS.PARAMETERS) {
      finalFn = createTakeLatestPromiseFn(retryFn as any, genKeyByParams, true);
    }
  }

  const tm = new TokenManager(debounceDimension);

  function fnProxy(...params: Parameters<F>): ReturnType<F> {
    const key = genKeyByParams(params);
    if (ttl !== -1) {
      clearExpiredCache();
    }
    const cache = cacheManager!.get(key);

    // Stale-while-revalidate pattern
    if (swr && cache) {
      // Return cached data immediately
      const cachedPromise = Promise.resolve(cache.value) as ReturnType<F>;

      // Notify that background update is starting
      onBackgroundUpdateStart?.(cache.value);

      // Start background update through the full execution pipeline
      // (single dedup, debounce, retry, takeLatest) — so rapid calls
      // naturally share the same background promise via promiseHandlerMap.
      const backgroundUpdate = async () => {
        try {
          const freshData = await executeAsync();
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

    return executeAsync();

    // Execute the async function with all features (single, debounce, takeLatest, retry)
    // but without cache/SWR handling. Used by both the normal path and SWR background updates.
    function executeAsync(): ReturnType<F> {
      if (single && debounceTime === -1) {
        if (singleDimension === DIMENSIONS.FUNCTION && promiseHandlerMap.get(DEFAULT_SINGLE_KEY)) {
          return promiseHandlerMap.get(DEFAULT_SINGLE_KEY)! as ReturnType<F>;
        }
        if (singleDimension === DIMENSIONS.PARAMETERS && promiseHandlerMap.get(key)) {
          return promiseHandlerMap.get(key)! as ReturnType<F>;
        }
      }
      const promiseHandler = new Promise<AsyncResolveToken>((resolve, reject) => {
        if (debounceTime === -1) {
          resolve(new AsyncResolveToken(tm.getToken()));
          tm.refresh();
          return;
        }

        listener.push({
          resolve,
          reject,
          token: tm.getToken(key),
          key: debounceDimension === DIMENSIONS.FUNCTION ? DEFAULT_TIMER_KEY : key,
        });
        if (debounceDimension === DIMENSIONS.FUNCTION) {
          clearTimeout(timerMapOfDebounce.get(DEFAULT_TIMER_KEY));
          timerMapOfDebounce.set(DEFAULT_TIMER_KEY, setTimeout(() => {
            resolve(new AsyncResolveToken(tm.getToken()));
            tm.refresh();
          }, debounceTime));
        }
        if (debounceDimension === DIMENSIONS.PARAMETERS) {
          clearTimeout(timerMapOfDebounce.get(key));
          timerMapOfDebounce.set(key, setTimeout(() => {
            resolve(new AsyncResolveToken(tm.getToken(key)));
            tm.refresh(key);
          }, debounceTime));
        }
      })
        .then((arg: any) => {
          if (arg instanceof AsyncResolveToken) {

            const scopeToken = arg.value;

            beforeRun?.();
            const runFnPromise = finalFn(params);
            return runFnPromise
              .then((res) => {
                cacheManager!.set(key, res as PickPromiseType<F>);
                const composeRes = new AsyncResolveResult(res);
                listener.filter(i => {
                  if (debounceDimension === DIMENSIONS.FUNCTION) {
                    return i.token === scopeToken && i.key === DEFAULT_TIMER_KEY;
                  }
                  return i.token === scopeToken && i.key === key;
                }).forEach((i) => {
                  i.resolve(composeRes);
                });
                return res;
              })
              .catch((e) => {
                listener.filter(i => {
                  if (debounceDimension === DIMENSIONS.FUNCTION) {
                    return i.token === scopeToken && i.key === DEFAULT_TIMER_KEY;
                  }
                  return i.token === scopeToken && i.key === key;
                }).forEach((i) => {
                  i.reject(e);
                });

                throw e;
              }).finally(() => {
                listener = listener.filter(i => {
                  if (debounceDimension === DIMENSIONS.FUNCTION) {
                    return !(i.token === scopeToken && i.key === DEFAULT_TIMER_KEY);
                  }
                  return !(i.token === scopeToken && i.key === key);
                });
                if (!listener.find(i => i.key === key)) {
                  tm.remove(key);
                }
              });
          }
          if (arg instanceof AsyncResolveResult) {
            return arg.result;
          }
          return arg;
        })
        .finally(() => {
          timerMapOfDebounce.delete(DEFAULT_TIMER_KEY);
          timerMapOfDebounce.delete(key);
          promiseHandlerMap.delete(DEFAULT_SINGLE_KEY);
          promiseHandlerMap.delete(key);
        });
      if (singleDimension === DIMENSIONS.FUNCTION) {
        promiseHandlerMap.set(DEFAULT_SINGLE_KEY, promiseHandler);
      } else {
        promiseHandlerMap.set(key, promiseHandler);
      }
      return promiseHandler as ReturnType<F>;
    }
  }

  // For the default strategy, create WeakMapCacheManager now that fnProxy exists.
  if (!cacheManager) {
    cacheManager = new WeakMapCacheManager<PickPromiseType<F>>(fnProxy, ttl, cacheCapacity);
  }

  clearExpiredCache = createClearExpiredCache(cacheManager);

  function fnClearCache(...params: Parameters<F>): void;
  function fnClearCache(): void;
  function fnClearCache(...params: Parameters<F>) {
    cacheManager!.delete(params.length ? genKeyByParams(params) : undefined);
  }
  fnProxy.clearCache = fnClearCache;
  return fnProxy;
}
