import { createAsync } from '../src';

describe('retryStrategy with currentRetryCount parameter', () => {
  it('should pass currentRetryCount as second parameter to retryStrategy', async () => {
    let callCount = 0;
    const retryAttempts: number[] = [];
    
    const failingFunction = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount} failed`);
    };

    const retryFn = createAsync(failingFunction, {
      retryCount: 3,
      retryStrategy: (error, currentRetryCount) => {
        retryAttempts.push(currentRetryCount);
        return currentRetryCount <= 2; // Only retry first 2 attempts
      }
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail
    }

    expect(callCount).toBe(3); // Initial call + 2 retries
    expect(retryAttempts).toEqual([1, 2, 3]); // Should receive 1, 2, 3 as currentRetryCount
  });

  it('should work with complex retry logic based on currentRetryCount', async () => {
    let callCount = 0;
    const retryDecisions: boolean[] = [];
    
    const failingFunction = async () => {
      callCount++;
      throw new Error(`Network error ${callCount}`);
    };

    const retryFn = createAsync(failingFunction, {
      retryCount: 5,
      retryStrategy: (error, currentRetryCount) => {
        let shouldRetry = false;
        
        // Retry on first 2 attempts for any error
        if (currentRetryCount <= 2) {
          shouldRetry = true;
        }
        // Retry on 3rd attempt only for network errors
        else if (currentRetryCount === 3 && error.message.includes('Network')) {
          shouldRetry = true;
        }
        // Don't retry after 3rd attempt
        else {
          shouldRetry = false;
        }
        
        retryDecisions.push(shouldRetry);
        return shouldRetry;
      }
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail
    }

    expect(callCount).toBe(4); // Initial call + 3 retries
    expect(retryDecisions).toEqual([true, true, true, false]); // Retry decisions for attempts 1,2,3,4
  });

  it('should maintain backward compatibility with single parameter retryStrategy', async () => {
    let callCount = 0;
    let errorReceived: any = null;
    
    const failingFunction = async () => {
      callCount++;
      throw new Error(`Error ${callCount}`);
    };

    const retryFn = createAsync(failingFunction, {
      retryCount: 2,
      retryStrategy: (error) => {
        errorReceived = error;
        return error.message.includes('Error'); // Simple error-based retry
      }
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail
    }

    expect(callCount).toBe(3); // Initial call + 2 retries
    expect(errorReceived).toBeTruthy();
    expect(errorReceived.message).toContain('Error');
  });

  it('should stop retrying when retryStrategy returns false', async () => {
    let callCount = 0;
    
    const failingFunction = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount}`);
    };

    const retryFn = createAsync(failingFunction, {
      retryCount: 5,
      retryStrategy: (error, currentRetryCount) => {
        // Only retry on first attempt
        return currentRetryCount === 1;
      }
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail
    }

    expect(callCount).toBe(2); // Initial call + 1 retry (stopped after first retry)
  });

  it('should work correctly when retryStrategy always returns true within retryCount limit', async () => {
    let callCount = 0;

    const failingFunction = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount}`);
    };

    const retryFn = createAsync(failingFunction, {
      retryCount: 3,
      retryStrategy: (error, currentRetryCount) => {
        // Always retry within the limit
        return true;
      }
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail after all retries
    }

    expect(callCount).toBe(4); // Initial call + 3 retries (respects retryCount limit)
  });

  it('should work independently without retryCount using only retryStrategy', async () => {
    let callCount = 0;

    const failingFunction = async () => {
      callCount++;
      if (callCount <= 3) {
        throw new Error(`Attempt ${callCount} failed`);
      }
      return `Success on attempt ${callCount}`;
    };

    const retryFn = createAsync(failingFunction, {
      // No retryCount specified, only retryStrategy
      retryStrategy: (error, currentRetryCount) => {
        // Retry first 3 attempts
        return currentRetryCount <= 3;
      }
    });

    const result = await retryFn();

    expect(callCount).toBe(4); // Initial call + 3 retries
    expect(result).toBe('Success on attempt 4');
  });

  it('should not retry when no retry parameters are specified', async () => {
    let callCount = 0;

    const failingFunction = async () => {
      callCount++;
      throw new Error(`Attempt ${callCount} failed`);
    };

    const retryFn = createAsync(failingFunction, {
      // No retry parameters specified
    });

    try {
      await retryFn();
    } catch (error) {
      // Expected to fail immediately
    }

    expect(callCount).toBe(1); // Only initial call, no retries
  });

  it('should handle complex retry logic based on error type and attempt count', async () => {
    const createFailingFunction = (maxFailures: number) => {
      let callCount = 0;
      return async (errorType: string) => {
        callCount++;
        if (callCount <= maxFailures) {
          const error = new Error(`${errorType} error on attempt ${callCount}`);
          (error as any).type = errorType;
          throw error;
        }
        return { result: `Success after ${callCount} attempts`, callCount };
      };
    };



    // Test network error (should retry 2 times, succeed on 3rd call)
    const networkFn = createFailingFunction(2); // Fail first 2 calls, succeed on 3rd
    const networkRetryFn = createAsync(networkFn, {
      retryStrategy: (error, currentRetryCount) => {
        const errorType = (error as any).type;
        return errorType === 'network' && currentRetryCount <= 2;
      }
    });

    const networkResult = await networkRetryFn('network');
    expect(networkResult.callCount).toBe(3); // Initial + 2 retries
    expect(networkResult.result).toBe('Success after 3 attempts');

    // Test server error (should retry 3 times, succeed on 4th call)
    const serverFn = createFailingFunction(3); // Fail first 3 calls, succeed on 4th
    const serverRetryFn = createAsync(serverFn, {
      retryStrategy: (error, currentRetryCount) => {
        const errorType = (error as any).type;
        return errorType === 'server' && currentRetryCount <= 3;
      }
    });

    const serverResult = await serverRetryFn('server');
    expect(serverResult.callCount).toBe(4); // Initial + 3 retries
    expect(serverResult.result).toBe('Success after 4 attempts');

    // Test client error (should not retry)
    const clientFn = createFailingFunction(1); // Always fail
    const clientRetryFn = createAsync(clientFn, {
      retryStrategy: (error) => {
        const errorType = (error as any).type;
        return errorType !== 'client'; // Don't retry client errors
      }
    });

    try {
      await clientRetryFn('client');
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('client error on attempt 1');
    }
  });
});
