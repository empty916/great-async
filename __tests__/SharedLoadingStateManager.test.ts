import { SharedLoadingStateManager } from '../src/SharedLoadingStateManager';

describe('SharedLoadingStateManager', () => {
  let manager: SharedLoadingStateManager;

  beforeEach(() => {
    manager = new SharedLoadingStateManager();
  });

  describe('Basic functionality', () => {
    test('should initialize state correctly', () => {
      manager.init('test');
      expect(manager.isLoading('test')).toBe(false);
    });

    test('should increment and decrement count correctly', () => {
      manager.increment('test');
      expect(manager.isLoading('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isLoading('test')).toBe(false);
    });

    test('should support multiple counts', () => {
      manager.increment('test');
      manager.increment('test');
      expect(manager.isLoading('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isLoading('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isLoading('test')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string loadingId correctly', () => {
      // Empty string should be ignored
      manager.increment('');
      expect(manager.isLoading('')).toBe(false);
      
      manager.decrement('');
      expect(manager.isLoading('')).toBe(false);
      
      manager.init('');
      expect(manager.isLoading('')).toBe(false);
    });

    test('should handle uninitialized loadingId correctly', () => {
      // Directly calling increment should auto-initialize
      manager.increment('uninit');
      expect(manager.isLoading('uninit')).toBe(true);
      
      // Directly calling decrement should auto-initialize
      manager.decrement('uninit2');
      expect(manager.isLoading('uninit2')).toBe(false);
    });

    test('should prevent counter from going negative', () => {
      manager.init('test');
      
      // Multiple decrements should not cause negative count
      manager.decrement('test');
      manager.decrement('test');
      manager.decrement('test');
      
      expect(manager.isLoading('test')).toBe(false);
    });

    test('should handle repeated initialization correctly', () => {
      manager.init('test');
      manager.increment('test');
      
      // Repeated initialization should not reset the counter
      manager.init('test');
      expect(manager.isLoading('test')).toBe(true);
    });
  });

  describe('Subscription mechanism', () => {
    test('should handle subscribe and unsubscribe correctly', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('test', callback);
      
      manager.increment('test');
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      manager.decrement('test');
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('should handle empty loadingId subscription correctly', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('', callback);
      
      // Should return a noop function
      expect(typeof unsubscribe).toBe('function');
      
      manager.increment('');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should support multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.subscribe('test', callback1);
      manager.subscribe('test', callback2);
      
      manager.increment('test');
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Garbage collection', () => {
    test('should cleanup resources when count is 0 and no listeners', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('test', callback);
      
      manager.increment('test');
      manager.decrement('test');
      
      // At this point, count is 0 but has listener, should not cleanup
      expect(manager.getDebugInfo()).toHaveProperty('test');
      
      unsubscribe();
      manager.increment('test');
      manager.decrement('test');
      
      // Now count is 0 and no listener, should cleanup
      expect(manager.getDebugInfo()).not.toHaveProperty('test');
    });

    test('should retain resources when count exists', () => {
      manager.increment('test');
      
      // Should not cleanup when count exists
      expect(manager.getDebugInfo()).toHaveProperty('test');
      expect(manager.getDebugInfo().test.count).toBe(1);
    });
  });

  describe('Debug features', () => {
    test('getDebugInfo should return correct info', () => {
      const callback = jest.fn();
      manager.subscribe('test1', callback);
      manager.increment('test1');
      manager.increment('test2');
      
      const debugInfo = manager.getDebugInfo();
      
      expect(debugInfo.test1).toEqual({
        count: 1,
        listeners: 1
      });
      expect(debugInfo.test2).toEqual({
        count: 1,
        listeners: 0
      });
    });

    test('getActiveLoadingIds should return correct active IDs', () => {
      manager.increment('test1');
      manager.increment('test2');
      manager.init('test3'); // Only initialize, do not increment
      
      const activeIds = manager.getActiveLoadingIds();
      
      expect(activeIds).toContain('test1');
      expect(activeIds).toContain('test2');
      expect(activeIds).not.toContain('test3');
    });

    test('reset should cleanup all state', () => {
      manager.increment('test1');
      manager.increment('test2');
      manager.subscribe('test3', () => {});
      
      manager.reset();
      
      expect(manager.getDebugInfo()).toEqual({});
      expect(manager.getActiveLoadingIds()).toEqual([]);
      expect(manager.isLoading('test1')).toBe(false);
      expect(manager.isLoading('test2')).toBe(false);
      expect(manager.isLoading('test3')).toBe(false);
    });
  });

  describe('Memory leak prevention', () => {
    test('should handle large number of subscribe and unsubscribe correctly', () => {
      const callbacks: (() => void)[] = [];
      const unsubscribes: (() => void)[] = [];
      
      // Create many subscriptions
      for (let i = 0; i < 1000; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        unsubscribes.push(manager.subscribe(`test${i}`, callback));
      }
      
      // Increment to trigger all callbacks
      for (let i = 0; i < 1000; i++) {
        manager.increment(`test${i}`);
      }
      
      // Verify all callbacks are called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
      
      // Unsubscribe all
      unsubscribes.forEach(unsubscribe => unsubscribe());
      
      // Decrement to trigger garbage collection
      for (let i = 0; i < 1000; i++) {
        manager.decrement(`test${i}`);
      }
      
      // Verify resources are cleaned up
      expect(Object.keys(manager.getDebugInfo())).toHaveLength(0);
    });

    test('should handle concurrent operations correctly', () => {
      const loadingId = 'concurrent-test';
      
      // Simulate concurrent increment and decrement
      for (let i = 0; i < 100; i++) {
        manager.increment(loadingId);
      }
      
      for (let i = 0; i < 50; i++) {
        manager.decrement(loadingId);
      }
      
      expect(manager.isLoading(loadingId)).toBe(true);
      expect(manager.getDebugInfo()[loadingId].count).toBe(50);
      
      // Continue decrementing to 0
      for (let i = 0; i < 50; i++) {
        manager.decrement(loadingId);
      }
      
      expect(manager.isLoading(loadingId)).toBe(false);
    });
  });
}); 