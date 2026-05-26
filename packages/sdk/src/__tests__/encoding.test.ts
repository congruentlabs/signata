import { describe, expect, it } from 'vitest';
import { decodeAttestationData, encodeAttestationData } from '../encoding.js';
import { parseSchema } from '../eas.js';
import {
  CLAIM_JURISDICTION_V1,
  CLAIM_KYC_V1,
  CLAIM_OVER18_V1,
  CREDENTIAL_V1,
} from '../schemas.js';

describe('parseSchema', () => {
  it('parses simple field lists', () => {
    expect(parseSchema('bool verified, uint64 verifiedAt')).toEqual([
      { name: 'verified', type: 'bool' },
      { name: 'verifiedAt', type: 'uint64' },
    ]);
  });

  it('tolerates extra whitespace', () => {
    expect(parseSchema(' bool  verified ,  string  jurisdiction ')).toEqual([
      { name: 'verified', type: 'bool' },
      { name: 'jurisdiction', type: 'string' },
    ]);
  });

  it('throws on malformed fields', () => {
    expect(() => parseSchema('bool, string foo')).toThrow();
  });
});

describe('encode/decode round-trip', () => {
  it('round-trips the over-18 schema', () => {
    const values = {
      verified: true,
      verifiedAt: 1700000000n,
      issuerDid: 'did:web:issuer.example',
      jurisdiction: 'AU',
    };
    const encoded = encodeAttestationData(CLAIM_OVER18_V1.schema, values);
    const decoded = decodeAttestationData(CLAIM_OVER18_V1.schema, encoded);
    expect(decoded).toEqual(values);
  });

  it('round-trips the credential wrapper schema', () => {
    const values = {
      issuerDid: 'did:web:issuer.example',
      credentialType: 'PersonIdentificationData',
      issuedAt: 1700000000n,
      expiresAt: 1800000000n,
      credentialHash: ('0x' + 'ab'.repeat(32)) as `0x${string}`,
    };
    const encoded = encodeAttestationData(CREDENTIAL_V1.schema, values);
    const decoded = decodeAttestationData<typeof values>(CREDENTIAL_V1.schema, encoded);
    expect(decoded.issuerDid).toBe(values.issuerDid);
    expect(decoded.credentialType).toBe(values.credentialType);
    expect(decoded.issuedAt).toBe(values.issuedAt);
    expect(decoded.expiresAt).toBe(values.expiresAt);
    expect(decoded.credentialHash.toLowerCase()).toBe(values.credentialHash.toLowerCase());
  });

  it('round-trips the KYC schema', () => {
    const values = {
      level: 'enhanced',
      verifiedAt: 1700000000n,
      issuerDid: 'did:web:kyc.example',
      jurisdiction: 'AU',
    };
    const encoded = encodeAttestationData(CLAIM_KYC_V1.schema, values);
    expect(decodeAttestationData(CLAIM_KYC_V1.schema, encoded)).toEqual(values);
  });

  it('round-trips the jurisdiction schema', () => {
    const values = {
      country: 'AU',
      subdivision: 'NSW',
      verifiedAt: 1700000000n,
      issuerDid: 'did:web:issuer.example',
    };
    const encoded = encodeAttestationData(CLAIM_JURISDICTION_V1.schema, values);
    expect(decodeAttestationData(CLAIM_JURISDICTION_V1.schema, encoded)).toEqual(values);
  });

  it('throws when a required field is missing', () => {
    expect(() =>
      encodeAttestationData(CLAIM_OVER18_V1.schema, {
        verified: true,
        verifiedAt: 1n,
        // issuerDid missing
        jurisdiction: 'AU',
      }),
    ).toThrow(/issuerDid/);
  });
});
