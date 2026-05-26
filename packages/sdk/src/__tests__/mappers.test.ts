import { describe, expect, it } from 'vitest';
import type { VerificationResult } from '@signata/verifier';
import {
  credentialMapper,
  jurisdictionMapper,
  kycMapper,
  over18Mapper,
} from '../mappers.js';

function makeCredential(
  partial: Partial<VerificationResult> & { disclosedClaims?: Record<string, unknown> } = {},
): VerificationResult {
  return {
    valid: true,
    issuerDid: 'did:web:issuer.example',
    credentialType: 'PersonIdentificationData',
    disclosedClaims: {},
    raw: 'eyJ.eyJ.zzz~',
    warnings: [],
    issuedAt: 1700000000,
    expiresAt: 1800000000,
    ...partial,
  };
}

describe('credentialMapper', () => {
  it('produces a wrapper attestation for any verified credential', () => {
    const out = credentialMapper.map(makeCredential());
    expect(out).not.toBeNull();
    expect(out!.issuerDid).toBe('did:web:issuer.example');
    expect(out!.credentialType).toBe('PersonIdentificationData');
    expect(out!.credentialHash).toMatch(/^0x[0-9a-f]{64}$/i);
  });

  it('returns null when issuer or type is missing', () => {
    expect(credentialMapper.map(makeCredential({ issuerDid: '' }))).toBeNull();
    expect(credentialMapper.map(makeCredential({ credentialType: '' }))).toBeNull();
  });
});

describe('over18Mapper', () => {
  it('emits when age_over_18 is true', () => {
    const out = over18Mapper.map(
      makeCredential({ disclosedClaims: { age_over_18: true, country: 'AU' } }),
    );
    expect(out).not.toBeNull();
    expect(out!.verified).toBe(true);
    expect(out!.jurisdiction).toBe('AU');
  });

  it('emits when age >= 18 is disclosed numerically', () => {
    const out = over18Mapper.map(
      makeCredential({ disclosedClaims: { age: 21, country: 'AU' } }),
    );
    expect(out).not.toBeNull();
    expect(out!.verified).toBe(true);
  });

  it('returns null when age_over_18 is false', () => {
    const out = over18Mapper.map(makeCredential({ disclosedClaims: { age_over_18: false } }));
    expect(out).toBeNull();
  });

  it('returns null when neither claim is present', () => {
    const out = over18Mapper.map(makeCredential({ disclosedClaims: { other: 'thing' } }));
    expect(out).toBeNull();
  });

  it('returns null when age < 18 numerically', () => {
    const out = over18Mapper.map(makeCredential({ disclosedClaims: { age: 17 } }));
    expect(out).toBeNull();
  });
});

describe('kycMapper', () => {
  it('emits with explicit kyc_level', () => {
    const out = kycMapper.map(
      makeCredential({ disclosedClaims: { kyc_level: 'enhanced', country: 'AU' } }),
    );
    expect(out).not.toBeNull();
    expect(out!.level).toBe('enhanced');
    expect(out!.jurisdiction).toBe('AU');
  });

  it('emits "basic" when only kyc_passed is set', () => {
    const out = kycMapper.map(makeCredential({ disclosedClaims: { kyc_passed: true } }));
    expect(out).not.toBeNull();
    expect(out!.level).toBe('basic');
  });

  it('returns null when no kyc fields present', () => {
    expect(kycMapper.map(makeCredential({ disclosedClaims: {} }))).toBeNull();
  });
});

describe('jurisdictionMapper', () => {
  it('emits with country only', () => {
    const out = jurisdictionMapper.map(makeCredential({ disclosedClaims: { country: 'AU' } }));
    expect(out).not.toBeNull();
    expect(out!.country).toBe('AU');
    expect(out!.subdivision).toBe('');
  });

  it('emits with country + subdivision', () => {
    const out = jurisdictionMapper.map(
      makeCredential({ disclosedClaims: { country: 'AU', subdivision: 'NSW' } }),
    );
    expect(out!.subdivision).toBe('NSW');
  });

  it('returns null without country', () => {
    expect(jurisdictionMapper.map(makeCredential({ disclosedClaims: {} }))).toBeNull();
  });
});
