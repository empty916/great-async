export enum SCOPE {
  FUNCTION = 0,
  PARAMETERS = 1,
}

/**
 * @deprecated Use SCOPE instead. DIMENSIONS will be removed in v3.0.0
 */
export const DIMENSIONS = SCOPE;

/**
 * @deprecated Use SCOPE instead. T_SCOPE will be removed in v3.0.0
 */
export type T_SCOPE = SCOPE;

/**
 * @deprecated Use SCOPE instead. T_DIMENSIONS will be removed in v3.0.0
 */
export type T_DIMENSIONS = SCOPE;

export const DEFAULT_TIMER_KEY = Symbol('DEFAULT_TIMER_KEY');
export const DEFAULT_SINGLE_KEY = Symbol('DEFAULT_SINGLE_KEY');
export const DEFAULT_PROMISE_DEBOUNCE_KEY = Symbol('DEFAULT_PROMISE_DEBOUNCE_KEY');

export class TokenManager {
  scope: SCOPE;
  token = new Map<string | symbol, symbol>();

  constructor(s: SCOPE) {
    this.scope = s;
  }

  getKey(key?: string | symbol) {
    if (this.scope === SCOPE.PARAMETERS) {
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
