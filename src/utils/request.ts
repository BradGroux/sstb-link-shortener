/**
 * Return a path parameter after Hono routing has matched it.
 *
 * Hono's current types model route parameters as optional when routers are
 * mounted separately. Keep the runtime check instead of scattering unsafe
 * non-null assertions through handlers.
 */
export function requirePathParam(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw new Error(`Missing required path parameter: ${name}`);
  }

  return value;
}
