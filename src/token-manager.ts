export const DIMENSIONS = {
  FUNCTION: 0,
  PARAMETERS: 1,
} as const;

export type T_DIMENSIONS = typeof DIMENSIONS[keyof typeof DIMENSIONS];

export const DEFAULT_TIMER_KEY = Symbol('DEFAULT_TIMER_KEY');
export const DEFAULT_SINGLE_KEY = Symbol('DEFAULT_SINGLE_KEY');
export const DEFAULT_PROMISE_DEBOUNCE_KEY = Symbol('DEFAULT_PROMISE_DEBOUNCE_KEY');

export class TokenManager {
  scope: T_DIMENSIONS;
  token = new Map<string | symbol, symbol>();

  constructor(s: T_DIMENSIONS) {
    this.scope = s;
  }

  getKey(key?: string | symbol) {
    if (this.scope === DIMENSIONS.PARAMETERS) {
      return key || DEFAULT_TIMER_KEY;
    }
    return DEFAULT_TIMER_KEY;
  }

  initToken(key?: string | symbol) {
    this.token.set(this.getKey(key), Symbol('async_token'));
  }

  getToken(key?: string | symbol) {
    if (!this.token.has(this.getKey(key))) {
      this.initToken(key);
    }
    return this.token.get(this.getKey(key))!;
  }

  refresh(key?: string | symbol) {
    this.initToken(key);
    return this.token.get(this.getKey(key));
  }

  remove(key?: string | symbol) {
    this.token.delete(this.getKey(key));
  }
}
