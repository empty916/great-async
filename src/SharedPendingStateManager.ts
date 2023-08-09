
export class SharedPendingStateManager {
  values = {} as Record<string, number>;
  listeners = {} as Record<string, (() => any)[]>;
  subscribe(pendingId: string, callback: () => any) {
    if (!pendingId) {
      return () => {};
    }
    if (!this.listeners[pendingId]) {
      this.init(pendingId);
    }
    this.listeners[pendingId].push(callback);
    return () => {
      this.listeners[pendingId] = this.listeners[pendingId].filter(
        (cb) => cb !== callback
      );
    };
  }
  isPending(pendingId: string) {
    return this.values[pendingId] > 0;
  }
  init(pendingId: string) {
    if (!pendingId || this.values[pendingId] !== undefined) {
      return;
    }
    this.values[pendingId] = 0;
    this.listeners[pendingId] = [];
  }
  increment(pendingId: string) {
    if (!pendingId) {
      return;
    }
    this.values[pendingId]++;
    this.emit(pendingId);
  }
  decrement(pendingId: string) {
    if (!pendingId) {
      return;
    }
    this.values[pendingId]--;
    this.emit(pendingId);
  }
  emit(pendingId: string) {
    this.listeners[pendingId]?.forEach?.((callback) => callback());
  }
}

export const sharedPendingStateManager = new SharedPendingStateManager();
