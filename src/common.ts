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

export class FalsyValue {
  v: any;
  constructor(v: any) {
    this.v = v;
  }
  getValue() {
    return this.v;
  }
}

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