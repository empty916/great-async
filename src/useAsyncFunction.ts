import type {
  ClearCache,
  CreateAsyncControllerOptions,
} from "./asyncController";
import { createAsyncController } from "./asyncController";
import type { DependencyList } from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type { PickPromiseType, PromiseFunction } from "./common";
import { shallowEqual } from "./common";

export interface AsyncFunctionState<T> {
  loading: boolean;
  error: any;
  data: T;
}

const initDeps: any[] = [];

export interface UseAsyncFunctionOptions<F extends PromiseFunction>
  extends CreateAsyncControllerOptions<F> {
  /**
   * dependence list，it works when manual is false
   */
  deps?: DependencyList;
  /**
   * @deprecated Please use auto option instead.
   * @description whether to call fn manually.
   * @default undefined
   */
  manual?: boolean;
  /**
   * @description whether to call fn automatically
   * @default true
   */
  auto?: boolean;
}

export type UseAsyncFunctionReturn<F extends PromiseFunction> =
  | {
      /**
       * return value of fn
       */
      data: PickPromiseType<F> | null;
      /**
       * promise's loading status
       */
      loading: true;
      /**
       * promise's error value
       */
      error: any;
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
      loading: false;
      error: any;
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

export const useAsyncFunction = <F extends PromiseFunction>(
  asyncFn: F,
  opts: UseAsyncFunctionOptions<F> = {}
) => {
  const { deps, manual, auto = true, ...createAsyncControllerOptions } = opts;
  const stateRef = useRef({
    isMounted: false,
    depsRef: initDeps as DependencyList,
    id: {},
  });
  const argsRef = useRef({
    asyncFn,
    deps: undefined as DependencyList | undefined,
    manual: manual,
    auto: true,
  });
  const [createAsyncControllerOpts] = useState(createAsyncControllerOptions);
  const [asyncFunctionState, setAsyncFunctionState] = useState<
    AsyncFunctionState<PickPromiseType<F> | null>
  >({
    loading: manual === undefined ? auto : !manual,
    error: null,
    data: null,
  });
  argsRef.current.asyncFn = asyncFn;
  argsRef.current.manual = manual;
  argsRef.current.auto = auto;
  argsRef.current.deps = deps;
  
  if (deps && !Array.isArray(deps)) {
    console.log('deps:', JSON.stringify(deps))
    throw new Error("The deps must be an Array!");
  }

  const fnProxy = useMemo(() => {
    const fn1 = (...args: Parameters<F>) =>
      argsRef.current.asyncFn(...(args as any));
    return createAsyncController(fn1 as F, {
      ...createAsyncControllerOpts,
      beforeRun: (createAsyncControllerOpts.debounceTime !== -1 || createAsyncControllerOpts.beforeRun) ? () => {
        setAsyncFunctionState((ov) => {
          if (ov.loading) {
            return ov;
          }
          return {
            ...ov,
            loading: true,
          };
        });
        createAsyncControllerOpts.beforeRun?.();
      } : undefined
    });
  }, [createAsyncControllerOpts]);

  const createRunFn = useCallback(
    (throwError: boolean) => {
      return async (...args: Parameters<F>) => {
        await Promise.resolve();
        if (createAsyncControllerOpts.debounceTime === -1) {
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
    if (argsRef.current.manual ?? !auto) {
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
    if (argsRef.current.manual ?? !auto) {
      return;
    }
    // @ts-ignore
    runFn();
  }, [deps, runFn]);

  return {
    data: asyncFunctionState.data,
    loading: asyncFunctionState.loading,
    error: asyncFunctionState.error,
    run: manualRunFn,
    fn: manualRunFn,
    clearCache: fnProxy.clearCache,
  } as UseAsyncFunctionReturn<F>;
};
