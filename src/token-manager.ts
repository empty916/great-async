/**
 * Scope of debounce / single mode keying.
 *
 * - `SHARED` — all calls share one bucket; parameters are ignored.
 *   (e.g. one debounce timer for the whole function regardless of args.)
 * - `KEYED`  — bucket per unique parameters; each distinct args set has
 *   its own timer / pending slot.
 */
export enum SCOPE {
  SHARED = 0,
  KEYED = 1,
}

/**
 * @deprecated Use `SCOPE` (with members `SHARED` / `KEYED`) instead.
 * Will be removed in v3.0.0.
 *
 * Numeric values match `SCOPE` so existing `=== DIMENSIONS.FUNCTION`
 * runtime comparisons still work, but at the type level the two enums
 * are distinct — passing `DIMENSIONS.FUNCTION` where `SCOPE` is expected
 * needs a cast or an explicit migration to `SCOPE.SHARED` / `SCOPE.KEYED`.
 */
export enum DIMENSIONS {
  FUNCTION = 0,
  PARAMETERS = 1,
}

/**
 * @deprecated Use `SCOPE` instead. Will be removed in v3.0.0.
 */
export type T_SCOPE = SCOPE;

/**
 * @deprecated Use `SCOPE` instead. Will be removed in v3.0.0.
 */
export type T_DIMENSIONS = SCOPE;

// Internal symbols used by createAsync to mark the SHARED-scope slot.
// Not part of the public API — see src/index.ts (only re-exports the public bits).
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
    if (this.scope === SCOPE.KEYED) {
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
