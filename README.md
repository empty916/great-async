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

## Core API - createAsync

The heart of `great-async` is `createAsync` - a framework-agnostic function that enhances any async function with powerful features.

### Basic Usage

```typescript
// Recommended: Use the modern API
import { createAsync } from 'great-async';
import { createAsync } from 'great-async/create-async';

// Legacy: Use the full name (deprecated)
import { createAsyncController } from 'great-async';
import { createAsyncController } from 'great-async/asyncController';

// Enhance any async function
const fetchUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

const enhancedFetch = createAsync(fetchUserData, {
  ttl: 60000, // Cache for 1 minute
  swr: true,  // Enable stale-while-revalidate
});

// Use it like the original function
const userData = await enhancedFetch('123');
```

### Core Features

#### 🔄 Smart Caching

```typescript
// Define the API function
const fetchData = async (param: string) => {
  const response = await fetch(`/api/data/${param}`);
  return response.json();
};

const cachedAPI = createAsync(fetchData, {
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
// Define the API function
const fetchUserProfile = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}/profile`);
  return response.json();
};

const swrAPI = createAsync(fetchUserProfile, {
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

#### 🎯 Take Latest Promise

When multiple identical requests are made, only the latest one's result is used and all pending requests share its result:

```typescript
// Define the API function
const performSearch = async (query: string) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
};

const searchAPI = createAsync(performSearch, {
  takeLatest: true,
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

Control when functions execute with two different scopes:

```typescript
import { DIMENSIONS } from 'great-async/asyncController';

// Define the API function
const searchAPI = async (query: string) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
};

// PARAMETERS dimension: Debounce per unique parameters
const parameterDebounce = createAsync(searchAPI, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.PARAMETERS,
});

// Each unique parameter gets its own debounce timer
parameterDebounce('react');  // Timer 1: Will execute after 300ms
parameterDebounce('vue');    // Timer 2: Will execute after 300ms (different parameter)
parameterDebounce('react');  // Cancels Timer 1, starts new timer for 'react'

// FUNCTION dimension: Debounce ignores parameters
const functionDebounce = createAsync(searchAPI, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.FUNCTION,
});

// All calls share the same debounce timer regardless of parameters
functionDebounce('react');   // Starts global timer
functionDebounce('vue');     // Cancels previous timer, starts new one
functionDebounce('angular'); // Only this call will execute after 300ms
```

#### 🔁 Smart Retry Logic

Handle failures gracefully:

```typescript
// Define the API function
const fetchData = async (param: string) => {
  const response = await fetch(`/api/data/${param}`);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
};

const resilientAPI = createAsync(fetchData, {
  retryStrategy: (error, currentRetryCount) => {
    // Retry on server errors, but limit retries for specific errors
    if (error.status >= 500) {
      // For 503 Service Unavailable, only retry first 2 attempts
      if (error.status === 503) {
        return currentRetryCount <= 2;
      }
      // For other server errors, retry all attempts
      return true;
    }
    // Don't retry client errors
    return false;
  },
});

// Automatically retries up to 3 times on 5xx errors
const data = await resilientAPI('important-data');
```

#### 📦 Single Mode

Prevent concurrent executions - all pending requests share the result of the first ongoing request:

```typescript
// Define the API function
const heavyOperation = async (param: string) => {
  // Simulate a heavy operation
  await new Promise(resolve => setTimeout(resolve, 2000));
  const response = await fetch(`/api/heavy/${param}`);
  return response.json();
};

const singletonAPI = createAsync(heavyOperation, {
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
import { createAsync, DIMENSIONS } from 'great-async/create-async';

class APIClient {
  private cachedGet = createAsync(this.httpGet, {
    ttl: 5 * 60 * 1000,        // 5 minute cache
    cacheCapacity: 200,         // LRU cache
    retryStrategy: (error, currentRetryCount) => {
      return error.status >= 500 && currentRetryCount <= 3;
    },
  });

  private debouncedSearch = createAsync(this.httpGet, {
    debounceTime: 300,
    debounceDimension: DIMENSIONS.PARAMETERS, // Debounce per unique search query
    takeLatest: true,      // Latest search wins, discard previous identical searches
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
  return createAsync(
    async (query: string) => {
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
      return response.json();
    },
    {
      // Performance optimizations
      debounceTime: 300,           // Wait for user to stop typing
      takeLatest: true,       // Latest search wins, discard previous identical searches
      
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

## React Integration - useAsync

For React applications, `great-async` provides `useAsync` hook that builds on top of `createAsync`:

### Basic React Usage

```tsx
// Recommended: Use the modern API
import { useAsync } from 'great-async';
import { useAsync } from 'great-async/use-async';

// Legacy: Use the full name (deprecated)
import { useAsyncFunction } from 'great-async';
import { useAsyncFunction } from 'great-async/useAsyncFunction';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    { deps: [userId] } // Re-run when userId changes
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>Hello, {data.name}!</div>;
}
```

#### Manual Execution with `fn`

The `fn` returned by `useAsync` allows you to manually trigger the async function at any time:

```tsx
function UserDashboard({ userId }: { userId: string }) {
  // Define the API function
  const getUserData = async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  };

  const { data, loading, error, fn: getUserDataProxy } = useAsync(
    () => getUserData(userId),
    {
      auto: false, // Don't auto-execute on mount
      deps: [userId]
    }
  );

  return (
    <div>
      <button onClick={() => getUserDataProxy()} disabled={loading}>
        {loading ? 'Loading...' : 'Load User Data'}
      </button>
      
      {error && <div>Error: {error.message}</div>}
      {data && (
        <div>
          <h2>{data.name}</h2>
          <p>Email: {data.email}</p>
          <button onClick={() => getUserDataProxy()}>Refresh</button>
        </div>
      )}
    </div>
  );
}

// Advanced: Conditional execution based on user interaction
function SearchResults({ query }: { query: string }) {
  // Define the API function
  const searchAPI = async (query: string) => {
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  };

  const { data, loading, fn: searchAPIProxy } = useAsync(
    () => searchAPI(query),
    {
      auto: 'deps-only', // Only search when query changes, not on mount
      deps: [query],
    }
  );

  const handleManualSearch = () => {
    // Force a fresh search regardless of cache
    searchAPIProxy();
  };

  return (
    <div>
      <button onClick={handleManualSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search Now'}
      </button>
      {data?.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}

// Form submission example
function CreateUser() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  // Define the API function
  const createUserAPI = async (userData: { name: string; email: string }) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  };
  
  const { data: newUser, loading, error, fn: createUserAPIProxy } = useAsync(
    () => createUserAPI(formData),
    { auto: false } // Only execute when form is submitted
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserAPIProxy(); // Manual execution
  };

  if (newUser) {
    return <div>User created successfully: {newUser.name}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.name}
        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
        placeholder="Name"
      />
      <input 
        value={formData.email}
        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
        placeholder="Email"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### React-Specific Features

#### 📱 Share Loading States

Share loading states across multiple components using the same `loadingId`:

```tsx
import { useAsync, useLoadingState } from 'great-async';

// Define the API functions
const fetchUser = async () => {
  const response = await fetch('/api/user');
  return response.json();
};

const fetchUserAvatar = async () => {
  const response = await fetch('/api/user/avatar');
  return response.json();
};

// Multiple components can share the same loading state
function UserProfile() {
  const { data, loading } = useAsync(fetchUser, {
    loadingId: 'user-data', // Shared loading identifier
  });
  
  if (loading) return <div>Profile loading...</div>;
  return <div>User: {data?.name}</div>;
}

function UserAvatar() {
  const { data, loading } = useAsync(fetchUserAvatar, {
    loadingId: 'user-data', // Same loadingId - shares loading state
  });
  
  if (loading) return <div>Avatar loading...</div>;
  return <img src={data?.avatar} alt="User avatar" />;
}

function GlobalLoadingIndicator() {
  const isLoading = useLoadingState('user-data'); // Reacts to shared loading state
  
  return (
    <div className="global-loading">
      {isLoading && <div>🔄 Loading user data...</div>}
    </div>
  );
}

// Usage: All components will show loading state when ANY of them is loading
function App() {
  return (
    <div>
      <GlobalLoadingIndicator />
      <UserProfile />
      <UserAvatar />
    </div>
  );
}
```

You can also control shared loading states manually:

```tsx
import { useAsync } from 'great-async/use-async';

// Manual control of shared loading states
function SomeComponent() {
  const handleStartLoading = () => {
    useAsync.showLoading('user-data'); // Show loading for loadingId
  };

  const handleStopLoading = () => {
    useAsync.hideLoading('user-data'); // Hide loading for loadingId
  };
  
  return (
    <div>
      <button onClick={handleStartLoading}>Start Loading</button>
      <button onClick={handleStopLoading}>Stop Loading</button>
    </div>
  );
}
```

#### 🔄 React SWR Pattern

```tsx
function Dashboard() {
  // Define the API function
  const fetchCurrentUser = async () => {
    const response = await fetch('/api/user/current');
    return response.json();
  };

  const { data: user, backgroundUpdating } = useAsync(
    fetchCurrentUser,
    {
      id: 'currentUser', // Required: cache survives remounts, no loading flash
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
  
  // Define the API function
  const searchAPI = async (query: string) => {
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  };
  
  const { data: results, loading } = useAsync(
    () => searchAPI(query),
    {
      deps: [query],
      debounceTime: 300,     // Wait for user to stop typing
      takeLatest: true, // Latest search wins, discard previous identical searches
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

#### 🗑️ Cache Management with `clearCache`

The `clearCache` function allows you to manually control cached data:

```tsx
function UserProfile({ userId }: { userId: string }) {
  // Define the API function
  const fetchUserData = async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  };
  
  const { data, loading, clearCache } = useAsync(
    (id: string = userId) => fetchUserData(id), // Function with parameters and default value
    {
      deps: [userId],
      ttl: 5 * 60 * 1000,
    }
  );

  const handleClearAllCache = () => {
    clearCache(); // Clear all cached data
  };

  const handleClearSpecificCache = () => {
    clearCache(userId); // Clear cache for specific userId
  };

  return (
    <div>
      {data && <div>User: {data.name}</div>}
      <button onClick={handleClearAllCache}>Clear All Cache</button>
      <button onClick={handleClearSpecificCache}>Clear This User's Cache</button>
    </div>
  );
}
```

**Framework-agnostic usage:**

```typescript
// Define the API function
const fetchUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

const userAPI = createAsync(fetchUserData, {
  ttl: 5 * 60 * 1000,
});

// Use the API
const userData = await userAPI('123'); // Cached for 5 minutes

// Clear cache for one specific parameter combination
userAPI.clearCache('123'); // Clear cache only for userId '123'

// Clear all cache
userAPI.clearCache(); // Clear all cached data

// Force fresh data for specific parameter
userAPI.clearCache('123');
const freshData = await userAPI('123'); // Will fetch fresh data

// Note: To clear multiple specific caches, call clearCache multiple times
userAPI.clearCache('123'); // Clear cache for user '123'
userAPI.clearCache('456'); // Clear cache for user '456'
userAPI.clearCache('789'); // Clear cache for user '789'
```

**Important Notes:**

- **Single parameter combination**: `clearCache(...params)` only clears cache for one specific parameter combination
- **Batch clearing**: To clear multiple specific caches, call `clearCache` multiple times
- **Parameter matching**: Parameters must match exactly (same values, same order) as when the cache was created

**Cache management patterns:**

```typescript
// 1. Clear cache on data mutations
const updateUser = async (userId: string, data: any) => {
  await fetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
  userAPI.clearCache(userId); // Clear cache for this specific user
};

// 2. Clear cache on logout
const logout = () => {
  userAPI.clearCache(); // Clear all user data cache
  profileAPI.clearCache(); // Clear profile cache
  // ... clear other caches
};

// 3. Clear multiple specific caches
const clearMultipleUsers = (userIds: string[]) => {
  userIds.forEach(userId => {
    userAPI.clearCache(userId); // Clear each user's cache individually
  });
};

// 4. Clear cache for complex parameters
const searchAPI = createAsync(
  async (query: string, filters: { category: string; status: string }) => {
    // ... search logic
  }
);

// Clear cache for specific search
searchAPI.clearCache('react', { category: 'tech', status: 'active' });

// Clear all search cache
searchAPI.clearCache();

// 5. Periodic cache cleanup
setInterval(() => {
  userAPI.clearCache(); // Clear all cache every hour
}, 60 * 60 * 1000);
```

#### 🎯 Conditional Auto-Execution

Control when automatic requests are triggered:

```tsx
function UserSettings({ userId }: { userId: string }) {
  const [filters, setFilters] = useState({ category: '', status: '' });
  
  // Define the API function
  const fetchUserSettings = async (userId: string, filters: { category: string; status: string }) => {
    const params = new URLSearchParams({ ...filters, userId });
    const response = await fetch(`/api/user/settings?${params}`);
    return response.json();
  };
  
  // Only auto-fetch when filters change, not on initial mount
  const { data: settings, loading, fn: fetchUserSettingsProxy } = useAsync(
    () => fetchUserSettings(userId, filters),
    {
      auto: 'deps-only',  // Don't auto-call on mount, only when deps change
      deps: [userId, filters],
    }
  );

  return (
    <div>
      <button onClick={() => fetchUserSettingsProxy()}>Load Settings</button>
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

#### 💾 Persistent Cache Across Mounts

Use the `id` option to make cache survive component mount/unmount cycles. Without `id`, the cache is stored in a WeakMap keyed by the function reference and gets garbage-collected when the component unmounts:

```tsx
function UserProfile({ userId }: { userId: string }) {
  // Define the API function
  const fetchUserProfile = async (id: string) => {
    const response = await fetch(`/api/users/${id}/profile`);
    return response.json();
  };

  // With `id`, the cache persists even when navigating away and back
  const { data, loading, backgroundUpdating } = useAsync(
    (id: string = userId) => fetchUserProfile(id),
    {
      deps: [userId],
      id: 'fetchUserProfile', // Stable cache key surviving re-mounts
      ttl: 5 * 60 * 1000,
      swr: true,
    }
  );

  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <h2>{data?.name}</h2>
      {backgroundUpdating && <span>Updating...</span>}
    </div>
  );
}
```

**How it works:** When `id` is provided, `great-async` uses a module-level `IdCacheManager` keyed by this string instead of the default `WeakMap<fnProxy>` strategy. The cache stays alive as long as the module is loaded — navigate away and back, and SWR still returns the cached data instantly without a loading flash.

> **⚠️ SWR in React requires `id`.** The default WeakMap cache is keyed by the fnProxy which gets garbage-collected on unmount. Without `id`, SWR has no cache to serve after a remount and will always show a **loading flash** on every navigation. Always pair `swr: true` with an `id` in React components.

> **⚠️ Cache key uniqueness.** The cache key is generated from the function parameters (default: `JSON.stringify`). A no-arg function always produces the same key (`"[]"`), so all components using the same `id` without parameters **share the exact same cache entry**. If each component needs independent cache (e.g. different user profiles), either:
> - Pass distinguishing parameters to the function (e.g. `userId`)
> - Or use a unique `id` per component instance

#### 📦 Initial & Fallback Data

Use `initialData` for the default value before first resolve, and `fallbackData` to control what happens on error. When `fallbackData` is omitted, the previously-resolved `data` is preserved so transient errors don't blank the UI:

```tsx
function ProductList() {
  // Define the API function
  const fetchProducts = async () => {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json(); // Returns Product[]
  };

  const { data, loading, error } = useAsync(
    fetchProducts,
    {
      initialData: [],  // Start with empty array before first resolve
      fallbackData: [], // Reset to empty array on error (explicit)
    }
  );

  // data is always an array — no null check needed
  return (
    <div>
      {loading && <span>Refreshing...</span>}
      {error && <div>Error: {error.message}</div>}
      {data.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```


## API Reference

### createAsync(asyncFn, options)

**Returns:** Enhanced function with additional methods:
- **Enhanced function**: Same signature as original function, but with caching, debouncing, etc.
- **`clearCache()`**: Clear all cached data for this function
- **`clearCache(...params)`**: Clear cache for one specific parameter combination

```typescript
const enhancedFn = createAsync(originalFn, options);

// Use like original function
const result = await enhancedFn(param1, param2);

// Clear all cache
enhancedFn.clearCache();

// Clear cache for one specific parameter combination
enhancedFn.clearCache(param1, param2);
```

#### Caching Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `-1` | Cache duration in milliseconds. **Caching is OFF by default** — set `ttl` or `cacheCapacity` to enable |
| `cacheCapacity` | `number` | `-1` | Maximum cache size using LRU eviction. **Caching is OFF by default** — set this or `ttl` to enable |
| `swr` | `boolean` | `false` | Enable stale-while-revalidate |
| `id` | `string` | — | Stable cache identifier. Uses a module-level store keyed by this id instead of the default WeakMap strategy. Cache survives component mount/unmount |
| `cacheManager` | `CacheManager<T>` | — | Custom cache manager. Takes precedence over `id` (with dev warning). The manager is responsible for expiration/eviction — `ttl` and `cacheCapacity` are not interpreted by createAsync when this is set |

#### Performance Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounceTime` | `number` | `-1` | Debounce delay in milliseconds |
| `debounceDimension` | `DIMENSIONS` | `FUNCTION` | Debounce scope:<br/>• `FUNCTION`: Debounce ignores parameters<br/>• `PARAMETERS`: Debounce per unique parameters |
| `takeLatest` | `boolean` | `false` | Latest request wins - discard previous identical requests |
| `single` | `boolean` | `false` | Share result of first ongoing request with all pending requests |
| `singleDimension` | `DIMENSIONS` | `FUNCTION` | Single mode scope:<br/>• `FUNCTION`: Single mode ignores parameters<br/>• `PARAMETERS`: Single mode per unique parameters |

#### Reliability Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retryCount` | `number` | `0` | ⚠️ **Deprecated** - Number of retry attempts (use `retryStrategy` instead) |
| `retryStrategy` | `function` | `() => true` | Custom retry logic `(error, currentRetryCount) => boolean` |

##### Migration from retryCount to retryStrategy

```typescript
// ❌ Deprecated: Using retryCount
const oldWay = createAsync(apiCall, {
  retryCount: 3,
  retryStrategy: (error) => error.status >= 500
});

// ✅ Recommended: Using retryStrategy only (independent control)
const newWay = createAsync(apiCall, {
  retryStrategy: (error, currentRetryCount) => {
    return currentRetryCount <= 3 && error.status >= 500;
  }
});

// ✅ Advanced: Complex retry logic without retryCount
const advancedWay = createAsync(apiCall, {
  retryStrategy: (error, currentRetryCount) => {
    // Network errors: retry first 2 attempts
    if (error.type === 'network') {
      return currentRetryCount <= 2;
    }

    // Rate limiting: retry with exponential backoff
    if (error.status === 429) {
      return currentRetryCount <= 5;
    }

    // Server errors: retry first 3 attempts
    if (error.status >= 500) {
      return currentRetryCount <= 3;
    }

    // Don't retry client errors
    return false;
  }
});
```

##### Advanced Retry Strategy Examples

```typescript
// Example 1: Independent retry control (no retryCount needed)
const smartRetry = createAsync(apiCall, {
  retryStrategy: (error, currentRetryCount) => {
    // Don't retry client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    // Rate limiting: retry with increasing delays
    if (error.status === 429) {
      return currentRetryCount <= 5;
    }

    // Server errors: retry first 3 attempts
    if (error.status >= 500) {
      return currentRetryCount <= 3;
    }

    // Network errors: retry first 2 attempts only
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return currentRetryCount <= 2;
    }

    return false;
  }
});

// Example 2: Error-type based independent retry
const typeBasedRetry = createAsync(fetchData, {
  retryStrategy: (error, currentRetryCount) => {
    // Critical operations: retry up to 5 times
    if (error.critical) {
      return currentRetryCount <= 5;
    }

    // Regular operations: retry up to 2 times
    return currentRetryCount <= 2;
  }
});

// Example 3: Backward compatible (with retryCount)
const legacyRetry = createAsync(fetchData, {
  retryCount: 3,
  retryStrategy: (error) => {
    // Old style - still works
    return error.status >= 500;
  }
});

// Example 4: No retry configuration (default behavior)
const noRetry = createAsync(fetchData, {
  // No retry parameters - will not retry on errors
});
```

#### Callbacks
| Option | Type | Description |
|--------|------|-------------|
| `beforeRun` | `() => void` | Called before function execution |
| `onBackgroundUpdate` | `(data, error) => void` | Called when SWR background update completes |
| `onBackgroundUpdateStart` | `(cachedData) => void` | Called when SWR background update starts |

### useAsync(asyncFn, options)

Extends `createAsync` options with React-specific features:

#### React-Specific Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auto` | `boolean \| 'deps-only'` | `true` | Control auto-execution behavior:<br/>• `true`: Auto-call on mount and deps change<br/>• `false`: Manual execution only<br/>• `'deps-only'`: Auto-call only when deps change |
| `deps` | `Array` | `[]` | Re-run when dependencies change |
| `loadingId` | `string` | `''` | Share loading state across components |
| `initialData` | `T` | `null` | Value used for `data` before the async function first resolves |
| `fallbackData` | `T \| null \| undefined` | `undefined` | Value used for `data` when the function rejects. `undefined` preserves the last-resolved data (transient errors won't blank the UI) |

#### Return Values
| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The result data |
| `loading` | `boolean` | True during initial load |
| `error` | `any` | Error object if request fails |
| `backgroundUpdating` | `boolean` | True during SWR background updates |
| `fn` | `Function` | Manually trigger the async function |
| `clearCache` | `Function` | Clear cached data:<br/>• `clearCache()` - Clear all cached data<br/>• `clearCache(...params)` - Clear cache for one specific parameter combination |

## Subpath Imports

Starting from version 1.0.7-beta10, you can import individual modules. Multiple import paths are supported for better compatibility:

```typescript
// Recommended: Use modern API names with kebab-case
import { createAsync } from 'great-async/create-async';
import { useAsync } from 'great-async/use-async';

// Legacy: Use full API names (deprecated)
import { createAsyncController } from 'great-async/asyncController';
import { useAsyncFunction } from 'great-async/useAsyncFunction';

// Alternative: direct dist imports for better bundler compatibility
import { createAsync } from 'great-async/dist/create-async';
import { useAsync } from 'great-async/dist/use-async';
import { createAsyncController } from 'great-async/dist/asyncController';
import { useAsyncFunction } from 'great-async/dist/useAsyncFunction';

// Utility modules (kebab-case)
import { createTakeLatestPromise } from 'great-async/take-latest-promise';
import { shareLoading } from 'great-async/share-loading';
```

### TypeScript Support

Starting from version 1.0.7-beta10, TypeScript module resolution is fully supported for all import methods. Both runtime and TypeScript compilation will work correctly in all modern bundlers including UMI, Webpack, Vite, etc.

## Comparison with Similar Libraries

### 📊 Feature Comparison

| Feature | great-async | TanStack Query | SWR | RTK Query | Apollo Client |
|---------|-------------|----------------|-----|-----------|---------------|
| **Framework Support** | ✅ Agnostic | ⚛️ React | ⚛️ React | ⚛️ React | ⚛️ React |
| **Bundle Size** | 🟢 ~8KB | 🟡 ~47KB | 🟢 ~2KB | 🟡 ~13KB | 🔴 ~47KB |
| **Learning Curve** | 🟢 Low | 🟡 Medium | 🟢 Low | 🟡 Medium | 🔴 High |
| **Caching Strategy** | ✅ TTL + LRU | ✅ Time-based | ✅ SWR | ✅ Normalized | ✅ Normalized |
| **SWR Pattern** | ✅ Built-in | ✅ Built-in | ✅ Native | ✅ Built-in | ✅ Built-in |
| **Debouncing** | ✅ Advanced | ❌ External | ❌ External | ❌ External | ❌ External |
| **Single Mode** | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual | ❌ Manual |
| **Take Latest Promise** | ✅ Built-in | ❌ No | ❌ No | ❌ No | ❌ No |
| **Retry Logic** | ✅ Configurable | ✅ Advanced | ✅ Basic | ✅ Basic | ✅ Advanced |
| **Offline Support** | ✅ Cache-based | ✅ Advanced | ✅ Basic | ✅ Basic | ✅ Advanced |
| **DevTools** | ❌ No | ✅ Excellent | ❌ No | ✅ Redux | ✅ Excellent |
| **Mutations** | ✅ Via Controller | ✅ Built-in | ✅ Via mutate | ✅ Built-in | ✅ Built-in |
| **Share Loading** | ✅ Unique | ❌ No | ❌ No | ❌ No | ❌ No |
| **Auto Modes** | ✅ 3 modes | ✅ Manual | ✅ Manual | ✅ Manual | ✅ Manual |
| **Function Enhancement** | ✅ Transparent | ❌ No | ❌ No | ❌ No | ❌ No |
| **Manual Execution** | ✅ Simple `fn()` | 🟡 `refetch()` | 🟡 `mutate()` | 🟡 Via endpoints | 🟡 `refetch()` |

### 🎯 When to Choose What

#### Choose **great-async** when:
- ✅ You need a **framework-agnostic** solution
- ✅ You want **transparent function enhancement** - enhance functions without changing their API
- ✅ You need **gradual migration** without breaking existing code
- ✅ You want **intuitive manual execution** with `fn()` that preserves function signature
- ✅ You want **advanced debouncing** with parameter/function dimensions
- ✅ You need **share loading states** across components
- ✅ You prefer **small bundle size** with comprehensive features
- ✅ You want **built-in single mode** to prevent duplicate requests
- ✅ You need **flexible auto-execution** modes (`true`, `false`, `'deps-only'`)
- ✅ You're building **Node.js APIs** or **vanilla JS** applications

#### Choose **TanStack Query** when:
- ✅ You need **powerful DevTools** for debugging
- ✅ You want **advanced mutation** features with optimistic updates
- ✅ You need **infinite queries** and complex pagination
- ✅ You're building **large-scale React applications**
- ✅ You want **extensive plugin ecosystem**

#### Choose **SWR** when:
- ✅ You prefer **minimal setup** and simplicity
- ✅ You're using **Next.js** (made by same team)
- ✅ You want **lightweight** solution for basic data fetching
- ✅ You need **fast initial page loads**

#### Choose **RTK Query** when:
- ✅ You're already using **Redux Toolkit**
- ✅ You need **centralized state management**
- ✅ You want **normalized caching** with entity relationships
- ✅ You prefer **Redux ecosystem** and patterns

#### Choose **Apollo Client** when:
- ✅ You're using **GraphQL** exclusively
- ✅ You need **advanced GraphQL features** (subscriptions, fragments)
- ✅ You want **powerful caching** with normalized data
- ✅ You're building **complex GraphQL applications**

### 💡 Code Comparison

#### Function Enhancement Pattern - Transparent Proxy Design

```typescript
// great-async - Transparent Function Enhancement
// Original function
async function fetchUserData(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// Enhanced function with caching, debouncing, retry - SAME SIGNATURE!
const enhancedFetchUser = createAsync(fetchUserData, {
  ttl: 5 * 60 * 1000,
  debounceTime: 300,
  retryCount: 3,
  swr: true,
});

// Use exactly like the original function
const userData = await enhancedFetchUser('123'); // ✅ Same API!
const moreData = await enhancedFetchUser('456'); // ✅ With all enhancements!

// Perfect for gradual migration - just replace the function!
// Before: const users = await Promise.all([fetchUserData('1'), fetchUserData('2')])
// After:  const users = await Promise.all([enhancedFetchUser('1'), enhancedFetchUser('2')])

// Works in any context - classes, modules, callbacks
class UserService {
  fetchUser = enhancedFetchUser; // ✅ Drop-in replacement
  
  async getTeam(userIds: string[]) {
    return Promise.all(userIds.map(this.fetchUser)); // ✅ Same usage
  }
}

// Other libraries - Require different usage patterns
// TanStack Query - Must use hooks, different API
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUserData(userId), // ❌ Wrapped in hook
});

// SWR - Must use hooks, different API  
const { data } = useSWR(
  ['user', userId], 
  () => fetchUserData(userId) // ❌ Wrapped in hook
);

// RTK Query - Must define endpoints, different API
const api = createApi({
  endpoints: (builder) => ({
    getUser: builder.query({ // ❌ Completely different API
      query: (userId) => `/users/${userId}`,
    }),
  }),
});
```

#### Simple Data Fetching

```typescript
// Define the API function
const getUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

// great-async - Framework Agnostic
const fetchUser = createAsync(getUserData, {
  ttl: 5 * 60 * 1000,
  swr: true,
});

// React usage with manual control
const { data, loading, error, fn: fetchUserProxy } = useAsync(
  () => fetchUser(userId),
  {
    deps: [userId],
    auto: 'deps-only'
  }
);

// Manual execution - same function signature!
const handleRefresh = () => fetchUserProxy(); // ✅ Simple and intuitive

// TanStack Query - React Only
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => getUserData(userId),
  staleTime: 5 * 60 * 1000,
});

// Manual execution - different API
const handleRefresh = () => refetch(); // ❌ Different function, loses parameters

// SWR - React Only
const { data, isLoading, error, mutate } = useSWR(
  ['user', userId],
  () => getUserData(userId)
);

// Manual execution - complex API
const handleRefresh = () => mutate(); // ❌ Revalidation only, not re-execution
```

#### Advanced Features

```typescript
// Define the API functions
const performSearch = async (query: string) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
};

const fetchUserProfile = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}/profile`);
  return response.json();
};

// great-async - Unique Features
const searchAPI = createAsync(performSearch, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.PARAMETERS, // Per-parameter debouncing
  takeLatest: true, // Latest request wins
  swr: true,
  retryStrategy: (error, currentRetryCount) => {
    return error.status >= 500 && currentRetryCount <= 3;
  },
});

// TanStack Query - Requires additional setup
const { data, isLoading } = useQuery({
  queryKey: ['search', query],
  queryFn: () => performSearch(query),
  enabled: !!query,
  retry: 3,
});

// Manual debouncing needed
const debouncedQuery = useDebounce(query, 300);
```

### 🚀 Migration Examples

#### From SWR to great-async

```typescript
// Define the API function
const fetchUserData = async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

// Before (SWR)
const { data, error, isLoading, mutate } = useSWR(
  `/api/users/${userId}`,
  fetcher,
  { refreshInterval: 30000 }
);

// Manual refresh requires revalidation
const handleRefresh = () => mutate(); // ❌ Complex revalidation logic

// After (great-async)
const { data, error, loading, fn: fetchUserDataProxy } = useAsync(
  (id: string = userId) => fetchUserData(id),
  {
    deps: [userId],
    ttl: 30000,
    swr: true,
  }
);

// Manual refresh is simple and intuitive
const handleRefresh = () => fetchUserDataProxy(); // ✅ Direct function call
```

#### From TanStack Query to great-async

```typescript
// Define the API function
const fetchPosts = async (params: { page: number }) => {
  const response = await fetch(`/api/posts?page=${params.page}`);
  return response.json();
};

// Before (TanStack Query)
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['posts', { page }],
  queryFn: ({ queryKey }) => fetchPosts(queryKey[1]),
  staleTime: 5 * 60 * 1000,
});

// Manual refetch loses original parameters
const handleRefresh = () => refetch(); // ❌ No control over parameters

// After (great-async)
const { data, loading, error, fn: fetchPostsProxy } = useAsync(
  (params: { page: number } = { page }) => fetchPosts(params),
  {
    deps: [page],
    ttl: 5 * 60 * 1000,
    swr: true,
  }
);

// Manual execution with full control
const handleRefresh = () => fetchPostsProxy(); // ✅ Same function, same parameters
const handleRefreshWithNewPage = () => fetchPostsProxy({ page: page + 1 }); // ✅ Can modify parameters
```

### 📈 Performance Comparison

| Library | Bundle Size | Runtime Performance | Memory Usage |
|---------|-------------|-------------------|--------------|
| **great-async** | 🟢 ~8KB | 🟢 Excellent | 🟢 Low |
| **TanStack Query** | 🟡 ~47KB | 🟢 Excellent | 🟡 Medium |
| **SWR** | 🟢 ~2KB | 🟢 Excellent | 🟢 Low |
| **RTK Query** | 🟡 ~13KB | 🟢 Good | 🟡 Medium |
| **Apollo Client** | 🔴 ~47KB | 🟡 Good | 🔴 High |

### 🏆 Summary

**great-async** stands out by offering:

1. **Framework Agnostic**: Works everywhere (React, Vue, Node.js, vanilla JS)
2. **Transparent Function Enhancement**: Enhance functions without changing their API
3. **Intuitive Manual Execution**: `fn()` preserves original function signature and behavior
4. **Unique Features**: Advanced debouncing, share loading states, single mode
5. **Small Bundle**: Comprehensive features in a compact package
6. **Simple API**: Easy to learn and use
7. **Flexible**: Multiple auto-execution modes and caching strategies

While other libraries excel in specific areas (TanStack Query's DevTools, SWR's simplicity, RTK Query's Redux integration), **great-async** provides the best balance of features, performance, and flexibility for most use cases.

## Migration Guide

### From other libraries

```tsx
// From SWR
- import useSWR from 'swr'
+ import { useAsync } from 'great-async'

- const { data, error } = useSWR('/api/user', fetcher)
+ const { data, error } = useAsync(fetchUser, { swr: true })

// From React Query
- import { useQuery } from 'react-query'
+ import { useAsync } from 'great-async'

- const { data, isLoading } = useQuery('user', fetchUser)
+ const { data, loading } = useAsync(fetchUser, { ttl: 300000 })
```

## Best Practices

### ✅ Do's

- Start with `createAsync` for framework-agnostic code
- Use `swr: true` for data that doesn't change often
- Set appropriate `ttl` values based on data freshness needs
- Use `debounceTime` for user input-triggered requests
- Use `retryStrategy` instead of deprecated `retryCount` for flexible retry control
- Use `deps` array in React to control when requests re-run
- Use `auto: 'deps-only'` for conditional data loading (e.g., search, filters)
- Prefer `auto: false` for expensive operations that should be manually triggered

### ❌ Don'ts

- Don't set very short TTL values (< 1 second) without good reason
- Don't use SWR for real-time data that must be always fresh
- Don't forget to handle errors in production
- Don't set `cacheCapacity` too high in memory-constrained environments
- **Don't use deprecated `retryCount`** - use `retryStrategy` instead for better control
- **Don't combine `single: true` with `debounceTime`** - these features conflict with each other

### ⚠️ Feature Conflicts

#### Single Mode vs Debouncing

**Avoid using `single: true` together with `debounceTime`** as they have conflicting behaviors:

- **Debounce**: Delays execution until user stops making calls
- **Single**: Prevents duplicate executions by sharing ongoing requests

```typescript
// ❌ BAD: Conflicting configuration
const conflictedAPI = createAsync(searchFn, {
  debounceTime: 300,  // Delays execution
  single: true,       // Shares ongoing requests - CONFLICTS!
});

// ✅ GOOD: Use debounce for user input
const searchAPI = createAsync(searchFn, {
  debounceTime: 300,
  takeLatest: true, // Latest request wins
});

// ✅ GOOD: Use single for expensive operations
const heavyAPI = createAsync(heavyFn, {
  single: true,
  ttl: 60000, // Cache results
});
```

## License

MIT © [great-async](https://github.com/empty916/great-async)

