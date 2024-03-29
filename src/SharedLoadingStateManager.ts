import { useSyncExternalStore } from "react";

export class SharedLoadingStateManager {
  values = {} as Record<string, number>;
  listeners = {} as Record<string, (() => any)[]>;
  subscribe(loadingId: string, callback: () => any) {
    if (!loadingId) {
      return () => {};
    }
    if (!this.listeners[loadingId]) {
      this.init(loadingId);
    }
    this.listeners[loadingId].push(callback);
    return () => {
      this.listeners[loadingId] = this.listeners[loadingId].filter(
        (cb) => cb !== callback
      );
    };
  }
  isLoading(loadingId: string) {
    return this.values[loadingId] > 0;
  }
  init(loadingId: string) {
    if (!loadingId || this.values[loadingId] !== undefined) {
      return;
    }
    this.values[loadingId] = 0;
    this.listeners[loadingId] = [];
  }
  increment(loadingId: string) {
    if (!loadingId) {
      return;
    }
    if (this.values[loadingId] === undefined) {
      this.init(loadingId);
    }
    this.values[loadingId]++;
    this.emit(loadingId);
  }
  decrement(loadingId: string) {
    if (!loadingId) {
      return;
    }
    if (this.values[loadingId] === undefined) {
      this.init(loadingId);
    }
    if (this.values[loadingId] === 0) {
      return;
    }
    this.values[loadingId]--;
    this.emit(loadingId);
  }
  emit(loadingId: string) {
    this.listeners[loadingId]?.forEach?.((callback) => callback());
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