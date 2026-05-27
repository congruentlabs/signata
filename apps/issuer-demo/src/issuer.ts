/**
 * SD-JWT VC issuance backed by the demo signing key. Produces credentials
 * structurally identical to what a real EUDI / national issuer would emit;
 * the only thing that's "demo" is the signing key.
 */

import { SDJwtVcInstance, type SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import { bufToBase64Url, hasher } from './hasher.js';
import { DEMO_PRIVATE_JWK, ISSUER_DID, KID } from './demoKey.js';

let importedKey: CryptoKey | undefined;

async function getPrivateKey(): Promise<CryptoKey> {
  if (importedKey) return importedKey;
  importedKey = await crypto.subtle.importKey(
    'jwk',
    DEMO_PRIVATE_JWK as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  return importedKey;
}

function buildInstance(): SDJwtVcInstance {
  return new SDJwtVcInstance({
    hasher,
    hashAlg: 'sha-256',
    saltGenerator: async () => {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return bufToBase64Url(bytes);
    },
    signer: async (data: string) => {
      const key = await getPrivateKey();
      const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(data),
      );
      return bufToBase64Url(new Uint8Array(sig));
    },
    signAlg: 'ES256',
  });
}

export interface CredentialDefinition {
  /** Internal id used by the UI to pick the credential to issue. */
  id: string;
  /** Display name shown on the issuer's button. */
  label: string;
  /** Short subtitle shown under the button. */
  description: string;
  /** SD-JWT VC `vct` claim. */
  vct: string;
  /** Concrete claims to set in the payload. */
  claims: Record<string, unknown>;
  /** Which claims to make selectively disclosable. */
  disclosureKeys: string[];
  /** Lifetime of the credential in seconds. */
  validitySeconds: number;
}

export const CREDENTIAL_TYPES: CredentialDefinition[] = [
  {
    id: 'person',
    label: 'Person identification',
    description:
      'Identity record including age-over-18, jurisdiction, and name. Every field is selectively disclosable.',
    vct: 'PersonIdentificationData',
    claims: {
      given_name: 'Ada',
      family_name: 'Lovelace',
      birthdate: '1815-12-10',
      age_over_18: true,
      country: 'ZZ',
    },
    disclosureKeys: ['given_name', 'family_name', 'birthdate', 'age_over_18', 'country'],
    validitySeconds: 60 * 60 * 24 * 90, // 90 days
  },
  {
    id: 'kyc',
    label: 'KYC attestation',
    description:
      'A "verified identity" credential with a configurable KYC level and jurisdiction.',
    vct: 'KycCredential',
    claims: {
      kyc_level: 'enhanced',
      kyc_passed: true,
      country: 'ZZ',
    },
    disclosureKeys: ['kyc_level', 'kyc_passed', 'country'],
    validitySeconds: 60 * 60 * 24 * 365, // 1 year
  },
  {
    id: 'residency',
    label: 'Residency credential',
    description: 'Just country and subdivision (no other PII).',
    vct: 'ResidencyCredential',
    claims: {
      country: 'ZZ',
      subdivision: 'ZZ-01',
    },
    disclosureKeys: ['country', 'subdivision'],
    validitySeconds: 60 * 60 * 24 * 365,
  },
];

export async function issueCredential(def: CredentialDefinition): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SdJwtVcPayload = {
    iss: ISSUER_DID,
    vct: def.vct,
    iat: now,
    exp: now + def.validitySeconds,
    ...def.claims,
  };
  // The disclosure-frame typings in @sd-jwt are too tight for arbitrary
  // claim shapes — `_sd: string[]` is the documented form at runtime.
  const disclosureFrame = { _sd: def.disclosureKeys } as never;
  const sdjwt = buildInstance();
  return sdjwt.issue(payload, disclosureFrame, { header: { kid: KID } });
}
