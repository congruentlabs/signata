/**
 * @signata/sdk
 *
 * High-level SDK for bridging verifiable credentials onto EAS attestations
 * and reading them back. Wraps `@signata/verifier` (verification) and the
 * EAS SDK (on-chain projection).
 */

import type { VerificationResult } from '@signata/verifier';

/**
 * A mapper that turns a verified credential into the data payload for a
 * specific EAS schema. One mapper per schema.
 *
 * Example:
 * ```ts
 * const over18Mapper: ClaimMapper<{ verified: boolean; jurisdiction: string }> = {
 *   schemaUid: SCHEMA_OVER18,
 *   map: (cred) => ({
 *     verified: cred.disclosedClaims.age_over_18 === true,
 *     jurisdiction: String(cred.disclosedClaims.country ?? ''),
 *   }),
 * };
 * ```
 */
export interface ClaimMapper<TData> {
  schemaUid: string;
  map(credential: VerificationResult): TData | null;
}

export interface BridgeOptions {
  /** Connected wagmi/viem wallet client used to send the attestation transaction. */
  walletClient: unknown;
  /** Which claim mappers to apply. */
  mappers: ClaimMapper<unknown>[];
}

export interface BridgeResult {
  /** The attestations that were minted (or scheduled). */
  attestations: {
    schemaUid: string;
    uid?: string;
    transactionHash?: string;
  }[];
}

/**
 * Project a verified credential onto one or more EAS attestations.
 *
 * Currently a stub.
 */
export async function bridgeCredential(
  credential: VerificationResult,
  options: BridgeOptions,
): Promise<BridgeResult> {
  void credential;
  void options;
  throw new Error('bridgeCredential: not yet implemented');
}

export interface AttestationQuery {
  recipient: `0x${string}`;
  schemaUid: string;
  /** Optional attester filter. Defaults to the Signata attester address. */
  attester?: `0x${string}`;
}

export interface AttestationRecord<TData = unknown> {
  uid: string;
  recipient: `0x${string}`;
  attester: `0x${string}`;
  schemaUid: string;
  data: TData;
  issuedAt: number;
  expiresAt?: number;
  revoked: boolean;
}

/**
 * Read attestations against an address that match a schema.
 *
 * Currently a stub.
 */
export async function findAttestations<TData = unknown>(
  query: AttestationQuery,
): Promise<AttestationRecord<TData>[]> {
  void query;
  throw new Error('findAttestations: not yet implemented');
}

/**
 * Revoke an attestation previously issued by this caller. EAS revocation
 * requires the caller be the original attester.
 *
 * Currently a stub.
 */
export async function revokeAttestation(uid: string): Promise<{ transactionHash: string }> {
  void uid;
  throw new Error('revokeAttestation: not yet implemented');
}
