/**
 * Built-in claim mappers — translate a verified credential into the data
 * payload for a specific EAS schema. Mappers are pure functions and can
 * return `null` to opt out of attesting against their schema (e.g. an
 * over-18 mapper returns null if the credential doesn't disclose age).
 *
 * Consumers can write their own mappers conforming to the `ClaimMapper`
 * type and pass them to `bridgeCredential`.
 */

import type { VerificationResult } from '@signata/verifier';
import type { ClaimMapper } from './types.js';
import {
  CLAIM_JURISDICTION_V1,
  CLAIM_KYC_V1,
  CLAIM_OVER18_V1,
  CREDENTIAL_V1,
} from './schemas.js';
import { keccak256, toHex } from 'viem';

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * Generic wrapper attestation. Always returns a value as long as the
 * credential has an issuer DID and a type.
 */
export const credentialMapper: ClaimMapper<{
  issuerDid: string;
  credentialType: string;
  issuedAt: bigint;
  expiresAt: bigint;
  credentialHash: `0x${string}`;
}> = {
  schema: CREDENTIAL_V1,
  map(credential: VerificationResult) {
    if (!credential.issuerDid || !credential.credentialType) return null;
    return {
      issuerDid: credential.issuerDid,
      credentialType: credential.credentialType,
      issuedAt: BigInt(credential.issuedAt ?? 0),
      expiresAt: BigInt(credential.expiresAt ?? 0),
      // Hash the original credential string so consumers can detect
      // re-projection of the same underlying credential.
      credentialHash: keccak256(toHex(credential.raw)),
    };
  },
};

/**
 * Over-18 claim. Looks for `age_over_18` or `age` in the disclosed claims.
 */
export const over18Mapper: ClaimMapper<{
  verified: boolean;
  verifiedAt: bigint;
  issuerDid: string;
  jurisdiction: string;
}> = {
  schema: CLAIM_OVER18_V1,
  map(credential: VerificationResult) {
    const claims = credential.disclosedClaims;
    let verified: boolean | null = null;
    if (typeof claims['age_over_18'] === 'boolean') {
      verified = claims['age_over_18'];
    } else if (typeof claims['age'] === 'number') {
      verified = claims['age'] >= 18;
    }
    if (verified === null || verified === false) return null;
    return {
      verified: true,
      verifiedAt: nowSeconds(),
      issuerDid: credential.issuerDid,
      jurisdiction: string(claims['country'] ?? claims['jurisdiction'] ?? ''),
    };
  },
};

/**
 * KYC attestation. Expects either `kyc_level` (one of "basic" / "enhanced"
 * / "identity-verified") or, as a fallback, a truthy `kyc_passed`.
 */
export const kycMapper: ClaimMapper<{
  level: string;
  verifiedAt: bigint;
  issuerDid: string;
  jurisdiction: string;
}> = {
  schema: CLAIM_KYC_V1,
  map(credential: VerificationResult) {
    const claims = credential.disclosedClaims;
    let level: string | null = null;
    if (typeof claims['kyc_level'] === 'string') level = claims['kyc_level'];
    else if (claims['kyc_passed'] === true) level = 'basic';
    if (!level) return null;
    return {
      level,
      verifiedAt: nowSeconds(),
      issuerDid: credential.issuerDid,
      jurisdiction: string(claims['country'] ?? claims['jurisdiction'] ?? ''),
    };
  },
};

/**
 * Jurisdiction (country + optional subdivision) attestation. Looks for
 * `country` (ISO 3166-1 alpha-2) and optionally `subdivision`.
 */
export const jurisdictionMapper: ClaimMapper<{
  country: string;
  subdivision: string;
  verifiedAt: bigint;
  issuerDid: string;
}> = {
  schema: CLAIM_JURISDICTION_V1,
  map(credential: VerificationResult) {
    const country = string(credential.disclosedClaims['country']);
    if (!country) return null;
    return {
      country,
      subdivision: string(credential.disclosedClaims['subdivision']),
      verifiedAt: nowSeconds(),
      issuerDid: credential.issuerDid,
    };
  },
};

/**
 * The four built-in mappers, in a sensible default order. Pass to
 * `bridgeCredential` and any mapper whose preconditions are met will
 * produce an attestation.
 */
export const DEFAULT_MAPPERS = [credentialMapper, over18Mapper, kycMapper, jurisdictionMapper];
