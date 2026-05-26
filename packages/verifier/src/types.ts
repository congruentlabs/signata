/**
 * Shape of a verified credential as returned by {@link verifyCredential}.
 *
 * Only fields disclosed by the holder are present in `disclosedClaims`. For
 * SD-JWT VC the holder controls which disclosable fields are presented at
 * verification time; undisclosed fields will be absent from the result.
 */
export interface VerificationResult {
  /** True iff the signature is valid, the issuer is resolvable, and the credential is within its validity window. */
  valid: boolean;
  /** DID of the issuer that signed the credential. */
  issuerDid: string;
  /** Credential type (`vct` for SD-JWT VC; `type` for W3C VC). */
  credentialType: string;
  /** Claims the holder chose to disclose at verification time. */
  disclosedClaims: Record<string, unknown>;
  /** Unix seconds since epoch. */
  issuedAt?: number;
  /** Unix seconds since epoch. */
  expiresAt?: number;
  /** Original credential string, retained for replay-detection hashing. */
  raw: string;
  /** Non-fatal warnings (e.g. issuer not on trust registry but signature otherwise valid). */
  warnings: string[];
  /** Reason the credential is invalid, if `valid` is false. */
  reason?: VerificationFailureReason;
}

export type VerificationFailureReason =
  | 'malformed'
  | 'unsupported-format'
  | 'signature-invalid'
  | 'issuer-unresolvable'
  | 'issuer-untrusted'
  | 'expired'
  | 'not-yet-valid'
  | 'unknown';

/**
 * A minimal trust registry the verifier consults to decide whether an issuer
 * DID is accredited. Production deployments will load this from a maintained
 * source (a JSON file shipped with the SDK, or an on-chain registry).
 */
export interface TrustRegistry {
  /**
   * Whether the registry recognises this issuer DID. Implementations may
   * apply additional checks (jurisdiction, validity dates).
   */
  isTrusted(issuerDid: string, opts?: { jurisdiction?: string; now?: Date }): boolean | Promise<boolean>;
  /**
   * Optional metadata about a known issuer.
   */
  describe?(issuerDid: string): IssuerMetadata | undefined | Promise<IssuerMetadata | undefined>;
}

export interface IssuerMetadata {
  displayName: string;
  jurisdiction?: string;
  accreditationLevel?: string;
  validFrom?: string;
  validUntil?: string;
  contactUrl?: string;
}

export interface VerifyOptions {
  trustRegistry?: TrustRegistry;
  /** Override the current time for deterministic testing. */
  now?: Date;
  /** Required jurisdiction. The verifier delegates the check to the registry. */
  jurisdiction?: string;
}
