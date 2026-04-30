import type {
  ClearCache,
  CreateAsyncOptions,
} from "./create-async";
import { createAsync } from "./create-async";
import type { DependencyList } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { PickPromiseType, PromiseFunction, AsyncError } from "./common";
import { shallowEqual, defaultGenKeyByParams } from "./common";
import { sharePending, usePendingState } from "./share-pending";
import { IdCacheManager } from "./id-cache-manager";
import { WeakMapCacheManager } from "./weak-map-cache-manager";

export interface AsyncFunctionState<T> {
  pending: boolean;
  /**
   * Alias for `pending`. Both names refer to the same in-flight state.
   */
  loading: boolean;
  error: AsyncError | null;
  data: T;
}

const initDeps: any[] = [];

export interface UseAsyncOptions<F extends PromiseFunction>
  extends CreateAsyncOptions<F> {
  /**
   * dependence list，it works when auto is true or 'deps-only'
   */
  deps?: DependencyList;
  /**
   * @description whether to call fn automatically
   * - true: auto-call on mount and when deps change
   * - false: never auto-call (manual mode)
   * - 'deps-only': only auto-call when deps change, not on mount
   * @default true
   */
  auto?: boolean | 'deps-only';
  /**
   * When using useAsync in different components and giving them the same pendingId, they will share the "pending" state.
   */
  pendingId?: string;
  /**
   * Value used for `data` before the async function first resolves
   * (or while the very first call is pending).
   * @default null
   */
  initialData?: PickPromiseType<F>;
  /**
   * Value used for `data` when the async function rejects. When omitted,
   * the previously resolved `data` is preserved on error (so a transient
   * failure does not blank out the UI).
   *
   * Pass `null` (or any other concrete value) to explicitly reset `data`
   * on every error.
   */
  fallbackData?: PickPromiseType<F> | null;
}

export type UseAsyncReturn<F extends PromiseFunction> =
  | {
      /**
       * return value of fn
       */
      data: PickPromiseType<F> | null;
      /**
       * promise's pending status (true when async operation is in progress)
       */
      pending: true;
      /**
       * Alias for `pending`. Both names refer to the same in-flight state.
       */
      loading: true;
      /**
       * promise's error value
       */
      error: AsyncError | null;
      /**
       * Whether background update is in progress (for stale-while-revalidate)
       */
      backgroundUpdating: boolean;
      /**
       * * please use fn instead \
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling run will update pending state
       * @deprecated
       */
      run: F;
      /**
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling fn will update pending state
       */
      fn: F;
      clearCache: ClearCache<F>;
    }
  | {
      data: PickPromiseType<F>;
      /**
       * promise's pending status (false when async operation is complete)
       */
      pending: false;
      /**
       * Alias for `pending`. Both names refer to the same in-flight state.
       */
      loading: false;
      error: AsyncError | null;
      /**
       * Whether background update is in progress (for stale-while-revalidate)
       */
      backgroundUpdating: boolean;
      /**
       * please use fn instead \
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling run will update pending state
       * @deprecated
       */
      run: F;
      /**
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling fn will update pending state
       */
      fn: F;
      clearCache: ClearCache<F>;
    };

/**
 * React hook for managing async operations with enhanced features like caching, SWR, debouncing, etc.
 * This is the main implementation function.
 *
 * @param asyncFn The async function to execute
 * @param options useAsync options
 * @returns Object containing data, pending, error, and control functions
 *
 * @example
 * ```typescript
 * import { useAsync } from 'great-async/use-async';
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, pending, error } = useAsync(
 *     () => fetch(`/api/users/${userId}`).then(res => res.json()),
 *     {
 *       deps: [userId],
 *       pendingId: 'user-profile', // Share pending state across components
 *       cache: {
 *         ttl: 5 * 60 * 1000,
 *         swr: true
 *       }
 *     }
 *   );
 *
 *   if (pending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   return <div>User: {data?.name}</div>;
 * }
 * ```
 */
export const useAsync = <F extends PromiseFunction>(
  asyncFn: F,
  opts: UseAsyncOptions<F> = {}
) => {
  const {
    deps,
    auto = true,
    pendingId,
    initialData,
    fallbackData,
    ...createAsyncOptions
  } = opts;

  const resolvedInitial: PickPromiseType<F> | null =
    initialData !== undefined ? initialData : null;
  // `undefined` here means "keep last data on error".
  const resolvedFallback: PickPromiseType<F> | null | undefined = fallbackData;

  const { swr = false } = createAsyncOptions.cache || {};
  const { onBackgroundUpdate, } = createAsyncOptions.lifecycle || {};

  const stateRef = useRef({
    isMounted: false,
    depsRef: initDeps as DependencyList,
    id: {},
    hasIncremented: false,
  });
  const argsRef = useRef({
    asyncFn,
    deps: undefined as DependencyList | undefined,
    auto: auto,
    loadingId: '',
    onBackgroundUpdate: onBackgroundUpdate,
    fallbackData: resolvedFallback,
  });
  const [createAsyncOpts] = useState(createAsyncOptions);

  // When `cache.manager` or `id` is provided, the cache lives outside of
  // createAsync (in user-supplied manager / module-level IdCacheManager) and
  // survives mount/unmount. Check it eagerly so SWR can return data on the
  // very first render without a pending flash.
  //
  // For the default WeakMap mode this stays null — the WeakMap entry is
  // keyed by the not-yet-created fnProxy, so the SWR cache check has to
  // happen later via WeakMapCacheManager.peek.
  const cacheManagerForState = useMemo(() => {
    if (createAsyncOpts.cache?.manager) {
      return createAsyncOpts.cache.manager;
    }
    return createAsyncOpts.id
      ? IdCacheManager.forId<PickPromiseType<F>>(
          createAsyncOpts.id,
          createAsyncOpts.cache?.ttl ?? -1,
          createAsyncOpts.cache?.capacity ?? -1,
        )
      : null;
  }, [
    createAsyncOpts.cache?.manager,
    createAsyncOpts.id,
    createAsyncOpts.cache?.ttl,
    createAsyncOpts.cache?.capacity,
  ]);

  const getCachedData = (key: string) => {
    if (!cacheManagerForState) return null;
    return cacheManagerForState.get(key);
  };

  const defaultCacheKey = (createAsyncOpts.cache?.keyGenerator || defaultGenKeyByParams)([] as any);

  const [asyncFunctionState, setAsyncFunctionState] = useState<
    AsyncFunctionState<PickPromiseType<F> | null>
  >(() => {
    if (swr) {
      const cached = getCachedData(defaultCacheKey);
      if (cached) {
        return { pending: false, loading: false, error: null, data: cached.value };
      }
    }
    return {
      pending: auto === true,
      loading: auto === true,
      error: null,
      data: resolvedInitial,
    };
  });

  const [backgroundUpdating, setBackgroundUpdating] = useState(false);

  argsRef.current.asyncFn = asyncFn;
  argsRef.current.auto = auto;
  argsRef.current.deps = deps;
  argsRef.current.loadingId = pendingId || '';
  argsRef.current.onBackgroundUpdate = onBackgroundUpdate;
  argsRef.current.fallbackData = resolvedFallback;

  if (deps && !Array.isArray(deps)) {
    throw new Error("The deps must be an Array!");
  }

  useLayoutEffect(() => {
    if (!pendingId) return;

    if (asyncFunctionState.pending && !stateRef.current.hasIncremented) {
      sharePending.increment(pendingId);
      stateRef.current.hasIncremented = true;
    } else if (!asyncFunctionState.pending && stateRef.current.hasIncremented) {
      sharePending.decrement(pendingId);
      stateRef.current.hasIncremented = false;
    }

    return () => {
      if (stateRef.current.hasIncremented) {
        sharePending.decrement(pendingId);
        stateRef.current.hasIncremented = false;
      }
    }
  }, [asyncFunctionState.pending, pendingId]);

  const sharedPendingState = usePendingState(pendingId || '');

  const fnProxy = useMemo(() => {
    const fn1 = (...args: Parameters<F>) =>
      argsRef.current.asyncFn(...(args as any));

    // Merge SWR configuration
    const mergedOptions = {
      ...createAsyncOpts,
      cache: {
        ...createAsyncOpts.cache,
      },
      lifecycle: {
        ...createAsyncOpts.lifecycle,
        onBackgroundUpdateStart: swr ? (cachedData: PickPromiseType<F>) => {
          // Background update is starting, set backgroundUpdating state
          setBackgroundUpdating(true);
          createAsyncOpts.lifecycle?.onBackgroundUpdateStart?.(cachedData);
        } : createAsyncOpts.lifecycle?.onBackgroundUpdateStart,
        onBackgroundUpdate: swr ? (data: PickPromiseType<F> | undefined, error: AsyncError | undefined) => {
          // Background update completed, update data and clear background updating state
          if (data !== undefined) {
            setAsyncFunctionState(prev => ({
              ...prev,
              data,
              error: null,
            }));
          }
          if (error) {
            setAsyncFunctionState(prev => ({
              ...prev,
              error,
            }));
          }
          setBackgroundUpdating(false);
          argsRef.current.onBackgroundUpdate?.(data, error);
          createAsyncOpts.lifecycle?.onBackgroundUpdate?.(data, error);
        } : createAsyncOpts.lifecycle?.onBackgroundUpdate,
        beforeRun:
          createAsyncOpts.debounce?.time !== -1 ||
          createAsyncOpts.lifecycle?.beforeRun
            ? () => {
                setAsyncFunctionState((ov) => {
                  if (ov.pending) {
                    return ov;
                  }
                  return {
                    ...ov,
                    pending: true,
                    loading: true,
                  };
                });
                createAsyncOpts.lifecycle?.beforeRun?.();
              }
            : undefined,
      }
    };

    return createAsync(fn1 as F, mergedOptions);
  }, [createAsyncOpts, swr]);

  const createRunFn = useCallback(
    (throwError: boolean) => {
      return async (...args: Parameters<F>) => {
        await Promise.resolve();

        // Check if SWR has valid cache. Two complementary sources:
        // 1. cacheManagerForState — covers `cacheManager` and `id` modes.
        // 2. WeakMapCacheManager.peek — covers the default WeakMap mode,
        //    which is keyed by fnProxy and only resolvable after fnProxy
        //    has been constructed.
        const cacheKey = (createAsyncOpts.cache?.keyGenerator || defaultGenKeyByParams)(args);
        const hasSWRCache = swr && !!(
          getCachedData(cacheKey)
          || WeakMapCacheManager.peek(fnProxy, cacheKey, {
            ttl: createAsyncOpts.cache?.ttl ?? -1,
            cacheCapacity: createAsyncOpts.cache?.capacity ?? -1,
          })
        );

        if ((createAsyncOpts.debounce?.time || -1) === -1 && !hasSWRCache) {
          setAsyncFunctionState((ov) => {
            if (ov.pending) {
              return ov;
            }
            return {
              ...ov,
              pending: true,
              loading: true,
            };
          });
        }

        try {
          const res = await fnProxy(...args);
          setAsyncFunctionState((ov) => {
            if (!ov.pending && ov.error === null && ov.data === res) {
              return ov;
            }
            return {
              pending: false,
              loading: false,
              error: null,
              data: res,
            };
          });
          return res;
        } catch (err) {
          setAsyncFunctionState((ov) => {
            // When fallbackData is undefined, keep the previous data — a
            // transient error should not blank out the UI.
            const fb = argsRef.current.fallbackData;
            const newData = fb !== undefined ? fb : ov.data;
            if (!ov.pending && ov.error === err && ov.data === newData) {
              return ov;
            }
            return {
              error: err,
              pending: false,
              loading: false,
              data: newData,
            };
          });
          if (throwError) {
            throw err;
          }
        }
      };
    },
    [fnProxy, swr, createAsyncOpts]
  );

  const runFn = useMemo(() => createRunFn(false), [createRunFn]);
  const manualRunFn = useMemo(() => createRunFn(true), [createRunFn]) as F;

  useEffect(() => {
    const ld = argsRef.current.deps;
    if (ld?.length) {
      stateRef.current.depsRef = ld;
    }
    stateRef.current.isMounted = true;
    // Skip auto-call on mount if manual is true or auto is false/deps-only
    if (argsRef.current.auto === false || argsRef.current.auto === 'deps-only') {
      return;
    }
    // @ts-ignore
    runFn();
  }, [runFn]);

  useEffect(() => {
    if (!stateRef.current.isMounted || stateRef.current.depsRef === initDeps) {
      return;
    }
    const ld = argsRef.current.deps;
    if (shallowEqual(ld!, stateRef.current.depsRef)) {
      return;
    }
    stateRef.current.depsRef = ld!;
    // Allow auto-call on deps change if manual is false and auto is true or 'deps-only'
    if (argsRef.current.auto === false) {
      return;
    }
    // @ts-ignore
    runFn();
  }, [deps, runFn]);

  const composedPendingState = asyncFunctionState.pending || sharedPendingState;

  return {
    data: asyncFunctionState.data,
    pending: composedPendingState,
    loading: composedPendingState,
    error: asyncFunctionState.error,
    backgroundUpdating,
    run: manualRunFn,
    fn: manualRunFn,
    clearCache: fnProxy.clearCache,
  } as UseAsyncReturn<F>;
};

// Static methods for manual pending state control
useAsync.showPending = (pendingId: string) => sharePending.increment(pendingId);
useAsync.hidePending = (pendingId: string) => sharePending.decrement(pendingId);
