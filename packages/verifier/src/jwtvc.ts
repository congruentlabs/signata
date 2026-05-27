/**
 * W3C JWT-VC parsing and verification.
 *
 * A JWT-VC is a single JWS (no `~` separator, no disclosures) whose
 * payload contains a `vc` claim carrying the W3C Verifiable Credential
 * structure. There is no selective disclosure — every claim in
 * `vc.credentialSubject` is visible to anyone presenting the credential.
 *
 * Reference: https://www.w3.org/TR/vc-data-model/#json-web-token
 */

import { decodeProtectedHeader, decodeJwt, importJWK, jwtVerify } from 'jose';
import type { DecodedSdJwt } from './sdjwt.js';
import { publicKeyJwkFromMethod, resolveIssuer } from './did.js';

interface VcStructure {
  '@context'?: string | string[];
  type?: string | string[];
  issuer?: string | { id?: string };
  credentialSubject?: Record<string, unknown> | Record<string, unknown>[];
  validFrom?: string;
  validUntil?: string;
  issuanceDate?: string;
  expirationDate?: string;
}

interface JwtVcPayload {
  iss?: string;
  sub?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  vc?: VcStructure;
}

function looksLikeCompactJws(input: string): boolean {
  const parts = input.split('.');
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p));
}

/**
 * Heuristic format detection. SD-JWT VC always contains at least one `~`
 * (after the JWS, even if no disclosures are present); JWT-VC is plain
 * compact JWS.
 */
export type CredentialFormat = 'sd-jwt-vc' | 'jwt-vc' | 'unknown';

export function detectFormat(input: string): CredentialFormat {
  if (typeof input !== 'string' || input.length === 0) return 'unknown';
  if (input.includes('~')) return 'sd-jwt-vc';
  if (looksLikeCompactJws(input)) return 'jwt-vc';
  return 'unknown';
}

/**
 * Decode a JWT-VC into the same shape as an SD-JWT VC decode result, so
 * the orchestration layer doesn't have to special-case it.
 *
 * - `disclosedClaims` is `vc.credentialSubject` (the W3C "subject" is
 *   exactly the claim bag).
 * - `rawPayload` is the entire JWS payload — used for the iss / iat / exp
 *   / nbf reads downstream.
 */
export function decodeJwtVc(credential: string): DecodedSdJwt {
  const jws = credential;
  const header = decodeProtectedHeader(jws) as DecodedSdJwt['header'];
  const payload = decodeJwt(jws) as JwtVcPayload & Record<string, unknown>;

  // W3C allows the issuer to be a string or an object with `id`. Prefer
  // `iss` (always set in JWT-VC mode), but fall back to `vc.issuer`.
  if (!payload.iss && payload.vc?.issuer) {
    const issuer = payload.vc.issuer;
    payload.iss = typeof issuer === 'string' ? issuer : issuer.id;
  }

  // Use VC validity dates if the JWT-level claims are absent.
  const vc = payload.vc;
  if (vc) {
    if (payload.iat === undefined && vc.issuanceDate) {
      const t = Math.floor(new Date(vc.issuanceDate).getTime() / 1000);
      if (Number.isFinite(t)) payload.iat = t;
    }
    if (payload.exp === undefined && (vc.expirationDate ?? vc.validUntil)) {
      const t = Math.floor(new Date((vc.expirationDate ?? vc.validUntil) as string).getTime() / 1000);
      if (Number.isFinite(t)) payload.exp = t;
    }
    if (payload.nbf === undefined && vc.validFrom) {
      const t = Math.floor(new Date(vc.validFrom).getTime() / 1000);
      if (Number.isFinite(t)) payload.nbf = t;
    }
  }

  // `vct` isn't part of W3C VC. Derive a credentialType from `vc.type[N]`
  // — the first entry is conventionally "VerifiableCredential"; the
  // interesting type is the next one along.
  if (typeof payload['vct'] !== 'string') {
    const types = Array.isArray(vc?.type) ? vc?.type : vc?.type ? [vc.type] : [];
    const interesting = types.find((t) => t !== 'VerifiableCredential') ?? types[0];
    if (interesting) payload['vct'] = interesting;
  }

  const disclosedClaims = extractSubject(vc);

  return {
    jws,
    header,
    rawPayload: payload as Record<string, unknown>,
    disclosedClaims,
  };
}

function extractSubject(vc: VcStructure | undefined): Record<string, unknown> {
  if (!vc?.credentialSubject) return {};
  const subject = Array.isArray(vc.credentialSubject)
    ? (vc.credentialSubject[0] ?? {})
    : vc.credentialSubject;
  // Drop `id` — it's the subject DID, not a disclosable claim.
  const { id: _id, ...rest } = subject as Record<string, unknown>;
  return rest;
}

/**
 * Verify the JWS signature using the issuer DID's published key. Mirrors
 * `verifyIssuerSignature` from sdjwt.ts but for the JWT-VC path.
 */
export async function verifyJwtVcSignature(decoded: DecodedSdJwt): Promise<Record<string, unknown>> {
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
