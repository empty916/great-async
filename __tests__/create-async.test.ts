import { SCOPE, createAsync, WeakMapCacheManager } from '../src';
import { sleep } from '../src/utils';

const { cacheMap } = WeakMapCacheManager;


test('normal', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		return {
			name: 'tom',
			age: 10
		}
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		const promiseRes = getUserData();
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	await Promise.all(queue);
	expect(times).toBe(100);

});


test('single', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		return {
			name: 'tom',
			age: 10
		}
	}, {
		single: { enabled: true },
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		const promiseRes = getUserData();
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(1);
	expect(times).toBe(1);

});



test('single with parameter dimension 1', async () => {
	let times = 0;
	const getUserData = createAsync(async (i: number) => {
		times++;
		await sleep(100);
		return {
			i,
			name: 'tom',
			age: 10
		}
	}, {
		single: { enabled: true, scope: SCOPE.KEYED }
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		const promiseRes = getUserData(i);
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(100);
	expect(times).toBe(100);

});



test('single with parameter dimension 2', async () => {
	let times = 0;
	const getUserData = createAsync(async (i: number) => {
		times++;
		await sleep(100);
		return {
			i,
			name: 'tom',
			age: 10
		}
	}, {
		single: { enabled: true, scope: SCOPE.KEYED }
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		const promiseRes = getUserData(i % 3);
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(3);
	expect(times).toBe(3);
});


test('debounce time', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		return {
			name: 'tom',
			age: 10
		}
	}, {
		debounce: { time: 90 },
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		const promiseRes = getUserData();
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(1);
	expect(times).toBe(1);

});


test('debounce time 2', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		return {
			name: 'tom',
			age: 10
		}
	}, {
		debounceTime: 200,
	});
	getUserData();
	await sleep(210);
	await getUserData();
	expect(times).toBe(2);

});


test('promise and time debounce ', async () => {
	let times = 0;
	const getUserData = createAsync(async (type: '1'|'2' = '1') => {
		times++;
		await sleep(200);
		if (type === '1') {
			return {
				name: 'tom',
				age: 10
			}
		} else {
			return {
				name: 'jerry',
				age: 10
			}
		}
	}, {
		debounce: { time: 90, takeLatest: true },
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		const promiseRes = getUserData();
		queue.push(promiseRes);
	}
	await sleep(120);
	// now after 120 + 90 + 100 seconds, the promiseRes will be resolved
	const promiseRes = getUserData('2');
	queue.push(promiseRes);
	expect(queue.length).toBe(101);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(1);
	expect([...new Set(reslist)][0]).toEqual({
		name: 'jerry',
		age: 10
	});
	expect(times).toBe(2);

});


test('debounce time with parameter dimension 1', async () => {
	let times = 0;
	const getUserData = createAsync(async (i: number) => {
		times++;
		await sleep(100);
		return {
			i,
			name: 'tom',
			age: 10
		}
	}, {
		debounce: { time: 90, scope: SCOPE.KEYED }
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		const promiseRes = getUserData(i);
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(100);
	expect(times).toBe(100);

});


test('debounce time with parameter dimension 2', async () => {
	let times = 0;
	const getUserData = createAsync(async (i: number) => {
		times++;
		await sleep(100);
		return {
			i,
			name: 'tom',
			age: 10
		}
	}, {
		debounce: { time: 90, scope: SCOPE.KEYED }
	});
	
	const queue: any[] = [];
	for(let i = 0; i < 100; i++) {
		const promiseRes = getUserData(i % 3);
		queue.push(promiseRes);
	}
	expect(queue.length).toBe(100);
	const reslist = await Promise.all(queue);
	expect([...new Set(reslist)].length).toBe(3);
	expect(times).toBe(3);

});

test('ttl', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { ttl: 310 },
	});
	
	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(3);
});


test('cacheCapacity', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { capacity: 2 },
	});
	
	const resList: any[] = [];
	for(let i = 0; i < 4; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(4);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(4);
});


test('cacheCapacity work', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { capacity: 3 },
	});
	
	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(3);
});


test('ttl and debounce', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		debounce: { time: 50 },
		cache: { ttl: 160 * 4 },
	});
	
	await Promise.all([
		getUserData(0 + '' ),
		getUserData(1 + '' ),
		getUserData(2 + '' ),
	]);
	expect(times).toBe(1);

	getUserData(0 + '' );
	await sleep(160);
	expect(times).toBe(2);


	await getUserData(1 + '' );
	await sleep(160);
	expect(times).toBe(3);

	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(3);
});


test('genKeyByParams', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { ttl: 310, keyGenerator: (params: [string?]) => params[0] || '[]' },
	});
	
	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	expect(cacheMap.get(getUserData)?.get('0')).not.toBe(null);
	expect(cacheMap.get(getUserData)?.get('1')).not.toBe(null);
	expect(cacheMap.get(getUserData)?.get('2')).not.toBe(null);

	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(3);
});


test('clear cache', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { ttl: 310, keyGenerator: (params: [string?]) => params[0] || '[]' },
	});
	
	await getUserData('0');
	expect(cacheMap.get(getUserData)?.get('0')).not.toBe(null);
	
	getUserData.clearCache('0');
	expect(cacheMap.get(getUserData)?.get('0')).toBe(undefined);

	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	
	expect(cacheMap.get(getUserData)?.get('0')).not.toBe(null);
	expect(cacheMap.get(getUserData)?.get('1')).not.toBe(null);
	expect(cacheMap.get(getUserData)?.get('2')).not.toBe(null);

	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(4);
});


test('clear all cache', async () => {
	let times = 0;
	const getUserData = createAsync(async (name?: string) => {
		times++;
		await sleep(100);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { ttl: 310, keyGenerator: (params: [string?]) => params[0] || '[]' },
	});
	
	const resList: any[] = [];
	for(let i = 0; i < 100; i++) {
		resList.push(await getUserData(i % 3 + '' ));
	}
	getUserData.clearCache();
	expect(cacheMap.get(getUserData)?.get('0')).toBe(undefined);
	expect(cacheMap.get(getUserData)?.get('1')).toBe(undefined);
	expect(cacheMap.get(getUserData)?.get('2')).toBe(undefined);

	const uniquedReslist = [...new Set(resList)];
	expect(uniquedReslist.length).toBe(3);
	expect(uniquedReslist.find(i => i.name === '0')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '1')).not.toBe(null);
	expect(uniquedReslist.find(i => i.name === '2')).not.toBe(null);
	expect(times).toBe(3);
});


test('clear expired cache', async () => {
	const getUserData = createAsync(async (name?: string) => {
		await sleep(10);
		return {
			name: name || 'tom',
			age: 10
		}
	}, {
		cache: { ttl: 100, keyGenerator: (params: [string?]) => params[0] || '[]' },
	});
	await getUserData('x');
	expect(cacheMap.get(getUserData)?.get('x')?.data).toEqual({
		name: 'x',
		age: 10
	});
	await sleep(200);
	await getUserData('y');
	await sleep(20);
	expect(cacheMap.get(getUserData)?.get('x')).toBe(undefined);
	expect(cacheMap.get(getUserData)?.get('y')?.data).toEqual({
		name: 'y',
		age: 10
	});
});


test('error', async () => {
	const getUserData = createAsync(async () => {
		await sleep(100);
		throw new Error('error message');
	});
	
	await expect(getUserData()).rejects.toThrow('error message');
});

test('retry error', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		throw new Error('error message');
	}, { retry: (error: any, currentRetryCount: number) => currentRetryCount <= 2 });
	
	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(3);
});


test('retry error', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		throw new Error('error message');
	}, { retry: (error: any, currentRetryCount: number) => currentRetryCount <= 2 });
	
	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(3);

	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(6);
});

test('retry error with custom retry strategy', async () => {
	let times = 0;
	let times1 = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		throw new Error('error message');
	}, {
		retry: (error: any, currentRetryCount) => error.message === 'error' && currentRetryCount <= 2
	});
	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(1);
	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(2);
	const getUserData2 = createAsync(async () => {
		times1++;
		await sleep(100);
		throw new Error('error message');
	}, {
		retry: (error: any, currentRetryCount: number) => error.message === 'error message' && currentRetryCount <= 2
	});
	await expect(getUserData2()).rejects.toThrow('error message');
	expect(times1).toBe(3);
	await expect(getUserData2()).rejects.toThrow('error message');
	expect(times1).toBe(6);
});


test('retry call fn when occur error and return success finally', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		if (times < 3) {
			throw new Error('error message');
		}
		return {
			name: 'tom',
			age: 10
		}
	}, { retry: (error: any, currentRetryCount: number) => currentRetryCount <= 2 });
	return getUserData().then(res => {
		expect(res).toEqual({
			name: 'tom',
			age: 10,
		});
		expect(times).toBe(3);
	});
});




test('recreate', async () => {
	const getUserData = createAsync(async () => {
		await sleep(100);
		return {
			name: 'tom',
			age: 10
		}
	});
	expect(createAsync(getUserData)).not.toBe(getUserData);
});

test('SWR onBackgroundUpdate receives key parameter', async () => {
	const onBgUpdateStart = jest.fn();
	const onBgUpdate = jest.fn();

	const fetchUser = async (id: string) => {
		await sleep(20);
		return { id, fresh: true };
	};

	const enhanced = createAsync(fetchUser, {
		ttl: 1000,
		swr: true,
		onBackgroundUpdateStart: onBgUpdateStart,
		onBackgroundUpdate: onBgUpdate,
	});

	// First call: populate cache
	await enhanced('user-1');

	// Second call: SWR cache hit, triggers background update with key
	await enhanced('user-1');
	await sleep(80); // wait for background update to complete

	// onBackgroundUpdateStart should receive cached data and key
	expect(onBgUpdateStart).toHaveBeenCalledTimes(1);
	expect(onBgUpdateStart).toHaveBeenCalledWith(
		{ id: 'user-1', fresh: true },
		expect.stringContaining('user-1'),
	);

	// onBackgroundUpdate should receive fresh data, no error, and key
	expect(onBgUpdate).toHaveBeenCalledTimes(1);
	expect(onBgUpdate).toHaveBeenCalledWith(
		{ id: 'user-1', fresh: true },
		undefined,
		expect.stringContaining('user-1'),
	);
});

test('SWR onBackgroundUpdate receives key on error', async () => {
	const onBgUpdate = jest.fn();

	let shouldFail = false;
	const fetchUser = async (id: string) => {
		await sleep(20);
		if (shouldFail) throw new Error('fetch failed');
		return { id, fresh: true };
	};

	const enhanced = createAsync(fetchUser, {
		ttl: 1000,
		swr: true,
		onBackgroundUpdate: onBgUpdate,
	});

	// Populate cache
	await enhanced('user-1');

	// Trigger SWR with error
	shouldFail = true;
	await enhanced('user-1');
	await sleep(80);

	// onBackgroundUpdate should receive undefined data, the error, and key
	expect(onBgUpdate).toHaveBeenCalledTimes(1);
	const [data, error, key] = onBgUpdate.mock.calls[0];
	expect(data).toBeUndefined();
	expect(error.message).toBe('fetch failed');
	expect(key).toEqual(expect.stringContaining('user-1'));
});

test('SWR with cacheCapacity evicts least recently used entry on overflow', async () => {
	let callCount = 0;
	const fetchUser = async (id: string) => {
		callCount++;
		await sleep(10);
		return { id, call: callCount };
	};

	const enhanced = createAsync(fetchUser, {
		cacheCapacity: 2,
		swr: true,
	});

	// Fill: A → B → C. C's insert overflows capacity, evicts A (oldest).
	// LRU now contains B (oldest) and C (newest).
	await enhanced('A');
	await enhanced('B');
	await enhanced('C');
	const countAfterFill = callCount;

	// Re-fetch A — was evicted, cache miss, normal fetch.
	// This inserts A and overflows again, evicting B (now the oldest).
	await enhanced('A');
	expect(callCount).toBe(countAfterFill + 1);

	// C survived both evictions — SWR cache hit, bg update calls fetcher.
	await enhanced('C');
	await sleep(50);
	expect(callCount).toBe(countAfterFill + 2); // +1 for A fetch, +1 for C bg update
});

test('SWR with cacheCapacity: get refreshes LRU position preventing eviction', async () => {
	let callCount = 0;
	const fetchUser = async (id: string) => {
		callCount++;
		await sleep(10);
		return { id, call: callCount };
	};

	const enhanced = createAsync(fetchUser, {
		cacheCapacity: 2,
		swr: true,
	});

	// Populate A then B. LRU order: A (oldest), B (newest)
	await enhanced('A');
	await enhanced('B');

	// Access A via SWR — get() refreshes LRU: B (oldest), A (newest)
	await enhanced('A');
	await sleep(50); // let bg update finish

	// Add C — capacity overflow, oldest (B) is evicted
	await enhanced('C');

	// B was evicted — cache miss, normal fetch
	const beforeB = callCount;
	await enhanced('B');
	expect(callCount).toBe(beforeB + 1);

	// A is still in cache — SWR cache hit
	await enhanced('A');
	await sleep(50);
	// bg update for A calls fetcher once
	expect(callCount).toBe(beforeB + 2);
});