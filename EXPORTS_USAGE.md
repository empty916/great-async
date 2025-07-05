# Subpath Imports

Starting from version 1.0.7-beta5, `great-async` supports subpath imports, allowing you to import individual modules directly without including the entire library.

## Available Subpath Imports

### Main Library
```typescript
// Import everything (default)
import { createAsyncController, useAsyncFunction, SharedLoadingStateManager } from 'great-async';
```

### Individual Modules

#### AsyncController
```typescript
// Import only asyncController functionality
import { createAsyncController, DIMENSIONS, DEFAULT_TIMER_KEY } from 'great-async/asyncController';
```

#### React Hook
```typescript
// Import only React hook functionality
import { useAsyncFunction } from 'great-async/useAsyncFunction';
```

#### Shared Loading State Manager
```typescript
// Import only shared loading state functionality
import { SharedLoadingStateManager, sharedLoadingStateManager, useLoadingState } from 'great-async/SharedLoadingStateManager';
```

#### Promise Debounce
```typescript
// Import only promise debounce functionality
import { createPromiseDebounce } from 'great-async/promiseDebounce';
```

#### LRU Cache
```typescript
// Import only LRU cache functionality
import { LRU } from 'great-async/LRU';
```

#### Common Utilities
```typescript
// Import only common utilities
import { shallowEqual, FalsyValue, DIMENSIONS, cacheMap } from 'great-async/common';
```

#### Utils
```typescript
// Import only utility functions
import { sleep } from 'great-async/utils';
```

## Benefits

1. **Tree Shaking**: Only import what you need, reducing bundle size
2. **Better Performance**: Smaller bundles load faster
3. **Cleaner Code**: More explicit about which functionality you're using
4. **Type Safety**: Full TypeScript support for all subpath imports

## Migration

### Before (still works)
```typescript
import { createAsyncController } from 'great-async/dist/asyncController';
```

### After (recommended)
```typescript
import { createAsyncController } from 'great-async/asyncController';
```

## Example Usage

```typescript
// Only import what you need for a Node.js project
import { createAsyncController, DIMENSIONS } from 'great-async/asyncController';

const controller = createAsyncController(myAsyncFunction, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.PARAMETERS
});
```

```typescript
// Only import React hooks for a React project
import { useAsyncFunction } from 'great-async/useAsyncFunction';
import { useLoadingState } from 'great-async/SharedLoadingStateManager';

function MyComponent() {
  const { loading, data, error } = useAsyncFunction(fetchData, {
    loadingId: 'my-data'
  });
  
  const globalLoading = useLoadingState('my-data');
  
  // ... component logic
}
``` 