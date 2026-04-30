import type { DependencyList } from "react";

export const isDev = typeof process !== 'undefined'
  && typeof process.env !== 'undefined'
  && process.env.NODE_ENV !== 'production';

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

// Re-export scope constants from token-manager for backward compatibility.
// DEFAULT_*_KEY symbols are internal — not surfaced here.
export { SCOPE, DIMENSIONS, TokenManager } from "./token-manager";
export type { T_SCOPE, T_DIMENSIONS } from "./token-manager";

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