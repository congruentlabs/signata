/**
 * Minimal EAS contract surface — addresses, ABI fragments, and the schema
 * UID derivation used by both this package and consumers who want to
 * compute UIDs at compile time.
 *
 * We deliberately avoid `@ethereum-attestation-service/eas-sdk` because it
 * pulls in ethers v6 and we are a viem-native package.
 */

import { encodePacked, keccak256, parseAbiParameters, type Address, type Hex } from 'viem';

/**
 * EAS contract addresses on the OP-stack chains we target. These are
 * predeployed at canonical addresses so they're identical across Base and
 * Base Sepolia (and most other OP-stack chains).
 */
export const EAS_ADDRESSES = {
  /** Base mainnet (chain 8453) */
  base: {
    eas: '0x4200000000000000000000000000000000000021' as Address,
    schemaRegistry: '0x4200000000000000000000000000000000000020' as Address,
    graphql: 'https://base.easscan.org/graphql' as const,
  },
  /** Base Sepolia (chain 84532) */
  baseSepolia: {
    eas: '0x4200000000000000000000000000000000000021' as Address,
    schemaRegistry: '0x4200000000000000000000000000000000000020' as Address,
    graphql: 'https://base-sepolia.easscan.org/graphql' as const,
  },
} as const;

export type SupportedNetwork = keyof typeof EAS_ADDRESSES;

/** Zero address — used as `resolver` for schemas with no resolver contract. */
export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';

/**
 * EAS computes a schema UID as keccak256(packed(schema, resolver, revocable)).
 * This matches the on-chain `_getUID` in the SchemaRegistry contract.
 */
export function computeSchemaUid(
  schemaString: string,
  resolver: Address = ZERO_ADDRESS,
  revocable = true,
): Hex {
  return keccak256(encodePacked(['string', 'address', 'bool'], [schemaString, resolver, revocable]));
}

/**
 * Minimal EAS contract ABI — only the functions and types this SDK uses.
 */
export const EAS_ABI = [
  {
    type: 'function',
    name: 'attest',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'revoke',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'uid', type: 'bytes32' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getAttestation',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'schema', type: 'bytes32' },
          { name: 'time', type: 'uint64' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocationTime', type: 'uint64' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'attester', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'Attested',
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'attester', type: 'address' },
      { indexed: false, name: 'uid', type: 'bytes32' },
      { indexed: true, name: 'schemaUID', type: 'bytes32' },
    ],
  },
] as const;

export const SCHEMA_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'schema', type: 'string' },
      { name: 'resolver', type: 'address' },
      { name: 'revocable', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'getSchema',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'resolver', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'schema', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { indexed: true, name: 'uid', type: 'bytes32' },
      { indexed: true, name: 'registerer', type: 'address' },
      { indexed: false, name: 'schema', type: 'tuple', components: [
        { name: 'uid', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'revocable', type: 'bool' },
        { name: 'schema', type: 'string' },
      ] },
    ],
  },
] as const;

/**
 * Parse a schema string ("bool verified, uint64 verifiedAt, string issuerDid")
 * into the structured form viem expects for `encodeAbiParameters`. Field
 * names are preserved for readability when decoding.
 */
export interface SchemaField {
  name: string;
  type: string;
}

export function parseSchema(schemaString: string): SchemaField[] {
  return schemaString.split(',').map((rawPart) => {
    const part = rawPart.trim();
    const lastSpace = part.lastIndexOf(' ');
    if (lastSpace < 0) {
      throw new Error(`Malformed schema field: '${part}'`);
    }
    return {
      type: part.slice(0, lastSpace).trim(),
      name: part.slice(lastSpace + 1).trim(),
    };
  });
}

/**
 * Resolve the parsed schema into the AbiParameter array shape viem accepts.
 * Built lazily so the caller can also cache it.
 */
export function schemaAbiParameters(schemaString: string) {
  // `parseAbiParameters` accepts a comma-separated string of "type name"
  // pairs — that's exactly our schema string shape.
  return parseAbiParameters(schemaString);
}
