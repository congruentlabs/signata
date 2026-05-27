/**
 * @signata/verifier
 *
 * Browser-safe verifier for verifiable digital credentials. Validates the
 * issuer's signature against a resolvable DID, checks the credential's
 * validity window, applies a configurable trust registry, and extracts the
 * disclosed claims.
 *
 * Supports SD-JWT VC (the EUDI Wallet format) and W3C JWT-VC.
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

export { detectFormat, type CredentialFormat } from './jwtvc.js';

import { decode as decodeSdJwtVc, verifyIssuerSignature as verifySdJwtVcSignature } from './sdjwt.js';
import { decodeJwtVc, detectFormat, verifyJwtVcSignature } from './jwtvc.js';
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
 * Supports SD-JWT VC (compact form with `~`-separated disclosures) and
 * W3C JWT-VC (plain compact JWS with a `vc` claim). Other formats
 * (ISO 18013-5 mDoc, JSON-LD VC) return `unsupported-format`.
 */
export async function verifyCredential(
  credential: string,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  if (typeof credential !== 'string' || credential.length === 0) {
    return fail('', 'malformed', 'Credential must be a non-empty string');
  }

  const format = detectFormat(credential);
  if (format === 'unknown') {
    return fail(
      credential,
      'unsupported-format',
      'Unrecognised credential shape — expected SD-JWT VC or W3C JWT-VC',
    );
  }

  const now = options.now ?? new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const warnings: string[] = [];

  // 1. Decode (no signature check yet)
  let decoded;
  try {
    decoded = format === 'sd-jwt-vc' ? await decodeSdJwtVc(credential) : decodeJwtVc(credential);
  } catch (err) {
    return fail(credential, 'malformed', errMessage(err));
  }

  const iss = typeof decoded.rawPayload['iss'] === 'string' ? decoded.rawPayload['iss'] : '';
  const vct = typeof decoded.rawPayload['vct'] === 'string' ? decoded.rawPayload['vct'] : '';
  const iat = asNumber(decoded.rawPayload['iat']);
  const nbf = asNumber(decoded.rawPayload['nbf']);
  const exp = asNumber(decoded.rawPayload['exp']);

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
    if (format === 'sd-jwt-vc') {
      await verifySdJwtVcSignature(decoded);
    } else {
      await verifyJwtVcSignature(decoded);
    }
  } catch (err) {
    const detail = errMessage(err);
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
