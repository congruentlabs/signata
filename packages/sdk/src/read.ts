/**
 * Read attestations from EAS.
 *
 * Two paths:
 *
 *   `findAttestations` — uses the EAS GraphQL indexer to filter by
 *   (recipient, schema, attester). Fast and exactly the query we need;
 *   relies on the indexer being available at the configured endpoint.
 *
 *   `getAttestation` — direct contract read for a known UID. No indexer
 *   dependency. Used to verify what GraphQL reported and as the primary
 *   read path in offline / private-network deployments.
 */

import { type Address, type Hex, getAddress } from 'viem';
import { EAS_ABI, EAS_ADDRESSES, type SupportedNetwork } from './eas.js';
import { decodeAttestationData } from './encoding.js';
import { findSchemaByUid } from './schemas.js';
import type { AttestationRecord, FindAttestationsQuery } from './types.js';

interface GraphQLAttestationNode {
  id: string;
  schemaId: string;
  recipient: string;
  attester: string;
  time: string;
  expirationTime: string;
  revocationTime: string;
  revoked: boolean;
  data: string;
}

const FIND_QUERY = /* GraphQL */ `
  query FindAttestations($where: AttestationWhereInput) {
    attestations(where: $where, orderBy: [{ time: desc }]) {
      id
      schemaId
      recipient
      attester
      time
      expirationTime
      revocationTime
      revoked
      data
    }
  }
`;

/**
 * Find attestations using the EAS GraphQL indexer.
 *
 * Returns the records sorted newest-first. Decodes the data blob if the
 * schema is one of the built-in Signata schemas; otherwise returns the raw
 * hex string under `data._raw` for downstream processing.
 */
export async function findAttestations<TData extends Record<string, unknown> = Record<string, unknown>>(
  query: FindAttestationsQuery,
): Promise<AttestationRecord<TData>[]> {
  const endpoint = EAS_ADDRESSES[query.network].graphql;
  const where: Record<string, unknown> = {
    recipient: { equals: getAddress(query.recipient) },
    schemaId: { equals: query.schemaUid },
  };
  if (query.attester) {
    where['attester'] = { equals: getAddress(query.attester) };
  }
  if (!query.includeRevoked) {
    where['revoked'] = { equals: false };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: FIND_QUERY, variables: { where } }),
  });
  if (!res.ok) {
    throw new Error(`EAS GraphQL ${endpoint} returned ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { attestations: GraphQLAttestationNode[] };
    errors?: { message: string }[];
  };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`EAS GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  const nodes = json.data?.attestations ?? [];

  return nodes.map((node) => attestationFromNode<TData>(node));
}

function attestationFromNode<TData extends Record<string, unknown>>(
  node: GraphQLAttestationNode,
): AttestationRecord<TData> {
  const schema = findSchemaByUid(node.schemaId as Hex);
  const dataDecoded = schema
    ? decodeAttestationData<TData>(schema.schema, node.data as Hex)
    : ({ _raw: node.data } as unknown as TData);
  return {
    uid: node.id as Hex,
    schemaUid: node.schemaId as Hex,
    recipient: getAddress(node.recipient),
    attester: getAddress(node.attester),
    time: BigInt(node.time),
    expirationTime: BigInt(node.expirationTime),
    revocationTime: BigInt(node.revocationTime),
    revoked: node.revoked,
    data: dataDecoded,
  };
}

/**
 * Direct contract read for one attestation. Used to verify what the
 * indexer reported, or when the indexer isn't available.
 */
export async function getAttestation<TData extends Record<string, unknown> = Record<string, unknown>>(
  uid: Hex,
  options: { publicClient: import('viem').PublicClient; network: SupportedNetwork },
): Promise<AttestationRecord<TData> | undefined> {
  const easAddress = EAS_ADDRESSES[options.network].eas;
  const result = (await options.publicClient.readContract({
    address: easAddress,
    abi: EAS_ABI,
    functionName: 'getAttestation',
    args: [uid],
  })) as {
    uid: Hex;
    schema: Hex;
    time: bigint;
    expirationTime: bigint;
    revocationTime: bigint;
    refUID: Hex;
    recipient: Address;
    attester: Address;
    revocable: boolean;
    data: Hex;
  };

  // EAS returns a zero-UID record when the attestation doesn't exist.
  if (result.uid === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return undefined;
  }

  const schema = findSchemaByUid(result.schema);
  const dataDecoded = schema
    ? decodeAttestationData<TData>(schema.schema, result.data)
    : ({ _raw: result.data } as unknown as TData);

  return {
    uid: result.uid,
    schemaUid: result.schema,
    recipient: result.recipient,
    attester: result.attester,
    time: result.time,
    expirationTime: result.expirationTime,
    revocationTime: result.revocationTime,
    revoked: result.revocationTime > 0n,
    data: dataDecoded,
  };
}
