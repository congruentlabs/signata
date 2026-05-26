/**
 * Test fixtures: an in-memory issuer that signs SD-JWT VCs using `did:jwk`.
 * The DID embeds the public key directly, so resolution requires no
 * network access. Keys are WebCrypto `CryptoKey`s so the signer can use
 * `crypto.subtle.sign` directly.
 */

import { SDJwtVcInstance, type SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import { hasher } from '../hasher.js';

export interface TestIssuer {
  did: string;
  publicJwk: JsonWebKey;
  /** Issues a credential with the supplied claims. */
  issue(payload: {
    vct: string;
    claims: Record<string, unknown>;
    disclosureKeys: string[];
    issuedAt?: Date;
    expiresAt?: Date;
    notBefore?: Date;
  }): Promise<string>;
}

function base64UrlString(input: string): string {
  return base64UrlBytes(new TextEncoder().encode(input));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create an in-memory ES256 issuer with a `did:jwk` identifier.
 */
export async function createTestIssuer(): Promise<TestIssuer> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
  // did:jwk requires the JWK to be encoded as a canonical JSON string. The
  // simplest canonicalisation that satisfies the verifier we're testing is
  // a fixed-order serialisation of just the required JWK fields.
  const canonicalJwk = canonicalEcJwk(publicJwk);
  const did = `did:jwk:${base64UrlString(canonicalJwk)}`;

  const sdjwt = new SDJwtVcInstance({
    hasher,
    hashAlg: 'sha-256',
    saltGenerator: async () => {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return base64UrlBytes(bytes);
    },
    signer: async (data: string) => {
      const bytes = new TextEncoder().encode(data);
      const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        keyPair.privateKey,
        bytes,
      );
      return base64UrlBytes(new Uint8Array(sig));
    },
    signAlg: 'ES256',
  });

  return {
    did,
    publicJwk: JSON.parse(canonicalJwk) as JsonWebKey,
    async issue({ vct, claims, disclosureKeys, issuedAt, expiresAt, notBefore }) {
      const payload: SdJwtVcPayload = {
        iss: did,
        vct,
        ...claims,
      };
      if (issuedAt) payload.iat = Math.floor(issuedAt.getTime() / 1000);
      if (expiresAt) payload.exp = Math.floor(expiresAt.getTime() / 1000);
      if (notBefore) payload.nbf = Math.floor(notBefore.getTime() / 1000);

      // The `@sd-jwt/sd-jwt-vc` disclosure-frame type is highly conditional on
      // the precise claim shape; `_sd: string[]` is the documented form but
      // doesn't fit the generic signature for arbitrary `claims`. Loosen at
      // the call site — runtime behaviour is well-tested below.
      const disclosureFrame = { _sd: disclosureKeys } as never;

      return sdjwt.issue(payload, disclosureFrame, { header: { kid: `${did}#0` } });
    },
  };
}

function canonicalEcJwk(jwk: JsonWebKey): string {
  // Members in lexicographic order per RFC 7638, only the required ones for ECDSA P-256
  const obj: Record<string, string> = {
    crv: jwk.crv ?? 'P-256',
    kty: jwk.kty ?? 'EC',
    x: jwk.x ?? '',
    y: jwk.y ?? '',
  };
  return JSON.stringify(obj);
}

/**
 * Take an issued SD-JWT VC and present only the named disclosures.
 *
 * We do this manually rather than through `@sd-jwt`'s `present()` because the
 * verifier only cares about which disclosures arrive — and a hand-rolled
 * filter is the most direct test of "verifier respects holder selection."
 */
export function present(issued: string, discloseKeys: string[]): string {
  const parts = issued.split('~');
  const jws = parts[0] ?? '';
  if (!jws) throw new Error('Cannot present an empty credential');
  const disclosures = parts.slice(1).filter((p) => p.length > 0);
  const selected: string[] = [];
  for (const d of disclosures) {
    try {
      const json = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded = JSON.parse(json) as unknown[];
      const key = decoded[1]; // [salt, key, value]
      if (typeof key === 'string' && discloseKeys.includes(key)) {
        selected.push(d);
      }
    } catch {
      /* skip malformed */
    }
  }
  return [jws, ...selected, ''].join('~');
}

/**
 * Tamper with the credential by flipping a byte in its signature region.
 */
export function tamperSignature(credential: string): string {
  const [jws, ...rest] = credential.split('~');
  if (!jws) throw new Error('Cannot tamper an empty credential');
  const segments = jws.split('.');
  if (segments.length !== 3) throw new Error('JWS not in compact form');
  const sig = segments[2] ?? '';
  const flipped = sig.startsWith('A') ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
  segments[2] = flipped;
  return [segments.join('.'), ...rest].join('~');
}

export function allowList(...dids: string[]) {
  const set = new Set(dids);
  return {
    isTrusted(did: string) {
      return set.has(did);
    },
  };
}
