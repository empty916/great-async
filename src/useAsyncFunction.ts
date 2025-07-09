// Re-export everything from use-async for backward compatibility
export * from './use-async';

// Import the main hook to create a backward compatible alias
import { useAsync, UseAsyncOptions, UseAsyncReturn } from './use-async';

/**
 * @deprecated Use useAsync instead. This will be removed in v2.0.0
 *
 * React hook for managing async operations with enhanced features like caching, SWR, debouncing, etc.
 * This is a backward compatible alias for useAsync.
 *
 * @param asyncFn The async function to execute
 * @param options useAsyncFunction options (same as useAsync options)
 * @returns Object containing data, loading, error, and control functions
 */
export const useAsyncFunction = useAsync;

// Re-export types with backward compatible names
export type UseAsyncFunctionOptions<F extends import('./common').PromiseFunction = import('./common').PromiseFunction> = UseAsyncOptions<F>;
export type UseAsyncFunctionReturn<F extends import('./common').PromiseFunction> = UseAsyncReturn<F>;
