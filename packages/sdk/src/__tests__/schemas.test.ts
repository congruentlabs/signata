import { describe, expect, it } from 'vitest';
import {
  ALL_SCHEMAS,
  CLAIM_JURISDICTION_V1,
  CLAIM_KYC_V1,
  CLAIM_OVER18_V1,
  CREDENTIAL_V1,
  findSchemaByUid,
} from '../schemas.js';
import { computeSchemaUid } from '../eas.js';

describe('schemas', () => {
  it('each schema has a unique deterministic UID', () => {
    const uids = new Set<string>();
    for (const s of ALL_SCHEMAS) {
      expect(s.uid).toMatch(/^0x[0-9a-f]{64}$/i);
      expect(uids.has(s.uid)).toBe(false);
      uids.add(s.uid);
    }
    expect(uids.size).toBe(ALL_SCHEMAS.length);
  });

  it('UID matches the on-chain derivation: keccak256(packed(schema, resolver, revocable))', () => {
    for (const s of ALL_SCHEMAS) {
      expect(computeSchemaUid(s.schema, s.resolver, s.revocable)).toBe(s.uid);
    }
  });

  it('lookup by UID round-trips for all known schemas', () => {
    for (const s of ALL_SCHEMAS) {
      expect(findSchemaByUid(s.uid)?.name).toBe(s.name);
    }
  });

  it('lookup by unknown UID returns undefined', () => {
    expect(findSchemaByUid('0x' + '00'.repeat(32))).toBeUndefined();
  });

  it('all built-in schemas are revocable with no resolver', () => {
    for (const s of [CREDENTIAL_V1, CLAIM_OVER18_V1, CLAIM_KYC_V1, CLAIM_JURISDICTION_V1]) {
      expect(s.revocable).toBe(true);
      expect(s.resolver).toBe('0x0000000000000000000000000000000000000000');
    }
  });

  it('versioned names use the .vN suffix convention', () => {
    for (const s of ALL_SCHEMAS) {
      expect(s.name).toMatch(/\.v\d+$/);
    }
  });
});
