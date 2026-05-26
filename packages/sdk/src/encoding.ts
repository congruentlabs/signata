/**
 * Encode and decode the `data` field of an EAS attestation according to its
 * schema string. Built on viem's ABI encoder so we avoid the ethers
 * transitive that comes with `@ethereum-attestation-service/eas-sdk`.
 */

import { decodeAbiParameters, encodeAbiParameters, type Hex } from 'viem';
import { parseSchema, schemaAbiParameters } from './eas.js';

/**
 * Encode the attestation data payload for a schema.
 *
 * Values are looked up by field name from the supplied object. Missing
 * fields throw — callers should provide every field declared in the schema.
 */
export function encodeAttestationData(
  schemaString: string,
  values: Record<string, unknown>,
): Hex {
  const fields = parseSchema(schemaString);
  const params = schemaAbiParameters(schemaString);
  const args = fields.map((field) => {
    if (!(field.name in values)) {
      throw new Error(`Missing attestation field '${field.name}' for schema '${schemaString}'`);
    }
    return values[field.name];
  });
  return encodeAbiParameters(params, args);
}

/**
 * Decode the attestation `data` blob back into an object keyed by field
 * name. The opposite of `encodeAttestationData`.
 */
export function decodeAttestationData<T extends Record<string, unknown> = Record<string, unknown>>(
  schemaString: string,
  data: Hex,
): T {
  const fields = parseSchema(schemaString);
  const params = schemaAbiParameters(schemaString);
  const decoded = decodeAbiParameters(params, data);
  const result: Record<string, unknown> = {};
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field) continue;
    result[field.name] = decoded[i];
  }
  return result as T;
}
