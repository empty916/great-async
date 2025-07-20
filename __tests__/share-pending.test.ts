import { SharePending } from '../src';

describe('SharePending', () => {
  let manager: SharePending;

  beforeEach(() => {
    manager = new SharePending();
  });

  describe('Basic functionality', () => {
    test('should initialize state correctly', () => {
      manager.init('test');
      expect(manager.isPending('test')).toBe(false);
    });

    test('should increment and decrement count correctly', () => {
      manager.increment('test');
      expect(manager.isPending('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isPending('test')).toBe(false);
    });

    test('should handle multiple increments', () => {
      manager.increment('test');
      manager.increment('test');
      expect(manager.isPending('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isPending('test')).toBe(true);
      
      manager.decrement('test');
      expect(manager.isPending('test')).toBe(false);
    });

    test('should not go below zero', () => {
      manager.decrement('test');
      expect(manager.isPending('test')).toBe(false);
      
      manager.decrement('test');
      expect(manager.isPending('test')).toBe(false);
    });
  });

  describe('Multiple pendingIds', () => {
    test('should handle multiple pendingIds independently', () => {
      manager.increment('test1');
      manager.increment('test2');
      
      expect(manager.isPending('test1')).toBe(true);
      expect(manager.isPending('test2')).toBe(true);
      
      manager.decrement('test1');
      expect(manager.isPending('test1')).toBe(false);
      expect(manager.isPending('test2')).toBe(true);
    });
  });

  describe('Subscription system', () => {
    test('should notify subscribers on state change', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('test', callback);
      
      manager.increment('test');
      expect(callback).toHaveBeenCalledTimes(1);
      
      manager.decrement('test');
      expect(callback).toHaveBeenCalledTimes(2);
      
      unsubscribe();
    });

    test('should not notify after unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('test', callback);
      
      manager.increment('test');
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      manager.decrement('test');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.subscribe('test', callback1);
      manager.subscribe('test', callback2);
      
      manager.increment('test');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input validation', () => {
    test('should handle invalid pendingIds gracefully', () => {
      expect(() => manager.increment('')).not.toThrow();
      expect(() => manager.decrement('')).not.toThrow();
      expect(manager.isPending('')).toBe(false);
    });

    test('should return empty unsubscribe function for invalid pendingIds', () => {
      const unsubscribe = manager.subscribe('', jest.fn());
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Debug and utility methods', () => {
    test('should provide debug information', () => {
      manager.increment('test1');
      manager.increment('test2');
      manager.increment('test2');
      
      const debugInfo = manager.getDebugInfo();
      expect(debugInfo).toEqual({
        test1: { count: 1, listeners: 0 },
        test2: { count: 2, listeners: 0 }
      });
    });

    test('should return active pendingIds', () => {
      manager.increment('test1');
      manager.increment('test2');
      manager.increment('test3');
      manager.decrement('test2');
      
      const activeIds = manager.getActivePendingIds();
      expect(activeIds).toContain('test1');
      expect(activeIds).toContain('test3');
      expect(activeIds).not.toContain('test2');
    });

    test('should reset all state', () => {
      manager.increment('test1');
      manager.increment('test2');
      manager.subscribe('test1', jest.fn());
      
      manager.reset();
      
      expect(manager.isPending('test1')).toBe(false);
      expect(manager.isPending('test2')).toBe(false);
      expect(manager.getDebugInfo()).toEqual({});
      expect(manager.getActivePendingIds()).toEqual([]);
    });
  });

  describe('Cleanup mechanism', () => {
    test('should cleanup unused resources', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe('test', callback);
      
      manager.increment('test');
      manager.decrement('test');
      
      // Should still exist because there's a subscriber
      expect(manager.getDebugInfo()).toHaveProperty('test');
      
      unsubscribe();
      
      // Should be cleaned up after unsubscribe and count is 0
      manager.increment('test');
      manager.decrement('test');
      
      expect(manager.getDebugInfo()).not.toHaveProperty('test');
    });
  });
});
