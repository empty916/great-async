import type {
  ClearCache,
  CreateAsyncOptions,
} from "./create-async";
import { createAsync } from "./create-async";
import type { DependencyList } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { PickPromiseType, PromiseFunction, AsyncError } from "./common";
import { shallowEqual } from "./common";
import { shareLoading, useLoadingState } from "./share-loading";

export interface AsyncFunctionState<T> {
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
   * When using useAsync in different components and giving them the same loadingId, they will share the "loading" state.
   */
  loadingId?: string;
}

export type UseAsyncReturn<F extends PromiseFunction> =
  | {
      /**
       * return value of fn
       */
      data: PickPromiseType<F> | null;
      /**
       * promise's loading status \
       * please use loading intead
       * @deprecated
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
       * the difference is calling run will update loading state
       * @deprecated
       */
      run: F;
      /**
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling fn will update loading state
       */
      fn: F;
      clearCache: ClearCache<F>;
    }
  | {
      data: PickPromiseType<F>;
      /**
       * promise's loading status
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
       * the difference is calling run will update loading state
       * @deprecated
       */
      run: F;
      /**
       * proxy of first parameter, usage is same as first parameter. \
       * the difference is calling fn will update loading state
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
 * @returns Object containing data, loading, error, and control functions
 *
 * @example
 * ```typescript
 * import { useAsync } from 'great-async/use-async';
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, loading, error } = useAsync(
 *     () => fetch(`/api/users/${userId}`).then(res => res.json()),
 *     {
 *       deps: [userId],
 *       cache: {
 *         ttl: 5 * 60 * 1000,
 *         swr: true
 *       }
 *     }
 *   );
 *
 *   if (loading) return <div>Loading...</div>;
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
    loadingId,
    ...createAsyncOptions
  } = opts;

  const { swr = false } = createAsyncOptions.cache || {};
  const { onBackgroundUpdate, } = createAsyncOptions.hooks || {};

  const stateRef = useRef({
    isMounted: false,
    depsRef: initDeps as DependencyList,
    id: {},
    inited: false,
    hasIncremented: false,
  });
  const argsRef = useRef({
    asyncFn,
    deps: undefined as DependencyList | undefined,
    auto: auto,
    loadingId: '',
    onBackgroundUpdate: onBackgroundUpdate,
  });
  const [createAsyncOpts] = useState(createAsyncOptions);
  const [asyncFunctionState, setAsyncFunctionState] = useState<
    AsyncFunctionState<PickPromiseType<F> | null>
  >({
    loading: auto === true,
    error: null,
    data: null,
  });
  const [backgroundUpdating, setBackgroundUpdating] = useState(false);

  argsRef.current.asyncFn = asyncFn;
  argsRef.current.auto = auto;
  argsRef.current.deps = deps;
  argsRef.current.loadingId = loadingId || '';
  argsRef.current.onBackgroundUpdate = onBackgroundUpdate;

  if (deps && !Array.isArray(deps)) {
    throw new Error("The deps must be an Array!");
  }

  if (!stateRef.current.inited && loadingId) {
    shareLoading.init(loadingId);
    stateRef.current.inited = true;
    if(asyncFunctionState.loading) {
      shareLoading.increment(loadingId);
      stateRef.current.hasIncremented = true;
    }
  }

  useEffect(() => {
    if (!loadingId) return; // Skip shared state management if no loadingId

    if (asyncFunctionState.loading && !stateRef.current.hasIncremented) {
      shareLoading.increment(loadingId); // Only increment when needed
      stateRef.current.hasIncremented = true;
    } else if (!asyncFunctionState.loading && stateRef.current.hasIncremented) {
      shareLoading.decrement(loadingId); // Correctly handle state change
      stateRef.current.hasIncremented = false;
    }

    return () => {
      if (stateRef.current.hasIncremented) {
        shareLoading.decrement(loadingId); // Cleanup on unmount
        stateRef.current.hasIncremented = false;
      }
    }
  }, [asyncFunctionState.loading, loadingId]);

  const sharedLoadingState = useLoadingState(loadingId || '');

  const fnProxy = useMemo(() => {
    const fn1 = (...args: Parameters<F>) =>
      argsRef.current.asyncFn(...(args as any));

    // Merge SWR configuration
    const mergedOptions = {
      ...createAsyncOpts,
      cache: {
        ...createAsyncOpts.cache,
      },
      hooks: {
        ...createAsyncOpts.hooks,
        onBackgroundUpdateStart: swr ? (cachedData: PickPromiseType<F>) => {
          // Background update is starting, set backgroundUpdating state
          setBackgroundUpdating(true);
          createAsyncOpts.hooks?.onBackgroundUpdateStart?.(cachedData);
        } : createAsyncOpts.hooks?.onBackgroundUpdateStart,
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
          createAsyncOpts.hooks?.onBackgroundUpdate?.(data, error);
        } : createAsyncOpts.hooks?.onBackgroundUpdate,
        beforeRun:
          createAsyncOpts.debounce?.time !== -1 ||
          createAsyncOpts.hooks?.beforeRun
            ? () => {
                setAsyncFunctionState((ov) => {
                  if (ov.loading) {
                    return ov;
                  }
                  return {
                    ...ov,
                    loading: true,
                  };
                });
                createAsyncOpts.hooks?.beforeRun?.();
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

        if ((createAsyncOpts.debounce?.time || -1) === -1) {
          setAsyncFunctionState((ov) => {
            if (ov.loading) {
              return ov;
            }
            return {
              ...ov,
              loading: true,
            };
          });
        }

        try {
          const res = await fnProxy(...args);
          setAsyncFunctionState((ov) => {
            if (!ov.loading && ov.error === null && ov.data === res) {
              return ov;
            }
            return {
              loading: false,
              error: null,
              data: res,
            };
          });
          return res;
        } catch (err) {
          setAsyncFunctionState((ov) => {
            if (!ov.loading && ov.error === err && ov.data === null) {
              return ov;
            }
            return {
              error: err,
              loading: false,
              data: null,
            };
          });
          if (throwError) {
            throw err;
          }
        }
      };
    },
    [fnProxy]
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

  const composedPendingState = asyncFunctionState.loading || sharedLoadingState;

  return {
    data: asyncFunctionState.data,
    loading: composedPendingState,
    error: asyncFunctionState.error,
    backgroundUpdating,
    run: manualRunFn,
    fn: manualRunFn,
    clearCache: fnProxy.clearCache,
  } as UseAsyncReturn<F>;
};

useAsync.showLoading = (loadingId: string) => shareLoading.increment(loadingId);
useAsync.hideLoading = (loadingId: string) => shareLoading.decrement(loadingId);
