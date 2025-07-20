# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2024-XX-XX

### 🚨 BREAKING CHANGES

#### Removed Deprecated APIs
- **Removed `createAsyncController`**: Use `createAsync` instead
- **Removed `useAsyncFunction`**: Use `useAsync` instead
- **Removed package.json exports**: `/asyncController` and `/useAsyncFunction` paths no longer available

#### Parameter Structure Changes
- **New grouped parameter structure**: Options are now organized into logical groups (`cache`, `debounce`, `single`, `retry`, `hooks`)
- **Legacy flat structure still supported**: v1.x parameter format works with deprecation warnings
- **Simplified retry logic**: `retryCount` + `retryStrategy` → single `retry` function

#### Return Value Changes
- **New `pending` property**: More semantically correct than `loading` for async operations
- **Deprecated `loading` property**: Still available for backward compatibility but will be removed in v3.0.0
- Both `pending` and `loading` return the same value in v2.0 for seamless migration

```typescript
// ✅ Recommended - New pending property
const { data, pending, error } = useAsync(fetchUser);
if (pending) return <div>Loading...</div>;

// ⚠️ Deprecated - Still works but will be removed in v3.0.0
const { data, loading, error } = useAsync(fetchUser);
if (loading) return <div>Loading...</div>;
```

#### Parameter Changes
- **New `pendingId` parameter**: More semantically correct than `loadingId` for shared state
- **Deprecated `loadingId` parameter**: Still available for backward compatibility but will be removed in v3.0.0
- **New static methods**: `useAsync.showPending()` and `useAsync.hidePending()`
- **Deprecated static methods**: `useAsync.showLoading()` and `useAsync.hideLoading()`

```typescript
// ✅ Recommended - New pendingId parameter
const { pending } = useAsync(fetchUser, { pendingId: 'user-data' });

// ⚠️ Deprecated - Still works but will be removed in v3.0.0
const { pending } = useAsync(fetchUser, { loadingId: 'user-data' });

// ✅ Recommended - New static methods
useAsync.showPending('user-data');
useAsync.hidePending('user-data');

// ⚠️ Deprecated - Still works but will be removed in v3.0.0
useAsync.showLoading('user-data');
useAsync.hideLoading('user-data');
```

#### Internal Module Changes
- **New `share-pending` module**: Modern implementation with consistent naming
- **Removed `share-loading` module**: Completely removed in favor of `share-pending`
- **New classes and functions**: `SharePending`, `sharePending`, `usePendingState`
- **Breaking change**: `ShareLoading` APIs are no longer available (clean v2.0 release)

#### Package Exports Updates
- **New exports**: Added `share-pending`, `take-latest-promise`, and `common` module exports
- **Import paths**: All modules now support both direct and `/dist/` prefixed imports
- **Tree-shaking**: Better support for individual module imports

```typescript
// ✅ New module exports available
import { SharePending } from 'great-async/share-pending';
import { takeLatestPromise } from 'great-async/take-latest-promise';
import { LRU } from 'great-async/common';

// ✅ Both import styles supported
import { useAsync } from 'great-async/use-async';
import { useAsync } from 'great-async/dist/use-async';
```

### ✨ NEW FEATURES

#### Modern Parameter Structure
- **`cache`**: `{ ttl, capacity, keyGenerator, swr }`
- **`debounce`**: `{ time, scope, takeLatest }`
- **`single`**: `{ enabled, scope }`
- **`retry`**: `(error, currentRetryCount) => boolean`
- **`hooks`**: `{ beforeRun, onBackgroundUpdateStart, onBackgroundUpdate }`

#### Enhanced Type Safety
- **Function overloads**: Separate types for modern vs legacy parameter structures
- **Automatic conversion**: Legacy parameters automatically converted to modern structure
- **Better IntelliSense**: Improved TypeScript autocomplete and error messages

#### Improved Naming
- **`DIMENSIONS` → `SCOPE`**: More semantic constant naming
- **`cacheCapacity` → `capacity`**: Consistent naming within cache options
- **`genKeyByParams` → `keyGenerator`**: More descriptive property names

### 🔧 IMPROVEMENTS

#### Developer Experience
- **Comprehensive migration guide**: Detailed examples for upgrading from v1.x
- **Backward compatibility**: All v1.x code continues to work
- **Better documentation**: Updated examples use modern parameter structure
- **Cleaner API surface**: Focus on primary APIs without deprecated aliases

#### Performance
- **Reduced bundle size**: Eliminated duplicate code from deprecated APIs
- **Better tree shaking**: Cleaner exports improve dead code elimination

### 📚 DOCUMENTATION

#### Updated Examples
- All README examples use modern grouped parameter structure
- Added comprehensive migration guide with before/after comparisons
- Updated API reference with grouped parameter documentation
- Added breaking changes section with clear migration paths

### 🧪 TESTING

#### Enhanced Test Coverage
- Added backward compatibility tests
- Parameter conversion tests
- Type safety validation tests
- Migration scenario tests

### Migration Guide

```typescript
// ❌ v1.x (removed in v2.0)
import { createAsyncController, useAsyncFunction } from 'great-async';

const api = createAsyncController(fetchData, {
  ttl: 60000,
  debounceTime: 300,
  retryCount: 3
});

// ✅ v2.0 (use these instead)
import { createAsync, useAsync } from 'great-async';

const api = createAsync(fetchData, {
  cache: { ttl: 60000 },
  debounce: { time: 300 },
  retry: (error, count) => count <= 3
});
```

## [1.0.7-beta10] - 2025-01-08

### Added
- **Simplified API Names**: Added concise aliases for better developer experience
  - `createAsync` - Modern API (replaces `createAsyncController` in v2.0)
  - `useAsync` - Modern API (replaces `useAsyncFunction` in v2.0)
  - Both new and original APIs were fully compatible in v1.x
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
  // Modern API (v2.0+)
  import { createAsync, useAsync } from 'great-async';
  import { createAsync } from 'great-async/create-async';
  import { useAsync } from 'great-async/use-async';
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
  - Improved compatibility with different bundlers and TypeScript configurations

### Added
- Root-level module files for better TypeScript support:
  - `create-async.js` and `create-async.d.ts`
  - `use-async.js` and `use-async.d.ts`
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
