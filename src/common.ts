import type { DependencyList } from "react";

export type PromiseFunction = (...args: any) => Promise<any>;

/**
 * Error type that can be thrown by async functions
 * Covers most common error scenarios while maintaining flexibility
 */
export type AsyncError = Error | string | any;

export type PickPromiseType<P extends (...arg: any) => Promise<any>> =
  P extends (...arg: any) => Promise<infer V> ? V : never;

export const shallowEqual = (arr1: DependencyList, arr2: DependencyList) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    return false;
  }
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((a1, index) => a1 === arr2[index]);
};

export type AnyFn = (...args: any) => any;

export const SCOPE = {
  FUNCTION: 0,
  PARAMETERS: 1,
} as const;

/**
 * @deprecated Use SCOPE instead. DIMENSIONS will be removed in v3.0.0
 */
export const DIMENSIONS = SCOPE;

export type T_SCOPE = typeof SCOPE[keyof typeof SCOPE];

/**
 * @deprecated Use T_SCOPE instead. T_DIMENSIONS will be removed in v3.0.0
 */
export type T_DIMENSIONS = T_SCOPE;



export function defaultGenKeyByParams(params: any[]) {
	try {
	  return JSON.stringify(params);
	} catch (error) {
	  console.warn('great-async: serialize parameters failed!');
	  return '[]'
	}
  }
  

export interface CacheData {
	timestamp: number;
	data: any;
  }

export const cacheMap =
  typeof WeakMap !== "undefined"
    ? new WeakMap<AnyFn, Map<string, CacheData>>()
    : new Map<AnyFn, Map<string, CacheData>>();

export function getCache({
	ttl, cacheCapacity,
	fn,
	key
}: {
	ttl: number;
	cacheCapacity: number;
	fn: AnyFn;
	key: string
}) {
	if (ttl !== -1) {
	  // Check and delete expired caches on each call to prevent out of memory error
	  const thisCache = cacheMap.get(fn);
	  const cacheObj = thisCache?.get(key);
	  if (cacheObj && Date.now() - cacheObj.timestamp < ttl) {
		return {
			value: cacheObj.data
		};
	  }
	}
	if (cacheCapacity !== -1) {
	  const thisCache = cacheMap.get(fn);
	  const cacheObj = thisCache?.get(key);
	  if (cacheObj) {
		return {
			value: cacheObj.data
		};
	  }
	}
	return null;
}

export class AsyncResolveToken {
  value: symbol;
  constructor(v: symbol) {
    this.value = v;
  }
}

export class AsyncResolveResult<T = any> {
  result: T;
  constructor(r: T) {
    this.result = r;
  }
}


export const DEFAULT_TIMER_KEY = Symbol('DEFAULT_TIMER_KEY');
export const DEFAULT_SINGLE_KEY = Symbol('DEFAULT_SINGLE_KEY');
export const DEFAULT_PROMISE_DEBOUNCE_KEY = Symbol('DEFAULT_PROMISE_DEBOUNCE_KEY');


export class TokenManager {
	scope: T_SCOPE;
	token = new Map<string|symbol, symbol>();
	constructor(s: T_SCOPE) {
		this.scope = s;
	}
	getKey(key?: string|symbol) {
		if (this.scope === SCOPE.PARAMETERS) {
			return key || DEFAULT_TIMER_KEY;
		}
		return DEFAULT_TIMER_KEY;
	}
	initToken(key?: string|symbol) {
		this.token.set(this.getKey(key), Symbol('async_token'));
	}
	getToken(key?: string|symbol) {
		if (!this.token.has(this.getKey(key))) {
			this.initToken(key);
		}
		return this.token.get(this.getKey(key))!;
	}
	refresh(key?: string|symbol) {
		this.initToken(key);
		return this.token.get(this.getKey(key));
	}
	remove(key?: string|symbol) {
		this.token.delete(this.getKey(key));
	}
}