/**
 * @signata/verifier
 *
 * Browser-safe verifier for verifiable digital credentials. Validates the
 * issuer's signature against a resolvable DID, checks the credential's
 * validity window, applies a configurable trust registry, and extracts the
 * disclosed claims.
 *
 * No network calls except those required to resolve issuer DIDs (`did:web`
 * fetches a `did.json`). No PII leaves the caller.
 */

export type {
  VerificationResult,
  VerificationFailureReason,
  TrustRegistry,
  IssuerMetadata,
  VerifyOptions,
} from './types.js';

import { decode, verifyIssuerSignature } from './sdjwt.js';
import type {
  VerificationFailureReason,
  VerificationResult,
  VerifyOptions,
} from './types.js';

function fail(
  raw: string,
  reason: VerificationFailureReason,
  reasonDetail: string,
  partial: Partial<VerificationResult> = {},
): VerificationResult {
  return {
    valid: false,
    issuerDid: partial.issuerDid ?? '',
    credentialType: partial.credentialType ?? '',
    disclosedClaims: partial.disclosedClaims ?? {},
    raw,
    warnings: [],
    reason,
    reasonDetail,
    ...partial,
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Verify a credential string and return a structured result.
 *
 * Currently supports SD-JWT VC. Other formats (W3C JWT-VC, ISO 18013-5
 * mDoc) will return `unsupported-format` until added.
 */
export async function verifyCredential(
  credential: string,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  if (typeof credential !== 'string' || credential.length === 0) {
    return fail('', 'malformed', 'Credential must be a non-empty string');
  }
  // SD-JWT VC compact form contains at least one `~`. JWT-VC (no SD) has
  // exactly three segments separated by `.`. We dispatch on shape.
  if (!credential.includes('~')) {
    return fail(credential, 'unsupported-format', 'Only SD-JWT VC is currently supported');
  }

  const now = options.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const warnings: string[] = [];

  // 1. Decode (no signature check yet)
  let decoded;
  try {
    decoded = await decode(credential);
  } catch (err) {
    return fail(credential, 'malformed', errMessage(err));
  }

  const iss = typeof decoded.rawPayload.iss === 'string' ? decoded.rawPayload.iss : '';
  const vct = typeof decoded.rawPayload.vct === 'string' ? decoded.rawPayload.vct : '';
  const iat = asNumber(decoded.rawPayload.iat);
  const nbf = asNumber(decoded.rawPayload.nbf);
  const exp = asNumber(decoded.rawPayload.exp);

  if (!iss) {
    return fail(credential, 'malformed', 'Credential is missing `iss` claim', {
      credentialType: vct,
    });
  }

  // 2. Validity window
  if (typeof exp === 'number' && exp < nowSec) {
    return fail(credential, 'expired', `Credential expired at ${new Date(exp * 1000).toISOString()}`, {
      issuerDid: iss,
      credentialType: vct,
      issuedAt: iat,
      expiresAt: exp,
    });
  }
  if (typeof nbf === 'number' && nbf > nowSec) {
    return fail(credential, 'not-yet-valid', `Credential not valid until ${new Date(nbf * 1000).toISOString()}`, {
      issuerDid: iss,
      credentialType: vct,
      issuedAt: iat,
      expiresAt: exp,
    });
  }

  // 3. Resolve issuer + verify signature
  try {
    await verifyIssuerSignature(decoded);
  } catch (err) {
    const detail = errMessage(err);
    // Distinguish resolution failure from signature failure where we can.
    const reason: VerificationFailureReason = /resolv|did/i.test(detail)
      ? 'issuer-unresolvable'
      : 'signature-invalid';
    return fail(credential, reason, detail, {
      issuerDid: iss,
      credentialType: vct,
      issuedAt: iat,
      expiresAt: exp,
    });
  }

  // 4. Trust registry
  if (options.trustRegistry) {
    let trusted = false;
    try {
      trusted = await options.trustRegistry.isTrusted(iss, {
        jurisdiction: options.jurisdiction,
        now,
      });
    } catch (err) {
      warnings.push(`Trust registry lookup threw: ${errMessage(err)}`);
    }
    if (!trusted) {
      return fail(
        credential,
        'issuer-untrusted',
        `Issuer ${iss} is not on the configured trust registry${
          options.jurisdiction ? ` for jurisdiction ${options.jurisdiction}` : ''
        }`,
        {
          issuerDid: iss,
          credentialType: vct,
          disclosedClaims: decoded.disclosedClaims,
          issuedAt: iat,
          expiresAt: exp,
        },
      );
    }
  } else {
    warnings.push(
      'No trust registry provided — the issuer signature was verified but issuer accreditation was not checked',
    );
  }

  return {
    valid: true,
    issuerDid: iss,
    credentialType: vct,
    disclosedClaims: decoded.disclosedClaims,
    issuedAt: iat,
    expiresAt: exp,
    raw: credential,
    warnings,
  };
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
