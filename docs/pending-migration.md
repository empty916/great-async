# Migrating from `loading` to `pending`

## Overview

In great-async v2.0, we introduced the `pending` property and `pendingId` parameter as more semantically correct alternatives to `loading` and `loadingId`. These changes better represent the state of a Promise, which can be pending, fulfilled, or rejected.

## Why the Change?

- **Better Semantics**: `pending` and `pendingId` align with Promise terminology and are more accurate
- **Consistency**: Matches the standard Promise state naming convention
- **Clarity**: Makes it clearer that we're dealing with async operations
- **Unified Naming**: Both state property and shared state parameter use consistent naming

## Migration Guide

### ✅ Recommended: Use `pending` and `pendingId`

```typescript
import { useAsync } from 'great-async';

function UserProfile({ userId }: { userId: string }) {
  const { data, pending, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    {
      deps: [userId],
      pendingId: 'user-profile' // Share pending state across components
    }
  );

  if (pending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>Hello, {data.name}!</div>;
}
```

### ⚠️ Deprecated: `loading` and `loadingId` (still works)

```typescript
import { useAsync } from 'great-async';

function UserProfile({ userId }: { userId: string }) {
  // This still works but shows deprecation warnings
  const { data, loading, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    {
      deps: [userId],
      loadingId: 'user-profile' // Works but deprecated
    }
  );

  if (loading) return <div>Loading...</div>; // Works but deprecated
  if (error) return <div>Error: {error.message}</div>;
  return <div>Hello, {data.name}!</div>;
}
```

### Static Methods Migration

```typescript
// ✅ Recommended - New static methods
useAsync.showPending('user-data');
useAsync.hidePending('user-data');

// ⚠️ Deprecated - Still works but shows warnings
useAsync.showLoading('user-data');
useAsync.hideLoading('user-data');
```

### Internal Module Migration (Advanced Users)

If you're directly importing internal modules:

```typescript
// ✅ v2.0 - New modules
import { SharePending, sharePending, usePendingState } from 'great-async/share-pending';

// ❌ v1.x - No longer available in v2.0
// import { ShareLoading, shareLoading, useLoadingState } from 'great-async/share-loading';
```

## Backward Compatibility

- **v2.0**: Both `pending`/`pendingId` and `loading`/`loadingId` are available, deprecated ones show warnings
- **v3.0**: `loading` and `loadingId` will be removed, only `pending` and `pendingId` will be available

## Migration Strategy

### 1. Gradual Migration (Recommended)

Update your components one by one:

```typescript
// Before
const { data, loading, error } = useAsync(fetchData, { loadingId: 'my-data' });

// After
const { data, pending, error } = useAsync(fetchData, { pendingId: 'my-data' });
```

### 2. Search and Replace

Use your IDE's search and replace functionality:

1. **Property names**:
   - Search for: `loading`
   - Replace with: `pending`
2. **Parameter names**:
   - Search for: `loadingId`
   - Replace with: `pendingId`
3. **Static methods**:
   - Search for: `showLoading`/`hideLoading`
   - Replace with: `showPending`/`hidePending`
4. Review each change to ensure it's related to great-async

### 3. TypeScript Users

TypeScript will help you identify deprecated usage:

```typescript
// TypeScript will show deprecation warnings
const { loading } = useAsync(fetchData, { loadingId: 'test' }); // ⚠️ Deprecated warnings

// No warnings for new API
const { pending } = useAsync(fetchData, { pendingId: 'test' }); // ✅ Clean
```

## Common Patterns

### Conditional Rendering

```typescript
// Before
if (loading) return <Spinner />;

// After
if (pending) return <Spinner />;
```

### Button States

```typescript
// Before
<button disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</button>

// After
<button disabled={pending}>
  {pending ? 'Saving...' : 'Save'}
</button>
```

### Combined with Other States

```typescript
// Before
const isDisabled = loading || !isValid;

// After
const isDisabled = pending || !isValid;
```

## Benefits of Migration

1. **Future-proof**: Your code will work in v3.0 without changes
2. **Better semantics**: More accurate representation of async state
3. **Cleaner code**: No deprecation warnings in development
4. **Consistency**: Aligns with Promise and async/await terminology

## Timeline

- **v2.0**: `pending` introduced, `loading` deprecated
- **v2.x**: Both properties available for smooth migration
- **v3.0**: `loading` removed, only `pending` available

Start migrating today to ensure a smooth transition to future versions!
