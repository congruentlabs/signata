/**
 * Web Crypto-based hasher used both for SD-JWT digest computation and any
 * other hashing the issuer needs to do.
 */
export async function hasher(data: string | ArrayBuffer, alg: string): Promise<Uint8Array> {
  if (alg.toLowerCase() !== 'sha-256') {
    throw new Error(`Unsupported digest algorithm: ${alg}`);
  }
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(buf);
}

export function bufToBase64Url(buf: Uint8Array): string {
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
