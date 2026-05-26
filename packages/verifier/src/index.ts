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

import type { VerificationResult, VerifyOptions } from './types.js';

/**
 * Verify a credential string and return a structured result.
 *
 * Currently a stub. The full implementation parses SD-JWT VC and W3C JWT-VC,
 * resolves the issuer DID via `did-resolver`, verifies the JOSE signature,
 * checks the validity window, applies the trust registry, and returns the
 * disclosed claims.
 *
 * @param credential — the credential as a string (SD-JWT VC or compact JWT-VC).
 * @param options    — optional trust registry and clock override.
 */
export async function verifyCredential(
  credential: string,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  void credential;
  void options;
  throw new Error('verifyCredential: not yet implemented');
}
