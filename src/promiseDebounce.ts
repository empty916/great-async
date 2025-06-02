import { defaultGenKeyByParams, DIMENSIONS, PromiseFunction, T_DIMENSIONS } from "./common";



export function createPromiseDebounceFn<F extends PromiseFunction>(
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

export function createPromiseDebounce<F extends PromiseFunction>(
    fn: (...args: Parameters<F>) => ReturnType<F>,
    getKey: (...params: any[]) => string | symbol = defaultGenKeyByParams,
): (...args: Parameters<F>) => Promise<ReturnType<F>> {
    return createPromiseDebounceFn(fn, getKey, false);
}