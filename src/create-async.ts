import type { CacheData, PickPromiseType, PromiseFunction, T_DIMENSIONS, AsyncError } from "./common";
import { cacheMap, defaultGenKeyByParams, DIMENSIONS, FalsyValue, getCache } from "./common";
import { LRU } from "./LRU";
import { createPromiseDebounceFn } from "./promise-debounce";

export { DIMENSIONS, cacheMap, CacheData };

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
   */
  retryCount?: number;
  /**
   * retry strategy, if return value is true, it will retry to call function
   * @param error
   * @returns
   */
  retryStrategy?: (error: AsyncError) => boolean;
  /**
   * cache capacity, cache removal strategy using LRU algorithm
   * default value is -1, means no cache size limit
   */
  cacheCapacity?: number;

  beforeRun?: () => any;
  promiseDebounce?: boolean;
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
    promiseDebounce = false,
    debounceDimension = DIMENSIONS.FUNCTION,
    ttl = -1,
    single = false,
    singleDimension = DIMENSIONS.FUNCTION,
    retryCount = 0,
    retryStrategy = (error) => !!error,
    genKeyByParams = defaultGenKeyByParams,
    cacheCapacity = -1,
    beforeRun,
    swr = false,
    onBackgroundUpdateStart,
    onBackgroundUpdate,
  }: CreateAsyncOptions<F> = {}
): ReturnTypeOfCreateAsync<F> {
  let timerMapOfDebounce = new Map<string | symbol, any>();
  let promiseHandlerMap = new Map<string | symbol, Promise<any>>();
  const clearExpiredCache = createClearExpiredCache(fnProxy, ttl);

  let listener: {
    resolve: (arg?: any) => any;
    reject: (arg?: any) => any;
  }[] = [];

  async function retryFn(
    params: Parameters<F>,
    _retryCount: number = 0
  ): Promise<ReturnType<F>> {
    try {
      const res = await fn(...(params as any[]));
      return res;
    } catch (error) {
      if (_retryCount > 0 && retryStrategy(error)) {
        return retryFn(params, _retryCount - 1);
      }
      throw error;
    }
  }

  let finalFn = retryFn;

  if (promiseDebounce) {
    if (debounceDimension === DIMENSIONS.FUNCTION) {
      finalFn = createPromiseDebounceFn(retryFn as any, () => DEFAULT_PROMISE_DEBOUNCE_KEY);
    } else if (debounceDimension === DIMENSIONS.PARAMETERS) {
      finalFn = createPromiseDebounceFn(retryFn as any, genKeyByParams, true);
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
          const freshData = await finalFn(params, retryCount);
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
    if (single && debounceTime === -1) {
      if (singleDimension === DIMENSIONS.FUNCTION && promiseHandlerMap.get(DEFAULT_SINGLE_KEY)) {
        return promiseHandlerMap.get(DEFAULT_SINGLE_KEY)! as ReturnType<F>;
      }
      if (singleDimension === DIMENSIONS.PARAMETERS && promiseHandlerMap.get(key)) {
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
      if (debounceDimension === DIMENSIONS.FUNCTION) {
        clearTimeout(timerMapOfDebounce.get(DEFAULT_TIMER_KEY));
        timerMapOfDebounce.set(DEFAULT_TIMER_KEY, setTimeout(resolve, debounceTime));
      }
      if (debounceDimension === DIMENSIONS.PARAMETERS) {
        clearTimeout(timerMapOfDebounce.get(key));
        timerMapOfDebounce.set(key, setTimeout(resolve, debounceTime));
      }
    })
      .then((arg: any) => {
        if (arg === undefined) {
          beforeRun?.();
          const runFnPromise = finalFn(params, retryCount);
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
    if (singleDimension === DIMENSIONS.FUNCTION) {
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
