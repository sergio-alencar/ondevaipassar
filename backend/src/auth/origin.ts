/**
 * Whether a state-changing request comes from one of our own pages. Browsers
 * attach an Origin header to every cross-origin request and to every non-GET
 * same-origin one, and a page on another site cannot forge it, so this is a
 * CSRF check that doesn't depend on a token.
 *
 * A request with NO Origin is refused rather than let through: the cookie is
 * only ever sent by a browser, and a browser sends one. (curl and the like
 * have no business writing with a session cookie.)
 */
export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  return origin !== undefined && allowed.includes(origin);
}
