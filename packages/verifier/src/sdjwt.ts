/**
 * SD-JWT VC parsing and verification orchestration.
 *
 * The flow:
 *   1. Decode the compact form (`@sd-jwt/decode`).
 *   2. Read `iss` from the JWS payload; resolve the issuer DID.
 *   3. Verify the JWS signature with the resolved JWK (via `jose`).
 *   4. Check the validity window (`iat` / `nbf` / `exp`).
 *   5. Merge holder-supplied disclosures into the payload to expose claims.
 */

import { decodeSdJwt } from '@sd-jwt/decode';
import { importJWK, jwtVerify } from 'jose';
import { hasher } from './hasher.js';
import { publicKeyJwkFromMethod, resolveIssuer } from './did.js';

const SD = '_sd';
const SD_ALG = '_sd_alg';

export interface DecodedSdJwt {
  /** The first compact segment — the issuer-signed JWS. */
  jws: string;
  /** Header of the JWS. */
  header: { alg: string; kid?: string; typ?: string; [k: string]: unknown };
  /** Decoded payload of the JWS (raw — before disclosures are merged in). */
  rawPayload: Record<string, unknown>;
  /** Disclosed claims after applying the holder-supplied disclosures. */
  disclosedClaims: Record<string, unknown>;
}

interface DisclosureEntry {
  key?: string;
  value: unknown;
  digest: string;
}

/**
 * Merge disclosures into the payload by matching their digests against the
 * payload's `_sd` array. Disclosures with no matching digest are silently
 * ignored (a presented credential may omit some disclosures). The output
 * has `_sd`/`_sd_alg` stripped and disclosed key:value pairs added.
 *
 * Only top-level object disclosures are handled here — nested SD structures
 * and array-element disclosures (`...` form) are not yet supported and
 * will simply remain hidden. That matches the v0.1 verifier scope (flat
 * credentials only).
 */
function mergeDisclosures(
  payload: Record<string, unknown>,
  disclosures: readonly DisclosureEntry[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === SD || k === SD_ALG) continue;
    result[k] = v;
  }
  const sdArray = payload[SD];
  if (!Array.isArray(sdArray)) return result;
  const byDigest = new Map<string, DisclosureEntry>();
  for (const d of disclosures) {
    byDigest.set(d.digest, d);
  }
  for (const digest of sdArray) {
    if (typeof digest !== 'string') continue;
    const disclosure = byDigest.get(digest);
    if (!disclosure || disclosure.key === undefined) continue;
    result[disclosure.key] = disclosure.value;
  }
  return result;
}

export async function decode(credential: string): Promise<DecodedSdJwt> {
  const decoded = await decodeSdJwt(credential, hasher);
  const jws = credential.split('~')[0] ?? '';
  if (!jws) {
    throw new Error('Empty SD-JWT VC');
  }
  const rawPayload = decoded.jwt.payload as Record<string, unknown>;
  const header = decoded.jwt.header as DecodedSdJwt['header'];

  // `decoded.disclosures` is an array of @sd-jwt/utils `Disclosure` objects.
  // We pull out the fields we need without retaining a structural dep on the
  // library type — see `DisclosureEntry`.
  const alg = (rawPayload[SD_ALG] as string | undefined) ?? 'sha-256';
  const disclosures: DisclosureEntry[] = await Promise.all(
    decoded.disclosures.map(async (d) => {
      const digest = await d.digest({ hasher, alg });
      const entry: DisclosureEntry = { value: (d as { value: unknown }).value, digest };
      const key = (d as { key?: string }).key;
      if (key !== undefined) entry.key = key;
      return entry;
    }),
  );
  const disclosedClaims = mergeDisclosures(rawPayload, disclosures);
  return { jws, header, rawPayload, disclosedClaims };
}

/**
 * Verify the issuer's signature on the SD-JWT's JWS segment. Throws on
 * signature failure. Returns the verified payload.
 */
export async function verifyIssuerSignature(decoded: DecodedSdJwt): Promise<Record<string, unknown>> {
  const iss = decoded.rawPayload['iss'];
  if (typeof iss !== 'string' || iss.length === 0) {
    throw new Error('Credential is missing an `iss` claim');
  }
  const { method } = await resolveIssuer(iss, decoded.header.kid);
  const jwk = publicKeyJwkFromMethod(method);
  const key = await importJWK(jwk, decoded.header.alg);
  const { payload } = await jwtVerify(decoded.jws, key);
  return payload as Record<string, unknown>;
}
