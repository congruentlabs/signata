/**
 * Canonical Signata Bridge EAS schema definitions.
 *
 * Schemas are immutable on EAS — once registered, the UID is fixed forever.
 * That means versioning has to live in the schema name (the `.vN` suffix is
 * baked into how we describe each one).
 *
 * The exported `*.uid` values are computed deterministically from the
 * schema string + resolver + revocability, so they match whatever the
 * SchemaRegistry contract will produce on `register`. The runtime SDK and
 * any consuming dApp can reference these UIDs at compile time, before
 * registration has actually happened.
 */

import { computeSchemaUid } from './eas.js';
import type { Hex } from 'viem';

export interface SchemaDefinition {
  /** Human-readable name for documentation purposes. */
  name: string;
  /** Short description for trust-registry / explorer display. */
  description: string;
  /** EAS schema string. */
  schema: string;
  /** Deterministic UID computed from schema + resolver + revocable. */
  uid: Hex;
  /** Resolver contract; zero address for no resolver. */
  resolver: Hex;
  /** EAS revocability flag. */
  revocable: boolean;
}

function define(name: string, description: string, schema: string): SchemaDefinition {
  return {
    name,
    description,
    schema,
    uid: computeSchemaUid(schema),
    resolver: '0x0000000000000000000000000000000000000000',
    revocable: true,
  };
}

/**
 * Generic wrapper: "this holder presented a verified credential of type X
 * from issuer Y at time T". The most generic schema; useful as a fallback
 * when no more specific schema applies.
 */
export const CREDENTIAL_V1 = define(
  'signata.credential.v1',
  'Generic verified-credential reference. Issued when a credential of any type is bridged.',
  'string issuerDid,string credentialType,uint64 issuedAt,uint64 expiresAt,bytes32 credentialHash',
);

/**
 * Specific claim: this holder is 18 or older according to a verified
 * credential. Useful for age-gating without exposing date of birth.
 */
export const CLAIM_OVER18_V1 = define(
  'signata.claim.over18.v1',
  'Holder is at least 18, per a verified credential.',
  'bool verified,uint64 verifiedAt,string issuerDid,string jurisdiction',
);

/**
 * KYC level attestation. `level` is one of "basic" / "enhanced" /
 * "identity-verified" by convention; consumers should reject unknown values.
 */
export const CLAIM_KYC_V1 = define(
  'signata.claim.kyc.v1',
  'Holder has completed KYC at the given level with the named jurisdiction-accredited provider.',
  'string level,uint64 verifiedAt,string issuerDid,string jurisdiction',
);

/**
 * Jurisdiction attestation: holder's verified country and (optional) subdivision.
 */
export const CLAIM_JURISDICTION_V1 = define(
  'signata.claim.jurisdiction.v1',
  'Holder is resident in the named jurisdiction, per a verified credential.',
  'string country,string subdivision,uint64 verifiedAt,string issuerDid',
);

/**
 * All built-in schemas, in registration order. The register-schemas script
 * iterates this list.
 */
export const ALL_SCHEMAS: readonly SchemaDefinition[] = [
  CREDENTIAL_V1,
  CLAIM_OVER18_V1,
  CLAIM_KYC_V1,
  CLAIM_JURISDICTION_V1,
];

/**
 * Lookup by UID. Useful when reading an attestation back and wanting to
 * know which schema it's against.
 */
export function findSchemaByUid(uid: Hex): SchemaDefinition | undefined {
  return ALL_SCHEMAS.find((s) => s.uid.toLowerCase() === uid.toLowerCase());
}
