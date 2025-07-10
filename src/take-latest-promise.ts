import { defaultGenKeyByParams, PromiseFunction } from "./common";

/**
 * Creates a function that ensures only the latest Promise result is used.
 * 
 * When multiple calls are made with the same key:
 * - All Promises execute (no cancellation)
 * - All Promises resolve with the result of the latest call
 * - Earlier results are discarded
 * 
 * This is similar to RxJS's `takeLatest` operator but for Promises.
 * 
 * @example
 * ```typescript
 * const searchLatest = createTakeLatestPromise(
 *   (query: string) => searchAPI(query),
 *   (query) => `search-${query}`
 * );
 * 
 * // User types quickly: "a" -> "ab" -> "abc"
 * const result1 = searchLatest("a");    // Will resolve with "abc" results
 * const result2 = searchLatest("ab");   // Will resolve with "abc" results  
 * const result3 = searchLatest("abc");  // Will resolve with "abc" results
 * ```
 * 
 * @param fn - The async function to wrap
 * @param getKey - Function to generate a key for grouping calls
 * @param isRetryFn - Internal flag for retry functionality
 * @returns A wrapped function that implements take-latest behavior
 */
export function createTakeLatestPromiseFn<F extends PromiseFunction>(
    fn: F,
    getKey: (...params: any[]) => string | symbol,
    isRetryFn?: boolean,
): (...args: Parameters<F>) => Promise<ReturnType<F>> {
    const runFnPromiseQueue = new Map<string | symbol, Promise<ReturnType<F>>[]>();
    
    function afterAllPromiseResolved(key: string | symbol): Promise<any> {
        if (runFnPromiseQueue.has(key) && runFnPromiseQueue.get(key)!.length > 0) {
            const len = runFnPromiseQueue.get(key)!.length;
            return Promise.allSettled(runFnPromiseQueue.get(key)!).then(() => {
                if (runFnPromiseQueue.get(key)!.length > len) {
                    return afterAllPromiseResolved(key);
                }
                return Promise.resolve();
            });
        }
        return Promise.resolve();
    }
    
    function returnResWithStatus(key: string | symbol): Promise<ReturnType<F>> {
        const latestPromise = runFnPromiseQueue.get(key)!.at(-1);
        return Promise.allSettled([latestPromise]).then((res) => {
            if (res[0].status === "rejected") {
                return Promise.reject(res[0].reason);
            }
            // all promise are settled, clear the queue
            runFnPromiseQueue.set(key, []);
            return res[0].value;
        })
    }
    
    return function (...args: any[]) {
        const runFnPromise = fn(...args);
        const key = getKey(isRetryFn ? args[0] : args);
        if (!runFnPromiseQueue.has(key)) {
            runFnPromiseQueue.set(key, [runFnPromise]);
        } else {
            runFnPromiseQueue.get(key)!.push(runFnPromise);
        }
        const res = runFnPromise.then(() => {
            return afterAllPromiseResolved(key).then(() => {
                return returnResWithStatus(key);
            });
        }).catch(() => {
            return afterAllPromiseResolved(key).then(() => {
                return returnResWithStatus(key);
            });
        });
        return res;
    }
}

/**
 * Creates a function that implements take-latest behavior for Promises.
 * 
 * This is the main API for creating take-latest Promise functions.
 * When multiple calls are made with the same key, all calls will resolve
 * with the result of the latest call.
 * 
 * @param fn - The async function to wrap
 * @param getKey - Function to generate a key for grouping calls (defaults to parameter-based key)
 * @returns A wrapped function that implements take-latest behavior
 */
export function createTakeLatestPromise<F extends PromiseFunction>(
    fn: (...args: Parameters<F>) => ReturnType<F>,
    getKey: (...params: any[]) => string | symbol = defaultGenKeyByParams,
): (...args: Parameters<F>) => Promise<ReturnType<F>> {
    return createTakeLatestPromiseFn(fn, getKey, false);
}


