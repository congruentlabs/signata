import { describe, it, expect } from 'vitest';
import { verifyCredential } from '../index.js';
import { allowList, createTestIssuer, present, tamperSignature } from './fixtures.js';

const ONE_HOUR_SECS = 60 * 60;

describe('verifyCredential', () => {
  it('verifies a well-formed SD-JWT VC and exposes the disclosed claim values', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { given_name: 'Ada', family_name: 'Lovelace', age_over_18: true, country: 'ZZ' },
      disclosureKeys: ['given_name', 'family_name', 'age_over_18', 'country'],
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + ONE_HOUR_SECS * 1000),
    });

    const result = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
    });

    expect(result.valid).toBe(true);
    expect(result.issuerDid).toBe(issuer.did);
    expect(result.credentialType).toBe('DemoCredential');
    expect(result.disclosedClaims).toMatchObject({
      given_name: 'Ada',
      family_name: 'Lovelace',
      age_over_18: true,
      country: 'ZZ',
    });
    expect(result.reason).toBeUndefined();
  });

  it('respects holder-selected disclosures (keys not presented stay hidden)', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { given_name: 'Ada', family_name: 'Lovelace', age_over_18: true, country: 'ZZ' },
      disclosureKeys: ['given_name', 'family_name', 'age_over_18', 'country'],
    });
    const presented = present(issued, ['age_over_18', 'country']);

    const result = await verifyCredential(presented, {
      trustRegistry: allowList(issuer.did),
    });

    expect(result.valid).toBe(true);
    const keys = Object.keys(result.disclosedClaims);
    // Disclosed keys are present
    expect(keys).toEqual(expect.arrayContaining(['age_over_18', 'country']));
    // Undisclosed keys are absent
    expect(keys).not.toContain('given_name');
    expect(keys).not.toContain('family_name');
  });

  it('warns but still verifies when no trust registry is supplied', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { age_over_18: true },
      disclosureKeys: ['age_over_18'],
    });

    const result = await verifyCredential(issued);

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('trust registry'))).toBe(true);
  });

  it('rejects credentials whose issuer is not on the trust registry', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { age_over_18: true },
      disclosureKeys: ['age_over_18'],
    });

    const result = await verifyCredential(issued, {
      trustRegistry: allowList('did:web:someone-else.example'),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('issuer-untrusted');
    // It still extracted the issuer DID before failing
    expect(result.issuerDid).toBe(issuer.did);
  });

  it('rejects credentials past their expiry', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { age_over_18: true },
      disclosureKeys: ['age_over_18'],
      issuedAt: new Date(Date.now() - 2 * ONE_HOUR_SECS * 1000),
      expiresAt: new Date(Date.now() - ONE_HOUR_SECS * 1000),
    });

    const result = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects credentials before their nbf', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { age_over_18: true },
      disclosureKeys: ['age_over_18'],
      notBefore: new Date(Date.now() + ONE_HOUR_SECS * 1000),
    });

    const result = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not-yet-valid');
  });

  it('rejects credentials with a tampered signature', async () => {
    const issuer = await createTestIssuer();
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { age_over_18: true },
      disclosureKeys: ['age_over_18'],
    });
    const tampered = tamperSignature(issued);

    const result = await verifyCredential(tampered, {
      trustRegistry: allowList(issuer.did),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature-invalid');
  });

  it('rejects unsupported credential formats (JSON-LD VC)', async () => {
    // JSON-LD VCs start with `{` and don't fit either compact form
    const jsonLdVc = '{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential"]}';
    const result = await verifyCredential(jsonLdVc);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported-format');
  });

  it('rejects malformed input', async () => {
    const result = await verifyCredential('garbage~not-a-disclosure');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('malformed');
  });

  it('respects an explicit `now` for the validity window check', async () => {
    const issuer = await createTestIssuer();
    const validFrom = new Date('2026-01-01T00:00:00Z');
    const validTo = new Date('2026-06-01T00:00:00Z');
    const issued = await issuer.issue({
      vct: 'DemoCredential',
      claims: { foo: 'bar' },
      disclosureKeys: ['foo'],
      issuedAt: validFrom,
      notBefore: validFrom,
      expiresAt: validTo,
    });

    // Inside the window
    const ok = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
      now: new Date('2026-03-01T00:00:00Z'),
    });
    expect(ok.valid).toBe(true);

    // After the window
    const tooLate = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
      now: new Date('2026-07-01T00:00:00Z'),
    });
    expect(tooLate.valid).toBe(false);
    expect(tooLate.reason).toBe('expired');

    // Before the window
    const tooEarly = await verifyCredential(issued, {
      trustRegistry: allowList(issuer.did),
      now: new Date('2025-12-01T00:00:00Z'),
    });
    expect(tooEarly.valid).toBe(false);
    expect(tooEarly.reason).toBe('not-yet-valid');
  });
});
