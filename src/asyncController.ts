// Re-export everything from create-async for backward compatibility
export * from './create-async';

// Import the main function to create a backward compatible alias
import { createAsync, CreateAsyncOptions, ReturnTypeOfCreateAsync } from './create-async';

/**
 * @deprecated Use createAsync instead. This will be removed in v2.0.0
 *
 * Create async controller with enhanced features like caching, debouncing, SWR, etc.
 * This is a backward compatible alias for createAsync.
 *
 * @param fn A function and it's return type must be Promise
 * @param options createAsyncController options (same as createAsync options)
 * @returns Enhanced function with additional methods
 */
export const createAsyncController = createAsync;

// Re-export types with backward compatible names
export type CreateAsyncControllerOptions<F extends import('./common').PromiseFunction = import('./common').PromiseFunction> = CreateAsyncOptions<F>;
export type ReturnTypeOfCreateAsyncController<F extends import('./common').PromiseFunction> = ReturnTypeOfCreateAsync<F>;
