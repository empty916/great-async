import { createAsync, DIMENSIONS, SCOPE } from '../src';

describe('Backward Compatibility', () => {
  it('should support legacy flat options structure', async () => {
    let callCount = 0;
    const testFn = async (value: string) => {
      callCount++;
      return `result-${value}-${callCount}`;
    };

    // Test legacy flat structure (without single mode to avoid conflicts)
    const legacyAPI = createAsync(testFn, {
      ttl: 1000,
      cacheCapacity: 50,
      retryStrategy: (error, count) => count <= 2,
      beforeRun: () => console.log('legacy beforeRun'),
    });

    const result1 = await legacyAPI('test');
    expect(result1).toBe('result-test-1');
    expect(callCount).toBe(1);

    // Should use cache
    const result2 = await legacyAPI('test');
    expect(result2).toBe('result-test-1');
    expect(callCount).toBe(1);
  });

  it('should support modern grouped options structure', async () => {
    let callCount = 0;
    const testFn = async (value: string) => {
      callCount++;
      return `result-${value}-${callCount}`;
    };

    // Test modern grouped structure
    const modernAPI = createAsync(testFn, {
      cache: {
        ttl: 1000,
        capacity: 50,
      },
      debounce: {
        time: 100,
        scope: SCOPE.PARAMETERS,
        takeLatest: true,
      },
      single: {
        enabled: true,
        scope: SCOPE.FUNCTION,
      },
      retry: (error, count) => count <= 2,
      hooks: {
        beforeRun: () => console.log('modern beforeRun'),
      }
    });

    const result1 = await modernAPI('test');
    expect(result1).toBe('result-test-1');
    expect(callCount).toBe(1);

    // Should use cache
    const result2 = await modernAPI('test');
    expect(result2).toBe('result-test-1');
    expect(callCount).toBe(1);
  });

  it('should support DIMENSIONS as alias for SCOPE', () => {
    expect(DIMENSIONS.FUNCTION).toBe(SCOPE.FUNCTION);
    expect(DIMENSIONS.PARAMETERS).toBe(SCOPE.PARAMETERS);
    expect(DIMENSIONS).toBe(SCOPE);
  });

  it('should convert legacy retryCount + retryStrategy to modern retry', async () => {
    let callCount = 0;
    const failingFn = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount} failed`);
    };

    // Legacy format with both retryCount and retryStrategy
    const legacyAPI = createAsync(failingFn, {
      retryCount: 3,
      retryStrategy: (error) => error.message.includes('failed'),
    });

    await expect(legacyAPI()).rejects.toThrow('Attempt 4 failed');
    expect(callCount).toBe(4); // Initial + 3 retries
  });

  it('should convert legacy retryCount only to modern retry', async () => {
    let callCount = 0;
    const failingFn = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount} failed`);
    };

    // Legacy format with only retryCount
    const legacyAPI = createAsync(failingFn, {
      retryCount: 2,
    });

    await expect(legacyAPI()).rejects.toThrow('Attempt 3 failed');
    expect(callCount).toBe(3); // Initial + 2 retries
  });

  it('should handle type safety with overloads', async () => {
    let callCount = 0;
    const testFn = async (value: string) => {
      callCount++;
      return `result-${value}-${callCount}`;
    };

    // TypeScript should enforce either legacy OR modern format, not mixed
    // This test verifies that both formats work independently

    // Legacy format
    const legacyAPI = createAsync(testFn, {
      ttl: 500,
      debounceTime: 50,
    });

    // Modern format
    const modernAPI = createAsync(testFn, {
      cache: {
        ttl: 1000,
      },
      debounce: {
        time: 100,
      }
    });

    const result1 = await legacyAPI('test1');
    const result2 = await modernAPI('test2');

    expect(result1).toBe('result-test1-1');
    expect(result2).toBe('result-test2-2');
    expect(callCount).toBe(2);
  });
});
