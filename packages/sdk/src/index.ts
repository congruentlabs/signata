/**
 * @signata/sdk
 *
 * High-level SDK for bridging verified credentials onto EAS attestations
 * and reading them back. Wraps `@signata/verifier` (verification) and
 * provides a viem-native interface to the Ethereum Attestation Service.
 */

// EAS primitives
export {
  EAS_ADDRESSES,
  EAS_ABI,
  SCHEMA_REGISTRY_ABI,
  ZERO_ADDRESS,
  computeSchemaUid,
  parseSchema,
  schemaAbiParameters,
  type SupportedNetwork,
  type SchemaField,
} from './eas.js';

// Schemas
export {
  ALL_SCHEMAS,
  CREDENTIAL_V1,
  CLAIM_OVER18_V1,
  CLAIM_KYC_V1,
  CLAIM_JURISDICTION_V1,
  findSchemaByUid,
  type SchemaDefinition,
} from './schemas.js';

// Encoding helpers
export { encodeAttestationData, decodeAttestationData } from './encoding.js';

// Claim mappers
export {
  credentialMapper,
  over18Mapper,
  kycMapper,
  jurisdictionMapper,
  DEFAULT_MAPPERS,
} from './mappers.js';

// Write path
export { bridgeCredential, getAttestationUidFromTx } from './bridge.js';
export { revokeAttestation } from './revoke.js';

// Read path
export { findAttestations, getAttestation } from './read.js';

// Public types
export type {
  ClaimMapper,
  BridgeOptions,
  BridgeAttestation,
  BridgeResult,
  FindAttestationsQuery,
  AttestationRecord,
  RevokeOptions,
} from './types.js';
