import { useSyncExternalStore } from "react";

// Type definitions
type PendingStateCallback = () => void;
type PendingId = string;

export class SharePending {
  private values = new Map<PendingId, number>();
  private listeners = new Map<PendingId, PendingStateCallback[]>();
  
  // Type guard: check if pendingId is valid
  private isValidPendingId(pendingId: PendingId): boolean {
    return typeof pendingId === 'string' && pendingId.length > 0;
  }
  subscribe(pendingId: PendingId, callback: PendingStateCallback) {
    if (!this.isValidPendingId(pendingId)) {
      return () => {};
    }
    if (!this.listeners.has(pendingId)) {
      this.init(pendingId);
    }
    const callbacks = this.listeners.get(pendingId) || [];
    callbacks.push(callback);
    this.listeners.set(pendingId, callbacks);
    
    return () => {
      const currentCallbacks = this.listeners.get(pendingId) || [];
      const filteredCallbacks = currentCallbacks.filter((cb) => cb !== callback);
      this.listeners.set(pendingId, filteredCallbacks);
    };
  }
  
  isPending(pendingId: PendingId): boolean {
    return (this.values.get(pendingId) || 0) > 0;
  }
  
  init(pendingId: PendingId): void {
    if (!this.isValidPendingId(pendingId) || this.values.has(pendingId)) {
      return;
    }
    this.values.set(pendingId, 0);
    this.listeners.set(pendingId, []);
  }
  
  increment(pendingId: PendingId): void {
    if (!this.isValidPendingId(pendingId)) {
      return;
    }
    if (!this.values.has(pendingId)) {
      this.init(pendingId);
    }
    const currentValue = this.values.get(pendingId) || 0;
    this.values.set(pendingId, currentValue + 1);
    this.emit(pendingId);
  }
  
  decrement(pendingId: PendingId): void {
    if (!this.isValidPendingId(pendingId)) {
      return;
    }
    if (!this.values.has(pendingId)) {
      this.init(pendingId);
    }
    const currentValue = this.values.get(pendingId) || 0;
    if (currentValue === 0) {
      return;
    }
    this.values.set(pendingId, currentValue - 1);
    this.emit(pendingId);
    
    // Try to cleanup unused resources
    this.cleanup(pendingId);
  }
  
  private emit(pendingId: PendingId): void {
    const callbacks = this.listeners.get(pendingId);
    callbacks?.forEach((callback) => callback());
  }
  
  // Garbage collection mechanism
  private cleanup(pendingId: PendingId): void {
    const value = this.values.get(pendingId) || 0;
    const callbacks = this.listeners.get(pendingId) || [];
    
    if (value === 0 && callbacks.length === 0) {
      this.values.delete(pendingId);
      this.listeners.delete(pendingId);
    }
  }
  
  // Debug support
  getDebugInfo(): Record<string, { count: number; listeners: number }> {
    const info: Record<string, { count: number; listeners: number }> = {};
    
    this.values.forEach((count, pendingId) => {
      const callbacks = this.listeners.get(pendingId) || [];
      info[pendingId] = {
        count,
        listeners: callbacks.length
      };
    });
    
    return info;
  }
  
  // Get all active pendingIds
  getActivePendingIds(): string[] {
    const activeIds: string[] = [];
    this.values.forEach((count, pendingId) => {
      if (count > 0) {
        activeIds.push(pendingId);
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

export const sharePending = new SharePending();


export const usePendingState = (pendingId: string) => {

  const pendingState = useSyncExternalStore(
    cb => sharePending.subscribe(pendingId, cb),
    () => sharePending.isPending(pendingId),
    () => sharePending.isPending(pendingId),
  );

  return pendingState
}
