# great-async


## make async operation better, it is like swrjs or react-query


### createClearExpiredCache
```ts
import { createClearExpiredCache } from 'great-async';

const getUserData = (id: string) => {
    return Promise.resolve({
        id: 'xxx',
        name: 'tom',
        age: 18,
    });
}

const getUserDataProxy = createClearExpiredCache(getUserData, {
    /**
     * debounce time config. default value is -1 which means no debounce feature,
     * optional argument
     */
    debounceTime: -1,
    /**
	 * time to live of cache, default is -1, means no cache
     * optional argument
	 */
	ttl: -1,
    /**
	 * when the fn function is called multiple times at the same time, only the first call takes effect, the default is false
     * optional argument
	 */
	single: false,
    /**
	 * a strategy to genrate key of cache,
     * params is the arguments of function.
     * optional argument
	 */
    genKeyByParams: params => JSON.stringify(params),
    /**
	 * retry count of call function when error occur
     * optional argument
	 */
	retryCount: 0;

    /**
	 * retry strategy, if return value is true, it will retry to call function
     * optional argument
	 */
	retryStrategy: (error: any) => boolean;

    /**
	 * cache capacity, cache removal strategy using LRU algorithm
	 * default value is -1, means no cache capacity limit.
     * optional argument
	 */
	cacheCapacity: -1;
});

getUserDataProxy('id-1'); // you can use it like the original getUserData function


getUserDataProxy.clearCache(); // you can clear cache manually by calling clearCache
getUserDataProxy.clearCache('id-1'); // you can clear the cache you want by giving same parameters of the cache, this example means to clear the cache with key "id-1"
```