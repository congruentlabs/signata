/**
 * Hasher implementation backed by the Web Crypto SubtleCrypto API. Works in
 * any modern browser and in Node 20+ (where `crypto.subtle` is global).
 *
 * `@sd-jwt`'s `Hasher` shape is `(data: string | ArrayBuffer, alg: string) => Promise<Uint8Array>`.
 */
const SUPPORTED_ALGS = new Set(['sha-256']);

export async function hasher(data: string | ArrayBuffer, alg: string): Promise<Uint8Array> {
  const normalised = alg.toLowerCase();
  if (!SUPPORTED_ALGS.has(normalised)) {
    throw new Error(`Unsupported digest algorithm: ${alg}`);
  }
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(buf);
}
