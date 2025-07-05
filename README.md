# great-async

🚀 A powerful async operation library that makes async operations effortless, with built-in caching, SWR, debouncing, and more.

[![npm version](https://badge.fury.io/js/great-async.svg)](https://badge.fury.io/js/great-async)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why great-async?

- 🎯 **Framework Agnostic** - Works with any JavaScript environment
- ⚡ **SWR Pattern** - Show cached data instantly, update in background
- 🔄 **Smart Caching** - TTL and LRU cache strategies
- 🚫 **Duplicate Prevention** - Merge identical concurrent requests
- 🔁 **Auto Retry** - Configurable retry logic with custom strategies
- ⏰ **Debouncing** - Control when functions execute
- ⚛️ **React Ready** - Built-in hooks with loading states

## Installation

```bash
npm install great-async
```

## Core API - createAsyncController

The heart of `great-async` is `createAsyncController` - a framework-agnostic function that enhances any async function with powerful features.

### Basic Usage

```typescript
import { createAsyncController } from 'great-async';
// or for tree-shaking
import { createAsyncController } from 'great-async/asyncController';

// Enhance any async function
const fetchUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

const enhancedFetch = createAsyncController(fetchUserData, {
  ttl: 60000, // Cache for 1 minute
  swr: true,  // Enable stale-while-revalidate
});

// Use it like the original function
const userData = await enhancedFetch('123');
```

### Core Features

#### 🔄 Smart Caching

```typescript
const cachedAPI = createAsyncController(fetchData, {
  ttl: 5 * 60 * 1000,     // Cache for 5 minutes
  cacheCapacity: 100,      // LRU cache with max 100 items
});

// First call: hits the API
const data1 = await cachedAPI('param1');

// Second call within 5 minutes: returns cached data
const data2 = await cachedAPI('param1'); // ⚡ Instant!
```

#### ⚡ SWR (Stale-While-Revalidate)

Perfect for improving perceived performance:

```typescript
const swrAPI = createAsyncController(fetchUserProfile, {
  swr: true,
  ttl: 60000,
  onBackgroundUpdate: (freshData, error) => {
    if (freshData) console.log('Data updated in background!');
    if (error) console.error('Background update failed:', error);
  },
});

// First call: normal API request
await swrAPI('user123');

// Subsequent calls: instant cached response + background update
const profile = await swrAPI('user123'); // ⚡ Returns cached data immediately
// Background: fetches fresh data and updates cache
```

#### 🚫 Promise Debounce

When multiple identical requests are made, only the latest one's result is used and all pending requests share its result:

```typescript
const searchAPI = createAsyncController(performSearch, {
  promiseDebounce: true,
});

// Make multiple calls in quick succession
const promise1 = searchAPI('react'); // Starts execution
const promise2 = searchAPI('react'); // Starts execution, promise1 result will be discarded
const promise3 = searchAPI('react'); // Starts execution, promise1 & promise2 results will be discarded

// All promises resolve with the result from the final (3rd) call
const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
console.log(result1 === result2 && result2 === result3); // true - all use result from promise3
```

#### ⏰ Debouncing

Control when functions execute:

```typescript
import { DIMENSIONS } from 'great-async/asyncController';

const debouncedSearch = createAsyncController(searchAPI, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.PARAMETERS, // Debounce per unique parameters
});

// Rapid calls - only the last one executes
debouncedSearch('re');
debouncedSearch('rea');
debouncedSearch('react'); // Only this call will execute after 300ms
```

#### 🔁 Smart Retry Logic

Handle failures gracefully:

```typescript
const resilientAPI = createAsyncController(fetchData, {
  retryCount: 3,
  retryStrategy: (error) => {
    // Retry on server errors, not client errors
    return error.status >= 500;
  },
});

// Automatically retries up to 3 times on 5xx errors
const data = await resilientAPI('important-data');
```

#### 📦 Single Mode

Prevent concurrent executions - all pending requests share the result of the first ongoing request:

```typescript
const singletonAPI = createAsyncController(heavyOperation, {
  single: true,
});

// Multiple calls during first request execution
const promise1 = singletonAPI('data1'); // Executes immediately
const promise2 = singletonAPI('data2'); // Waits and shares result from first call
const promise3 = singletonAPI('data3'); // Waits and shares result from first call

// All promises resolve with the same result from the first call
const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
console.log(result1 === result2 && result2 === result3); // true
```

### Real-World Examples

#### 🌐 Node.js API Client

```typescript
import { createAsyncController, DIMENSIONS } from 'great-async/asyncController';

class APIClient {
  private cachedGet = createAsyncController(this.httpGet, {
    ttl: 5 * 60 * 1000,        // 5 minute cache
    cacheCapacity: 200,         // LRU cache
    retryCount: 3,              // Retry failed requests
    retryStrategy: (error) => error.status >= 500,
  });

  private debouncedSearch = createAsyncController(this.httpGet, {
    debounceTime: 300,
    debounceDimension: DIMENSIONS.PARAMETERS,
    promiseDebounce: true,      // Latest search wins, discard previous identical searches
  });

  async getUser(id: string) {
    return this.cachedGet(`/users/${id}`);
  }

  async search(query: string) {
    return this.debouncedSearch(`/search?q=${query}`);
  }

  private async httpGet(url: string) {
    const response = await fetch(`https://api.example.com${url}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

#### 🔍 Advanced Search System

```typescript
const createSearchController = (endpoint: string) => {
  return createAsyncController(
    async (query: string) => {
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
      return response.json();
    },
    {
      // Performance optimizations
      debounceTime: 300,           // Wait for user to stop typing
      promiseDebounce: true,       // Latest search wins, discard previous identical searches
      
      // Caching strategy
      swr: true,                   // Show cached results instantly
      ttl: 2 * 60 * 1000,         // Cache for 2 minutes
      cacheCapacity: 50,           // Keep last 50 searches
      
      // Reliability
      retryCount: 2,
      retryStrategy: (error) => error.status >= 500,
      
      // Callbacks
      onBackgroundUpdate: (results, error) => {
        if (error) console.warn('Search cache update failed:', error);
      },
    }
  );
};

const searchProducts = createSearchController('/api/products/search');
const searchUsers = createSearchController('/api/users/search');

// Usage
const products = await searchProducts('laptop');    // Fresh search
const moreProducts = await searchProducts('laptop'); // ⚡ Cached + background update
```

## React Integration - useAsyncFunction

For React applications, `great-async` provides `useAsyncFunction` hook that builds on top of `createAsyncController`:

### Basic React Usage

```tsx
import { useAsyncFunction } from 'great-async';
// or for tree-shaking
import { useAsyncFunction } from 'great-async/useAsyncFunction';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useAsyncFunction(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    { deps: [userId] } // Re-run when userId changes
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>Hello, {data.name}!</div>;
}

// Advanced: Control when requests are triggered
function SearchResults({ query }: { query: string }) {
  const { data, loading, fn: search } = useAsyncFunction(
    () => searchAPI(query),
    { 
      auto: 'deps-only', // Only search when query changes, not on mount
      deps: [query],
    }
  );

  return (
    <div>
      <button onClick={() => search()}>Search Now</button>
      {loading && <div>Searching...</div>}
      {data?.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}
```

### React-Specific Features

#### 📱 Shared Loading States

Share loading states across multiple components:

```tsx
import { useAsyncFunction } from 'great-async/useAsyncFunction';
import { useLoadingState } from 'great-async/SharedLoadingStateManager';

function UserProfile() {
  const { data } = useAsyncFunction(fetchUser, {
    loadingId: 'user-data', // Shared loading identifier
  });
  
  return <div>User: {data?.name}</div>;
}

function LoadingIndicator() {
  const isLoading = useLoadingState('user-data'); // Reacts to same loading state
  
  return isLoading ? <div>Loading user...</div> : null;
}
```

#### 🔄 React SWR Pattern

```tsx
function Dashboard() {
  const { data: user, backgroundUpdating } = useAsyncFunction(
    fetchCurrentUser,
    {
      swr: true,
      ttl: 2 * 60 * 1000, // 2 minutes
      onBackgroundUpdate: (newData, error) => {
        if (error) toast.error('Failed to sync user data');
      },
    }
  );

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      {backgroundUpdating && <span>🔄 Syncing...</span>}
    </div>
  );
}
```

#### 🔍 Search with Debouncing

```tsx
function SearchBox() {
  const [query, setQuery] = useState('');
  
  const { data: results, loading } = useAsyncFunction(
    () => searchAPI(query),
    {
      deps: [query],
      debounceTime: 300,     // Wait for user to stop typing
      promiseDebounce: true, // Latest search wins, discard previous identical searches
      auto: query.length > 2, // Only search with 3+ characters
    }
  );

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <span>Searching...</span>}
      {results?.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}
```

#### 🎯 Conditional Auto-Execution

Control when automatic requests are triggered:

```tsx
function UserSettings({ userId }: { userId: string }) {
  const [filters, setFilters] = useState({ category: '', status: '' });
  
  // Only auto-fetch when filters change, not on initial mount
  const { data: settings, loading, fn: refetch } = useAsyncFunction(
    () => fetchUserSettings(userId, filters),
    {
      auto: 'deps-only',  // Don't auto-call on mount, only when deps change
      deps: [userId, filters],
    }
  );

  return (
    <div>
      <button onClick={() => refetch()}>Load Settings</button>
      <FilterControls 
        filters={filters} 
        onChange={setFilters} // Will trigger auto-fetch when changed
      />
      {loading && <div>Loading...</div>}
      {settings && <SettingsPanel data={settings} />}
    </div>
  );
}
```
```

## API Reference

### createAsyncController(asyncFn, options)

#### Caching Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `-1` | Cache duration in milliseconds |
| `cacheCapacity` | `number` | `-1` | Maximum cache size (LRU) |
| `swr` | `boolean` | `false` | Enable stale-while-revalidate |

#### Performance Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounceTime` | `number` | `-1` | Debounce delay in milliseconds |
| `debounceDimension` | `DIMENSIONS` | `FUNCTION` | Debounce scope |
| `promiseDebounce` | `boolean` | `false` | Latest request wins - discard previous identical requests |
| `single` | `boolean` | `false` | Share result of first ongoing request with all pending requests |
| `singleDimension` | `DIMENSIONS` | `FUNCTION` | Single mode scope |

#### Reliability Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retryCount` | `number` | `0` | Number of retry attempts |
| `retryStrategy` | `function` | `() => true` | Custom retry logic |

#### Callbacks
| Option | Type | Description |
|--------|------|-------------|
| `beforeRun` | `() => void` | Called before function execution |
| `onBackgroundUpdate` | `(data, error) => void` | Called when SWR background update completes |
| `onBackgroundUpdateStart` | `(cachedData) => void` | Called when SWR background update starts |

### useAsyncFunction(asyncFn, options)

Extends `createAsyncController` options with React-specific features:

#### React-Specific Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auto` | `boolean \| 'deps-only'` | `true` | Control auto-execution behavior:<br/>• `true`: Auto-call on mount and deps change<br/>• `false`: Manual execution only<br/>• `'deps-only'`: Auto-call only when deps change |
| `deps` | `Array` | `[]` | Re-run when dependencies change |
| `loadingId` | `string` | `''` | Share loading state across components |

#### Return Values
| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The result data |
| `loading` | `boolean` | True during initial load |
| `error` | `any` | Error object if request fails |
| `backgroundUpdating` | `boolean` | True during SWR background updates |
| `fn` | `Function` | Manually trigger the async function |
| `clearCache` | `Function` | Clear cached data |

## Subpath Imports

Starting from version 1.0.7-beta5, you can import individual modules:

```typescript
// Import only what you need
import { createAsyncController } from 'great-async/asyncController';
import { useAsyncFunction } from 'great-async/useAsyncFunction';
import { LRU } from 'great-async/LRU';
```

See [EXPORTS_USAGE.md](./EXPORTS_USAGE.md) for complete details.

## Migration Guide

### From other libraries

```tsx
// From SWR
- import useSWR from 'swr'
+ import { useAsyncFunction } from 'great-async'

- const { data, error } = useSWR('/api/user', fetcher)
+ const { data, error } = useAsyncFunction(fetchUser, { swr: true })

// From React Query
- import { useQuery } from 'react-query'
+ import { useAsyncFunction } from 'great-async'

- const { data, isLoading } = useQuery('user', fetchUser)
+ const { data, loading } = useAsyncFunction(fetchUser, { ttl: 300000 })
```

## Best Practices

### ✅ Do's

- Start with `createAsyncController` for framework-agnostic code
- Use `swr: true` for data that doesn't change often
- Set appropriate `ttl` values based on data freshness needs
- Use `debounceTime` for user input-triggered requests
- Implement `retryStrategy` for better error handling
- Use `deps` array in React to control when requests re-run
- Use `auto: 'deps-only'` for conditional data loading (e.g., search, filters)
- Prefer `auto: false` for expensive operations that should be manually triggered

### ❌ Don'ts

- Don't set very short TTL values (< 1 second) without good reason
- Don't use SWR for real-time data that must be always fresh
- Don't forget to handle errors in production
- Don't set `cacheCapacity` too high in memory-constrained environments

## License

MIT © [great-async](https://github.com/empty916/great-async)

