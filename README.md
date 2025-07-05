# great-async

🚀 A powerful async operation library that makes React async operations effortless, with built-in caching, SWR, debouncing, and more.

[![npm version](https://badge.fury.io/js/great-async.svg)](https://badge.fury.io/js/great-async)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why great-async?

- 🎯 **Simple API** - Easy to use, powerful features
- ⚡ **SWR Pattern** - Show cached data instantly, update in background
- 🔄 **Smart Caching** - TTL and LRU cache strategies
- 🚫 **Duplicate Prevention** - Merge identical concurrent requests
- 🔁 **Auto Retry** - Configurable retry logic with custom strategies
- ⏰ **Debouncing** - Control when functions execute
- ⚛️ **React Ready** - Built-in hooks with loading states

## Quick Start

```bash
npm install great-async
```

```tsx
import { useAsyncFunction } from 'great-async';

function UserProfile({ userId }) {
  const { data, loading } = useAsyncFunction(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    { deps: [userId] }
  );

  if (loading) return <div>Loading...</div>;
  return <div>Hello, {data.name}!</div>;
}
```

## Core Features

### 🎯 1. Basic Async Operations

Perfect for simple API calls with automatic loading states.

```tsx
const { data, loading, error, fn } = useAsyncFunction(fetchUserData);

// data: your API response
// loading: true during request
// error: any thrown errors
// fn: manually trigger the request
```

### ⚡ 2. SWR (Stale-While-Revalidate)

Show cached data instantly while updating in the background.

```tsx
const { data, loading, backgroundUpdating } = useAsyncFunction(fetchUserData, {
  swr: true,        // Enable SWR
  ttl: 60000,       // Cache for 1 minute
});

// First load: shows loading
// Next loads: shows cached data immediately + updates background
```

**Perfect for:** User profiles, dashboard data, any content that doesn't change frequently.

### 🔄 3. Smart Caching

Multiple caching strategies to optimize performance.

```tsx
// Time-based cache (TTL)
useAsyncFunction(fetchData, {
  ttl: 5 * 60 * 1000,  // Cache for 5 minutes
});

// Size-based cache (LRU)
useAsyncFunction(fetchData, {
  cacheCapacity: 100,  // Keep last 100 results
});

// Combined
useAsyncFunction(fetchData, {
  ttl: 60000,
  cacheCapacity: 50,
});
```

### 🚫 4. Duplicate Request Prevention

Automatically merge identical concurrent requests.

```tsx
const searchController = createAsyncController(searchAPI, {
  promiseDebounce: true,
});

// Multiple calls with same params = single request
const result1 = searchController('react');
const result2 = searchController('react'); // Reuses result1
const result3 = searchController('vue');   // New request
```

**Perfect for:** Search autocomplete, rapid user interactions, preventing API spam.

### ⏰ 5. Debouncing

Control when functions execute to optimize performance.

```tsx
// Time-based debouncing
useAsyncFunction(searchAPI, {
  debounceTime: 300,  // Wait 300ms after last call
});

// Function-level or parameter-level debouncing
createAsyncController(searchAPI, {
  debounceTime: 300,
  debounceDimension: DIMENSIONS.PARAMETERS, // Debounce per unique params
});
```

### 🔁 6. Auto Retry

Intelligent retry logic with customizable strategies.

```tsx
useAsyncFunction(fetchData, {
  retryCount: 3,
  retryStrategy: (error) => {
    // Retry on server errors, not client errors
    return error.status >= 500;
  },
});
```

### 📦 7. Single Mode

Prevent multiple concurrent executions.

```tsx
useAsyncFunction(fetchData, {
  single: true,  // Only one request at a time
});
```

## Real-World Examples

### 📱 User Dashboard with SWR

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

### 🔍 Search with Debouncing

```tsx
function SearchBox() {
  const [query, setQuery] = useState('');
  
  const { data: results, loading } = useAsyncFunction(
    () => searchAPI(query),
    {
      deps: [query],
      debounceTime: 300,     // Wait for user to stop typing
      promiseDebounce: true, // Merge identical searches
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

### 💪 Robust API Call with All Features

```tsx
function ProductList() {
  const { data, loading, error, backgroundUpdating, fn } = useAsyncFunction(
    fetchProducts,
    {
      // Caching
      swr: true,
      ttl: 5 * 60 * 1000,    // 5 minute cache
      cacheCapacity: 100,     // LRU cache
      
      // Performance
      debounceTime: 200,
      promiseDebounce: true,
      single: true,
      
      // Reliability
      retryCount: 3,
      retryStrategy: (error) => error.status >= 500,
      
      // User Experience
      onBackgroundUpdate: (data, error) => {
        if (error) toast.error('Failed to refresh products');
        else toast.success('Products updated!');
      },
    }
  );

  if (loading && !data) return <div>Loading products...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1>Products</h1>
        {backgroundUpdating && <span>🔄</span>}
        <button onClick={fn}>Refresh</button>
      </div>
      {data?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

## API Reference

### useAsyncFunction(asyncFn, options)

#### Basic Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auto` | `boolean` | `true` | Auto-call on mount |
| `deps` | `Array` | `[]` | Re-run when dependencies change |
| `loadingId` | `string` | `''` | Share loading state across components |

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
| `promiseDebounce` | `boolean` | `false` | Merge identical concurrent requests |
| `single` | `boolean` | `false` | Allow only one execution at a time |

#### Reliability Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retryCount` | `number` | `0` | Number of retry attempts |
| `retryStrategy` | `function` | `() => true` | Custom retry logic |

#### Callbacks
| Option | Type | Description |
|--------|------|-------------|
| `onBackgroundUpdate` | `(data, error) => void` | Called when SWR background update completes |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The result data |
| `loading` | `boolean` | True during initial load |
| `error` | `any` | Error object if request fails |
| `backgroundUpdating` | `boolean` | True during SWR background updates |
| `fn` | `Function` | Manually trigger the async function |
| `clearCache` | `Function` | Clear cached data |

## createAsyncController(asyncFn, options)

For non-React environments or when you need more control:

```ts
import { createAsyncController } from 'great-async';

const apiController = createAsyncController(fetchData, {
  ttl: 60000,
  swr: true,
  retryCount: 3,
});

// Use like the original function
const result = await apiController(params);

// Clear cache when needed
apiController.clearCache();
```

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

- Use `swr: true` for data that doesn't change often
- Set appropriate `ttl` values based on data freshness needs
- Use `debounceTime` for user input-triggered requests
- Implement `retryStrategy` for better error handling
- Use `deps` array to control when requests re-run

### ❌ Don'ts

- Don't set very short TTL values (< 1 second) without good reason
- Don't use SWR for real-time data that must be always fresh
- Don't forget to handle errors in production
- Don't set `cacheCapacity` too high in memory-constrained environments

## License

MIT © [great-async](https://github.com/empty916/great-async)

