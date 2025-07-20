# SWR (Stale-While-Revalidate) Feature

## Overview

`swr` (Stale-While-Revalidate) is a cache optimization strategy that allows returning cached data immediately when available, while updating the cache in the background. This provides a better user experience and reduces loading times.

## How It Works

1. **First Request**: Makes a normal request and caches the result
2. **Subsequent Requests**:
   - Immediately returns cached data (stale data)
   - Simultaneously makes a new request in the background to update the cache
   - Silently updates when new data arrives without triggering loading state

## Usage Examples

### Basic Usage

```tsx
import { useAsync } from 'great-async';

const UserProfile = () => {
  const { data, pending, backgroundUpdating } = useAsync(
    fetchUserProfile,
    {
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        swr: true, // Enable stale-while-revalidate
      }
    }
  );

  if (pending) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      {backgroundUpdating && (
        <small style={{ color: 'gray' }}>Updating...</small>
      )}
    </div>
  );
};
```

### With Callback

```tsx
const UserProfile = () => {
  const { data, pending, backgroundUpdating } = useAsync(
    fetchUserProfile,
    {
      cache: {
        ttl: 5 * 60 * 1000,
        swr: true,
      },
      hooks: {
        onBackgroundUpdate: (newData, error) => {
          if (error) {
            console.error('Background update failed:', error);
          } else {
            console.log('Data updated in background:', newData);
          }
        },
      }
    }
  );

  // ... component logic
};
```

### Manual Trigger

```tsx
const UserProfile = () => {
  const { data, pending, backgroundUpdating, fn } = useAsync(
    fetchUserProfile,
    {
      auto: false,
      cache: {
        ttl: 5 * 60 * 1000,
      swr: true,
    }
  );

  const handleRefresh = () => {
    // Immediately returns cached data while updating in background
    fn();
  };

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={handleRefresh}>
        Refresh
        {backgroundUpdating && ' (Updating...)'}
      </button>
    </div>
  );
};
```

## API Parameters

### `swr`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable stale-while-revalidate functionality

### `onBackgroundUpdate`
- **Type**: `(data?: T, error?: any) => void`
- **Description**: Callback function when background update completes
- **Parameters**:
  - `data`: Updated data (on success)
  - `error`: Error information (on failure)

## Return Values

### `backgroundUpdating`
- **Type**: `boolean`
- **Description**: Whether a background update is in progress

## Best Practices

### 1. Set Appropriate Cache Time

```tsx
// For frequently changing data, set shorter cache time
const { data } = useAsync(fetchStockPrice, {
  cache: {
    ttl: 30 * 1000, // 30 seconds
    swr: true,
  }
});

// For relatively stable data, set longer cache time
const { data } = useAsync(fetchUserProfile, {
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    swr: true,
  }
});
```

### 2. Provide Visual Feedback

```tsx
const { data, backgroundUpdating } = useAsync(fetchData, {
  cache: {
    swr: true,
  }
});

return (
  <div>
    <h1>{data.title}</h1>
    {backgroundUpdating && (
      <div className="update-indicator">
        <span className="spinner"></span>
        <span>Updating...</span>
      </div>
    )}
  </div>
);
```

### 3. Error Handling

```tsx
const { data, backgroundUpdating } = useAsync(fetchData, {
  cache: {
    swr: true,
  },
  hooks: {
    onBackgroundUpdate: (newData, error) => {
      if (error) {
        // Show error message without affecting current displayed data
        toast.error('Failed to update data, but you can still use cached data');
      }
    },
  }
});
```

### 4. Combine with Other Features

```tsx
const { data, pending, backgroundUpdating } = useAsync(fetchData, {
  cache: {
    ttl: 5 * 60 * 1000,
    swr: true,
  },
  debounce: {
    time: 300, // Debouncing
  },
  single: {
    enabled: true, // Single mode
  },
  retry: (error, count) => count <= 3, // Retry attempts
});
```

## Important Notes

1. **Cache Dependency**: `swr` needs to be used with `ttl` or `cacheCapacity`
2. **Network Requests**: Background updates make actual network requests, control frequency appropriately
3. **Error Handling**: Background update failures don't affect currently displayed data
4. **Memory Usage**: Long-running applications should consider cache size limits

## Comparison with Other Libraries

| Feature | great-async | SWR | React Query |
|---------|-------------|-----|-------------|
| Stale-while-revalidate | ✅ | ✅ | ✅ |
| Cache Control | ✅ | ✅ | ✅ |
| Debouncing | ✅ | ❌ | ❌ |
| Single Mode | ✅ | ❌ | ❌ |
| Retry Mechanism | ✅ | ✅ | ✅ |
| Shared Loading | ✅ | ❌ | ❌ |

## Migration from Old API

If you're using the old `staleWhileRevalidate` property, you can easily migrate to the new `swr` property:

```tsx
// Old API (removed in v2.0)
const { data } = useAsyncFunction(fetchData, {
  staleWhileRevalidate: true,
  ttl: 60000,
});

// New API (v2.0)
const { data } = useAsync(fetchData, {
  cache: {
    swr: true,
    ttl: 60000,
  }
});
```

The old API is still supported for backward compatibility, but we recommend using the new `swr` property for better readability and consistency. 