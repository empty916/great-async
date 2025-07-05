import { useSyncExternalStore } from "react";

// Type definitions
type LoadingStateCallback = () => void;
type LoadingId = string;

export class SharedLoadingStateManager {
  private values = new Map<LoadingId, number>();
  private listeners = new Map<LoadingId, LoadingStateCallback[]>();
  
  // Type guard: check if loadingId is valid
  private isValidLoadingId(loadingId: LoadingId): boolean {
    return typeof loadingId === 'string' && loadingId.length > 0;
  }
  subscribe(loadingId: LoadingId, callback: LoadingStateCallback) {
    if (!this.isValidLoadingId(loadingId)) {
      return () => {};
    }
    if (!this.listeners.has(loadingId)) {
      this.init(loadingId);
    }
    const callbacks = this.listeners.get(loadingId) || [];
    callbacks.push(callback);
    this.listeners.set(loadingId, callbacks);
    
    return () => {
      const currentCallbacks = this.listeners.get(loadingId) || [];
      const filteredCallbacks = currentCallbacks.filter((cb) => cb !== callback);
      this.listeners.set(loadingId, filteredCallbacks);
    };
  }
  
  isLoading(loadingId: LoadingId): boolean {
    return (this.values.get(loadingId) || 0) > 0;
  }
  
  init(loadingId: LoadingId): void {
    if (!this.isValidLoadingId(loadingId) || this.values.has(loadingId)) {
      return;
    }
    this.values.set(loadingId, 0);
    this.listeners.set(loadingId, []);
  }
  
  increment(loadingId: LoadingId): void {
    if (!this.isValidLoadingId(loadingId)) {
      return;
    }
    if (!this.values.has(loadingId)) {
      this.init(loadingId);
    }
    const currentValue = this.values.get(loadingId) || 0;
    this.values.set(loadingId, currentValue + 1);
    this.emit(loadingId);
  }
  
  decrement(loadingId: LoadingId): void {
    if (!this.isValidLoadingId(loadingId)) {
      return;
    }
    if (!this.values.has(loadingId)) {
      this.init(loadingId);
    }
    const currentValue = this.values.get(loadingId) || 0;
    if (currentValue === 0) {
      return;
    }
    this.values.set(loadingId, currentValue - 1);
    this.emit(loadingId);
    
    // Try to cleanup unused resources
    this.cleanup(loadingId);
  }
  
  private emit(loadingId: LoadingId): void {
    const callbacks = this.listeners.get(loadingId);
    callbacks?.forEach((callback) => callback());
  }
  
  // Garbage collection mechanism
  private cleanup(loadingId: LoadingId): void {
    const value = this.values.get(loadingId) || 0;
    const callbacks = this.listeners.get(loadingId) || [];
    
    if (value === 0 && callbacks.length === 0) {
      this.values.delete(loadingId);
      this.listeners.delete(loadingId);
    }
  }
  
  // Debug support
  getDebugInfo(): Record<string, { count: number; listeners: number }> {
    const info: Record<string, { count: number; listeners: number }> = {};
    
    this.values.forEach((count, loadingId) => {
      const callbacks = this.listeners.get(loadingId) || [];
      info[loadingId] = {
        count,
        listeners: callbacks.length
      };
    });
    
    return info;
  }
  
  // Get all active loadingIds
  getActiveLoadingIds(): string[] {
    const activeIds: string[] = [];
    this.values.forEach((count, loadingId) => {
      if (count > 0) {
        activeIds.push(loadingId);
      }
    });
    return activeIds;
  }
  
  // Reset all state (mainly for testing)
  reset(): void {
    this.values.clear();
    this.listeners.clear();
  }
}

export const sharedLoadingStateManager = new SharedLoadingStateManager();


export const useLoadingState = (loadingId: string) => {

  const loadingState = useSyncExternalStore(
    cb => sharedLoadingStateManager.subscribe(loadingId, cb),
    () => sharedLoadingStateManager.isLoading(loadingId),
    () => sharedLoadingStateManager.isLoading(loadingId),
  );

  return loadingState
}