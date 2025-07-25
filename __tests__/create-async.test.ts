import { DIMENSIONS, cacheMap, createAsync } from '../src';
import { sleep } from '../src/utils';


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
		single: true,
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
		single: true,
		singleDimension: DIMENSIONS.PARAMETERS
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
		single: true,
		singleDimension: DIMENSIONS.PARAMETERS
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
		debounceTime: 90,
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
		debounceTime: 90,
		takeLatest: true,
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
		debounceTime: 90,
		debounceDimension: DIMENSIONS.PARAMETERS
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
		debounceTime: 90,
		debounceDimension: DIMENSIONS.PARAMETERS
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
		ttl: 310,
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
		cacheCapacity: 2,
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
		cacheCapacity: 3,
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
		debounceTime: 50,
		ttl: 160 * 4,
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
		ttl: 310,
		genKeyByParams: ([name]) => name || '[]',
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
		ttl: 310,
		genKeyByParams: ([name]) => name || '[]',
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
		ttl: 310,
		genKeyByParams: ([name]) => name || '[]',
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
		ttl: 100,
		genKeyByParams: ([name]) => name || '[]',
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
	}, {retryCount: 2});
	
	await expect(getUserData()).rejects.toThrow('error message');
	expect(times).toBe(3);
});


test('retry error', async () => {
	let times = 0;
	const getUserData = createAsync(async () => {
		times++;
		await sleep(100);
		throw new Error('error message');
	}, {retryCount: 2});
	
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
		retryCount: 2,
		retryStrategy: error => error.message === 'error'
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
		retryCount: 2,
		retryStrategy: error => error.message === 'error message'
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
	}, {retryCount: 2});
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