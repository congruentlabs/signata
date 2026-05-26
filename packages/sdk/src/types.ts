import type { VerificationResult } from '@signata/verifier';
import type { Address, Hex, WalletClient, PublicClient } from 'viem';
import type { SchemaDefinition } from './schemas.js';
import type { SupportedNetwork } from './eas.js';

/**
 * Takes a verified credential and returns the data for one specific EAS
 * schema, or `null` if the credential doesn't satisfy the mapper's
 * preconditions (e.g. no `age_over_18` claim for an over-18 mapper).
 */
export interface ClaimMapper<TData extends Record<string, unknown> = Record<string, unknown>> {
  schema: SchemaDefinition;
  map(credential: VerificationResult): TData | null;
}

export interface BridgeOptions {
  /** viem WalletClient — used as both attester and signer. */
  walletClient: WalletClient;
  /** Network the EAS contract lives on. */
  network: SupportedNetwork;
  /** Which mappers to apply. */
  mappers: ClaimMapper[];
  /**
   * Address to mint the attestation against. Defaults to the wallet
   * client's account, so the user's wallet is both attester and recipient
   * (the POC self-attestation pattern).
   */
  recipient?: Address;
}

export interface BridgeAttestation {
  schemaUid: Hex;
  schemaName: string;
  /** Returned only if the attestation went through (txn included). */
  uid?: Hex;
  /** Transaction hash for the `attest` call. */
  transactionHash: Hex;
  /** Encoded data sent on-chain. */
  encodedData: Hex;
}

export interface BridgeResult {
  attestations: BridgeAttestation[];
  /** Mapper results that were null (preconditions not met) plus the schema name. */
  skipped: { schemaName: string; reason: 'mapper-returned-null' }[];
}

export interface FindAttestationsQuery {
  publicClient?: PublicClient;
  network: SupportedNetwork;
  /** Address the attestation must be against. */
  recipient: Address;
  /** Schema UID to filter by. Required. */
  schemaUid: Hex;
  /** Restrict to attestations created by this attester. Optional. */
  attester?: Address;
  /** If true, include revoked attestations. Defaults to false. */
  includeRevoked?: boolean;
}

export interface AttestationRecord<TData = Record<string, unknown>> {
  uid: Hex;
  schemaUid: Hex;
  recipient: Address;
  attester: Address;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  revoked: boolean;
  data: TData;
}

export interface RevokeOptions {
  walletClient: WalletClient;
  network: SupportedNetwork;
  schemaUid: Hex;
  uid: Hex;
}
