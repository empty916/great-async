# Changelog

All notable changes to this project will be documented in this file.

## [1.0.7-beta10] - 2025-01-08

### Added
- **Simplified API Names**: Added concise aliases for better developer experience
  - `createAsync` - Simplified alias for `createAsyncController`
  - `useAsync` - Simplified alias for `useAsyncFunction`
  - Both new and original APIs are fully compatible and can be used interchangeably
  - New dedicated files: `createAsync.ts` and `useAsync.ts`
  - Full subpath import support for new APIs

### Enhanced
- **Retry Strategy Enhancement**: Added `currentRetryCount` parameter and independent retry control
  - `retryStrategy` now receives `(error, currentRetryCount)` instead of just `(error)`
  - `currentRetryCount` is 1-based (1 for first retry, 2 for second retry, etc.)
  - **Independent Retry Control**: `retryStrategy` can now work completely independently without `retryCount`
  - Enables more sophisticated retry logic based on attempt number and error type
  - Maintains backward compatibility with single-parameter functions and `retryCount`
  ```typescript
  // Independent retry control (no retryCount needed)
  const smartRetry = createAsync(myFunction, {
    retryStrategy: (error, currentRetryCount) => {
      // Network errors: retry first 2 attempts
      if (error.type === 'network') return currentRetryCount <= 2;
      // Server errors: retry first 3 attempts
      if (error.status >= 500) return currentRetryCount <= 3;
      return false;
    }
  });

  // Traditional approach (still supported)
  const traditionalRetry = createAsync(myFunction, {
    retryCount: 3,
    retryStrategy: (error, currentRetryCount) => {
      return currentRetryCount <= 2 && error.message.includes('network');
    }
  });
  ```
- **Import Flexibility**: Multiple ways to import the same functionality
  ```typescript
  // Concise (recommended)
  import { createAsync, useAsync } from 'great-async';
  import { createAsync } from 'great-async/create-async';
  import { useAsync } from 'great-async/use-async';

  // Original (still supported)
  import { createAsyncController, useAsyncFunction } from 'great-async';
  import { createAsyncController } from 'great-async/asyncController';
  import { useAsyncFunction } from 'great-async/useAsyncFunction';
  ```

### Refactored
- **Code Structure Reorganization**: Moved implementation code to new files for better maintainability
  - `createAsync.ts` now contains the main implementation (moved from `asyncController.ts`)
  - `useAsync.ts` now contains the main implementation (moved from `useAsyncFunction.ts`)
  - `asyncController.ts` and `useAsyncFunction.ts` now only handle re-exports for backward compatibility
  - Prepared for v2.0.0 where old APIs will be deprecated

### Changed
- **File Naming Convention**: Adopted kebab-case (short-dash) naming for new files
  - `src/createAsync.ts` → `src/create-async.ts`
  - `src/useAsync.ts` → `src/use-async.ts`
  - `src/promiseDebounce.ts` → `src/promise-debounce.ts`
  - `src/SharedLoadingStateManager.ts` → `src/shared-loading-state-manager.ts`
  - Updated all import paths and exports accordingly
- **Root Directory Cleanup**: Removed beta-stage root files for cleaner package structure
  - Removed: `asyncController.d.ts`, `asyncController.js`
  - Removed: `createAsync.d.ts`, `createAsync.js`
  - Removed: `useAsync.d.ts`, `useAsync.js`
  - Removed: `promiseDebounce.d.ts`, `promiseDebounce.js`
  - Removed: `SharedLoadingStateManager.d.ts`, `SharedLoadingStateManager.js`
  - Removed: `useAsyncFunction.d.ts`, `useAsyncFunction.js`
  - Only kebab-case root files are now provided for new APIs
- **Internal Module Encapsulation**: Removed public access to internal modules
  - Removed: `common.d.ts`, `common.js` (internal utilities)
  - Removed: `LRU.d.ts`, `LRU.js` (internal cache implementation)
  - Removed: `utils.d.ts`, `utils.js` (internal helper functions)
  - These modules are now only accessible through the main API

### Deprecated
- `createAsyncController` - Use `createAsync` instead (will be removed in v2.0.0)
- `useAsyncFunction` - Use `useAsync` instead (will be removed in v2.0.0)
- `retryCount` - Use `retryStrategy` instead for more flexible retry control (will be removed in v2.0.0)
  ```typescript
  // ❌ Deprecated
  createAsync(fn, { retryCount: 3 });

  // ✅ Recommended
  createAsync(fn, {
    retryStrategy: (error, currentRetryCount) => currentRetryCount <= 3
  });
  ```

## [1.0.7-beta11] - 2025-01-08

### Fixed
- **TypeScript Module Resolution**: Fixed TypeScript import errors for subpath imports in UMI and other frameworks
  - Added root-level `.d.ts` and `.js` files for all modules to support proper TypeScript module resolution
  - Now `import { createAsyncController } from 'great-async/asyncController'` works correctly in TypeScript
  - Improved compatibility with different bundlers and TypeScript configurations

### Added
- Root-level module files for better TypeScript support:
  - `asyncController.js` and `asyncController.d.ts`
  - `useAsyncFunction.js` and `useAsyncFunction.d.ts`
  - Similar files for all other modules

## [1.0.7-beta10] - 2025-01-08

### Added
- **Enhanced Import Compatibility**: Added support for direct dist imports to improve compatibility with different bundlers and frameworks (especially UMI/Webpack)
  - `great-async/dist/asyncController` (direct dist access)
  - `great-async/dist/useAsyncFunction` (direct dist access)
  - Similar patterns for all other modules (`LRU`, `SharedLoadingStateManager`, etc.)

### Fixed
- Fixed import issues in UMI framework and other bundlers that expect specific path formats
- Improved module resolution compatibility across different build tools

### Documentation
- Updated README with examples of all supported import methods
- Added subpath import section with comprehensive examples

## [1.0.7-beta9] - Previous Release

### Features
- Framework-agnostic async operation management
- Smart caching with TTL and LRU strategies
- Stale-while-revalidate (SWR) pattern
- Advanced debouncing with parameter/function dimensions
- Promise debouncing (latest request wins)
- Single mode to prevent duplicate requests
- Configurable retry logic
- React hooks with shared loading states
- TypeScript support with full type safety
- Comprehensive test coverage (88% code coverage, 83 tests)
